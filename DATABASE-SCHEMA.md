# 🗄️ Schéma de Base de Données — bcm-gest-react
### Architecture Atomique · Correcteur Collaboratif · v2.0

---

## Vue d'ensemble

```
auth.users (Supabase natif)
     │
     └── public.users (profils étendus)
              │
              ├── book_projects (projets éditoriaux)
              │        │
              │        ├── documents (sessions de travail)
              │        │        │
              │        │        ├── document_blocks (blocs atomiques)
              │        │        │        │
              │        │        │        ├── block_operations  (journal CRDT)
              │        │        │        ├── block_proposals   (suggestions)
              │        │        │        └── block_comments    (fils de discussion)
              │        │        │
              │        │        ├── document_collaborators (accès par session)
              │        │        ├── document_versions      (snapshots nommés)
              │        │        └── document_sessions      (présence live)
              │        │
              │        └── project_members (équipe du projet)
              │
              └── notifications (alertes utilisateurs)
```

---

## 1. Table `users`

Profils étendus liés à `auth.users` de Supabase.

```sql
CREATE TABLE public.users (
  id              UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email           TEXT NOT NULL UNIQUE,
  full_name       TEXT NOT NULL,
  phone           TEXT,
  avatar_url      TEXT,
  role            TEXT NOT NULL DEFAULT 'corrector'
                  CHECK (role IN ('admin', 'editor', 'redacteur_chef', 'corrector', 'reviewer')),
  is_active       BOOLEAN NOT NULL DEFAULT true,
  preferred_lang  TEXT DEFAULT 'fr',
  timezone        TEXT DEFAULT 'Africa/Douala',
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);
```

### Rôles et permissions

| Rôle | Description | Peut merger | Peut proposer | Peut commenter | Peut clore session |
|------|-------------|-------------|---------------|----------------|--------------------|
| `admin` | Administrateur plateforme | ✅ | ✅ | ✅ | ✅ |
| `editor` | Chef de projet éditorial | ✅ | ✅ | ✅ | ✅ |
| `redacteur_chef` | Rédacteur en chef du livre | ✅ | ✅ | ✅ | ❌ |
| `corrector` | Correcteur/Relecteur | ❌ | ✅ | ✅ | ❌ |
| `reviewer` | Relecteur lecture seule | ❌ | ❌ | ✅ | ❌ |

---

## 2. Table `book_projects`

Projets éditoriaux contenant un ou plusieurs livres.

```sql
CREATE TABLE book_projects (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title         TEXT NOT NULL,
  description   TEXT,
  cover_url     TEXT,
  genre         TEXT,
  language      TEXT DEFAULT 'fr',
  status        TEXT NOT NULL DEFAULT 'active'
                CHECK (status IN ('active', 'archived', 'completed')),
  created_by    UUID NOT NULL REFERENCES users(id),
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 3. Table `project_members`

Membres de l'équipe associés à un projet.

```sql
CREATE TABLE project_members (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id  UUID NOT NULL REFERENCES book_projects(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role        TEXT NOT NULL
              CHECK (role IN ('admin', 'editor', 'redacteur_chef', 'corrector', 'reviewer')),
  invited_by  UUID REFERENCES users(id),
  joined_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (project_id, user_id)
);
```

---

## 4. Table `documents`

Sessions de travail sur un livre à un stade précis du cycle éditorial.

```sql
CREATE TABLE documents (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id      UUID NOT NULL REFERENCES book_projects(id) ON DELETE CASCADE,
  title           TEXT NOT NULL,
  type            TEXT NOT NULL DEFAULT 'correction'
                  CHECK (type IN ('correction', 'proofreading', 'translation', 'review')),

  -- Stade éditorial
  stage           TEXT NOT NULL DEFAULT 'first_read'
                  CHECK (stage IN (
                    'first_read',
                    'proofreading_1',
                    'proofreading_2',    -- Relecture 2 = notre cas
                    'final_correction',
                    'ready_to_print'
                  )),

  -- Statut de la session
  status          TEXT NOT NULL DEFAULT 'draft'
                  CHECK (status IN (
                    'draft',        -- document créé, pas encore lancé
                    'converting',   -- conversion Pandoc en cours
                    'in_review',    -- session de correction active
                    'completed',    -- session clôturée
                    'archived'
                  )),

  -- Source originale
  source_format   TEXT CHECK (source_format IN ('docx', 'md', 'epub', 'odt')),
  source_path     TEXT,        -- chemin dans Supabase Storage bucket 'sources'
  source_size     INTEGER,     -- taille en octets

  -- Métriques
  total_blocks    INTEGER DEFAULT 0,
  merged_blocks   INTEGER DEFAULT 0,
  word_count      INTEGER DEFAULT 0,

  -- Dates
  started_at      TIMESTAMPTZ,
  deadline        TIMESTAMPTZ,
  completed_at    TIMESTAMPTZ,
  created_by      UUID NOT NULL REFERENCES users(id),
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 5. Table `document_collaborators`

Utilisateurs invités à participer à une session de correction.

```sql
CREATE TABLE document_collaborators (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  document_id  UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role         TEXT NOT NULL
               CHECK (role IN ('editor', 'redacteur_chef', 'corrector', 'reviewer')),
  invited_by   UUID REFERENCES users(id),
  invited_at   TIMESTAMPTZ DEFAULT NOW(),
  joined_at    TIMESTAMPTZ,                   -- première connexion à la session
  last_seen_at TIMESTAMPTZ,                   -- dernière activité
  color        TEXT NOT NULL,                 -- couleur unique du curseur ex: '#2563EB'
  permissions  JSONB DEFAULT '{
    "can_propose": true,
    "can_comment": true,
    "can_merge": false,
    "can_close_session": false
  }',
  UNIQUE (document_id, user_id)
);
```

---

## 6. Table `document_sessions`

Présence live des collaborateurs (qui est connecté, où, quand).

```sql
CREATE TABLE document_sessions (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  document_id    UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  user_id        UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  block_id       UUID,                        -- bloc actuellement consulté/édité
  cursor_pos     INTEGER,                     -- position du curseur dans le bloc
  is_online      BOOLEAN DEFAULT true,
  is_typing      BOOLEAN DEFAULT false,
  connected_at   TIMESTAMPTZ DEFAULT NOW(),
  last_ping_at   TIMESTAMPTZ DEFAULT NOW(),   -- heartbeat toutes les 30s
  UNIQUE (document_id, user_id)
);

-- Index pour récupérer qui est en ligne sur un document
CREATE INDEX idx_sessions_document ON document_sessions(document_id, is_online);
```

---

## 7. Table `document_blocks` ⭐ Table centrale

Chaque paragraphe, titre, image = 1 bloc indépendant. C'est le cœur de l'architecture atomique.

```sql
CREATE TABLE document_blocks (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  document_id    UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,

  -- Type et position
  type           TEXT NOT NULL
                 CHECK (type IN (
                   'heading1', 'heading2', 'heading3',
                   'paragraph', 'blockquote', 'image',
                   'footnote', 'list', 'divider'
                 )),
  position       INTEGER NOT NULL,            -- ordre dans le document (réordonnable)

  -- Contenu ProseMirror JSON
  content        JSONB NOT NULL DEFAULT '{}', -- structure TipTap/ProseMirror

  -- Statut éditorial (le cycle de vie du bloc)
  status         TEXT NOT NULL DEFAULT 'draft'
                 CHECK (status IN (
                   'draft',      -- contenu original importé, non modifié
                   'proposed',   -- modification suggérée, en attente d'approbation
                   'merged',     -- approuvé par le chef de projet → version officielle
                   'rejected'    -- proposition rejetée, retour au draft précédent
                 )),

  -- CRDT — synchronisation temps réel
  crdt_state     BYTEA,                       -- état Y.js encodé de ce bloc
  vector_clock   JSONB DEFAULT '{}',          -- { "user_uuid": version_int }

  -- Traçabilité
  created_by     UUID REFERENCES users(id),
  merged_by      UUID REFERENCES users(id),
  merged_at      TIMESTAMPTZ,
  rejected_by    UUID REFERENCES users(id),
  rejected_at    TIMESTAMPTZ,

  -- Métriques
  word_count     INTEGER DEFAULT 0,
  char_count     INTEGER DEFAULT 0,

  created_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_at     TIMESTAMPTZ DEFAULT NOW()
);

-- Index critiques pour les performances
CREATE INDEX idx_blocks_document   ON document_blocks(document_id, position);
CREATE INDEX idx_blocks_status     ON document_blocks(document_id, status);
CREATE INDEX idx_blocks_type       ON document_blocks(document_id, type);

-- Activer Realtime sur cette table
ALTER TABLE document_blocks REPLICA IDENTITY FULL;
```

### Format du champ `content` (JSONB)

```json
{
  "prosemirror": {
    "type": "paragraph",
    "content": [
      {
        "type": "text",
        "text": "Le matin arriva sans prévenir, comme il en avait"
      },
      {
        "type": "text",
        "text": " l'habitude",
        "marks": [{ "type": "em" }]
      },
      {
        "type": "text",
        "text": " dans cette forêt."
      }
    ]
  },
  "meta": {
    "word_count": 9,
    "char_count": 51,
    "import_source": "docx",
    "import_paragraph_index": 42
  }
}
```

### Format du champ `vector_clock` (JSONB)

```json
{
  "uuid-aminata": 3,
  "uuid-kouam":   7,
  "uuid-doriane": 1
}
```

Chaque entier représente le nombre d'opérations effectuées par cet utilisateur sur ce bloc.
Y.js utilise ce vecteur pour résoudre les conflits d'édition simultanée.

---

## 8. Table `block_operations`

Journal complet de chaque modification. Permet de rejouer l'historique à n'importe quelle seconde.

```sql
CREATE TABLE block_operations (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  block_id       UUID NOT NULL REFERENCES document_blocks(id) ON DELETE CASCADE,
  document_id    UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  user_id        UUID NOT NULL REFERENCES users(id),

  -- Type d'opération
  op_type        TEXT NOT NULL
                 CHECK (op_type IN (
                   'insert',    -- insertion de texte
                   'delete',    -- suppression de texte
                   'style',     -- changement de style (gras, italique...)
                   'move',      -- déplacement du bloc
                   'split',     -- découpage d'un bloc en deux
                   'merge_blocks', -- fusion de deux blocs
                   'image_replace' -- remplacement d'une image
                 )),

  -- Données de l'opération (format Y.js)
  op_data        JSONB NOT NULL,
  /*
    Exemples :
    insert : { "from": 12, "text": "bonjour", "marks": [] }
    delete : { "from": 5, "to": 11 }
    style  : { "from": 0, "to": 8, "mark": "bold", "action": "add" }
    move   : { "old_position": 3, "new_position": 7 }
  */

  -- Vecteur d'horloge au moment de l'opération
  vector_clock   JSONB NOT NULL DEFAULT '{}',

  -- Contexte
  session_id     UUID,                        -- session de travail de l'utilisateur
  is_offline     BOOLEAN DEFAULT false,       -- créé hors ligne, appliqué plus tard
  applied_at     TIMESTAMPTZ DEFAULT NOW(),   -- horodatage précis ms
  synced_at      TIMESTAMPTZ,                 -- quand synchronisé depuis offline

  created_at     TIMESTAMPTZ DEFAULT NOW()
);

-- Index pour rejouer l'historique d'un bloc dans l'ordre
CREATE INDEX idx_ops_block_time ON block_operations(block_id, applied_at);
CREATE INDEX idx_ops_document   ON block_operations(document_id, applied_at);
CREATE INDEX idx_ops_user       ON block_operations(user_id, applied_at);
CREATE INDEX idx_ops_offline    ON block_operations(is_offline, synced_at)
             WHERE is_offline = true;
```

---

## 9. Table `block_proposals`

Les modifications "Proposed" soumises par les relecteurs, en attente d'approbation.

```sql
CREATE TABLE block_proposals (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  block_id         UUID NOT NULL REFERENCES document_blocks(id) ON DELETE CASCADE,
  document_id      UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  proposed_by      UUID NOT NULL REFERENCES users(id),

  -- Contenu avant et après
  content_before   JSONB NOT NULL,            -- état du bloc avant la proposition
  content_after    JSONB NOT NULL,            -- état proposé
  diff_summary     TEXT,                      -- résumé lisible ex: "ressemble → ressemblait"

  -- Justification du relecteur
  justification    TEXT,

  -- Statut de la proposition
  status           TEXT NOT NULL DEFAULT 'pending'
                   CHECK (status IN ('pending', 'approved', 'rejected', 'superseded')),
  -- 'superseded' = une autre proposition plus récente l'a remplacée

  -- Décision du chef de projet
  reviewed_by      UUID REFERENCES users(id),
  reviewed_at      TIMESTAMPTZ,
  review_comment   TEXT,                      -- motif du rejet éventuel

  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

-- Index pour récupérer les propositions en attente d'un document
CREATE INDEX idx_proposals_document ON block_proposals(document_id, status);
CREATE INDEX idx_proposals_block    ON block_proposals(block_id, status);

-- Activer Realtime
ALTER TABLE block_proposals REPLICA IDENTITY FULL;
```

---

## 10. Table `block_comments`

Commentaires ancrés sur un bloc précis, à une position précise dans le texte.

```sql
CREATE TABLE block_comments (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  block_id      UUID NOT NULL REFERENCES document_blocks(id) ON DELETE CASCADE,
  document_id   UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  user_id       UUID NOT NULL REFERENCES users(id),
  parent_id     UUID REFERENCES block_comments(id), -- NULL = commentaire racine, sinon = réponse

  -- Ancrage dans le texte
  anchor_text   TEXT,                         -- texte sur lequel le commentaire est ancré
  anchor_start  INTEGER,                      -- position caractère de début
  anchor_end    INTEGER,                      -- position caractère de fin

  -- Contenu
  content       TEXT NOT NULL,

  -- Statut
  status        TEXT NOT NULL DEFAULT 'open'
                CHECK (status IN ('open', 'resolved')),
  resolved_by   UUID REFERENCES users(id),
  resolved_at   TIMESTAMPTZ,

  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Index pour récupérer les commentaires d'un bloc
CREATE INDEX idx_comments_block    ON block_comments(block_id, status);
CREATE INDEX idx_comments_document ON block_comments(document_id, status);
CREATE INDEX idx_comments_thread   ON block_comments(parent_id)
             WHERE parent_id IS NOT NULL;

-- Activer Realtime
ALTER TABLE block_comments REPLICA IDENTITY FULL;
```

---

## 11. Table `document_versions`

Points de sauvegarde nommés (manuels) et automatiques (toutes les 10 min).

```sql
CREATE TABLE document_versions (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  document_id     UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,

  -- Snapshot de tous les blocs à cet instant
  blocks_snapshot JSONB NOT NULL,
  /*
    Format :
    [
      { "block_id": "uuid", "position": 1, "type": "heading1", "content": {...}, "status": "merged" },
      { "block_id": "uuid", "position": 2, "type": "paragraph", "content": {...}, "status": "merged" },
      ...
    ]
  */

  -- Métadonnées de la version
  version_name    TEXT,                       -- ex: "Version finale", "Avant relecture Doriane"
  is_auto         BOOLEAN DEFAULT false,      -- true = snapshot automatique toutes les 10 min
  total_blocks    INTEGER,
  merged_blocks   INTEGER,
  word_count      INTEGER,

  created_by      UUID REFERENCES users(id),
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_versions_document ON document_versions(document_id, created_at DESC);
```

---

## 12. Table `notifications`

Alertes envoyées aux utilisateurs (nouvelle proposition, commentaire, mention, etc.).

```sql
CREATE TABLE notifications (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  document_id  UUID REFERENCES documents(id) ON DELETE CASCADE,
  block_id     UUID REFERENCES document_blocks(id) ON DELETE SET NULL,

  type         TEXT NOT NULL
               CHECK (type IN (
                 'new_proposal',      -- nouvelle proposition soumise
                 'proposal_approved', -- votre proposition a été approuvée
                 'proposal_rejected', -- votre proposition a été rejetée
                 'new_comment',       -- nouveau commentaire sur un bloc
                 'comment_reply',     -- réponse à votre commentaire
                 'session_invite',    -- invitation à rejoindre une session
                 'session_closed',    -- session clôturée
                 'mention',           -- vous avez été mentionné
                 'sync_complete'      -- synchronisation offline complète
               )),

  title        TEXT NOT NULL,
  body         TEXT,
  data         JSONB DEFAULT '{}',    -- données additionnelles contextuelles
  is_read      BOOLEAN DEFAULT false,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_notifs_user   ON notifications(user_id, is_read, created_at DESC);
CREATE INDEX idx_notifs_unread ON notifications(user_id) WHERE is_read = false;

-- Activer Realtime pour les notifications live
ALTER TABLE notifications REPLICA IDENTITY FULL;
```

---

## 13. Migrations — Ordre d'exécution

```
001_extensions.sql
002_users.sql
003_book_projects.sql
004_project_members.sql
005_documents.sql
006_document_collaborators.sql
007_document_sessions.sql
008_document_blocks.sql          ← table centrale
009_block_operations.sql
010_block_proposals.sql
011_block_comments.sql
012_document_versions.sql
013_notifications.sql
014_rls_policies.sql             ← toutes les policies RLS
015_realtime_enable.sql          ← activation Realtime
016_functions.sql                ← fonctions PostgreSQL
017_triggers.sql                 ← triggers automatiques
```

---

## 14. Row Level Security (RLS)

### Politique générale par table

```sql
-- ════════════════════════════════════════════
-- document_blocks
-- ════════════════════════════════════════════

ALTER TABLE document_blocks ENABLE ROW LEVEL SECURITY;

-- Lecture : membres du projet
CREATE POLICY "blocks_select" ON document_blocks FOR SELECT
USING (
  document_id IN (
    SELECT id FROM documents
    WHERE project_id IN (
      SELECT project_id FROM project_members WHERE user_id = auth.uid()
    )
  )
);

-- Insertion : collaborateurs de la session
CREATE POLICY "blocks_insert" ON document_blocks FOR INSERT
WITH CHECK (
  document_id IN (
    SELECT document_id FROM document_collaborators WHERE user_id = auth.uid()
  )
);

-- Mise à jour : collaborateurs avec permission selon le statut
CREATE POLICY "blocks_update" ON document_blocks FOR UPDATE
USING (
  -- Un correcteur peut mettre en "proposed"
  -- Seul un éditeur/admin peut mettre en "merged"
  document_id IN (
    SELECT document_id FROM document_collaborators
    WHERE user_id = auth.uid()
  )
);

-- ════════════════════════════════════════════
-- block_proposals
-- ════════════════════════════════════════════

ALTER TABLE block_proposals ENABLE ROW LEVEL SECURITY;

-- Lecture : membres du projet
CREATE POLICY "proposals_select" ON block_proposals FOR SELECT
USING (
  document_id IN (
    SELECT id FROM documents
    WHERE project_id IN (
      SELECT project_id FROM project_members WHERE user_id = auth.uid()
    )
  )
);

-- Insertion : correcteurs et rédacteurs en chef uniquement
CREATE POLICY "proposals_insert" ON block_proposals FOR INSERT
WITH CHECK (
  proposed_by = auth.uid()
  AND document_id IN (
    SELECT document_id FROM document_collaborators
    WHERE user_id = auth.uid()
    AND (permissions->>'can_propose')::boolean = true
  )
);

-- Approbation/Rejet : éditeurs et admins uniquement
CREATE POLICY "proposals_update" ON block_proposals FOR UPDATE
USING (
  reviewed_by = auth.uid()
  AND document_id IN (
    SELECT document_id FROM document_collaborators
    WHERE user_id = auth.uid()
    AND (permissions->>'can_merge')::boolean = true
  )
);

-- ════════════════════════════════════════════
-- block_comments
-- ════════════════════════════════════════════

ALTER TABLE block_comments ENABLE ROW LEVEL SECURITY;

-- Lecture : membres du projet
CREATE POLICY "comments_select" ON block_comments FOR SELECT
USING (
  document_id IN (
    SELECT id FROM documents
    WHERE project_id IN (
      SELECT project_id FROM project_members WHERE user_id = auth.uid()
    )
  )
);

-- Insertion : tout collaborateur invité
CREATE POLICY "comments_insert" ON block_comments FOR INSERT
WITH CHECK (
  user_id = auth.uid()
  AND document_id IN (
    SELECT document_id FROM document_collaborators WHERE user_id = auth.uid()
  )
);

-- Mise à jour : rédacteur en chef du commentaire ou éditeur (pour résoudre)
CREATE POLICY "comments_update" ON block_comments FOR UPDATE
USING (
  user_id = auth.uid()
  OR resolved_by = auth.uid()
);

-- ════════════════════════════════════════════
-- notifications
-- ════════════════════════════════════════════

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Chaque utilisateur ne voit que ses propres notifications
CREATE POLICY "notifs_select" ON notifications FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "notifs_update" ON notifications FOR UPDATE
USING (user_id = auth.uid());
```

---

## 15. Fonctions PostgreSQL utiles

```sql
-- ════════════════════════════════════════════
-- Calcul automatique de la progression d'un document
-- ════════════════════════════════════════════
CREATE OR REPLACE FUNCTION get_document_progress(doc_id UUID)
RETURNS TABLE (
  total_blocks    INTEGER,
  merged_blocks   INTEGER,
  proposed_blocks INTEGER,
  draft_blocks    INTEGER,
  progress_pct    NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::INTEGER AS total_blocks,
    COUNT(*) FILTER (WHERE status = 'merged')::INTEGER AS merged_blocks,
    COUNT(*) FILTER (WHERE status = 'proposed')::INTEGER AS proposed_blocks,
    COUNT(*) FILTER (WHERE status = 'draft')::INTEGER AS draft_blocks,
    ROUND(
      COUNT(*) FILTER (WHERE status = 'merged') * 100.0 / NULLIF(COUNT(*), 0),
      1
    ) AS progress_pct
  FROM document_blocks
  WHERE document_id = doc_id;
END;
$$ LANGUAGE plpgsql;


-- ════════════════════════════════════════════
-- Merger un bloc (approuver une proposition)
-- ════════════════════════════════════════════
CREATE OR REPLACE FUNCTION merge_block(
  p_block_id    UUID,
  p_proposal_id UUID,
  p_user_id     UUID
) RETURNS void AS $$
BEGIN
  -- 1. Appliquer le contenu proposé sur le bloc
  UPDATE document_blocks
  SET
    content    = (SELECT content_after FROM block_proposals WHERE id = p_proposal_id),
    status     = 'merged',
    merged_by  = p_user_id,
    merged_at  = NOW(),
    updated_at = NOW()
  WHERE id = p_block_id;

  -- 2. Marquer la proposition comme approuvée
  UPDATE block_proposals
  SET
    status      = 'approved',
    reviewed_by = p_user_id,
    reviewed_at = NOW()
  WHERE id = p_proposal_id;

  -- 3. Mettre à jour le compteur du document
  UPDATE documents
  SET merged_blocks = (
    SELECT COUNT(*) FROM document_blocks
    WHERE document_id = (SELECT document_id FROM document_blocks WHERE id = p_block_id)
    AND status = 'merged'
  )
  WHERE id = (SELECT document_id FROM document_blocks WHERE id = p_block_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ════════════════════════════════════════════
-- Nettoyage des opérations anciennes (pg_cron)
-- ════════════════════════════════════════════
CREATE OR REPLACE FUNCTION cleanup_old_operations() RETURNS void AS $$
BEGIN
  -- Supprimer les opérations de plus de 30 jours
  -- quand une version snapshot existe pour ce document
  DELETE FROM block_operations
  WHERE created_at < NOW() - INTERVAL '30 days'
  AND document_id IN (SELECT DISTINCT document_id FROM document_versions);
END;
$$ LANGUAGE plpgsql;

-- Planifier via pg_cron (activer l'extension dans Supabase Dashboard)
SELECT cron.schedule('cleanup-ops', '0 3 * * *', 'SELECT cleanup_old_operations()');


-- ════════════════════════════════════════════
-- Nettoyage des sessions offline inactives
-- ════════════════════════════════════════════
CREATE OR REPLACE FUNCTION cleanup_stale_sessions() RETURNS void AS $$
BEGIN
  UPDATE document_sessions
  SET is_online = false
  WHERE last_ping_at < NOW() - INTERVAL '1 minute'
  AND is_online = true;
END;
$$ LANGUAGE plpgsql;

SELECT cron.schedule('cleanup-sessions', '* * * * *', 'SELECT cleanup_stale_sessions()');
```

---

## 16. Triggers automatiques

```sql
-- ════════════════════════════════════════════
-- Mise à jour automatique de updated_at
-- ════════════════════════════════════════════
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_blocks_updated_at
  BEFORE UPDATE ON document_blocks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_proposals_updated_at
  BEFORE UPDATE ON block_proposals
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();


-- ════════════════════════════════════════════
-- Calcul automatique word_count sur les blocs
-- ════════════════════════════════════════════
CREATE OR REPLACE FUNCTION compute_block_metrics()
RETURNS TRIGGER AS $$
DECLARE
  raw_text TEXT;
BEGIN
  -- Extraire le texte brut du JSON ProseMirror
  SELECT string_agg(elem->>'text', ' ')
  INTO raw_text
  FROM jsonb_array_elements(NEW.content->'prosemirror'->'content') AS elem
  WHERE elem->>'type' = 'text';

  NEW.char_count  = COALESCE(length(raw_text), 0);
  NEW.word_count  = COALESCE(array_length(string_to_array(trim(raw_text), ' '), 1), 0);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_block_metrics
  BEFORE INSERT OR UPDATE OF content ON document_blocks
  FOR EACH ROW EXECUTE FUNCTION compute_block_metrics();


-- ════════════════════════════════════════════
-- Notification automatique lors d'une nouvelle proposition
-- ════════════════════════════════════════════
CREATE OR REPLACE FUNCTION notify_on_proposal()
RETURNS TRIGGER AS $$
BEGIN
  -- Notifier tous les éditeurs du document
  INSERT INTO notifications (user_id, document_id, block_id, type, title, body, data)
  SELECT
    dc.user_id,
    NEW.document_id,
    NEW.block_id,
    'new_proposal',
    'Nouvelle proposition',
    (SELECT full_name FROM users WHERE id = NEW.proposed_by)
      || ' a proposé une modification.',
    jsonb_build_object('proposal_id', NEW.id, 'diff', NEW.diff_summary)
  FROM document_collaborators dc
  WHERE dc.document_id = NEW.document_id
    AND dc.user_id != NEW.proposed_by
    AND (dc.permissions->>'can_merge')::boolean = true;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_notify_proposal
  AFTER INSERT ON block_proposals
  FOR EACH ROW EXECUTE FUNCTION notify_on_proposal();
```

---

## 17. Activation Realtime

```sql
-- Tables qui nécessitent Realtime (WebSocket live)
ALTER TABLE document_blocks    REPLICA IDENTITY FULL;
ALTER TABLE block_proposals    REPLICA IDENTITY FULL;
ALTER TABLE block_comments     REPLICA IDENTITY FULL;
ALTER TABLE document_sessions  REPLICA IDENTITY FULL;
ALTER TABLE notifications      REPLICA IDENTITY FULL;

-- Dans le Dashboard Supabase :
-- Database > Replication > activer pour chaque table ci-dessus
```

---

## 18. Supabase Storage — Buckets

```sql
-- Bucket : sources (fichiers originaux uploadés)
-- Bucket : exports (fichiers générés EPUB/PDF/DOCX)
-- Bucket : images (images extraites des documents)
-- Bucket : avatars (photos de profil utilisateurs)

-- Exemple de policy Storage pour 'sources'
CREATE POLICY "sources_insert" ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'sources'
  AND auth.uid() IN (
    SELECT user_id FROM project_members
  )
);

CREATE POLICY "sources_select" ON storage.objects FOR SELECT
USING (
  bucket_id = 'sources'
  AND auth.uid() IN (
    SELECT user_id FROM project_members
  )
);
```

---

## 19. Récapitulatif des tables

| Table | Lignes estimées | Realtime | RLS | Index clés |
|-------|----------------|----------|-----|------------|
| `users` | ~100 | ❌ | ✅ | `email` |
| `book_projects` | ~50 | ❌ | ✅ | `created_by` |
| `project_members` | ~500 | ❌ | ✅ | `project_id, user_id` |
| `documents` | ~200 | ❌ | ✅ | `project_id, status` |
| `document_collaborators` | ~1 000 | ❌ | ✅ | `document_id, user_id` |
| `document_sessions` | ~20 live | ✅ | ✅ | `document_id, is_online` |
| `document_blocks` | ~50 000 | ✅ | ✅ | `document_id, position, status` |
| `block_operations` | ~500 000 | ❌ | ✅ | `block_id, applied_at` |
| `block_proposals` | ~5 000 | ✅ | ✅ | `document_id, status` |
| `block_comments` | ~10 000 | ✅ | ✅ | `block_id, status` |
| `document_versions` | ~1 000 | ❌ | ✅ | `document_id, created_at` |
| `notifications` | ~20 000 | ✅ | ✅ | `user_id, is_read` |

---

*Schéma de base de données v2.0 — bcm-gest-react · Architecture Atomique · Mars 2025*

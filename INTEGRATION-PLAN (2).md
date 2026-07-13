# 🔀 Plan d'Intégration — Correcteur Atomique dans BCM-GEST
### Greffer la nouvelle architecture sans casser l'existant · v1.0

---

## Diagnostic — Ce qui existe vs ce qu'on ajoute

### ✅ Ce qui existe et qu'on NE TOUCHE PAS

```
raw_files           → intact
transcriptions      → intact
transcription_raw_files → intact
book_project_transcriptions → intact
audit_logs          → intact
workflow_actions    → intact
Tous les triggers existants (migrations 008) → intacts
Toutes les fonctions de validation (migration 010) → intactes
get_raw_file_lineage() → intact

Composants existants :
  MediaLibrary/     → intact
  Transcription/    → intact
  Workflow/         → intact
  Users/            → intact
  Reports/          → intact
  AudioPlayer.tsx   → intact
  PDFViewer.tsx     → intact
  TranscriptionEditor.tsx → intact
  BulkImportModal.tsx → intact
  DiffViewer.tsx    → intact (réutilisé par BlockDiffModal)

Modales Documents existantes (intactes) :
  modals/index.ts         → intact (export centralisé)
  modals/EditModal.tsx    → intact
    (formulaire création/édition + sélecteur MediaLibrary + FileUpload)
  modals/HistoryModal.tsx → intact
    (historique versions, comparer via DiffViewer, restaurer)
  modals/StatusModal.tsx  → intact
    (changement statut en masse)
  modals/AssigneeModal.tsx → intact
    (réassignation en masse)

Hooks existants :
  useAuth.ts        → intact
  useFileValidation.ts → intact
  useWorkflowAutomation.ts → intact (on y AJOUTE une fonction)
  useLineage.ts     → intact
  useImportWorkflow.ts → intact
  useDocumentMediaSync.ts → intact
  useDiff.ts        → intact (réutilisé par BlockDiffModal)
  useFileUpload.ts  → intact
  useMediaLibrary/  → intact
```

---

### ⚠️ Ce qui existe et qu'on ÉTEND (sans réécrire)

```
TABLE users
  → Ajouter : role 'corrector' | 'reviewer' | 'redacteur_chef' (les rôles existants restent)
  → Ajouter : timezone, preferred_lang
  → Les colonnes can_import, can_review, etc. restent

TABLE book_projects
  → Ajouter : stage (reflète le workflow_step existant)

TABLE proofreading_v2
  → C'est ici qu'on greffe le correcteur collaboratif
  → Ajouter : colonne session_document_id FK → documents (nouveau)

TABLE documents
  → Ajouter : colonnes source_format, source_path, total_blocks,
               merged_blocks, started_at, deadline, completed_at
  → La table existante devient la "session de correction"

TABLE document_versions
  → Ajouter : blocks_snapshot JSONB (pour les snapshots atomiques)
  → Les colonnes existantes (version_number, content, etc.) restent

Composant Documents.tsx
  → Ajouter le mode "Session de correction" avec CollabEditor
  → Le mode tableau existant reste intact

Hook useDocuments.ts
  → Ajouter les fonctions liées aux blocs
  → Les fonctions existantes restent
```

---

### 🆕 Ce qu'on CRÉE entièrement (nouvelles tables)

```
document_blocks         → nouvelle
block_operations        → nouvelle
block_proposals         → nouvelle
block_comments          → nouvelle
document_collaborators  → nouvelle
document_sessions       → nouvelle

Nouveaux composants :
  Documents/CollabEditor.tsx
  Documents/BlockEditor.tsx
  Documents/BlockProposed.tsx
  Documents/DocumentPreview.tsx
  Documents/DynamicSummary.tsx
  Documents/panels/ProposalsPanel.tsx
  Documents/panels/ActivityPanel.tsx
  Documents/panels/OfflinePanel.tsx
  Documents/modals/BlockHistoryModal.tsx
  Documents/modals/BlockDiffModal.tsx
  Documents/modals/SessionCloseModal.tsx

Nouveaux hooks :
  hooks/useDocumentBlocks.ts
  hooks/useBlockProposals.ts
  hooks/useBlockComments.ts
  hooks/useCollabSession.ts
  hooks/useOfflineSync.ts

Nouvelles Edge Functions Supabase :
  supabase/functions/convert-to-html/
  supabase/functions/generate-export/
  supabase/functions/analyze-docx-quality/
```

---

## Le point de greffe — Comment tout s'articule

Le correcteur collaboratif se greffe sur `proofreading_v2`.
C'est le seul point de contact entre l'ancien et le nouveau.

```
WORKFLOW EXISTANT (intact)
─────────────────────────────────────────────────────
raw_files
  └── transcriptions
        └── book_projects
              └── proofreading_v1
                    └── proofreading_v2  ← POINT DE GREFFE
                                │
                                │ proofreading_v2.session_document_id
                                │
                    ┌───────────▼───────────────────┐
                    │  NOUVEAU : documents (session) │
                    │    └── document_blocks         │
                    │          ├── block_operations  │
                    │          ├── block_proposals   │
                    │          └── block_comments    │
                    └───────────────────────────────┘

WORKFLOW ENRICHI
─────────────────────────────────────────────────────
... → relecture_2_en_cours → [CORRECTEUR COLLABORATIF] → relecture_2_validé
```

Concrètement :
- Quand `proofreading_v2` est créé → l'admin peut lancer une session de correction
- La session crée un `document` avec `type = 'correction'`, `stage = 'proofreading_2'`
- `proofreading_v2.session_document_id` pointe vers ce document
- À la clôture de la session → `proofreading_v2.status = 'relecture_2_validé'`
- Le trigger existant se déclenche normalement → workflow continue

---

## Migrations — Ordre et stratégie

### Migrations à créer (dans l'ordre)

```
011_extend_users.sql
  → Ajouter : timezone, preferred_lang
  → Modifier le CHECK de role pour ajouter 'corrector' et 'reviewer'
  → Compatible avec les données existantes (DEFAULT sur les nouvelles colonnes)

012_extend_book_projects.sql
  → Ajouter : stage TEXT (calculé depuis workflow_step existant)
  → Ajouter une fonction de migration des données existantes

013_extend_proofreading_v2.sql
  → Ajouter : session_document_id UUID REFERENCES documents(id)
  → Nullable (les R2 existantes n'ont pas de session)

014_extend_documents.sql
  → Ajouter les colonnes manquantes sur la table documents existante :
    source_format, source_path, source_size,
    total_blocks, merged_blocks,
    started_at, deadline, completed_at
  → Toutes nullable pour ne pas affecter les lignes existantes

015_extend_document_versions.sql
  → Ajouter : blocks_snapshot JSONB (nullable)
  → is_auto BOOLEAN DEFAULT false
  → Les colonnes existantes restent

016_create_document_blocks.sql
  → Création complète (nouvelle table)

017_create_block_operations.sql
  → Création complète (nouvelle table)

018_create_block_proposals.sql
  → Création complète (nouvelle table)

019_create_block_comments.sql
  → Création complète (nouvelle table)

020_create_document_collaborators.sql
  → Création complète (nouvelle table)

021_create_document_sessions.sql
  → Création complète (nouvelle table)

022_create_notifications.sql
  → Création complète (nouvelle table)

023_rls_new_tables.sql
  → Policies RLS pour toutes les nouvelles tables

024_realtime_enable.sql
  → Activer Realtime sur les nouvelles tables uniquement

025_new_functions.sql
  → merge_block()
  → get_document_progress()
  → cleanup_old_operations()
  → cleanup_stale_sessions()

026_new_triggers.sql
  → compute_block_metrics()
  → notify_on_proposal()
  → update_updated_at() sur nouvelles tables
```

---

## Migration 011 — Extension users (détail)

```sql
-- Ajout sans casser l'existant
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS timezone TEXT DEFAULT 'Africa/Douala',
  ADD COLUMN IF NOT EXISTS preferred_lang TEXT DEFAULT 'fr';

-- Étendre les rôles acceptés
-- L'ancien CHECK était : role IN ('user', 'editor', 'admin')
-- Le nouveau :
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check
  CHECK (role IN ('user', 'editor', 'admin', 'corrector', 'reviewer', 'redacteur_chef'));

-- Les utilisateurs existants conservent leur rôle intact
-- 'user' → peut être promu 'corrector', 'reviewer' ou 'redacteur_chef' par l'admin
```

---

## Migration 014 — Extension documents (détail)

```sql
-- La table documents existante :
-- id, title, type, source, status, workflow_step, progress,
-- content, file_url, assigned_to, tags, user_id, media_file_id,
-- created_at, updated_at

-- On ajoute uniquement ce qui manque
ALTER TABLE documents
  ADD COLUMN IF NOT EXISTS source_format  TEXT
    CHECK (source_format IN ('docx', 'md', 'epub', 'odt')),
  ADD COLUMN IF NOT EXISTS source_path    TEXT,
  ADD COLUMN IF NOT EXISTS source_size    INTEGER,
  ADD COLUMN IF NOT EXISTS total_blocks   INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS merged_blocks  INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS started_at     TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS deadline       TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS completed_at   TIMESTAMPTZ;

-- Étendre les types acceptés
-- L'ancien type était libre (TEXT)
-- On ajoute une contrainte souple
ALTER TABLE documents ADD CONSTRAINT documents_type_check
  CHECK (type IN (
    'correction', 'proofreading', 'translation', 'review',
    -- anciens types existants (à adapter selon vos données réelles)
    'transcription', 'document', 'report', NULL
  ));
```

---

## Conflict check — Tables avec noms identiques

### ⚠️ `documents` — collision directe

La table `documents` existante a une structure différente du schéma qu'on avait prévu.

| Colonne | Existant | Prévu | Action |
|---------|----------|-------|--------|
| `id` | ✅ UUID | ✅ UUID | Rien |
| `title` | ✅ TEXT | ✅ TEXT | Rien |
| `type` | ✅ TEXT libre | TEXT avec CHECK | Ajouter CHECK souple |
| `status` | ✅ TEXT | ✅ TEXT | Rien |
| `content` | ✅ TEXT | — | Garder, inutilisé pour blocs |
| `user_id` | ✅ UUID | `created_by` UUID | Garder `user_id`, alias dans les queries |
| `workflow_step` | ✅ INT | — | Garder, utile pour le workflow |
| `progress` | ✅ INT | — | Garder |
| `assigned_to` | ✅ TEXT | — | Garder (utilisé par AssigneeModal) |
| `tags` | ✅ TEXT[] | — | Garder (utilisé par EditModal) |
| `source_format` | ❌ manquant | ✅ TEXT | Ajouter |
| `total_blocks` | ❌ manquant | ✅ INT | Ajouter |
| `merged_blocks` | ❌ manquant | ✅ INT | Ajouter |
| `started_at` | ❌ manquant | ✅ TIMESTAMPTZ | Ajouter |

### ⚠️ `document_versions` — collision directe

| Colonne | Existant | Prévu | Action |
|---------|----------|-------|--------|
| `id` | ✅ | ✅ | Rien |
| `document_id` | ✅ | ✅ | Rien |
| `version_number` | ✅ INT | — | Garder (utilisé par HistoryModal) |
| `content` | ✅ TEXT | — | Garder (diff via DiffViewer + useDiff) |
| `restored_from_version` | ✅ UUID | — | Garder (utilisé par HistoryModal) |
| `restoration_reason` | ✅ TEXT | — | Garder |
| `blocks_snapshot` | ❌ | ✅ JSONB | Ajouter |
| `is_auto` | ❌ | ✅ BOOLEAN | Ajouter |
| `created_by` | ✅ UUID | ✅ UUID | Rien |

### ✅ `users` — compatible

Vos colonnes `can_import`, `can_review`, etc. sont plus granulaires que notre système de rôles. Les deux coexistent — les colonnes booléennes restent pour les permissions fines, le `role` pour la catégorie.

### ✅ `book_projects` — compatible

Votre table a `workflow_step` et `progress`. On ajoute juste `stage` TEXT comme alias sémantique de `workflow_step`.

---

## Nouveaux hooks — Intégration avec l'existant

### Ce qui change dans useDocuments.ts

```typescript
// AVANT (existant — ne pas toucher)
const {
  documents,
  createDocument,
  updateDocumentWithVersioning,
  fetchDocumentVersions,
  restoreDocumentVersion,
  deleteDocuments,
  advanceWorkflow,
  filterDocuments,
  fetchDocuments
} = useDocuments();

// APRÈS — on étend avec de nouvelles fonctions
const {
  // ← tout ce qui précède reste identique →

  // Nouvelles fonctions pour le correcteur collaboratif
  launchCorrectionSession,    // crée les blocs depuis le HTML converti
  closeCorrectionSession,     // clôture + déclenche relecture_2_validé
  getCorrectionProgress,      // progression globale des blocs
} = useDocuments();
```

### Hooks existants réutilisés sans modification

```typescript
// useDiff.ts — réutilisé par BlockDiffModal pour comparer deux états de bloc
// useFileUpload.ts — réutilisé par l'upload du .docx source dans EditModal
// Ces hooks ne changent pas, ils sont simplement appelés dans les nouveaux composants
```

### Nouveau hook useDocumentBlocks.ts

```typescript
// Hook dédié aux blocs — ne remplace pas useDocuments
const {
  blocks,
  loading,
  updateBlockStatus,    // draft → proposed → merged
  reorderBlock,
  getBlockHistory,
} = useDocumentBlocks(documentId);
```

### Nouveau hook useCollabSession.ts

```typescript
// Gestion de la session collaborative
const {
  collaborators,        // qui est connecté
  myColor,             // couleur de curseur assignée
  joinSession,
  leaveSession,
  updateCursorPosition,
} = useCollabSession(documentId);
```

---

## Modification de Documents.tsx — Stratégie

Le composant `Documents.tsx` existant gère le CRUD des documents avec ses 4 modales (`EditModal`, `HistoryModal`, `StatusModal`, `AssigneeModal`). On lui ajoute un **mode** supplémentaire sans toucher le reste.

```typescript
// Documents.tsx — AVANT (existant)
// Mode tableau avec filtres, CRUD, versioning, DiffViewer

// Documents.tsx — APRÈS
// On ajoute un state : isCollabMode: boolean

{!isCollabMode && (
  // ← tout le code existant, intact →
  <DocumentsTable
    documents={documents}
    onEdit={...}
    onDelete={...}
    onViewVersions={...}
  />
)}

{isCollabMode && selectedDocument?.type === 'correction' && (
  // ← nouveau code du correcteur collaboratif →
  <CorrectionEditor
    document={selectedDocument}
    onClose={() => setIsCollabMode(false)}
  />
)}
```

Le bouton de bascule apparaît uniquement quand le document sélectionné
est de type `correction` et que son statut est `in_review`.

---

## Nouveau composant CorrectionEditor.tsx

C'est le wrapper du correcteur collaboratif.
Il remplace l'ancien `CollabEditor.tsx` prévu dans l'archi initiale.
Il se charge de tout : split-screen, sommaire, panneau droit.

```
src/components/Documents/
├── Documents.tsx              ← modifié (ajout du mode correction)
├── CorrectionEditor.tsx       ← nouveau (wrapper principal)
│   ├── DynamicSummary.tsx     ← nouveau (sommaire avec pastilles)
│   ├── BlocksEditor.tsx       ← nouveau (zone centrale des blocs)
│   │   ├── BlockDraft.tsx
│   │   ├── BlockProposed.tsx
│   │   ├── BlockMerged.tsx
│   │   ├── BlockLive.tsx
│   │   └── BlockImage.tsx
│   ├── RightPanel.tsx         ← nouveau (propositions + activité + offline)
│   └── CorrectionTopbar.tsx   ← nouveau (avatars, sync, export)
├── document.ts                ← modifié (nouveaux types)
├── DiffViewer.tsx             ← intact
├── FileUpload.tsx             ← intact
└── modals/
    ├── index.ts               ← intact (export centralisé)
    │
    │   — MODALES EXISTANTES (intactes) —
    ├── EditModal.tsx          ← intact (création/édition + sélecteur MediaLibrary + FileUpload)
    ├── HistoryModal.tsx       ← intact (historique versions + comparer/restaurer)
    ├── StatusModal.tsx        ← intact (changement statut en masse)
    ├── AssigneeModal.tsx      ← intact (réassignation en masse)
    │
    │   — NOUVELLES MODALES (à créer) —
    ├── BlockHistoryModal.tsx  ← nouveau (historique d'un bloc atomique)
    ├── BlockDiffModal.tsx     ← nouveau (comparaison deux états d'un bloc)
    └── SessionCloseModal.tsx  ← nouveau (clôture session + résumé stats)
```

---

## Dépendances à installer

```bash
# Y.js — CRDT pour la collaboration temps réel
npm install yjs y-supabase

# TipTap — extensions collaboration (TipTap 3.x déjà installé ✅)
npm install @tiptap/extension-collaboration
npm install @tiptap/extension-collaboration-cursor

# DOMPurify — sécuriser le HTML de l'aperçu
npm install dompurify
npm install @types/dompurify

# idb — IndexedDB wrapper pour le stockage offline
npm install idb
```

> ⚠️ Vous avez déjà `@tiptap/react@3.20.0` et `@tiptap/starter-kit@3.20.0`.
> Les extensions collaboration sont compatibles avec TipTap 3.x.

---

## Impact sur l'App.tsx existant

L'`App.tsx` existant utilise une navigation par onglets :

```
Dashboard | Documents | Transcription | Workflow | Users | Reports
```

Aucun changement sur la navigation.
Le correcteur collaboratif s'ouvre **dans** l'onglet Documents,
comme une vue détaillée d'un document — pas un nouvel onglet.

```typescript
// App.tsx — aucune modification requise
// La navigation par onglets reste identique
```

---

## Impact sur useWorkflowAutomation.ts

Une seule fonction à ajouter pour connecter la clôture de session
au trigger de workflow existant :

```typescript
// Dans useWorkflowAutomation.ts — AJOUTER uniquement
async closeCorrectionSession(proofreadingV2Id: string, documentId: string) {
  // 1. Clôturer la session de correction (nouveaux blocs)
  await supabase.from('documents')
    .update({ status: 'completed', completed_at: new Date().toISOString() })
    .eq('id', documentId);

  // 2. Déclencher la finalisation R2 existante
  // ← réutilise finalizeProofreadingV2() qui existe déjà →
  await this.finalizeProofreadingV2(proofreadingV2Id, exportedHtml, blockCount);
}
```

---

## Ordre d'implémentation recommandé

```
PHASE 1 — Fondations (sans toucher l'UI)
  Semaine 1
  ├── Appliquer migrations 011 à 015 (extensions des tables existantes)
  ├── Appliquer migrations 016 à 022 (nouvelles tables)
  ├── Appliquer migrations 023 à 026 (RLS, Realtime, fonctions, triggers)
  └── Installer les nouvelles dépendances (yjs, y-supabase, dompurify, idb)

PHASE 2 — Edge Functions
  Semaine 1-2
  ├── supabase/functions/convert-to-html/
  ├── supabase/functions/generate-export/
  └── supabase/functions/analyze-docx-quality/

PHASE 3 — Hooks
  Semaine 2
  ├── Étendre useDocuments.ts (nouvelles fonctions, existant intact)
  ├── Créer useDocumentBlocks.ts
  ├── Créer useBlockProposals.ts
  ├── Créer useBlockComments.ts
  ├── Créer useCollabSession.ts
  └── Créer useOfflineSync.ts

PHASE 4 — Composants UI
  Semaine 2-3
  ├── CorrectionTopbar.tsx
  ├── DynamicSummary.tsx
  ├── Blocs : BlockDraft, BlockProposed, BlockMerged, BlockLive, BlockImage
  ├── BlocksEditor.tsx (assemblage des blocs)
  ├── Panels : ProposalsPanel, ActivityPanel, OfflinePanel
  └── CorrectionEditor.tsx (assemblage final)

PHASE 5 — Intégration dans Documents.tsx
  Semaine 3
  ├── Ajouter isCollabMode state
  ├── Conditionner l'affichage (tableau OU correcteur)
  └── Ajouter le bouton "Lancer la correction" sur les documents R2

PHASE 6 — Tests et ajustements
  Semaine 3-4
  ├── Test sync entre deux navigateurs
  ├── Test offline/reconnexion CRDT
  ├── Test export EPUB/PDF/DOCX
  └── Test de la clôture de session → trigger workflow
```

---

## Checklist avant de commencer à coder

- [ ] Sauvegarder la base de données Supabase (export SQL)
- [ ] Créer une branche Git dédiée : `feature/collaborative-corrector`
- [ ] Vérifier que les migrations 000 à 010 sont toutes appliquées
- [ ] Installer les nouvelles dépendances npm
- [ ] Vérifier la compatibilité TipTap 3.x avec les extensions collaboration
- [ ] Activer pg_cron dans le Dashboard Supabase (Extensions)
- [ ] Créer le bucket Storage `sources` et `exports` dans Supabase

---

## Ce qu'on ne fait PAS (hors scope)

```
❌ Réécrire useAuth.ts
❌ Modifier les triggers existants (migrations 008)
❌ Toucher à MediaLibrary
❌ Modifier le flux transcription → book_projects → proofreading_v1
❌ Changer la navigation par onglets de App.tsx
❌ Modifier AudioPlayer.tsx ou PDFViewer.tsx
❌ Toucher aux fonctions de validation (migration 010)
❌ Modifier get_raw_file_lineage()
❌ Modifier les modales existantes : EditModal, HistoryModal, StatusModal, AssigneeModal
❌ Modifier useDiff.ts ou useFileUpload.ts (on les réutilise tels quels)
❌ Modifier TranscriptionEditor.tsx
```

---

*Plan d'intégration v1.1 — bcm-gest-react · Mars 2025 · Mis à jour depuis RECAP v2*

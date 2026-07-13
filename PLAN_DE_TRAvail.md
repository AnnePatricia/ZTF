# 📋 PLAN DE TRAVAIL — BCM-GEST
## Intégration du Correcteur Collaboratif Atomique
### Version validée — Mars 2025

---

## 🎯 OBJECTIF GLOBAL

Intégrer le **correcteur collaboratif atomique** (style Google Docs) dans BCM-GEST **sans casser l'existant**, en gérant la coexistence de **deux systèmes de rôles** :

1. **Rôles fonctionnels** (workflow existant) : Transcripteur, Créateur de projet, Relecteur 1, Relecteur 2
2. **Rôles techniques** (nouveau correcteur) : admin, editor, redacteur_chef, corrector, reviewer

---

## 📊 ÉTAT ACTUEL vs ÉTAT CIBLE

### ✅ Ce qui existe (NE DOIT PAS ÊTRE CASSÉ)

| Élément | Description | Statut |
|---------|-------------|--------|
| **Tables SQL** | `users`, `raw_files`, `transcriptions`, `book_projects`, `proofreading_v1`, `proofreading_v2`, `documents`, `document_versions` | ✅ Intact |
| **Triggers** | Migrations 008 (9 triggers d'automatisation) | ✅ Intact |
| **Fonctions** | `get_raw_file_lineage()`, validations (migration 010) | ✅ Intact |
| **Composants** | MediaLibrary, Transcription, Workflow, Users, Reports | ✅ Intact |
| **Hooks** | useAuth, useDocuments, useFileValidation, useWorkflowAutomation | ✅ Intact |
| **Modales** | EditModal, HistoryModal, StatusModal, AssigneeModal | ✅ Intact |
| **Rôles users** | `user`, `editor`, `admin` | ✅ Existant |

### 🆕 Ce qu'on crée (NOUVEAU)

| Élément | Description | Priorité |
|---------|-------------|----------|
| **Nouvelles tables** | `document_blocks`, `block_operations`, `block_proposals`, `block_comments`, `document_collaborators`, `document_sessions`, `notifications` | P0 |
| **Extensions tables** | `users` (timezone, lang), `documents` (champs session), `document_versions` (blocks_snapshot) | P0 |
| **Nouveaux rôles** | `redacteur_chef`, `corrector`, `reviewer` dans `users.role` | P0 |
| **Nouveaux hooks** | useDocumentBlocks, useBlockProposals, useBlockComments, useCollabSession, useOfflineSync | P1 |
| **Nouveaux composants** | CorrectionEditor, BlocksEditor, BlockEditor, DynamicSummary, RightPanel, etc. | P1 |
| **Edge Functions** | convert-to-html, generate-export, analyze-docx-quality | P2 |

---

## 🗓️ PHASAGE DU TRAVAIL

---

## PHASE 0 — PRÉPARATION (1-2 jours)

### Objectifs
- Sauvegarder l'existant
- Comprendre l'architecture actuelle
- Valider le plan avec l'équipe

### Tâches

| # | Tâche | Fichier(s) | Critère de validation |
|---|-------|------------|----------------------|
| 0.1 | Export SQL complet de la base Supabase | — | Fichier `.sql` généré |
| 0.2 | Créer branche Git `feature/collaborative-corrector` | — | Branche créée sur GitHub/GitLab |
| 0.3 | Vérifier migrations 000→010 appliquées | Supabase Dashboard | Toutes les tables existent |
| 0.4 | Lister les utilisateurs existants et leurs rôles | `SELECT email, role FROM users;` | Audit des rôles actuels |
| 0.5 | Documenter les permissions existantes (`can_import`, etc.) | RECAP.md | Section mise à jour |

### Livrables
- [ ] Backup SQL
- [ ] Branche Git créée
- [ ] Audit des rôles existants

---

## PHASE 1 — BACKEND : RÔLES & UTILISATEURS (3-4 jours)

### Objectifs
- Étendre le système de rôles pour supporter les deux systèmes
- Créer l'UI de gestion des rôles dans le module Users
- Permettre la promotion/demotion d'utilisateurs

### Tâches

#### 1.1 Migration SQL — Extension des rôles

| Fichier | Description | SQL à écrire |
|---------|-------------|--------------|
| `011_extend_users_roles.sql` | Ajouter `timezone`, `preferred_lang` + étendre CHECK des rôles | Voir ci-dessous |

```sql
-- Migration 011_extend_users_roles.sql

-- 1. Nouvelles colonnes (nullable pour compatibilité)
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS timezone TEXT DEFAULT 'Africa/Douala',
  ADD COLUMN IF NOT EXISTS preferred_lang TEXT DEFAULT 'fr';

-- 2. Étendre la contrainte CHECK des rôles
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;

ALTER TABLE users ADD CONSTRAINT users_role_check
  CHECK (role IN (
    -- Rôles existants (workflow)
    'user',
    'editor',
    'admin',
    -- NOUVEAUX rôles (correcteur collaboratif)
    'redacteur_chef',
    'corrector',
    'reviewer'
  ));

-- 3. Commentaire pour clarifier la coexistence
COMMENT ON COLUMN users.role IS '
  Rôles techniques (correcteur collaboratif) :
  - admin : super-utilisateur, tous droits
  - editor : chef de projet, peut clore les sessions
  - redacteur_chef : peut merger les propositions
  - corrector : peut proposer des modifications
  - reviewer : lecture seule, commentaires uniquement
  - user : rôle de base (workflow existant)
  
  Rôles fonctionnels (workflow existant) :
  Ce ne sont pas des rôles SQL mais des "casquettes" :
  - Transcripteur : importe raw_files, crée transcriptions
  - Créateur de projet : crée book_projects
  - Relecteur 1 : assigné à proofreading_v1
  - Relecteur 2 : assigné à proofreading_v2
';
```

#### 1.2 Module Users — UI de gestion des rôles

| Composant | Fichier | Description |
|-----------|---------|-------------|
| `UsersTable.tsx` | `src/components/Users/UsersTable.tsx` | Tableau des utilisateurs avec colonne "Rôle technique" |
| `RoleBadge.tsx` | `src/components/Users/RoleBadge.tsx` | Badge coloré par rôle (admin=rouge, editor=bleu, etc.) |
| `RoleEditModal.tsx` | `src/components/Users/modals/RoleEditModal.tsx` | Modal pour changer le rôle technique d'un utilisateur |
| `PermissionsPanel.tsx` | `src/components/Users/PermissionsPanel.tsx` | Panneau montrant les permissions détaillées (can_import, can_review, etc.) |

**Maquette UI :**
```
┌─────────────────────────────────────────────────────────────────┐
│  GESTION DES UTILISATEURS                                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │ Email              │ Rôle technique  │ Permissions       │ │
│  ├────────────────────┼─────────────────┼───────────────────┤ │
│  │ marie@edition.com  │ [editor ▼]      │ ☑ Import          │ │
│  │                    │                 │ ☑ Transcrire      │ │
│  │                    │                 │ ☑ Review          │ │
│  │                    │                 │ ☑ Edit            │ │
│  │                    │                 │ ☐ Delete          │ │
│  │                    │                 │ ☐ Manage users    │ │
│  ├────────────────────┼─────────────────┼───────────────────┤ │
│  │ kouam@edition.com  │ [corrector ▼]   │ ☑ Import          │ │
│  │                    │                 │ ☑ Transcrire      │ │
│  │                    │                 │ ☐ Review          │ │
│  └───────────────────────────────────────────────────────────┘ │
│                                                                 │
│  [Ajouter un utilisateur]                                       │
└─────────────────────────────────────────────────────────────────┘
```

#### 1.3 Hook — useUserRoles

| Fichier | Fonctionnalités |
|---------|-----------------|
| `src/hooks/useUserRoles.ts` | - `getAllUsers()`<br>- `updateUserRole(userId, newRole)`<br>- `getUserPermissions(userId)`<br>- `can(userId, action)` |

**Exemple d'usage :**
```typescript
const { users, updateUserRole, can } = useUserRoles();

// Changer le rôle technique
await updateUserRole('uuid-marie', 'redacteur_chef');

// Vérifier une permission
if (can(currentUser.id, 'merge_blocks')) {
  // Afficher le bouton "Approuver & Merger"
}
```

#### 1.4 Matrice des permissions

| Action | admin | editor | redacteur_chef | corrector | reviewer | user |
|--------|-------|--------|----------------|-----------|----------|------|
| `import_files` | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ (si can_import) |
| `transcribe` | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ (si can_transcribe) |
| `create_project` | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| `review_v1` | ✅ | ✅ | ✅ | ✅ | ✅ (si can_review) | ❌ |
| `review_v2` | ✅ | ✅ | ✅ | ✅ | ✅ (si can_review) | ❌ |
| `merge_blocks` | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| `propose_modification` | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| `comment` | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| `close_session` | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| `manage_users` | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `delete_document` | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |

### Livrables Phase 1
- [ ] Migration 011 appliquée
- [ ] Composant Users mis à jour avec sélecteur de rôle
- [ ] Hook `useUserRoles` créé
- [ ] Matrice des permissions documentée

---

## PHASE 2 — BACKEND : NOUVELLES TABLES (4-5 jours)

### Objectifs
- Créer toutes les tables du correcteur collaboratif
- Configurer RLS (Row Level Security)
- Activer Realtime

### Tâches

#### 2.1 Migrations SQL (012→026)

| Migration | Table/Fonction | Description |
|-----------|----------------|-------------|
| `012_extend_book_projects.sql` | `book_projects.stage` | Alias sémantique de `workflow_step` |
| `013_extend_proofreading_v2.sql` | `proofreading_v2.session_document_id` | FK vers `documents` |
| `014_extend_documents.sql` | `documents.source_format`, `total_blocks`, etc. | Champs pour sessions de correction |
| `015_extend_document_versions.sql` | `document_versions.blocks_snapshot` | Snapshot JSONB des blocs |
| `016_create_document_blocks.sql` | `document_blocks` ⭐ | Table centrale des blocs atomiques |
| `017_create_block_operations.sql` | `block_operations` | Journal CRDT des opérations |
| `018_create_block_proposals.sql` | `block_proposals` | Propositions en attente |
| `019_create_block_comments.sql` | `block_comments` | Commentaires ancrés |
| `020_create_document_collaborators.sql` | `document_collaborators` | Invitations par session |
| `021_create_document_sessions.sql` | `document_sessions` | Présence live (curseurs) |
| `022_create_notifications.sql` | `notifications` | Alertes utilisateurs |
| `023_rls_policies.sql` | Policies RLS | Sécurité par rôle |
| `024_realtime_enable.sql` | Realtime | Activation sur nouvelles tables |
| `025_new_functions.sql` | `merge_block()`, `get_document_progress()` | Fonctions utilitaires |
| `026_new_triggers.sql` | Triggers | Automatismes (notifications, etc.) |

#### 2.2 Schéma résumé des nouvelles tables

```sql
-- Table centrale
document_blocks (
  id UUID PK,
  document_id UUID FK → documents,
  type TEXT (paragraph, heading1, image, etc.),
  position INT,
  content JSONB,  -- ProseMirror
  status TEXT (draft, proposed, merged, rejected),
  crdt_state BYTEA,  -- Y.js
  vector_clock JSONB,
  created_by UUID FK → users,
  merged_by UUID FK → users,
  merged_at TIMESTAMPTZ,
  word_count INT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)

-- Journal des opérations
block_operations (
  id UUID PK,
  block_id UUID FK → document_blocks,
  user_id UUID FK → users,
  op_type TEXT (insert, delete, style, move),
  op_data JSONB,
  vector_clock JSONB,
  applied_at TIMESTAMPTZ
)

-- Propositions
block_proposals (
  id UUID PK,
  block_id UUID FK → document_blocks,
  proposed_by UUID FK → users,
  content_before JSONB,
  content_after JSONB,
  diff_summary TEXT,
  justification TEXT,
  status TEXT (pending, approved, rejected),
  reviewed_by UUID FK → users,
  reviewed_at TIMESTAMPTZ
)

-- Commentaires
block_comments (
  id UUID PK,
  block_id UUID FK → document_blocks,
  user_id UUID FK → users,
  parent_id UUID FK → block_comments (thread),
  anchor_text TEXT,
  anchor_start INT,
  anchor_end INT,
  content TEXT,
  status TEXT (open, resolved)
)

-- Collaborateurs
document_collaborators (
  id UUID PK,
  document_id UUID FK → documents,
  user_id UUID FK → users,
  role TEXT (editor, redacteur_chef, corrector, reviewer),
  color TEXT,  -- couleur du curseur
  permissions JSONB
)

-- Sessions live
document_sessions (
  document_id UUID FK → documents,
  user_id UUID FK → users,
  block_id UUID FK → document_blocks,
  cursor_pos INT,
  is_online BOOLEAN,
  is_typing BOOLEAN,
  last_ping_at TIMESTAMPTZ
)
```

### Livrables Phase 2
- [ ] 15 migrations SQL créées et appliquées
- [ ] RLS configuré pour toutes les nouvelles tables
- [ ] Realtime activé
- [ ] Fonctions et triggers testés

---

## PHASE 3 — HOOKS REACT (3-4 jours)

### Objectifs
- Créer tous les hooks nécessaires pour le correcteur
- Étendre `useDocuments` sans casser l'existant

### Tâches

| Hook | Fichier | Fonctions principales |
|------|---------|----------------------|
| `useDocumentBlocks` | `src/hooks/useDocumentBlocks.ts` | `blocks`, `updateBlockStatus()`, `reorderBlock()`, `getBlockHistory()` |
| `useBlockProposals` | `src/hooks/useBlockProposals.ts` | `proposals`, `submitProposal()`, `approveProposal()`, `rejectProposal()` |
| `useBlockComments` | `src/hooks/useBlockComments.ts` | `comments`, `addComment()`, `resolveComment()`, `replyToComment()` |
| `useCollabSession` | `src/hooks/useCollabSession.ts` | `collaborators`, `myColor`, `joinSession()`, `leaveSession()`, `updateCursorPosition()` |
| `useOfflineSync` | `src/hooks/useOfflineSync.ts` | `isOffline`, `pendingOps`, `queueOperation()`, `syncPendingOperations()` |
| `useUserRoles` (déjà Phase 1) | `src/hooks/useUserRoles.ts` | `users`, `updateUserRole()`, `can()` |

**Extension de `useDocuments.ts` :**
```typescript
// À AJOUTER aux fonctions existantes (ne pas modifier l'existant)
const {
  // ← Fonctions existantes (intactes) →
  documents, createDocument, updateDocumentWithVersioning, ...
  
  // ← NOUVELLES fonctions →
  launchCorrectionSession,  // crée les blocs depuis DOCX
  closeCorrectionSession,   // clôture + trigger relecture_2_validé
  getCorrectionProgress,    // % de blocs mergés
} = useDocuments();
```

### Livrables Phase 3
- [ ] 6 hooks créés
- [ ] `useDocuments` étendu (sans casser l'existant)
- [ ] Tests unitaires des hooks

---

## PHASE 4 — COMPOSANTS UI (5-6 jours)

### Objectifs
- Créer l'UI du correcteur collaboratif
- Intégrer dans `Documents.tsx` (mode "Session de correction")

### Tâches

#### 4.1 Composants principaux

| Composant | Fichier | Description |
|-----------|---------|-------------|
| `CorrectionEditor.tsx` | `src/components/Documents/CorrectionEditor.tsx` | Wrapper principal (layout 3 colonnes) |
| `CorrectionTopbar.tsx` | `src/components/Documents/CorrectionTopbar.tsx` | Fil d'ariane, avatars, sync, export |
| `DynamicSummary.tsx` | `src/components/Documents/DynamicSummary.tsx` | Sommaire avec pastilles de statut |
| `BlocksEditor.tsx` | `src/components/Documents/BlocksEditor.tsx` | Zone centrale des blocs |
| `BlockEditor.tsx` | `src/components/Documents/BlockEditor.tsx` | Rendu d'un bloc individuel |
| `BlockProposed.tsx` | `src/components/Documents/BlockProposed.tsx` | UI d'une proposition en attente |
| `RightPanel.tsx` | `src/components/Documents/RightPanel.tsx` | Onglets (Propositions, Activité, Offline) |
| `ProposalsPanel.tsx` | `src/components/Documents/panels/ProposalsPanel.tsx` | Liste des propositions |
| `ActivityPanel.tsx` | `src/components/Documents/panels/ActivityPanel.tsx` | Flux d'activité temps réel |
| `OfflinePanel.tsx` | `src/components/Documents/panels/OfflinePanel.tsx` | Statut connexion + ops en attente |

#### 4.2 Nouvelles modales

| Modale | Fichier | Description |
|--------|---------|-------------|
| `BlockHistoryModal.tsx` | `src/components/Documents/modals/BlockHistoryModal.tsx` | Historique d'un bloc atomique |
| `BlockDiffModal.tsx` | `src/components/Documents/modals/BlockDiffModal.tsx` | Comparaison deux états d'un bloc |
| `SessionCloseModal.tsx` | `src/components/Documents/modals/SessionCloseModal.tsx` | Clôture session + résumé stats |

#### 4.3 Modification de `Documents.tsx`

```typescript
// AJOUTER un mode "Session de correction"
const [isCollabMode, setIsCollabMode] = useState(false);

{!isCollabMode && (
  // ← Tableau Documents existant (intact) →
  <DocumentsTable documents={documents} ... />
)}

{isCollabMode && selectedDocument?.type === 'correction' && (
  // ← Nouveau correcteur collaboratif →
  <CorrectionEditor
    document={selectedDocument}
    onClose={() => setIsCollabMode(false)}
  />
)}
```

### Livrables Phase 4
- [ ] 10+ composants créés
- [ ] 3 nouvelles modales
- [ ] `Documents.tsx` modifié (mode collab)
- [ ] Tests E2E du correcteur

---

## PHASE 5 — EDGE FUNCTIONS (2-3 jours)

### Objectifs
- Conversion DOCX → HTML → Blocs
- Export EPUB/PDF/DOCX
- Analyse de qualité

### Tâches

| Function | Chemin | Description |
|----------|--------|-------------|
| `convert-to-html` | `supabase/functions/convert-to-html/index.ts` | DOCX → HTML → JSON (blocs ProseMirror) |
| `generate-export` | `supabase/functions/generate-export/index.ts` | Blocs → EPUB/PDF/DOCX |
| `analyze-docx-quality` | `supabase/functions/analyze-docx-quality/index.ts` | Stats : nb paragraphes, images, etc. |

### Livrables Phase 5
- [ ] 3 Edge Functions déployées
- [ ] Tests d'intégration

---

## PHASE 6 — INTÉGRATION & TESTS (3-4 jours)

### Objectifs
- Tester la sync temps réel
- Tester offline/reconnexion
- Tester la clôture de session → trigger workflow

### Tâches

| Test | Description | Critère de succès |
|------|-------------|-------------------|
| **Sync temps réel** | 2 navigateurs éditent le même bloc | Curseurs colorés, modifications fusionnées sans conflit |
| **Offline** | Déconnexion réseau, modifications locales | Ops stockées dans IndexedDB, sync auto à la reconnexion |
| **CRDT** | 3 utilisateurs éditent le même paragraphe | Pas de perte de données, ordre préservé |
| **Export** | Clic sur "Exporter EPUB" | Fichier téléchargé, mise en page correcte |
| **Clôture session** | Clic sur "Passer en Correction finale" | `proofreading_v2.status = 'relecture_2_validé'`, trigger déclenché |
| **Permissions** | `corrector` essaie de merger | Bouton "Merger" masqué ou disabled |

### Livrables Phase 6
- [ ] Tests E2E passants
- [ ] Bug fixes
- [ ] Documentation utilisateur

---

## 📅 RÉCAPITULATIF TEMPS ESTIMÉ

| Phase | Durée | Jours/homme |
|-------|-------|-------------|
| Phase 0 — Préparation | 1-2 jours | 2 |
| Phase 1 — Rôles & Users | 3-4 jours | 4 |
| Phase 2 — Backend (tables) | 4-5 jours | 5 |
| Phase 3 — Hooks | 3-4 jours | 4 |
| Phase 4 — UI | 5-6 jours | 6 |
| Phase 5 — Edge Functions | 2-3 jours | 3 |
| Phase 6 — Tests | 3-4 jours | 4 |
| **TOTAL** | **21-28 jours** | **~28 jours (4 semaines)** |

---

## ✅ CHECKLIST DE VALIDATION

Avant de commencer à coder :

- [ ] Backup SQL de la base Supabase effectué
- [ ] Branche Git `feature/collaborative-corrector` créée
- [ ] Migrations 000→010 vérifiées comme appliquées
- [ ] Bucket Storage `sources` et `exports` créés
- [ ] Extension `pg_cron` activée dans Supabase Dashboard
- [ ] Dépendances npm installées (`yjs`, `y-supabase`, `dompurify`, `idb`)
- [ ] Plan validé par l'équipe

---

## 🚀 PROCHAINES ÉTAPES (après validation)

1. **Commencer Phase 1** : Migration 011 + module Users
2. **Créer un utilisateur test** avec chaque rôle (admin, editor, redacteur_chef, corrector, reviewer)
3. **Tester la matrice des permissions** pour chaque rôle
4. **Enchaîner sur Phase 2** : Nouvelles tables SQL

---

*Document créé le 8 mars 2025 — bcm-gest-react — v1.0*

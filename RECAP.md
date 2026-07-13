# 📚 BCM-GEST — RÉCAPITULATIF COMPLET DU PROJET

**Document de référence technique et fonctionnelle**  
*Application web de gestion de flux éditorial*

---

## 🎯 TABLE DES MATIÈRES

1. [Présentation générale](#1-présentation-générale)
2. [Stack technique détaillée](#2-stack-technique-détaillée)
3. [Architecture du projet](#3-architecture-du-projet)
4. [Workflow éditorial complet](#4-workflow-éditorial-complet)
5. [Modèle de données (Base de données)](#5-modèle-de-données-base-de-données)
6. [Modules fonctionnels](#6-modules-fonctionnels)
7. [Hooks personnalisés](#7-hooks-personnalisés)
8. [Composants principaux](#8-composants-principaux)
9. [Système d'authentification](#9-système-dauthentification)
10. [Triggers et automatismes SQL](#10-triggers-et-automatismes-sql)
11. [Fonctions SQL avancées](#11-fonctions-sql-avancées)
12. [Gestion des fichiers et validation](#12-gestion-des-fichiers-et-validation)
13. [Versioning et historique](#13-versioning-et-historique)
14. [Interface utilisateur](#14-interface-utilisateur)
15. [Configuration et environnement](#15-configuration-et-environnement)
16. [Scripts et commandes](#16-scripts-et-commandes)
17. [Bonnes pratiques](#17-bonnes-pratiques)
18. [Débogage et tests](#18-débogage-et-tests)

---

## 1. PRÉSENTATION GÉNÉRALE

### 1.1 Objectif du projet

**BCM-GEST** est une application web complète de gestion de flux éditorial conçue pour automatiser et centraliser le processus de production de contenu d'une maison d'édition ou d'un service de production audiovisuelle.

### 1.2 Fonctionnalités principales

- **Import de fichiers bruts** : Audio (MP3, WAV), PDF, images
- **Transcription** : Conversion audio/PDF → texte avec éditeur riche
- **Création de projets de livres** : Regroupement de transcriptions
- **Relectures multiples** : Deux niveaux de relecture (R1, R2)
- **Publication** : Version finale prête pour édition
- **Traçabilité complète** : Historique et lignée éditoriale
- **Gestion multi-utilisateurs** : Rôles et permissions

### 1.3 Valeur ajoutée

| Avantage | Description |
|----------|-------------|
| **Automatisation** | Triggers SQL pour transitions de statut automatiques |
| **Centralisation** | Tous les fichiers et documents dans une seule plateforme |
| **Collaboration** | Gestion d'équipe avec rôles hiérarchisés |
| **Versioning** | Historique complet de toutes les modifications |
| **Traçabilité** | Lignée éditoriale complète via fonction SQL dédiée |

---

## 2. STACK TECHNIQUE DÉTAILLÉE

### 2.1 Frontend

| Technologie | Version | Usage |
|-------------|---------|-------|
| **React** | 19.1.1 | Framework UI principal |
| **TypeScript** | 4.9.5 | Typage statique |
| **Vite** | 7.3.1 | Build tool et dev server |
| **Tailwind CSS** | 3.4.19 | Styling utilitaire |
| **TanStack Query** | 5.90.21 | Gestion du cache et data fetching |
| **React Router DOM** | 7.13.0 | Navigation (si nécessaire) |

### 2.2 Bibliothèques spécialisées

| Bibliothèque | Version | Usage |
|--------------|---------|-------|
| **@tiptap/react** | 3.20.0 | Éditeur de texte riche |
| **@tiptap/starter-kit** | 3.20.0 | Extensions de base TipTap |
| **@tiptap/extension-link** | 3.20.0 | Liens hypertexte dans l'éditeur |
| **@tiptap/extension-placeholder** | 3.20.0 | Placeholder dans l'éditeur |
| **@tiptap/extension-text-align** | 3.20.0 | Alignement du texte |
| **react-pdf** | 10.3.0 | Visualisation PDF |
| **pdfjs-dist** | 5.4.296 | Moteur PDF.js |
| **react-dropzone** | 15.0.0 | Drag-and-drop pour uploads |
| **react-window** | 2.2.7 | Virtualisation de listes |
| **recharts** | 3.7.0 | Graphiques et statistiques |
| **diff** | 8.0.3 | Comparaison de versions (diff) |
| **docx** | 9.5.3 | Génération de documents Word |
| **file-saver** | 2.0.5 | Téléchargement de fichiers |

### 2.3 Backend (Supabase)

| Service | Description |
|---------|-------------|
| **PostgreSQL** | Base de données relationnelle |
| **Auth** | Authentification JWT |
| **Storage** | Stockage de fichiers (buckets S3) |
| **Realtime** | WebSockets pour mises à jour en temps réel |
| **RPC** | Appels de fonctions SQL depuis le frontend |

### 2.4 Configuration TypeScript

```json
{
  "target": "ES2020",
  "module": "ESNext",
  "jsx": "react-jsx",
  "strict": true,
  "moduleResolution": "bundler",
  "paths": {
    "@/*": ["src/*"],
    "@components/*": ["src/components/*"],
    "@hooks/*": ["src/hooks/*"]
  }
}
```

---

## 3. ARCHITECTURE DU PROJET

### 3.1 Structure des dossiers

```
bcm-gest-react/
├── .env                          # Variables d'environnement (Supabase)
├── .env.local                    # Variables locales (non versionnées)
├── package.json                  # Dépendances et scripts
├── tsconfig.json                 # Configuration TypeScript
├── vite.config.ts                # Configuration Vite
├── tailwind.config.js            # Configuration Tailwind CSS
├── postcss.config.cjs            # Configuration PostCSS
├── index.html                    # Point d'entrée HTML
│
├── src/
│   ├── App.tsx                   # Composant racine
│   ├── index.tsx                 # Point d'entrée React
│   ├── supabaseClient.ts         # Client Supabase
│   │
│   ├── components/               # Composants React
│   │   ├── common/               # Composants partagés
│   │   │   ├── Header.tsx        # En-tête avec navigation
│   │   │   ├── Footer.tsx        # Pied de page
│   │   │   └── TabNavigation.tsx # Navigation par onglets
│   │   │
│   │   ├── Dashboard/            # Tableau de bord
│   │   │   └── Dashboard.tsx
│   │   │
│   │   ├── Documents/            # Gestion des documents
│   │   │   ├── Documents.tsx
│   │   │   ├── document.ts       # Types et constantes
│   │   │   ├── DiffViewer.tsx    # Comparaison de versions
│   │   │   ├── FileUpload.tsx    # Upload de fichiers
│   │   │   └── modals/           # Modales de gestion
│   │   │       ├── index.ts      # Export centralisé
│   │   │       ├── EditModal.tsx       # Création/édition de document
│   │   │       ├── HistoryModal.tsx    # Historique des versions (comparer/restaurer)
│   │   │       ├── StatusModal.tsx     # Changement de statut en masse
│   │   │       └── AssigneeModal.tsx   # Réassignation en masse
│   │   │
│   │   ├── MediaLibrary/         # Médiathèque (CŒUR DU SYSTÈME)
│   │   │   ├── MediaLibrary.tsx
│   │   │   ├── EditorialFlow.tsx # Vue du flux éditorial
│   │   │   ├── CategoryView.tsx  # Vue par catégorie
│   │   │   ├── TreeView.tsx      # Vue arborescente
│   │   │   └── modals/
│   │   │       ├── ImportModal.tsx
│   │   │       ├── ImportModalWithValidation.tsx
│   │   │       ├── BulkImportModal.tsx  # Import en masse
│   │   │       └── ValidationModal.tsx
│   │   │
│   │   ├── Transcription/        # Module de transcription
│   │   │   ├── Transcription.tsx
│   │   │   ├── TranscriptionEditor.tsx  # Éditeur TipTap
│   │   │   ├── AudioPlayer.tsx   # Lecteur audio
│   │   │   └── PDFViewer.tsx     # Visualiseur PDF
│   │   │
│   │   ├── Workflow/             # Vue Kanban du workflow
│   │   │   └── Workflow.tsx
│   │   │
│   │   ├── Users/                # Gestion des utilisateurs
│   │   │   └── Users.tsx
│   │   │
│   │   ├── Reports/              # Rapports et statistiques
│   │   │   └── Reports.tsx
│   │   │
│   │   ├── Login/                # Authentification
│   │   │   └── Login.tsx
│   │   │
│   │   └── Notifications/        # Notifications (optionnel)
│   │
│   ├── hooks/                    # Hooks personnalisés
│   │   ├── index.ts              # Export de tous les hooks
│   │   ├── useAuth.ts            # Authentification
│   │   ├── useDocuments.ts       # CRUD documents + versioning
│   │   ├── useFileValidation.ts  # Validation des noms de fichiers
│   │   ├── useWorkflowAutomation.ts # Automatismes de workflow
│   │   ├── useLineage.ts         # Lignée éditoriale
│   │   ├── useImportWorkflow.ts  # Flux d'importation
│   │   ├── useDocumentMediaSync.ts # Sync Documents ↔ MediaLibrary
│   │   ├── useDiff.ts            # Comparaison de versions
│   │   ├── useFileUpload.ts      # Upload de fichiers
│   │   │
│   │   └── MediaLibrary/         # Hooks spécifiques MediaLibrary
│   │       ├── index.ts
│   │       ├── useRawFiles.ts
│   │       ├── useTranscriptions.ts
│   │       ├── useBookProjects.ts
│   │       ├── useProofreading.ts
│   │       ├── useAuditLog.ts
│   │       └── useMediaLibrary.ts
│   │
│   ├── context/                  # Contextes React
│   │   └── AppStateContext.tsx   # État global (user, notifications)
│   │
│   ├── types/                    # Types TypeScript
│   │   └── index.ts              # Types globaux
│   │
│   ├── styles/                   # Styles globaux
│   │   └── index.css             # Imports Tailwind + custom
│   │
│   └── assets/                   # Assets statiques
│
├── Supabase/
│   └── migrations/               # Migrations SQL (schéma DB)
│       ├── 000_create_users.sql
│       ├── 001_create_raw_files.sql
│       ├── 002_create_transcriptions.sql
│       ├── 003_create_book_projects.sql
│       ├── 004_create_proofreading.sql
│       ├── 005_create_audit_logs.sql
│       ├── 006_create_relationships.sql
│       ├── 007_create_lineage_function.sql
│       ├── 007-bis_fix_lineage_function.sql
│       ├── 008_create_status_triggers.sql
│       ├── 008-bis_fix_triggers.sql
│       ├── 008-ter_fix_all_triggers.sql
│       ├── 009_add_unique_constraints.sql
│       └── 010_create_validation_functions.sql
│
├── build/                        # Build de production
├── node_modules/                 # Dépendances npm
└── public/                       # Assets publics
```

### 3.2 Flux de données

```
┌─────────────────────────────────────────────────────────────────┐
│                         FLUX DE DONNÉES                         │
└─────────────────────────────────────────────────────────────────┘

Utilisateur
    │
    ▼
Composant React (App.tsx → Modules)
    │
    ├───→ Hook personnalisé (useDocuments, useMediaLibrary, etc.)
    │         │
    │         ▼
    │     Client Supabase (supabaseClient.ts)
    │         │
    │         ├───→ API REST (queries/mutations)
    │         ├───→ Realtime (subscriptions)
    │         └───→ RPC (fonctions SQL)
    │                 │
    │                 ▼
    │             PostgreSQL (Supabase)
    │                 │
    │                 ├───→ Tables (documents, raw_files, etc.)
    │                 ├───→ Triggers (automatismes)
    │                 └───→ Fonctions (get_raw_file_lineage, etc.)
    │
    └───→ Context (AppStateContext, Auth)
              │
              ▼
          État global partagé
```

### 3.3 Cycle de vie d'une requête

1. **Action utilisateur** → Clic sur un bouton
2. **Hook personnalisé** → `useDocuments.createDocument()`
3. **Appel Supabase** → `supabase.from('documents').insert()`
4. **Base de données** → Insertion + Triggers
5. **Realtime** → Notification de changement
6. **Re-fetch** → Mise à jour automatique de l'UI

---

## 4. WORKFLOW ÉDITORIAL COMPLET

### 4.1 Vue d'ensemble

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           WORKFLOW ÉDITORIAL BCM-GEST                       │
│                            (0% → 100%)                                      │
└─────────────────────────────────────────────────────────────────────────────┘

┌──────────────┐
│ FICHIER BRUT │ 0% - "libre"
│   (import)   │
└──────┬───────┘
       │
       │ Liaison transcription
       │ Trigger: statut → "traité"
       ▼
┌──────────────┐
│ TRANSCRIPTION│ 15% - "transcription_en_cours"
│   (saisie)   │
└──────┬───────┘
       │
       │ Bouton "Fin"
       │ Trigger: statut → "transcrit"
       ▼
┌──────────────┐
│  PROJET DE   │ 50% - "projet_de_livre"
│    LIVRE     │
└──────┬───────┘
       │
       │ Création R1
       │ Trigger: statut → "relecture_1_en_cours"
       ▼
┌──────────────┐
│  RELECTURE 1 │ 60% - "relecture_1_en_cours"
│   (correction)│
└──────┬───────┘
       │
       │ Validation R1
       │ Trigger: statut → "relecture_1_validé"
       ▼
┌──────────────┐
│  RELECTURE 2 │ 85% - "relecture_2_en_cours"
│   (finale)   │
└──────┬───────┘
       │
       │ Validation finale
       │ Trigger: statut → "relecture_2_validé"
       ▼
┌──────────────┐
│   TERMINÉ    │ 100% - PRÊT POUR PUBLICATION
└──────────────┘
```

### 4.2 Tableau des statuts

| Statut | Progression | Workflow Step | Description |
|--------|-------------|---------------|-------------|
| `libre` | 0% | 0 | Fichier brut importé, non lié |
| `traité` | 15% | 1 | Fichier brut lié à une transcription |
| `transcription_en_cours` | 15% | 2 | Transcription en cours de saisie |
| `transcrit` | 30% | 3 | Transcription finalisée |
| `projet_de_livre` | 50% | 4 | Regroupé dans un projet de livre |
| `relecture_1_en_cours` | 60% | 4 | Première relecture en cours |
| `relecture_1_validé` | 70% | 4 | Première relecture validée |
| `relecture_2_en_cours` | 85% | 5 | Deuxième relecture en cours |
| `relecture_2_validé` | 100% | 5 | Workflow complet terminé |

### 4.3 Règles de transition

| De | Vers | Condition | Déclencheur |
|----|------|-----------|-------------|
| `libre` | `traité` | Liaison transcription | Trigger SQL |
| `traité` | `transcrit` | Bouton "Fin" transcription | Hook `finalizeTranscription` |
| `transcrit` | `projet_de_livre` | Liaison projet de livre | Trigger SQL |
| `projet_de_livre` | `relecture_1_en_cours` | Création R1 | Trigger SQL |
| `relecture_1_en_cours` | `relecture_1_validé` | Validation R1 | Hook `finalizeProofreadingV1` |
| `relecture_1_validé` | `relecture_2_en_cours` | Création R2 | Trigger SQL |
| `relecture_2_en_cours` | `relecture_2_validé` | Validation R2 | Hook `finalizeProofreadingV2` |

### 4.4 Contraintes d'unicité

```sql
-- 1 projet de livre = 1 Relecture 1 UNIQUE
CREATE UNIQUE INDEX idx_proofreading_v1_unique_book_project
  ON proofreading_v1(book_project_id) WHERE is_deleted = FALSE;

-- 1 Relecture 1 = 1 Relecture 2 UNIQUE
CREATE UNIQUE INDEX idx_proofreading_v2_unique_proofreading_v1
  ON proofreading_v2(proofreading_v1_id) WHERE is_deleted = FALSE;
```

### 4.5 Règles de nommage

| Type de fichier | Règle | Exemple |
|-----------------|-------|---------|
| **Transcription** | Même nom que le brut + `.txt` | `interview_001.mp3` → `interview_001.txt` |
| **Relecture 1** | Titre du projet + `_R1.pdf` | `Mon Livre` → `Mon Livre_R1.pdf` |
| **Relecture 2** | Titre du projet + `_R2.pdf` | `Mon Livre` → `Mon Livre_R2.pdf` |

---

## 5. MODÈLE DE DONNÉES (BASE DE DONNÉES)

### 5.1 Schéma relationnel complet

```sql
-- Utilisateurs (étend auth.users de Supabase)
users (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  email TEXT UNIQUE,
  full_name TEXT,
  role TEXT CHECK (role IN ('user', 'editor', 'admin')),
  avatar_url TEXT,
  department TEXT,
  team TEXT,
  can_import BOOLEAN DEFAULT TRUE,
  can_transcribe BOOLEAN DEFAULT TRUE,
  can_review BOOLEAN DEFAULT FALSE,
  can_edit BOOLEAN DEFAULT FALSE,
  can_delete BOOLEAN DEFAULT FALSE,
  can_manage_users BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE
)

-- Fichiers bruts (audio, PDF, images)
raw_files (
  id UUID PRIMARY KEY,
  file_name TEXT NOT NULL,
  file_type TEXT,
  file_url TEXT NOT NULL,
  file_size BIGINT,
  status TEXT DEFAULT 'libre',
  is_linked BOOLEAN DEFAULT FALSE,
  linked_documents_count INT DEFAULT 0,
  metadata JSONB,
  imported_by UUID REFERENCES users(id),
  imported_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE,
  is_deleted BOOLEAN DEFAULT FALSE
)

-- Transcriptions
transcriptions (
  id UUID PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT,
  status TEXT DEFAULT 'transcription_en_cours',
  workflow_step INT DEFAULT 2,
  progress INT DEFAULT 15,
  raw_file_id UUID REFERENCES raw_files(id),
  transcribed_by UUID REFERENCES users(id),
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE
)

-- Projets de livres
book_projects (
  id UUID PRIMARY KEY,
  title TEXT NOT NULL,
  status TEXT DEFAULT 'projet_de_livre',
  workflow_step INT DEFAULT 4,
  progress INT DEFAULT 50,
  created_by UUID REFERENCES users(id),
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE
)

-- Relecture 1
proofreading_v1 (
  id UUID PRIMARY KEY,
  book_project_id UUID REFERENCES book_projects(id),
  file_url TEXT,
  content TEXT,
  status TEXT DEFAULT 'relecture_1_en_cours',
  workflow_step INT DEFAULT 4,
  progress INT DEFAULT 60,
  reviewer UUID REFERENCES users(id),
  corrections_count INT DEFAULT 0,
  notes TEXT,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE,
  is_deleted BOOLEAN DEFAULT FALSE
)

-- Relecture 2
proofreading_v2 (
  id UUID PRIMARY KEY,
  proofreading_v1_id UUID REFERENCES proofreading_v1(id),
  file_url TEXT,
  content TEXT,
  status TEXT DEFAULT 'relecture_2_en_cours',
  workflow_step INT DEFAULT 5,
  progress INT DEFAULT 85,
  reviewer UUID REFERENCES users(id),
  corrections_count INT DEFAULT 0,
  notes TEXT,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE,
  is_deleted BOOLEAN FALSE
)

-- Documents (interface de gestion)
documents (
  id UUID PRIMARY KEY,
  title TEXT NOT NULL,
  type TEXT,
  source TEXT,
  status TEXT DEFAULT 'à_traiter',
  workflow_step INT DEFAULT 0,
  progress INT DEFAULT 0,
  content TEXT,
  file_url TEXT,
  assigned_to TEXT,
  tags TEXT[],
  user_id UUID REFERENCES users(id),
  media_file_id UUID,
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE
)

-- Versions de documents (historique)
document_versions (
  id UUID PRIMARY KEY,
  document_id UUID REFERENCES documents(id),
  version_number INT NOT NULL,
  title TEXT,
  type TEXT,
  source TEXT,
  status TEXT,
  workflow_step INT,
  progress INT,
  content TEXT,
  file_url TEXT,
  assigned_to TEXT,
  tags TEXT[],
  created_by UUID REFERENCES users(id),
  restored_from_version UUID,
  restoration_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE
)

-- Tables de liaison
transcription_raw_files (
  transcription_id UUID REFERENCES transcriptions(id),
  raw_file_id UUID REFERENCES raw_files(id),
  linked_by UUID REFERENCES users(id),
  linked_at TIMESTAMP WITH TIME ZONE,
  PRIMARY KEY (transcription_id, raw_file_id)
)

book_project_transcriptions (
  book_project_id UUID REFERENCES book_projects(id),
  transcription_id UUID REFERENCES transcriptions(id),
  order_index INT DEFAULT 0,
  linked_by UUID REFERENCES users(id),
  linked_at TIMESTAMP WITH TIME ZONE,
  PRIMARY KEY (book_project_id, transcription_id)
)

document_media_links (
  document_id UUID REFERENCES documents(id),
  media_file_id UUID REFERENCES raw_files(id),
  status TEXT,
  linked_at TIMESTAMP WITH TIME ZONE,
  PRIMARY KEY (document_id, media_file_id)
)

-- Actions de workflow (audit)
workflow_actions (
  id UUID PRIMARY KEY,
  document_id UUID REFERENCES documents(id),
  action_type TEXT NOT NULL,
  from_status TEXT,
  to_status TEXT,
  performed_by UUID REFERENCES users(id),
  notes TEXT,
  performed_at TIMESTAMP WITH TIME ZONE
)

-- Logs d'audit (global)
audit_logs (
  id UUID PRIMARY KEY,
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  action TEXT NOT NULL,
  old_value JSONB,
  new_value JSONB,
  performed_by UUID REFERENCES users(id),
  performed_at TIMESTAMP WITH TIME ZONE
)
```

### 5.2 Vues utilitaires

```sql
-- Utilisateurs actifs
CREATE VIEW active_users AS
SELECT id, email, full_name, role, department, team, created_at
FROM users
WHERE id IN (SELECT id FROM auth.users WHERE email_confirmed_at IS NOT NULL);

-- Projets sans R1
CREATE VIEW projects_without_proofreading_v1 AS
SELECT * FROM book_projects
WHERE id NOT IN (SELECT book_project_id FROM proofreading_v1 WHERE is_deleted = FALSE);

-- R1 sans R2
CREATE VIEW proofreading_v1_without_proofreading_v2 AS
SELECT * FROM proofreading_v1
WHERE id NOT IN (SELECT proofreading_v1_id FROM proofreading_v2 WHERE is_deleted = FALSE);

-- Doublons potentiels R1
CREATE VIEW potential_proofreading_v1_duplicates AS
SELECT book_project_id, COUNT(*) as count
FROM proofreading_v1
WHERE is_deleted = FALSE
GROUP BY book_project_id
HAVING COUNT(*) > 1;

-- Doublons potentiels R2
CREATE VIEW potential_proofreading_v2_duplicates AS
SELECT proofreading_v1_id, COUNT(*) as count
FROM proofreading_v2
WHERE is_deleted = FALSE
GROUP BY proofreading_v1_id
HAVING COUNT(*) > 1;
```

---

## 6. MODULES FONCTIONNELS

### 6.1 Authentification (Login)

**Fichier :** `src/components/Login/Login.tsx`

**Fonctionnalités :**
- Connexion email/mot de passe via Supabase Auth
- Inscription avec nom complet
- Gestion de session automatique
- Redirection après connexion

**Hook associé :** `useAuth`

```typescript
const { user, loading, signIn, signUp, signOut } = useAuth();
```

### 6.2 Tableau de bord (Dashboard)

**Fichier :** `src/components/Dashboard/Dashboard.tsx`

**Fonctionnalités :**
- Statistiques globales (nombre de documents par statut)
- Graphiques de production (Recharts)
- Activité récente
- Tâches assignées

### 6.3 Documents

**Fichier :** `src/components/Documents/Documents.tsx`

**Fonctionnalités :**
- **CRUD complet** : Créer, Lire, Mettre à jour, Supprimer
- **Filtres** : Par statut, type, assigné, tags
- **Recherche** : Plein texte sur tous les champs
- **Versioning** : Historique avec comparaison (DiffViewer)
- **Actions en masse** : Sélection multiple, suppression groupée
- **Liaison MediaLibrary** : Lier un document à un fichier brut

**Hook associé :** `useDocuments`

```typescript
const {
  documents,
  loading,
  error,
  documentVersions,
  createDocument,
  updateDocumentWithVersioning,
  fetchDocumentVersions,
  restoreDocumentVersion,
  deleteDocuments
} = useDocuments();
```

**Modales (dossier `modals/`) :**

| Modale | Fichier | Fonctionnalité |
|--------|---------|----------------|
| **EditModal** | `EditModal.tsx` | Création/édition de document avec formulaire complet + sélecteur MediaLibrary + FileUpload |
| **HistoryModal** | `HistoryModal.tsx` | Affiche l'historique des versions avec options comparer/restaurer |
| **StatusModal** | `StatusModal.tsx` | Changement de statut en masse pour documents sélectionnés |
| **AssigneeModal** | `AssigneeModal.tsx` | Réassignation en masse de documents à un utilisateur |

### 6.4 MediaLibrary (CŒUR DU SYSTÈME)

**Fichier :** `src/components/MediaLibrary/MediaLibrary.tsx`

**Fonctionnalités :**

#### Vue "Bibliothèque"
- Grille ou liste des fichiers bruts
- Filtres : type (audio, PDF, image), statut, date
- Indicateur de liaison (libre/lié)
- Stats en temps réel

#### Vue "Flux Éditorial"
- Visualisation arborescente de la lignée
- Progression globale par fichier brut
- Liens : brut → transcriptions → projets → relectures

#### Import avec validation
- Validation automatique des noms de fichiers
- Suggestions de correction
- Liaison automatique lors de l'import

#### Import en masse (BulkImportModal)
- Import de plusieurs paires de fichiers simultanément
- Appariement automatique par nom de fichier
- Édition manuelle (dissocier, réassocier)
- Validation groupée avec rapport détaillé

**Types d'appariement supportés :**
1. Fichier Brut → Transcription (1↔1 ou N↔1)
2. Transcription → Projet de Livre (N↔1)
3. Projet de Livre → Relecture 1 (1↔1)
4. Relecture 1 → Relecture 2 (1↔1)

**Hooks associés :**
- `useMediaLibrary`
- `useRawFiles`
- `useTranscriptions`
- `useBookProjects`
- `useProofreading`
- `useFileValidation`
- `useImportWorkflow`

### 6.5 Transcription

**Fichier :** `src/components/Transcription/Transcription.tsx`

**Fonctionnalités :**

#### Onglet "Lancement"
- Documents à transcrire (`imported`, `transcribing`)
- Lecteur audio intégré (MP3, WAV, OGG, AAC, M4A)
- Visualiseur PDF
- Éditeur de texte riche (TipTap)
- Sauvegarde automatique (brouillon local)
- Raccourcis clavier (Ctrl+S, Échap)

#### Onglet "Relecture"
- Transcriptions terminées à relire
- Comparaison avec l'original
- Validation avec passage au statut supérieur

#### Onglet "Tagging"
- Ajout de métadonnées
- Catégorisation
- Assignation à des projets

**Composants :**
- `AudioPlayer.tsx` : Lecteur audio avec contrôles
- `PDFViewer.tsx` : Visualiseur PDF avec navigation
- `TranscriptionEditor.tsx` : Éditeur TipTap avec mise en forme

### 6.6 Workflow

**Fichier :** `src/components/Workflow/Workflow.tsx`

**Fonctionnalités :**
- Vue Kanban par étape du workflow
- Assignation des tâches
- Suivi de progression
- Goulots d'étranglement

### 6.7 Utilisateurs

**Fichier :** `src/components/Users/Users.tsx`

**Fonctionnalités :**
- Liste des utilisateurs actifs
- Rôles et permissions
- Statistiques par utilisateur
- Création/modification de comptes

### 6.8 Rapports (Reports)

**Fichier :** `src/components/Reports/Reports.tsx`

**Fonctionnalités :**
- Production par période
- Temps moyen par étape
- Performance par relecteur
- Taux de correction
- Graphiques (Recharts)

---

## 7. HOOKS PERSONNALISÉS

### 7.1 useAuth

**Fichier :** `src/hooks/useAuth.ts`

```typescript
const { user, loading, signIn, signUp, signOut } = useAuth();
```

**Fonctions :**
- `signIn(email, password)` : Connexion
- `signUp(email, password, fullName)` : Inscription
- `signOut()` : Déconnexion

**État :**
- `user` : Utilisateur connecté (null si non connecté)
- `loading` : Chargement de la session

### 7.2 useDocuments

**Fichier :** `src/hooks/useDocuments.ts`

```typescript
const {
  documents,
  loading,
  error,
  documentVersions,
  fetchDocuments,
  filterDocuments,
  createDocument,
  advanceWorkflow,
  updateDocumentWithVersioning,
  fetchDocumentVersions,
  restoreDocumentVersion,
  deleteDocuments
} = useDocuments();
```

**Fonctions clés :**
- `createDocument(data)` : Créer avec versioning automatique
- `updateDocumentWithVersioning(id, updates)` : Mettre à jour + créer version
- `advanceWorkflow(id, action, notes)` : Transition de statut
- `restoreDocumentVersion(id, versionId, reason)` : Restaurer ancienne version

### 7.3 useFileValidation

**Fichier :** `src/hooks/useFileValidation.ts`

```typescript
const {
  validateTranscriptionName,
  validateProofreadingV1Name,
  validateProofreadingV2Name,
  generateExpectedTranscriptionName,
  validateAndSuggestTranscriptionCorrection,
  checkTranscriptionImportRequirements,
  validateBatchFiles
} = useFileValidation();
```

**Fonctions :**
- `validateTranscriptionName(rawFileId, fileName)` : Vérifie nom transcription
- `generateExpectedTranscriptionName(rawFileId)` : Génère nom attendu
- `validateAndSuggestTranscriptionCorrection(id, fileName)` : Valide + suggère
- `checkTranscriptionImportRequirements(fileName)` : Vérifie requirements
- `validateBatchFiles(files)` : Validation en lot

### 7.4 useWorkflowAutomation

**Fichier :** `src/hooks/useWorkflowAutomation.ts`

```typescript
const {
  autoLinkTranscriptionToRaw,
  autoLinkTranscriptionToBookProject,
  autoCreateDocumentFromBookProject,
  autoCreateDocumentFromProofreadingV1,
  finalizeTranscription,
  finalizeProofreadingV1,
  finalizeProofreadingV2,
  completeTranscriptionImportWorkflow
} = useWorkflowAutomation();
```

**Fonctions clés :**
- `autoLinkTranscriptionToRaw(transcriptionId, rawFileId)` : Liaison auto
- `finalizeTranscription(id, rawFileId, content)` : Bouton "Fin"
- `finalizeProofreadingV1(id, content, corrections)` : Validation R1
- `finalizeProofreadingV2(id, content, corrections)` : Validation R2

### 7.5 useLineage

**Fichier :** `src/hooks/useLineage.ts`

```typescript
const { lineage, loading, error, getLineageSummary, getNextStep } = useLineage(rawFileId);
```

**Retourne :**
```typescript
interface LineageData {
  raw_file: RawFileData;
  transcriptions: TranscriptionData[];
  book_projects: BookProjectData[];
  proofreading_v1: ProofreadingV1Data[];
  proofreading_v2: ProofreadingV2Data[];
  linked_documents: LinkedDocumentData[];
  global_progress: number;
}
```

### 7.6 useImportWorkflow

**Fichier :** `src/hooks/useImportWorkflow.ts`

```typescript
const {
  importRawFile,
  importTranscription,
  importBookProject,
  importProofreadingV1,
  importProofreadingV2,
  state,
  reset
} = useImportWorkflow();
```

**Gère :**
- Import de fichiers bruts
- Import de transcriptions avec validation
- Import de projets de livres
- Import de relectures R1/R2
- État global de l'import

### 7.7 useDocumentMediaSync

**Fichier :** `src/hooks/useDocumentMediaSync.ts`

```typescript
const {
  getLinkedDocuments,
  linkMediaToDocument,
  updateMediaStatusFromDocument,
  isMediaFileProcessed
} = useDocumentMediaSync();
```

**Synchronise :**
- Documents ↔ MediaLibrary
- Statuts entre entités liées

### 7.8 useMediaLibrary

**Fichier :** `src/hooks/MediaLibrary/useMediaLibrary.ts`

```typescript
const {
  rawFiles,
  transcriptions,
  bookProjects,
  proofreadingV1,
  proofreadingV2,
  stats,
  loading,
  error,
  uploadRawFile,
  deleteRawFile,
  refreshAll
} = useMediaLibrary(linkStatusFilter);
```

**Filtre :**
- `linkStatusFilter` : 'all', 'linked', 'unlinked'

---

## 8. COMPOSANTS PRINCIPAUX

### 8.1 App.tsx (Racine)

**Structure :**
```typescript
<App>
  <Header />
  <TabNavigation />
  <Main>
    {activeTab === 'dashboard' && <Dashboard />}
    {activeTab === 'documents' && <Documents />}
    {activeTab === 'transcription' && <Transcription />}
    {activeTab === 'workflow' && <Workflow />}
    {activeTab === 'users' && <Users />}
    {activeTab === 'reports' && <Reports />}
  </Main>
  <Footer />
</App>
```

**Onglets :**
1. Tableau de bord
2. Documents
3. Transcription
4. Workflow
5. Utilisateurs
6. Rapports

### 8.2 Header

**Fonctionnalités :**
- Logo/Nom de l'application
- Navigation principale
- Profil utilisateur
- Bouton de déconnexion
- Toggle dark/light mode

### 8.3 TabNavigation

**Fonctionnalités :**
- Navigation par onglets
- Indicateur d'onglet actif
- Compteur d'éléments par onglet

### 8.4 DiffViewer

**Fichier :** `src/components/Documents/DiffViewer.tsx`

**Fonctionnalités :**
- Comparaison de deux versions d'un document
- Affichage des ajouts (vert) et suppressions (rouge)
- Utilisation de la bibliothèque `diff`

### 8.5 TranscriptionEditor

**Fichier :** `src/components/Transcription/TranscriptionEditor.tsx`

**Technologies :**
- TipTap (éditeur de texte riche)
- Extensions : Link, Placeholder, TextAlign

**Fonctionnalités :**
- Mise en forme (gras, italique, souligné)
- Liens hypertexte
- Alignement du texte
- Placeholder personnalisé
- Sauvegarde automatique

### 8.6 AudioPlayer

**Fichier :** `src/components/Transcription/AudioPlayer.tsx`

**Fonctionnalités :**
- Lecture/pause
- Avance/retour rapide
- Affichage du temps
- Support MP3, WAV, OGG, AAC, M4A

### 8.7 PDFViewer

**Fichier :** `src/components/Transcription/PDFViewer.tsx`

**Technologies :**
- react-pdf
- PDF.js

**Fonctionnalités :**
- Navigation par page
- Zoom avant/arrière
- Affichage responsive

### 8.8 BulkImportModal

**Fichier :** `src/components/MediaLibrary/modals/BulkImportModal.tsx`

**Fonctionnalités :**
- Drag-and-drop de multiples fichiers
- Appariement automatique par nom
- Édition manuelle des associations
- Validation groupée
- Rapport d'import détaillé

### 8.9 Modales Documents

**Dossier :** `src/components/Documents/modals/`

#### HistoryModal.tsx
**Fonctionnalités :**
- Affiche toutes les versions d'un document
- Pour chaque version : numéro, date, titre, statut, progression, assigné, tags
- Bouton **Comparer** : ouvre le DiffViewer avec la version précédente
- Bouton **Restaurer** : restaure une ancienne version
- Animations : fade-in, slide-down avec délai en cascade
- Support dark mode complet

**Props principales :**
```typescript
interface HistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  documentVersions: any[];
  onCompare: (version: any) => void;
  onRestore: (versionId: string) => void;
  formatDateTime: (date: string) => string;
  statusClass: (status: string) => string;
}
```

#### EditModal.tsx
**Fonctionnalités :**
- Formulaire complet de création/édition de document
- Champs : titre, type, source, statut, progression, assigné, tags
- Gestion des tags avec ajout/suppression
- **Sélecteur MediaLibrary** : choisir un fichier existant dans la médiathèque
- **FileUpload** : uploader un nouveau fichier
- Validation des champs obligatoires avec erreurs visuelles
- Animations : fade-in, scale-in, slide-up

**Props principales :**
```typescript
interface EditModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingDocument: any | null;
  newDocument: DocumentFormData;
  setNewDocument: (doc: DocumentFormData) => void;
  formErrors: { title: boolean; source: boolean; assigned_to: boolean };
  setFormErrors: (errors: any) => void;
  tagsInput: string;
  setTagsInput: (input: string) => void;
  onAddTag: () => void;
  onRemoveTag: (tag: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  
  // Synchronisation MediaLibrary
  selectedMediaFile: any | null;
  showMediaLibrarySelector: boolean;
  setShowMediaLibrarySelector: (show: boolean) => void;
  handleMediaFileSelect: (file: any) => void;
  handleRemoveMediaSelection: () => void;
  rawFiles: any[];
  mediaLoading: boolean;
  isCheckingFile: boolean;
}
```

#### StatusModal.tsx
**Fonctionnalités :**
- Changement de statut en masse pour documents sélectionnés
- Liste déroulante de tous les statuts disponibles
- Indicateur visuel (cercle coloré) pour chaque statut
- Affiche le nombre de documents sélectionnés
- Validation avec bouton dédié

**Props principales :**
```typescript
interface StatusModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedDocuments: string[];
  selectedStatus: DocumentStatus | null;
  setSelectedStatus: (status: DocumentStatus | null) => void;
  onValidate: (status: DocumentStatus) => void;
  documentStatuses: DocumentStatus[];
  statusClass: (status: string) => string;
}
```

#### AssigneeModal.tsx
**Fonctionnalités :**
- Réassignation en masse de documents
- Liste de tous les utilisateurs assignables
- Sélection avec indicateur visuel (ring bleu)
- Affiche le nombre de documents à réassigner
- Validation avec bouton dédié

**Props principales :**
```typescript
interface AssigneeModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedDocuments: string[];
  selectedAssignee: string | null;
  setSelectedAssignee: (assignee: string | null) => void;
  onValidate: (assignee: string) => void;
  assignees: string[];
}
```

---

## 9. SYSTÈME D'AUTHENTIFICATION

### 9.1 Configuration Supabase Auth

```typescript
// src/supabaseClient.ts
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseKey)
```

### 9.2 Table users

La table `users` étend `auth.users` avec des métadonnées :

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  email TEXT UNIQUE,
  full_name TEXT,
  role TEXT CHECK (role IN ('user', 'editor', 'admin')),
  -- Permissions
  can_import BOOLEAN DEFAULT TRUE,
  can_transcribe BOOLEAN DEFAULT TRUE,
  can_review BOOLEAN DEFAULT FALSE,
  can_edit BOOLEAN DEFAULT FALSE,
  can_delete BOOLEAN DEFAULT FALSE,
  can_manage_users BOOLEAN DEFAULT FALSE
);
```

### 9.3 Trigger de création automatique

```sql
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();
```

### 9.4 Rôles et permissions

| Permission | user | editor | admin |
|------------|------|--------|-------|
| Importer | ✅ | ✅ | ✅ |
| Transcrire | ✅ | ✅ | ✅ |
| Relire | ❌ | ✅ | ✅ |
| Éditer | ❌ | ✅ | ✅ |
| Supprimer | ❌ | ❌ | ✅ |
| Gérer utilisateurs | ❌ | ❌ | ✅ |

### 9.5 Row Level Security (RLS)

```sql
-- Policy: Les utilisateurs peuvent voir leur propre profil
CREATE POLICY "Users can view their own profile"
  ON users FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- Policy: Les admins peuvent voir tous les profils
CREATE POLICY "Admins can view all profiles"
  ON users FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin'
  ));
```

---

## 10. TRIGGERS ET AUTOMATISMES SQL

### 10.1 Vue d'ensemble

| # | Trigger | Table | Événement | Résultat |
|---|---------|-------|-----------|----------|
| 1 | `trigger_update_raw_file_status_on_transcription_link` | `transcription_raw_files` | INSERT | `raw_files.status = 'traité'` |
| 2 | `trigger_update_transcription_status_on_book_project_link` | `book_project_transcriptions` | INSERT | `transcriptions.status = 'projet_de_livre'` |
| 3 | `trigger_update_book_project_status_on_proofreading_v1` | `proofreading_v1` | INSERT | `book_projects.status = 'relecture_1_en_cours'` |
| 4 | `trigger_update_book_project_status_on_proofreading_v1_validated` | `proofreading_v1` | UPDATE | `book_projects.status = 'relecture_1_validé'` |
| 5 | `trigger_update_proofreading_v1_status_on_proofreading_v2` | `proofreading_v2` | INSERT | `proofreading_v1.status = 'relecture_2_en_cours'` |
| 6 | `trigger_update_proofreading_v1_status_on_proofreading_v2_validated` | `proofreading_v2` | UPDATE | `proofreading_v1.status = 'relecture_2_validé'` |
| 7 | `trigger_update_raw_file_link_count_on_document_link` | `document_media_links` | INSERT | `raw_files.is_linked = true` |
| 8 | `trigger_update_raw_file_link_count_on_document_unlink` | `document_media_links` | DELETE | `raw_files.is_linked = false/count` |
| 9 | `trigger_cleanup_transcription_links_on_raw_file_delete` | `raw_files` | UPDATE | Supprime liaisons |

### 10.2 Exemple de trigger

```sql
CREATE OR REPLACE FUNCTION update_raw_file_status_on_transcription_link()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE raw_files
  SET
    status = 'traité',
    is_linked = TRUE,
    linked_documents_count = (
      SELECT COUNT(*) FROM transcription_raw_files WHERE raw_file_id = NEW.raw_file_id
    ),
    metadata = jsonb_set(
      COALESCE(metadata, '{}'::jsonb),
      '{status_history}',
      (COALESCE(metadata->'status_history', '[]'::jsonb) ||
       jsonb_build_array(
         jsonb_build_object(
           'status', 'traité',
           'timestamp', NOW(),
           'reason', 'Liaison avec transcription',
           'transcription_id', NEW.transcription_id
         )
       ))::jsonb
    ),
    updated_at = NOW()
  WHERE id = NEW.raw_file_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_raw_file_status_on_transcription_link
  AFTER INSERT ON transcription_raw_files
  FOR EACH ROW
  EXECUTE FUNCTION update_raw_file_status_on_transcription_link();
```

### 10.3 Historique des statuts (metadata)

Chaque trigger met à jour le champ `metadata.status_history` :

```json
{
  "status_history": [
    {
      "status": "libre",
      "timestamp": "2025-01-15T10:00:00Z",
      "reason": "Import initial"
    },
    {
      "status": "traité",
      "timestamp": "2025-01-15T10:05:00Z",
      "reason": "Liaison avec transcription",
      "transcription_id": "uuid-transcription"
    },
    {
      "status": "transcrit",
      "timestamp": "2025-01-15T10:10:00Z",
      "reason": "Finalisation transcription"
    }
  ]
}
```

---

## 11. FONCTIONS SQL AVANCÉES

### 11.1 get_raw_file_lineage()

**Fichier :** `Supabase/migrations/007_create_lineage_function.sql`

**Signature :**
```sql
SELECT get_raw_file_lineage(p_raw_file_id UUID)
RETURNS JSONB
```

**Retourne :**
```json
{
  "raw_file": {
    "id": "uuid",
    "file_name": "interview_001.mp3",
    "file_type": "audio/mpeg",
    "status": "transcrit",
    "is_linked": true
  },
  "transcriptions": [
    {
      "id": "uuid",
      "title": "interview_001.txt",
      "content": "...",
      "status": "projet_de_livre",
      "progress": 50
    }
  ],
  "book_projects": [
    {
      "id": "uuid",
      "title": "Mon Livre",
      "status": "relecture_1_en_cours",
      "progress": 60
    }
  ],
  "proofreading_v1": [
    {
      "id": "uuid",
      "status": "relecture_1_validé",
      "corrections_count": 15
    }
  ],
  "proofreading_v2": [
    {
      "id": "uuid",
      "status": "relecture_2_validé",
      "corrections_count": 5
    }
  ],
  "linked_documents": [
    {
      "id": "uuid",
      "title": "Mon Livre_R1",
      "status": "relecture_1_validé"
    }
  ],
  "global_progress": 100
}
```

### 11.2 Fonctions de validation (Migration 010)

| Fonction | Paramètres | Retour | Description |
|----------|------------|--------|-------------|
| `validate_transcription_name()` | rawFileId, fileName | boolean | Vérifie nom transcription |
| `validate_proofreading_v1_name()` | projectId, fileName | boolean | Vérifie nom R1 |
| `validate_proofreading_v2_name()` | r1Id, fileName | boolean | Vérifie nom R2 |
| `generate_expected_transcription_name()` | rawFileId | string | Génère nom attendu |
| `generate_expected_proofreading_v1_name()` | projectId | string | Génère nom R1 attendu |
| `generate_expected_proofreading_v2_name()` | r1Id | string | Génère nom R2 attendu |
| `validate_and_suggest_transcription_correction()` | id, fileName | JSONB | Valide + suggère |
| `validate_and_suggest_proofreading_v1_correction()` | id, fileName | JSONB | Valide + suggère |
| `validate_and_suggest_proofreading_v2_correction()` | id, fileName | JSONB | Valide + suggère |
| `check_transcription_import_requirements()` | fileName | JSONB | Vérifie requirements |

### 11.3 Exemple : validate_transcription_name()

```sql
CREATE OR REPLACE FUNCTION validate_transcription_name(
  p_raw_file_id UUID,
  p_transcription_file_name TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
  raw_file_name TEXT;
  expected_base_name TEXT;
  provided_base_name TEXT;
BEGIN
  -- Récupérer le nom du fichier brut
  SELECT file_name INTO raw_file_name
  FROM raw_files
  WHERE id = p_raw_file_id;

  IF raw_file_name IS NULL THEN
    RETURN FALSE;
  END IF;

  -- Extraire la base du nom (sans extension)
  expected_base_name := SUBSTRING(raw_file_name FROM '(.*)\.[^.]*$');
  provided_base_name := SUBSTRING(p_transcription_file_name FROM '(.*)\.[^.]*$');

  -- Vérifier que l'extension est .txt
  IF p_transcription_file_name NOT LIKE '%.txt' THEN
    RETURN FALSE;
  END IF;

  -- Vérifier que la base du nom correspond
  RETURN LOWER(expected_base_name) = LOWER(provided_base_name);
END;
$$ LANGUAGE plpgsql;
```

---

## 12. GESTION DES FICHIERS ET VALIDATION

### 12.1 Formats supportés

| Type | Formats | Taille max |
|------|---------|------------|
| **Audio** | MP3, WAV, OGG, AAC, M4A | 100 MB |
| **PDF** | PDF | 50 MB |
| **Images** | JPG, PNG, GIF, WEBP | 10 MB |
| **Texte** | TXT, DOCX | 5 MB |

### 12.2 Bucket Supabase Storage

```typescript
// Structure des buckets
bcm-gest-react/
├── raw-files/          # Fichiers bruts
├── transcriptions/     # Fichiers de transcription
├── book-projects/      # Projets de livres
├── proofreading-v1/    # Relectures 1
├── proofreading-v2/    # Relectures 2
└── documents/          # Documents finaux
```

### 12.3 Upload de fichiers

```typescript
// Exemple avec useFileUpload
const { upload, loading, error } = useFileUpload();

const handleUpload = async (file: File, bucket: string) => {
  const result = await upload(file, bucket);
  if (result.success) {
    console.log('File URL:', result.url);
  }
};
```

### 12.4 Validation des noms

**Règles :**

| Type | Règle | Exemple valide | Exemple invalide |
|------|-------|----------------|------------------|
| Transcription | Même base que brut + `.txt` | `interview.mp3` → `interview.txt` | `interview.mp3` → `autre.txt` |
| R1 | Titre projet + `_R1.pdf` | `Mon Livre` → `Mon Livre_R1.pdf` | `Mon Livre` → `R1.pdf` |
| R2 | Titre projet + `_R2.pdf` | `Mon Livre` → `Mon Livre_R2.pdf` | `Mon Livre` → `R2.pdf` |

**Fonction de validation :**

```typescript
const { validateTranscriptionName } = useFileValidation();

const isValid = await validateTranscriptionName(rawFileId, 'interview.txt');
if (!isValid) {
  const suggestion = await generateExpectedTranscriptionName(rawFileId);
  console.log(`Nom attendu: ${suggestion}`);
}
```

---

## 13. VERSIONING ET HISTORIQUE

### 13.1 Table document_versions

```sql
CREATE TABLE document_versions (
  id UUID PRIMARY KEY,
  document_id UUID REFERENCES documents(id),
  version_number INT NOT NULL,
  title TEXT,
  content TEXT,
  status TEXT,
  created_by UUID REFERENCES users(id),
  restored_from_version UUID,
  restoration_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE
);
```

### 13.2 Cycle de versioning

```
Document v1 (création)
    │
    ▼
Modification → Document v2 (version précédente sauvegardée)
    │
    ▼
Modification → Document v3 (version précédente sauvegardée)
    │
    ▼
Restauration v1 → Document v4 (copie de v1 + métadonnées)
```

### 13.3 Comparaison de versions (Diff)

```typescript
// Utilisation de DiffViewer
import DiffViewer from './DiffViewer';

<DiffViewer
  original={version1.content}
  modified={version2.content}
  originalTitle="Version 1"
  modifiedTitle="Version 2"
/>
```

### 13.4 Restauration

```typescript
const { restoreDocumentVersion } = useDocuments();

await restoreDocumentVersion(
  documentId,
  versionId,
  "Erreur dans la version actuelle"
);
```

---

## 14. INTERFACE UTILISATEUR

### 14.1 Navigation

**Structure :**
```
┌────────────────────────────────────────────────────┐
│  Header (Logo, Navigation, Profil)                 │
├────────────────────────────────────────────────────┤
│  TabNavigation (Onglets)                           │
├────────────────────────────────────────────────────┤
│                                                    │
│  Contenu principal (Module actif)                  │
│                                                    │
├────────────────────────────────────────────────────┤
│  Footer (Copyright, Liens)                         │
└────────────────────────────────────────────────────┘
```

### 14.2 Thème

**Mode clair/sombre :**
- Bascule manuelle dans le Header
- Classes Tailwind : `dark:bg-gray-900`, `dark:text-white`

**Couleurs par statut :**

| Statut | Couleur | Classe Tailwind |
|--------|---------|-----------------|
| `libre` | Gris | `bg-gray-100 text-gray-800` |
| `traité` | Jaune | `bg-yellow-100 text-yellow-800` |
| `transcrit` | Vert | `bg-green-100 text-green-800` |
| `projet_de_livre` | Indigo | `bg-indigo-100 text-indigo-800` |
| `relecture_1_en_cours` | Orange | `bg-amber-100 text-amber-800` |
| `relecture_1_validé` | Bleu | `bg-blue-100 text-blue-800` |
| `relecture_2_validé` | Violet | `bg-purple-100 text-purple-800` |

### 14.3 Composants réutilisables

- **Boutons** : Styles cohérents avec variants (primary, secondary, danger)
- **Inputs** : Border, focus ring, dark mode
- **Modales** : Overlay, animation, close button
- **Cartes** : Shadow, rounded, hover effects
- **Badges** : Status pills colorées

### 14.4 Responsive

- Mobile-first avec Tailwind
- Breakpoints : `sm:`, `md:`, `lg:`, `xl:`
- Grilles adaptatives : `grid-cols-1 md:grid-cols-2`

---

## 15. CONFIGURATION ET ENVIRONNEMENT

### 15.1 Variables d'environnement

**Fichier : `.env`**
```env
VITE_SUPABASE_URL=https://vuggjlvdgahcanjtrfvv.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_ogzqJ2mmmgD0CQwOQbir6g_WAfZidfH
```

### 15.2 Vite Configuration

**Fichier : `vite.config.ts`**
```typescript
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@components': path.resolve(__dirname, './src/components'),
      '@hooks': path.resolve(__dirname, './src/hooks'),
    },
  },
  server: {
    port: 3000,
    open: true,
  },
  build: {
    outDir: 'build',
    sourcemap: true,
  },
});
```

### 15.3 Tailwind Configuration

**Fichier : `tailwind.config.js`**
```javascript
module.exports = {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: '#3B82F6',
        secondary: '#10B981',
      },
    },
  },
  plugins: [],
};
```

---

## 16. SCRIPTS ET COMMANDES

### 16.1 Scripts npm

| Commande | Description |
|----------|-------------|
| `npm run dev` | Démarre le serveur de développement (port 3000) |
| `npm run build` | Compile pour la production |
| `npm run preview` | Prévisualise la build de production |
| `npm run lint` | Vérifie le code avec ESLint |

### 16.2 Installation

```bash
# 1. Cloner le repository
git clone <repository-url>
cd bcm-gest-react

# 2. Installer les dépendances
npm install

# 3. Configurer les variables d'environnement
cp .env.example .env.local
# Éditer .env.local avec vos clés Supabase

# 4. Appliquer les migrations SQL
# Via l'interface Supabase SQL Editor ou :
# supabase db push

# 5. Démarrer le serveur de développement
npm run dev
```

### 16.3 Build de production

```bash
# Compiler
npm run build

# Le résultat est dans le dossier build/
# Structure :
# build/
# ├── index.html
# ├── assets/
# │   ├── index-[hash].js
# │   ├── index-[hash].css
# │   └── [autres assets]
# └── asset-manifest.json
```

---

## 17. BONNES PRATIQUES

### 17.1 Nommage des fichiers

- **Respecter scrupuleusement** les conventions de nommage
- **Vérifier avant import** avec `useFileValidation`
- **Utiliser les suggestions** de correction

### 17.2 Gestion des statuts

- **Toujours utiliser les triggers** pour les transitions
- **Ne jamais modifier manuellement** sauf exception
- **Vérifier la cohérence** avec `get_raw_file_lineage()`

### 17.3 Versioning

- **Chaque modification importante** crée une nouvelle version
- **Inclure un commentaire** de version significatif
- **Utiliser la comparaison (diff)** avant restauration

### 17.4 Performance

- **Pagination activée** sur les listes (6-12 items/page)
- **Chargement lazy** des modales et composants lourds
- **Skeleton loaders** pendant le chargement
- **Memoization** avec `useMemo` pour les filtres

### 17.5 Sécurité

- **Row Level Security (RLS)** activé sur toutes les tables
- **Permissions par rôle** strictement appliquées
- **Jamais de clés secrètes** dans le frontend
- **Validation côté serveur** avec fonctions SQL

### 17.6 Code quality

- **TypeScript strict** : pas de `any` sauf nécessité
- **ESLint** : règles activées dans `tsconfig.json`
- **Composants modulaires** : une responsabilité par composant
- **Hooks réutilisables** : logique métier dans les hooks

---

## 18. DÉBOGAGE ET TESTS

### 18.1 Logs utiles

```typescript
// État actuel
console.log('État:', { documents, loading, error });

// Lignée éditoriale
const lineage = await supabase.rpc('get_raw_file_lineage', {
  p_raw_file_id: 'uuid'
});
console.log('Lignée:', lineage.data);

// Validation de nom
const isValid = await supabase.rpc('validate_transcription_name', {
  p_raw_file_id: 'uuid',
  p_transcription_file_name: 'interview.txt'
});
console.log('Valide:', isValid.data);
```

### 18.2 Vues de contrôle SQL

```sql
-- Projets sans R1
SELECT * FROM projects_without_proofreading_v1;

-- R1 sans R2
SELECT * FROM proofreading_v1_without_proofreading_v2;

-- Doublons R1 (devrait être vide)
SELECT * FROM potential_proofreading_v1_duplicates;

-- Doublons R2 (devrait être vide)
SELECT * FROM potential_proofreading_v2_duplicates;
```

### 18.3 Tester les fonctions SQL

```sql
-- Tester la validation de nom
SELECT validate_transcription_name(
  'uuid-raw-file',
  'interview_001.txt'
); -- true ou false

-- Tester avec suggestion
SELECT validate_and_suggest_transcription_correction(
  'uuid-raw-file',
  'mauvais_nom.txt'
);
-- {"is_valid": false, "expected_name": "interview_001.txt", ...}

-- Obtenir la lignée complète
SELECT get_raw_file_lineage('uuid-raw-file');
```

### 18.4 Realtime debugging

```typescript
// Écouter les changements
const channel = supabase
  .channel('documents-changes')
  .on(
    'postgres_changes',
    { event: '*', schema: 'public', table: 'documents' },
    (payload) => {
      console.log('Changement détecté:', payload);
    }
  )
  .subscribe();

// Se désabonner
supabase.removeChannel(channel);
```

### 18.5 Erreurs courantes

| Erreur | Cause | Solution |
|--------|-------|----------|
| `Invalid API key` | Clé Supabase incorrecte | Vérifier `.env` |
| `Row not found` | ID inexistant | Vérifier l'ID dans la DB |
| `Permission denied` | RLS bloque | Vérifier les policies |
| `Function not found` | Migration non appliquée | Appliquer la migration |
| `Unique constraint violated` | Doublon R1/R2 | Vérifier l'unicité |

---

## 📚 RESSOURCES SUPPLÉMENTAIRES

### Documentation interne

- `README.md` — Documentation principale
- `WORKFLOW_IMPLEMENTATION.md` — Détails de l'implémentation du workflow
- `MEDIA_LIBRARY_EDIT_INSTRUCTIONS.md` — Guide de modification de la MediaLibrary

### Migrations SQL

- `Supabase/migrations/000_*.sql` — Schéma de base de données
- `Supabase/migrations/007_*.sql` — Fonction de lignée
- `Supabase/migrations/008_*.sql` — Triggers d'automatisation
- `Supabase/migrations/009_*.sql` — Contraintes d'unicité
- `Supabase/migrations/010_*.sql` — Fonctions de validation

### Liens externes

- [React Documentation](https://react.dev)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [Supabase Docs](https://supabase.com/docs)
- [TanStack Query](https://tanstack.com/query/latest)
- [TipTap Editor](https://tiptap.dev/docs)

---

## 👥 CONTRIBUTEURS

Développé par l'équipe BCM-GEST.

---

## 📄 LICENCE

Propriétaire — Tous droits réservés.

---

*Document généré le 8 mars 2026*  
*Version : 1.0.0*

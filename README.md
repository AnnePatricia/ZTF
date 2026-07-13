# 📚 BCM-GEST — Système de Gestion Éditoriale

**BCM-GEST** est une application web moderne de gestion de flux éditorial, conçue pour accompagner le processus complet de production de contenu : depuis l'import de fichiers bruts (audio, PDF, images) jusqu'à la publication finale, en passant par la transcription, la création de projets de livres et les relectures multiples.

---

## 🎯 Vue d'ensemble

### Objectif principal

Centraliser et automatiser le workflow éditorial d'une maison d'édition ou d'un service de production de contenu, avec :

- **Traçabilité complète** : Chaque fichier brut peut être suivi à travers toutes les étapes de transformation
- **Automatisation** : Transitions de statut gérées automatiquement par des triggers SQL
- **Collaboration** : Gestion multi-utilisateurs avec rôles et permissions
- **Versioning** : Historique complet des modifications sur chaque document

### Stack Technique

| Couche | Technologie |
|--------|-------------|
| **Frontend** | React 19 + TypeScript |
| **Build Tool** | Vite 7 |
| **Styling** | Tailwind CSS |
| **State Management** | React Context + Custom Hooks |
| **Data Fetching** | TanStack Query (React Query) |
| **Backend** | Supabase (PostgreSQL + Auth + Storage) |
| **Éditeur de texte** | TipTap (Rich Text Editor) |
| **PDF** | React-PDF + PDF.js |
| **Audio** | Lecteur audio natif HTML5 |

---

## 🏗️ Architecture de l'application

### Structure des dossiers

```
bcm-gest-react/
├── src/
│   ├── components/          # Composants React organisés par fonctionnalité
│   │   ├── common/          # Composants partagés (Header, Footer, Navigation)
│   │   ├── Dashboard/       # Tableau de bord
│   │   ├── Documents/       # Gestion des documents
│   │   ├── MediaLibrary/    # Médiathèque (fichiers bruts, transcriptions, projets)
│   │   ├── Transcription/   # Module de transcription
│   │   ├── Workflow/        # Vue du workflow éditorial
│   │   ├── Users/           # Gestion des utilisateurs
│   │   ├── Reports/         # Rapports et statistiques
│   │   └── Login/           # Authentification
│   ├── hooks/               # Hooks personnalisés
│   │   ├── MediaLibrary/    # Hooks spécifiques à la médiathèque
│   │   ├── useAuth.ts       # Authentification
│   │   ├── useDocuments.ts  # Gestion des documents
│   │   ├── useFileValidation.ts     # Validation des noms de fichiers
│   │   ├── useWorkflowAutomation.ts # Automatismes de workflow
│   │   └── useLineage.ts    # Lignée éditoriale
│   ├── context/             # Contextes React (AppState, Auth)
│   ├── types/               # Types TypeScript
│   └── supabaseClient.ts    # Configuration Supabase
├── Supabase/
│   └── migrations/          # Migrations SQL (schéma de base de données)
└── public/                  # Assets statiques
```

---

## 🔄 Workflow Éditorial Complet

### Vue d'ensemble du flux

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           WORKFLOW ÉDITORIAL BCM-GEST                       │
└─────────────────────────────────────────────────────────────────────────────┘

ÉTAPE 1: FICHIER BRUT (0%)
┌──────────────────────────────────────────────────────────────────────────────┐
│ 📁 Import dans MediaLibrary                                                  │
│    • Formats supportés: MP3, WAV, PDF, images                                │
│    • Statut initial: "libre"                                                 │
│    • Validation: Nom du fichier unique                                       │
│                                                                              │
│ 🔗 Liaison avec une transcription                                            │
│    • Validation du nom: interview_001.mp3 → interview_001.txt                │
│    • Trigger SQL: statut brut → "traité"                                     │
│    • is_linked: true                                                         │
└──────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
ÉTAPE 2: TRANSCRIPTION (15-30%)
┌──────────────────────────────────────────────────────────────────────────────┐
│ ✏️ Transcription créée                                                       │
│    • Statut: "transcription_en_cours" (15%)                                  │
│    • Interface: Lecteur audio/PDF + Éditeur de texte                         │
│    • Sauvegarde automatique (brouillon local)                                │
│                                                                              │
│ ✅ Finalisation (Bouton "Fin")                                               │
│    • Statut → "transcrit" (30%)                                              │
│    • Trigger: statut brut → "transcrit"                                      │
│    • Contenu verrouillé pour relecture                                       │
│                                                                              │
│ 📖 Création d'un projet de livre                                             │
│    • Regroupement de plusieurs transcriptions                                │
│    • Validation: titre du projet                                             │
│    • Trigger: statut transcription → "projet_de_livre"                       │
└──────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
ÉTAPE 3: PROJET DE LIVRE (50%)
┌──────────────────────────────────────────────────────────────────────────────┐
│ 📚 Projet créé                                                               │
│    • Statut: "projet_de_livre" (50%)                                         │
│    • Titre: "Mon Livre"                                                      │
│    • Transcriptions liées: interview_001.txt, interview_002.txt...           │
│                                                                              │
│ 📝 Création Relecture 1 (R1)                                                 │
│    • Validation: "Mon Livre_R1.pdf" ✓                                        │
│    • Contrainte: 1 projet = 1 R1 UNIQUE                                      │
│    • Trigger: statut projet → "relecture_1_en_cours"                         │
└──────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
ÉTAPE 4: RELECTURE 1 (60-70%)
┌──────────────────────────────────────────────────────────────────────────────┐
│ 👁️ Relecture 1 en cours                                                      │
│    • Statut: "relecture_1_en_cours" (60%)                                    │
│    • Assignation à un relecteur                                              │
│    • Comptage des corrections                                                │
│                                                                              │
│ ✅ Validation (Bouton "Fin")                                                 │
│    • Statut → "relecture_1_validé" (70%)                                     │
│    • Trigger: statut projet → "relecture_1_validé"                           │
│                                                                              │
│ 📝 Création Relecture 2 (R2)                                                 │
│    • Validation: "Mon Livre_R2.pdf" ✓                                        │
│    • Contrainte: 1 R1 = 1 R2 UNIQUE                                          │
│    • Trigger: statut R1 → "relecture_2_en_cours"                             │
└──────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
ÉTAPE 5: RELECTURE 2 (85-100%)
┌──────────────────────────────────────────────────────────────────────────────┐
│ 👁️ Relecture 2 en cours                                                      │
│    • Statut: "relecture_2_en_cours" (85%)                                    │
│    • Second relecteur                                                        │
│    • Corrections finales                                                     │
│                                                                              │
│ ✅ Validation finale (Bouton "Fin")                                          │
│    • Statut → "relecture_2_validé" (100%)                                    │
│    • Trigger: statut R1 → "relecture_2_validé"                               │
│    • ✅ WORKFLOW TERMINÉ — PRÊT POUR PUBLICATION                             │
└──────────────────────────────────────────────────────────────────────────────┘
```

### Tableau des statuts

| Statut | Progression | Description |
|--------|-------------|-------------|
| `libre` | 0% | Fichier brut importé, non lié |
| `traité` | 15% | Fichier brut lié à une transcription |
| `transcription_en_cours` | 15% | Transcription en cours de saisie |
| `transcrit` | 30% | Transcription finalisée |
| `projet_de_livre` | 50% | Regroupé dans un projet de livre |
| `relecture_1_en_cours` | 60% | Première relecture en cours |
| `relecture_1_validé` | 70% | Première relecture validée |
| `relecture_2_en_cours` | 85% | Deuxième relecture en cours |
| `relecture_2_validé` | 100% | Workflow complet terminé |

---

## 📦 Modules fonctionnels

### 1. **Authentification (Login)**

- Connexion via email/mot de passe
- Inscription avec nom complet
- Gestion de session via Supabase Auth
- Rôles utilisateurs : `user`, `editor`, `admin`

**Permissions par rôle :**

| Permission | user | editor | admin |
|------------|------|--------|-------|
| Importer | ✅ | ✅ | ✅ |
| Transcrire | ✅ | ✅ | ✅ |
| Relire | ❌ | ✅ | ✅ |
| Éditer | ❌ | ✅ | ✅ |
| Supprimer | ❌ | ❌ | ✅ |
| Gérer utilisateurs | ❌ | ❌ | ✅ |

---

### 2. **Tableau de bord (Dashboard)**

Vue d'ensemble avec indicateurs clés :

- Nombre de documents par statut
- Tâches assignées à l'utilisateur
- Activité récente
- Statistiques de production

---

### 3. **Documents**

Gestion complète des documents avec :

- **CRUD** : Créer, Lire, Mettre à jour, Supprimer
- **Filtres** : Par statut, type, assigné, tags
- **Recherche** : Recherche plein texte sur tous les champs
- **Versioning** : Historique des versions avec comparaison (diff)
- **Bulk Actions** : Actions en masse (changer statut, réassigner)
- **Liaison MediaLibrary** : Lier un document à un fichier brut

**Fonctionnalités avancées :**
- Comparaison de versions (DiffViewer)
- Restauration d'anciennes versions
- Export PDF
- Partage par lien
- Duplication de documents

---

### 4. **Médiathèque (MediaLibrary)**

Cœur du système de gestion de fichiers :

#### 4.1. Vue "Bibliothèque"
- Grille ou liste des fichiers bruts
- Filtres : type (audio, PDF, image), statut éditorial, date
- Indicateur de liaison (libre/lié)
- Stats en temps réel

#### 4.2. Vue "Flux Éditorial"
- Visualisation arborescente de la lignée éditoriale
- Progression globale par fichier brut
- Liens entre : brut → transcriptions → projets → relectures

#### 4.3. Import avec validation
- Validation automatique des noms de fichiers
- Suggestions de correction
- Liaison automatique lors de l'import

**Règles de nommage :**

| Type | Règle | Exemple |
|------|-------|---------|
| Transcription | Même nom que le brut + .txt | `interview_001.mp3` → `interview_001.txt` |
| Relecture 1 | Titre du projet + `_R1.pdf` | `Mon Livre` → `Mon Livre_R1.pdf` |
| Relecture 2 | Titre du projet + `_R2.pdf` | `Mon Livre` → `Mon Livre_R2.pdf` |

#### 4.4. Import en masse (BulkImportModal)

Fonctionnalité avancée pour importer plusieurs paires de fichiers simultanément :

**Types d'appariement supportés :**
1. **Fichier Brut → Transcription** : Import de bruts avec leurs transcriptions
2. **Transcription → Projet de Livre** : Regroupement de transcriptions en projet
3. **Projet de Livre → Relecture 1** : Création de R1 liée à un projet
4. **Relecture 1 → Relecture 2** : Création de R2 liée à une R1

**Modes d'appariement :**
- **1↔1 (Un par un)** : Chaque fichier source est apparié avec sa cible correspondante
- **N↔1 (Groupe)** : Plusieurs fichiers sources vers une seule cible (pour raw-transcription et transcription-book uniquement)

**Fonctionnalités clés :**
- **Appariement automatique** : Détection par nom de fichier (ex: `interview_001.mp3` + `interview_001.txt`)
- **Édition manuelle** : Dissocier, réassocier, réorganiser par drag-and-drop
- **Validation groupée** : Vérification des noms avant import avec possibilité de rejeter certains fichiers
- **Rapport détaillé** : Succès, erreurs et ignorés avec logs complets
- **Gestion des contraintes** : Vérification d'unicité (1 projet = 1 R1, 1 R1 = 1 R2)

**Exemple d'utilisation :**
```typescript
// Dans MediaLibrary.tsx
<BulkImportModal
  isOpen={isBulkImportModalOpen}
  onClose={() => setIsBulkImportModalOpen(false)}
  rawFiles={rawFiles}
  transcriptions={transcriptions}
  bookProjects={bookProjects}
  proofreadingV1={proofreadingV1}
  onImportSuccess={() => {
    refreshAll(); // Rafraîchir les données après import
  }}
/>
```

**Workflow d'import en masse :**
1. Choisir le type d'appariement
2. Sélectionner tous les fichiers (drag-and-drop)
3. Apparier automatiquement (ou manuellement)
4. Valider les noms de fichiers proposés
5. Lancer l'import
6. Consulter le rapport d'import

---

### 5. **Transcription**

Module dédié à la transcription de contenus :

#### 5.1. Onglet "Lancement"
- Documents à transcrire (`imported`, `transcribing`)
- Lecteur audio intégré (MP3, WAV, OGG, AAC, M4A)
- Visualiseur PDF
- Éditeur de texte riche (TipTap)
- Sauvegarde automatique (brouillon local)
- Raccourcis clavier (Ctrl+S, Échap)

#### 5.2. Onglet "Relecture"
- Transcriptions terminées à relire
- Comparaison avec l'original
- Validation avec passage au statut supérieur

#### 5.3. Onglet "Tagging"
- Ajout de métadonnées
- Catégorisation
- Assignation à des projets

---

### 6. **Workflow**

Vue globale du flux de production :

- Kanban par étape du workflow
- Assignation des tâches
- Suivi de progression
- Goulots d'étranglement

---

### 7. **Utilisateurs**

Gestion des comptes et permissions :

- Liste des utilisateurs actifs
- Rôles et permissions
- Statistiques par utilisateur
- Création/modification de comptes

---

### 8. **Rapports (Reports)**

Statistiques et analytics :

- Production par période
- Temps moyen par étape
- Performance par relecteur
- Taux de correction

---

## 🗄️ Modèle de données (Supabase)

### Tables principales

```sql
-- Utilisateurs (étend auth.users)
users (
  id UUID PRIMARY KEY,
  email TEXT,
  full_name TEXT,
  role TEXT CHECK (role IN ('user', 'editor', 'admin')),
  can_import BOOLEAN,
  can_transcribe BOOLEAN,
  can_review BOOLEAN,
  can_edit BOOLEAN,
  can_delete BOOLEAN,
  can_manage_users BOOLEAN
)

-- Fichiers bruts
raw_files (
  id UUID PRIMARY KEY,
  file_name TEXT,
  file_type TEXT,
  file_url TEXT,
  file_size BIGINT,
  status TEXT,  -- libre, traité, transcrit, etc.
  is_linked BOOLEAN,
  imported_at TIMESTAMP
)

-- Transcriptions
transcriptions (
  id UUID PRIMARY KEY,
  title TEXT,
  content TEXT,
  status TEXT,
  raw_file_id UUID REFERENCES raw_files(id),
  transcribed_by UUID REFERENCES users(id)
)

-- Projets de livres
book_projects (
  id UUID PRIMARY KEY,
  title TEXT,
  status TEXT,
  created_by UUID REFERENCES users(id)
)

-- Relecture 1
proofreading_v1 (
  id UUID PRIMARY KEY,
  book_project_id UUID REFERENCES book_projects(id),
  file_url TEXT,
  status TEXT,
  reviewer UUID REFERENCES users(id),
  corrections_count INT
)

-- Relecture 2
proofreading_v2 (
  id UUID PRIMARY KEY,
  proofreading_v1_id UUID REFERENCES proofreading_v1(id),
  file_url TEXT,
  status TEXT,
  reviewer UUID REFERENCES users(id),
  corrections_count INT
)

-- Tables de liaison
transcription_raw_files (transcription_id, raw_file_id)
book_project_transcriptions (book_project_id, transcription_id)
document_media_links (document_id, media_file_id, status)
```

### Triggers d'automatisation

| Trigger | Action | Résultat |
|---------|--------|----------|
| `trigger_update_raw_file_status_on_transcription_link` | INSERT sur `transcription_raw_files` | `raw_files.status = 'traité'` |
| `trigger_update_transcription_status_on_book_project_link` | INSERT sur `book_project_transcriptions` | `transcriptions.status = 'projet_de_livre'` |
| `trigger_update_book_project_status_on_proofreading_v1` | INSERT sur `proofreading_v1` | `book_projects.status = 'relecture_1_en_cours'` |
| `trigger_update_book_project_status_on_proofreading_v1_validated` | UPDATE sur `proofreading_v1` | `book_projects.status = 'relecture_1_validé'` |
| `trigger_update_proofreading_v1_status_on_proofreading_v2` | INSERT sur `proofreading_v2` | `proofreading_v1.status = 'relecture_2_en_cours'` |
| `trigger_update_proofreading_v1_status_on_proofreading_v2_validated` | UPDATE sur `proofreading_v2` | `proofreading_v1.status = 'relecture_2_validé'` |

### Fonction de lignée éditoriale

```sql
-- Retourne la lignée complète d'un fichier brut
SELECT get_raw_file_lineage('uuid-du-fichier-brut');
```

**Réponse JSON :**
```json
{
  "raw_file": { "id": "...", "file_name": "interview_001.mp3", ... },
  "transcriptions": [{ "id": "...", "title": "interview_001.txt", ... }],
  "book_projects": [{ "id": "...", "title": "Mon Livre", ... }],
  "proofreading_v1": [{ "id": "...", "status": "relecture_1_validé", ... }],
  "proofreading_v2": [{ "id": "...", "status": "relecture_2_validé", ... }],
  "linked_documents": [{ "id": "...", "title": "Mon Livre_R1", ... }],
  "global_progress": 100
}
```

---

## 🎨 Interface utilisateur

### Navigation

L'application utilise une navigation par onglets :

1. **Tableau de bord** — Vue d'ensemble
2. **Documents** — Gestion des documents
3. **Transcription** — Module de transcription
4. **Workflow** — Flux de production
5. **Utilisateurs** — Gestion des comptes
6. **Rapports** — Statistiques

### Thème

- **Mode clair/sombre** : Bascule automatique ou manuelle
- **Couleurs par statut** : Code couleur cohérent pour les statuts
- **Responsive** : Adapté mobile, tablette, desktop

### Composants réutilisables

- `Header` — En-tête avec navigation et profil
- `Footer` — Pied de page
- `TabNavigation` — Navigation par onglets
- `DiffViewer` — Comparaison de versions
- `PDFViewer` — Visualiseur PDF
- `AudioPlayer` — Lecteur audio
- `TranscriptionEditor` — Éditeur de texte riche

---

## 🚀 Démarrage

### Prérequis

- Node.js 18+
- npm ou yarn
- Compte Supabase

### Installation

```bash
# 1. Cloner le repository
git clone <repository-url>
cd bcm-gest-react

# 2. Installer les dépendances
npm install

# 3. Configurer les variables d'environnement
# Copier .env.local.example vers .env.local
# Remplir avec vos clés Supabase
VITE_SUPABASE_URL=votre_url_supabase
VITE_SUPABASE_ANON_KEY=votre_clé_anon

# 4. Appliquer les migrations SQL
# Via l'interface Supabase ou en CLI :
# supabase db push

# 5. Démarrer le serveur de développement
npm run dev
```

### Scripts disponibles

| Commande | Description |
|----------|-------------|
| `npm run dev` | Démarrer le serveur de développement |
| `npm run build` | Compiler pour la production |
| `npm run preview` | Prévisualiser la build de production |
| `npm run lint` | Vérifier le code avec ESLint |

---

## 🔧 Hooks personnalisés

### `useAuth`
Gestion de l'authentification.

```typescript
const { user, loading, signIn, signUp, signOut } = useAuth();
```

### `useDocuments`
Gestion des documents (CRUD + versioning).

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

### `useMediaLibrary`
Gestion de la médiathèque.

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

### `useFileValidation`
Validation des noms de fichiers.

```typescript
const {
  validateTranscriptionName,
  validateProofreadingV1Name,
  validateProofreadingV2Name,
  generateExpectedTranscriptionName,
  validateAndSuggestTranscriptionCorrection,
  checkTranscriptionImportRequirements
} = useFileValidation();
```

### `useWorkflowAutomation`
Automatismes de workflow.

```typescript
const {
  autoLinkTranscriptionToRaw,
  autoCreateDocumentFromBookProject,
  finalizeTranscription,
  finalizeProofreadingV1,
  finalizeProofreadingV2
} = useWorkflowAutomation();
```

### `useLineage`
Lignée éditoriale.

```typescript
const { lineage, loading, error, getLineageSummary, getNextStep } = useLineage(rawFileId);
```

### `useDocumentMediaSync`
Synchronisation Documents ↔ MediaLibrary.

```typescript
const {
  getLinkedDocuments,
  linkMediaToDocument,
  isMediaFileProcessed
} = useDocumentMediaSync();
```

---

## 📝 Bonnes pratiques

### Nommage des fichiers

Respecter scrupuleusement les conventions :

```
# Transcription
<interview_id>.txt  # Doit correspondre au fichier brut

# Relectures
<titre_projet>_R1.pdf
<titre_projet>_R2.pdf
```

### Gestion des statuts

- Toujours utiliser les triggers pour les transitions
- Ne jamais modifier un statut manuellement sauf exception
- Vérifier la cohérence avec `get_raw_file_lineage()`

### Versioning

- Chaque modification importante crée une nouvelle version
- Inclure un commentaire de version significatif
- Utiliser la comparaison (diff) avant restauration

### Performance

- Pagination activée sur les listes (6-12 items/page)
- Chargement lazy des modales
- Skeleton loaders pendant le chargement
- Memoization avec `useMemo` pour les filtres

---

## 🐛 Débogage

### Logs utiles

```typescript
// Activer le mode debug
console.log('État actuel:', { documents, loading, error });

// Vérifier la lignée
const lineage = await get_raw_file_lineage('uuid');
console.log('Lignée:', lineage);
```

### Vues de contrôle SQL

```sql
-- Projets sans R1
SELECT * FROM projects_without_proofreading_v1;

-- R1 sans R2
SELECT * FROM proofreading_v1_without_proofreading_v2;

-- Doublons potentiels
SELECT * FROM potential_proofreading_v1_duplicates;
SELECT * FROM potential_proofreading_v2_duplicates;
```

---

## 📚 Documentation supplémentaire

- `WORKFLOW_IMPLEMENTATION.md` — Détails de l'implémentation du workflow
- `MEDIA_LIBRARY_EDIT_INSTRUCTIONS.md` — Guide de modification de la MediaLibrary
- `Supabase/migrations/` — Scripts SQL commentés

---

## 👥 Contributeurs

Développé par l'équipe BCM-GEST.

---

## 📄 Licence

Propriétaire — Tous droits réservés.

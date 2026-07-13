# 📦 BulkImportModal — Documentation Technique

## 🎯 Vue d'ensemble

`BulkImportModal` est un composant React avancé permettant l'import en masse de paires de fichiers appariés selon le workflow éditorial de BCM-GEST.

---

## 📋 Table des matières

1. [Fonctionnalités](#-fonctionnalités)
2. [Types d'appariement](#-types-dappariement)
3. [Architecture du composant](#-architecture-du-composant)
4. [Interface de programmation](#-interface-de-programmation)
5. [Workflow d'import](#-workflow-dimport)
6. [Exemples d'utilisation](#-exemples-dutilisation)
7. [Gestion des erreurs](#-gestion-des-erreurs)
8. [Performances](#-performances)

---

## ✨ Fonctionnalités

### Principales

- **Import multi-fichiers** : Jusqu'à 100+ paires de fichiers en une seule opération
- **Appariement automatique** : Détection par correspondance de nom de fichier
- **Modes d'appariement** : 1↔1 (individuel) ou N↔1 (groupe)
- **Édition manuelle** : Dissocier, réassocier, réorganiser les paires
- **Drag-and-drop** : Réorganisation visuelle des paires
- **Validation groupée** : Vérification des noms avant import
- **Rapport détaillé** : Statistiques et logs complets

### Avancées

- **Sélection hybride** : Combinaison de fichiers machine et d'entités plateforme existantes
- **Renommage automatique** : Application des conventions de nommage du workflow
- **Gestion des contraintes** : Vérification d'unicité (1 projet = 1 R1 unique)
- **Progression en temps réel** : Barre de progression et statut par paire
- **Rollback partiel** : Rejet individuel de paires non conformes

---

## 🔗 Types d'appariement

### 1. Fichier Brut → Transcription

```typescript
{
  id: 'raw-transcription',
  title: 'Fichier Brut → Transcription',
  color: 'from-blue-500 to-green-500',
  file1Accept: '.mp3,.wav,.mp4,.pdf,.jpg,.jpeg,.png',
  file2Accept: '.txt,.doc,.docx'
}
```

**Cas d'usage :**
- Import d'interviews audio avec leurs transcriptions
- Liaison automatique par nom : `interview_001.mp3` + `interview_001.txt`

**Règles de validation :**
- Le nom de la transcription doit correspondre au brut (sans extension)
- Mode N↔1 autorisé : plusieurs bruts → 1 transcription

**Renommage automatique :**
```
interview_001.mp3 + transcription.txt → interview_001_tr.txt
```

---

### 2. Transcription → Projet de Livre

```typescript
{
  id: 'transcription-book',
  title: 'Transcription → Projet de Livre',
  color: 'from-green-500 to-purple-500',
  file1Accept: '.txt,.doc,.docx',
  file2Accept: '.txt,.doc,.docx,.pdf'
}
```

**Cas d'usage :**
- Regrouper plusieurs transcriptions en un projet de livre
- Créer un projet avec ses transcriptions sources

**Règles de validation :**
- Une transcription peut appartenir à plusieurs projets
- Mode N↔1 autorisé : plusieurs transcriptions → 1 projet

**Renommage automatique :**
```
Aucun (le titre du projet est défini par l'utilisateur)
```

---

### 3. Projet de Livre → Relecture 1

```typescript
{
  id: 'book-proofreading1',
  title: 'Projet de Livre → Relecture 1',
  color: 'from-purple-500 to-amber-500',
  file1Accept: '.txt,.doc,.docx,.pdf',
  file2Accept: '.txt,.doc,.docx,.pdf'
}
```

**Cas d'usage :**
- Créer une relecture 1 liée à un projet existant
- Import du fichier de relecture avec validation de nom

**Règles de validation :**
- **Contrainte d'unicité** : 1 projet = 1 R1 UNIQUE
- Le nom doit suivre : `Titre_Projet_R1.pdf`

**Renommage automatique :**
```
Mon_Livre.pdf + relecture.pdf → Mon_Livre_R1.pdf
```

---

### 4. Relecture 1 → Relecture 2

```typescript
{
  id: 'proofreading1-proofreading2',
  title: 'Relecture 1 → Relecture 2',
  color: 'from-amber-500 to-red-500',
  file1Accept: '.txt,.doc,.docx,.pdf',
  file2Accept: '.txt,.doc,.docx,.pdf'
}
```

**Cas d'usage :**
- Créer une relecture 2 liée à une R1 validée
- Finaliser le workflow éditorial

**Règles de validation :**
- **Contrainte d'unicité** : 1 R1 = 1 R2 UNIQUE
- Le nom doit suivre : `Titre_Projet_R2.pdf`

**Renommage automatique :**
```
Mon_Livre_R1.pdf + relecture2.pdf → Mon_Livre_R2.pdf
```

---

## 🏗️ Architecture du composant

### Structure des données

```typescript
interface FilePair {
  id: string;              // Identifiant unique
  sources: FileSource;     // Sources (peut être N fichiers)
  target: File;            // Cible (toujours 1 fichier)
  pairingType: PairingType;
  progress: number;        // 0-100
  status: 'pending' | 'uploading' | 'success' | 'error';
  error?: string;
  results?: {
    uploadedFiles?: any[];
    createdEntities?: any[];
  };
}

interface FileSource {
  files: File[];    // Fichiers machine (upload)
  entities: any[];  // Entités plateforme (déjà existantes)
}
```

### États principaux

```typescript
// État global
const [pairingType, setPairingType] = useState<PairingType | null>(null);
const [pairingMode, setPairingMode] = useState<'one-to-one' | 'many-to-one'>('one-to-one');
const [filePairs, setFilePairs] = useState<FilePair[]>([]);
const [editMode, setEditMode] = useState<EditMode>('none');

// États pour la sélection hybride
const [filesFromMachine, setFilesFromMachine] = useState<File[]>([]);
const [entitiesFromPlatform, setEntitiesFromPlatform] = useState<{
  type: 'raw' | 'transcription' | 'book' | 'proofreading1';
  ids: string[];
  entities: any[];
}>();

// États pour l'édition
const [unpairedFiles, setUnpairedFiles] = useState<{ 
  file1s: File[], 
  file2s: File[] 
}>();
const [selectedFile1Indices, setSelectedFile1Indices] = useState<number[]>([]);
const [selectedFile2Index, setSelectedFile2Index] = useState<number | null>(null);

// États pour l'import
const [isUploading, setIsUploading] = useState(false);
const [uploadProgress, setUploadProgress] = useState(0);
const [showValidationModal, setShowValidationModal] = useState(false);
const [showReport, setShowReport] = useState(false);
```

### Hooks utilisés

```typescript
// Hook principal pour le workflow d'import
const {
  importRawFile,
  importTranscription,
  importTranscriptionStandalone,
  importBookProject,
  importProofreadingV1,
  importProofreadingV2
} = useImportWorkflow();
```

---

## 🔌 Interface de programmation

### Props

```typescript
interface BulkImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  
  // Données de la plateforme (pour validation et sélection)
  rawFiles?: any[];
  transcriptions?: any[];
  bookProjects?: any[];
  proofreadingV1?: any[];
  
  // Callback après import réussi
  onImportSuccess?: () => void;
  
  // Fonction d'upload (optionnelle, utilise importRawFile par défaut)
  uploadRawFile?: (file: File, metadata?: Record<string, any>) => Promise<any>;
}
```

### Méthodes publiques

```typescript
// Apparier automatiquement les fichiers
autoPairFiles(): void

// Dissocier une paire individuelle
dissociateSinglePair(pairIndex: number): void

// Dissocier plusieurs paires
dissociateSelectedPairs(): void

// Réassocier des fichiers (N↔1)
reassignFiles(): void

// Préparer les fichiers pour validation
prepareFilesForValidation(): void

// Confirmer la validation et lancer l'import
confirmValidationAndUpload(): Promise<void>
```

---

## 🔄 Workflow d'import

### Étape 1 : Choisir le type d'appariement

```typescript
setPairingType('raw-transcription');
```

### Étape 2 : Sélectionner les fichiers

```typescript
// Via drag-and-drop ou input file
const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
  const files = Array.from(e.target.files);
  setSelectedFiles(files);
};
```

### Étape 3 : Apparier les fichiers

```typescript
// Automatique
autoPairFiles();

// Manuel (après dissociation)
reassignFiles();
```

### Étape 4 : Validation groupée

```typescript
prepareFilesForValidation();
// → Affiche la modale de validation
// → Utilisateur coche/décoche les fichiers
// → confirmValidationAndUpload() est appelé
```

### Étape 5 : Upload réel

```typescript
performBulkUpload(validPairs, rejectedIndices);
// → Upload séquentiel avec progression
// → Rapport détaillé à la fin
```

### Étape 6 : Rapport

```typescript
showImportReport({
  totalPairs: 10,
  successCount: 8,
  errorCount: 1,
  ignoredCount: 1,
  details: {
    success: [...],
    errors: [...],
    ignored: [...]
  }
});
```

---

## 💡 Exemples d'utilisation

### Exemple 1 : Import simple (1↔1)

```typescript
import BulkImportModal from './modals/BulkImportModal';

function MediaLibrary() {
  const [isBulkImportModalOpen, setIsBulkImportModalOpen] = useState(false);
  const { rawFiles, transcriptions, refreshAll } = useMediaLibrary();

  return (
    <>
      <button onClick={() => setIsBulkImportModalOpen(true)}>
        Import en masse
      </button>

      <BulkImportModal
        isOpen={isBulkImportModalOpen}
        onClose={() => setIsBulkImportModalOpen(false)}
        rawFiles={rawFiles}
        transcriptions={transcriptions}
        onImportSuccess={() => {
          refreshAll();
          alert('✅ Import en masse terminé !');
        }}
      />
    </>
  );
}
```

### Exemple 2 : Import avec sélection hybride

```typescript
// 1. L'utilisateur sélectionne des transcriptions depuis la plateforme
const handleSelectPlatformFiles = (selectedEntities: any[]) => {
  setEntitiesFromPlatform({
    type: 'transcription',
    ids: selectedEntities.map(e => e.id),
    entities: selectedEntities
  });
};

// 2. L'utilisateur importe un fichier projet depuis sa machine
const handleProjectFileImport = (file: File) => {
  // Le projet sera automatiquement apparié avec les transcriptions sélectionnées
  setFilePairs([{
    id: 'pair_1',
    sources: {
      files: [],                    // Aucun fichier machine pour les sources
      entities: entitiesFromPlatform.entities  // Transcriptions plateforme
    },
    target: file,  // Projet depuis machine
    pairingType: 'transcription-book',
    progress: 0,
    status: 'pending'
  }]);
};
```

### Exemple 3 : Gestion des erreurs

```typescript
const report = await performBulkUpload(pairs, []);

if (report.errorCount > 0) {
  console.error('Erreurs détectées :', report.details.errors);
  
  // Afficher les erreurs à l'utilisateur
  report.details.errors.forEach(err => {
    console.error(`Paire ${err.pairId}: ${err.error}`);
  });
}

if (report.ignoredCount > 0) {
  console.warn('Fichiers ignorés :', report.details.ignored);
}
```

---

## 🐛 Gestion des erreurs

### Types d'erreurs

| Type | Cause | Solution |
|------|-------|----------|
| `Validation du nom échouée` | Nom ne correspond pas aux conventions | Utiliser le renommage automatique |
| `Contrainte d'unicité violée` | R1 ou R2 existe déjà | Vérifier les entités existantes |
| `Aucun fichier brut importé` | Upload échoué | Vérifier la connexion et les permissions |
| `Aucune transcription liée` | Sources vides | Sélectionner des transcriptions |

### Stratégies de gestion

```typescript
// 1. Vérification avant upload
const constraints = await checkConstraints(pair);
if (!constraints.valid) {
  report.ignoredCount++;
  report.details.ignored.push({ 
    pairId: pair.id, 
    reason: constraints.reason 
  });
  continue; // Passer à la paire suivante
}

// 2. Try-catch pendant l'upload
try {
  targetResult = await importTranscription(file, sourceIds);
} catch (err: any) {
  errorCount++;
  report.details.errors.push({ pairId: pair.id, error: err.message });
}

// 3. Rollback partiel (rejet individuel)
const validPairs = filePairs.filter((_, index) => validIndices.includes(index));
// Seules les paires validées sont importées
```

---

## ⚡ Performances

### Optimisations implémentées

1. **Upload séquentiel** : Évite la surcharge du serveur
   ```typescript
   await new Promise(resolve => setTimeout(resolve, 300));
   ```

2. **Mise à jour batch des états** :
   ```typescript
   setFilePairs(prev => prev.map(p => 
     p.id === pair.id ? { ...p, status: 'uploading' } : p
   ));
   ```

3. **Memoization des filtres** :
   ```typescript
   const filteredFiles = useMemo(() => {
     return files.filter(/* ... */);
   }, [files, pairingType]);
   ```

4. **Lazy loading des modales** :
   ```typescript
   const BulkImportModal = lazy(() => import('./BulkImportModal'));
   ```

### Limites recommandées

| Paramètre | Valeur recommandée |
|-----------|-------------------|
| Nombre max de paires | 100 |
| Taille max par fichier | 100 MB |
| Timeout par upload | 30 secondes |
| Délai entre uploads | 300 ms |

---

## 🧪 Tests et validation

### Cas de test

```typescript
// Test 1 : Apparier par nom exact
test('autoPairFiles should match files by exact name', () => {
  const files = [
    new File([''], 'interview_001.mp3'),
    new File([''], 'interview_001.txt')
  ];
  setSelectedFiles(files);
  autoPairFiles();
  expect(filePairs).toHaveLength(1);
});

// Test 2 : Validation de nom R1
test('should reject R1 with invalid name', async () => {
  const result = await importProofreadingV1(
    new File([''], 'Mauvais_Nom.pdf'),
    'project-id',
    false
  );
  expect(result.success).toBe(false);
  expect(result.message).toContain('Nom attendu');
});

// Test 3 : Contrainte d'unicité
test('should reject duplicate R1', async () => {
  const result = await importProofreadingV1(
    new File([''], 'Mon_Livre_R1.pdf'),
    'project-with-existing-r1',
    false
  );
  expect(result.success).toBe(false);
  expect(result.message).toContain('existe déjà');
});
```

---

## 📞 Support et débugage

### Logs utiles

```typescript
// Activer le mode debug
console.log('🔮 [AUTO PAIR] Called!', { 
  pairingType, 
  pairingMode, 
  selectedFiles: selectedFiles.length 
});

console.log('🏷️ [BULK IMPORT] Renaming file:', 
  pair.target.name, '→', renamedFile.name
);

console.log('📊 RAPPORT D IMPORT:', report);
```

### Vues SQL de contrôle

```sql
-- Vérifier les R1 orphelines
SELECT * FROM proofreading_v1 
WHERE book_project_id IS NULL;

-- Vérifier les doublons potentiels
SELECT book_project_id, COUNT(*) 
FROM proofreading_v1 
WHERE is_deleted = FALSE 
GROUP BY book_project_id 
HAVING COUNT(*) > 1;
```

---

## 📚 Ressources liées

- [WORKFLOW_IMPLEMENTATION.md](../WORKFLOW_IMPLEMENTATION.md)
- [useImportWorkflow.ts](../../../hooks/useImportWorkflow.ts)
- [useFileValidation.ts](../../../hooks/useFileValidation.ts)
- [ImportModal.tsx](./ImportModal.tsx)

---

**Dernière mise à jour :** 2026-03-07  
**Version :** 1.0.0  
**Auteur :** Équipe BCM-GEST

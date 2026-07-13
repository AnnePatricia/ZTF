# ✅ ÉTAPE 1 : FLUX D'IMPORTATION IMPLÉMENTÉE

## 📋 VUE D'ENSEMBLE

Cette étape implémente **les flux d'importation avec validation** selon le cahier des charges, couvrant tous les **SOUS-CAS 2** :

1. ✅ Import d'un fichier brut (aucune validation)
2. ✅ Import d'une transcription liée à un brut (validation du nom)
3. ✅ Import d'un projet de livre lié à des transcriptions
4. ✅ Import d'une relecture 1 liée à un projet (validation + unicité)
5. ✅ Import d'une relecture 2 liée à une R1 (validation + unicité)

---

## 📁 FICHIERS CRÉÉS

### **Composants React**

| Fichier | Rôle | Statut |
|---------|------|--------|
| `ValidationModal.tsx` | Modal de validation des noms | ✅ Créé |
| `ImportModalWithValidation.tsx` | Import avec validation intégrée | ✅ Créé |

### **Hooks React**

| Fichier | Rôle | Fonctions |
|---------|------|-----------|
| `useImportWorkflow.ts` | Gère tous les flux d'import | 5 fonctions d'import |

### **Exports**

| Fichier | Modification |
|---------|--------------|
| `hooks/index.ts` | ✅ Ajout de `useImportWorkflow` |

---

## 🔄 WORKFLOW D'IMPORTATION

### **CAS 1 : Fichier Brut (0%)**

```typescript
// Aucun prérequis
// Aucune validation

const result = await importRawFile(file, {
  import_type: 'raw'
});

// Résultat :
// {
//   success: true,
//   entityId: 'uuid-du-fichier',
//   message: 'Fichier brut importé avec succès'
// }
```

**Schéma :**
```
Import → Upload Storage → Insert DB → ✅ TERMINÉ
```

---

### **CAS 2 : Transcription liée à un brut (15-30%)**

**SOUS-CAS 2 : Fichier(s) brut(s) lié(s) à une transcription par une importation**

```typescript
// Prérequis : linkedRawFileId (ID du fichier brut)
// Validation : OBLIGATOIRE - Nom transcrit = Nom brut

const result = await importTranscription(file, linkedRawFileId, skipValidation);
```

**Workflow :**
```
1. Validation du nom
   ├─ "interview_001.mp3" → "interview_001.txt" ✅
   └─ "autre_nom.txt" → ❌ (proposer renommage)

2. Upload du fichier transcrit

3. Création de la transcription
   └─ Statut: "transcription_en_cours" (15%)

4. Liaison automatique (trigger)
   ├─ transcription_raw_files INSERT
   └─ brut.status → "traité"

5. Finalisation (bouton "Fin" dans l'interface)
   └─ transcription.status → "transcrit" (30%)
```

**Contraintes :**
- ✅ Validation du nom requise (peut être skipée avec warning)
- ✅ Liaison automatique avec le brut
- ✅ Trigger met à jour le statut du brut

---

### **CAS 3 : Projet de livre lié à des transcriptions (50%)**

**SOUS-CAS 2 : FICHIER TRANSCRIT LIE PAR UN PROJET IMPORTE**

```typescript
// Prérequis : linkedTranscriptionIds[] (IDs des transcriptions)
// Validation : AUCUNE (nom libre)

const result = await importBookProject(file, linkedTranscriptionIds, metadata);
```

**Workflow :**
```
1. Upload du fichier projet

2. Création du projet de livre
   ├─ Statut: "projet_de_livre" (50%)
   └─ Titre: nom du fichier (sans extension)

3. Liaison avec les transcriptions sélectionnées
   └─ book_project_transcriptions INSERT (multi-lignes)

4. Triggers (si liaisons)
   └─ transcription.status → "projet_de_livre"
```

**Contraintes :**
- ✅ Sélection multiple de transcriptions possible
- ✅ Liaison en masse
- ✅ Ordre des transcriptions enregistré (order_index)

---

### **CAS 4 : Relecture 1 liée à un projet (60-70%)**

**SOUS-CAS 2 : LE PROJET DE LIVRE LIE PAR RELECTURE 1 IMPORTE**

```typescript
// Prérequis : linkedBookProjectId (ID du projet)
// Validation : OBLIGATOIRE - Nom = "Titre Projet_R1"
// Contrainte : 1 projet = 1 R1 UNIQUE

const result = await importProofreadingV1(file, linkedBookProjectId, skipValidation);
```

**Workflow :**
```
1. Validation du nom
   ├─ Projet: "Mon Livre"
   ├─ Attendu: "Mon Livre_R1.pdf" ✅
   └─ Reçu: "Autre_R1.pdf" → ❌ (blocage)

2. Vérification unicité
   ├─ SELECT COUNT(*) FROM proofreading_v1
   │   WHERE book_project_id = X AND is_deleted = false
   └─ Si count > 0 → ❌ ERREUR (1 projet = 1 R1)

3. Upload du fichier R1

4. Création de la R1
   ├─ Statut: "relecture_1_en_cours" (60%)
   └─ book_project_id: lié au projet

5. Trigger
   └─ projet.status → "relecture_1_en_cours"

6. Finalisation (bouton "Fin")
   └─ R1.status → "relecture_1_validé" (70%)
      └─ Trigger: projet.status → "relecture_1_validé"
```

**Contraintes :**
- ✅ Validation du nom OBLIGATOIRE (ne peut pas être skipée)
- ✅ Contrainte d'unicité : 1 projet = 1 R1
- ✅ Trigger met à jour le statut du projet

---

### **CAS 5 : Relecture 2 liée à une R1 (85-100%)**

**DERNIER CAS : DE RELECTURE 1 à RELECTURE 2**

```typescript
// Prérequis : linkedProofreadingV1Id (ID de la R1)
// Validation : OBLIGATOIRE - Nom = "Titre Projet_R2"
// Contrainte : 1 R1 = 1 R2 UNIQUE

const result = await importProofreadingV2(file, linkedProofreadingV1Id, skipValidation);
```

**Workflow :**
```
1. Validation du nom
   ├─ Projet (via R1): "Mon Livre"
   ├─ Attendu: "Mon Livre_R2.pdf" ✅
   └─ Reçu: "Autre_R2.pdf" → ❌ (blocage)

2. Vérification unicité
   ├─ SELECT COUNT(*) FROM proofreading_v2
   │   WHERE proofreading_v1_id = X AND is_deleted = false
   └─ Si count > 0 → ❌ ERREUR (1 R1 = 1 R2)

3. Upload du fichier R2

4. Création de la R2
   ├─ Statut: "relecture_2_en_cours" (85%)
   └─ proofreading_v1_id: lié à la R1

5. Trigger
   └─ R1.status → "relecture_2_en_cours"

6. Finalisation (bouton "Fin")
   └─ R2.status → "relecture_2_validé" (100%)
      └─ Trigger: R1.status → "relecture_2_validé"
```

**Contraintes :**
- ✅ Validation du nom OBLIGATOIRE (ne peut pas être skipée)
- ✅ Contrainte d'unicité : 1 R1 = 1 R2
- ✅ Trigger met à jour le statut de la R1

---

## 🎯 COMPOSANT : ValidationModal

### **Props**

```typescript
interface ValidationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  
  validationType: 'transcription' | 'proofreading_v1' | 'proofreading_v2';
  
  file: File | null;
  linkedEntityId: string | null;
  linkedEntityName?: string;
  
  onRename?: (newName: string) => void;
}
```

### **Fonctionnalités**

- ✅ Affiche le nom actuel du fichier
- ✅ Affiche le nom attendu
- ✅ Propose le renommage automatique
- ✅ Validation en temps réel
- ✅ Messages d'erreur conformes

### **Exemple d'utilisation**

```typescript
<ValidationModal
  isOpen={showValidation}
  onClose={() => setShowValidation(false)}
  onConfirm={handleConfirm}
  validationType="transcription"
  file={selectedFile}
  linkedEntityId={rawFileId}
  linkedEntityName="interview_001.mp3"
/>
```

---

## 🎯 COMPOSANT : ImportModalWithValidation

### **Props**

```typescript
interface ImportModalWithValidationProps {
  isOpen: boolean;
  onClose: () => void;
  importType: 'raw' | 'transcription' | 'book' | 'proofreading1' | 'proofreading2';
  setImportType: (type) => void;
  
  // IDs pour la validation
  linkedRawFileId?: string;        // Pour transcription
  linkedBookProjectId?: string;    // Pour proofreading1
  linkedProofreadingV1Id?: string; // Pour proofreading2
  linkedTranscriptionIds?: string[]; // Pour book
  
  onImportSuccess?: (result: any) => void;
}
```

### **Fonctionnalités**

- ✅ Sélection du type d'import
- ✅ Drag & Drop des fichiers
- ✅ Validation automatique selon le type
- ✅ Affichage de la progression
- ✅ Gestion des erreurs
- ✅ Callback après succès

---

## 🔧 INTÉGRATION DANS MediaLibrary.tsx

### **Exemple d'utilisation**

```typescript
import { useState } from 'react';
import ImportModalWithValidation from './modals/ImportModalWithValidation';

function MediaLibrary() {
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importType, setImportType] = useState<'raw' | 'transcription' | null>(null);
  const [selectedRawFileId, setSelectedRawFileId] = useState<string>('');

  const handleOpenImport = (type: string, linkedId?: string) => {
    setImportType(type);
    if (linkedId) {
      setSelectedRawFileId(linkedId);
    }
    setIsImportModalOpen(true);
  };

  const handleImportSuccess = (result: any) => {
    // Rafraîchir les données
    refreshAll();
    
    // Rediriger si nécessaire
    if (result.entityId) {
      navigate(`/transcriptions/${result.entityId}/edit`);
    }
  };

  return (
    <>
      {/* Bouton d'import */}
      <button onClick={() => handleOpenImport('raw')}>
        Importer Fichier Brut
      </button>
      
      <button onClick={() => handleOpenImport('transcription', selectedRawFileId)}>
        Importer Transcription
      </button>

      {/* Modal */}
      <ImportModalWithValidation
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        importType={importType}
        setImportType={setImportType}
        linkedRawFileId={selectedRawFileId}
        onImportSuccess={handleImportSuccess}
      />
    </>
  );
}
```

---

## 📊 TABLEAU RÉCAPITULATIF DES VALIDATIONS

| Type Import | Validation Nom | Contrainte Unicité | Trigger Statut |
|-------------|----------------|-------------------|----------------|
| **Brut** | ❌ Non | ❌ Non | ❌ Non |
| **Transcription** | ✅ Oui (brut) | ❌ Non | ✅ brut → "traité" |
| **Projet** | ❌ Non | ❌ Non | ✅ transcrit → "projet" |
| **R1** | ✅ Oui (projet) | ✅ 1 projet = 1 R1 | ✅ projet → "R1_en_cours" |
| **R2** | ✅ Oui (R1) | ✅ 1 R1 = 1 R2 | ✅ R1 → "R2_en_cours" |

---

## ✅ CHECKLIST D'IMPLÉMENTATION

### **Backend (SQL)**
- [x] Migration 007: `get_raw_file_lineage()`
- [x] Migration 008: Triggers d'automatisation
- [x] Migration 009: Contraintes d'unicité R1/R2
- [x] Migration 010: Validation des noms

### **Frontend (Hooks)**
- [x] `useFileValidation` - Validation des noms
- [x] `useWorkflowAutomation` - Automatismes
- [x] `useLineage` - Lignée éditoriale
- [x] `useImportWorkflow` - **NOUVEAU** Flux d'import

### **Frontend (Composants)**
- [x] `ValidationModal` - **NOUVEAU** Modal de validation
- [x] `ImportModalWithValidation` - **NOUVEAU** Import avec validation
- [ ] `MediaLibrary.tsx` - À METTRE À JOUR (intégration)
- [ ] `Documents.tsx` - À METTRE À JOUR (intégration)

---

## 🚀 PROCHAINE ÉTAPE

**Maintenant que les flux d'importation sont prêts, il faut :**

1. **Intégrer `ImportModalWithValidation` dans `MediaLibrary.tsx`**
   - Remplacer l'ancien `ImportModal`
   - Passer les IDs liés selon le contexte
   - Gérer le callback `onImportSuccess`

2. **Intégrer la validation dans `Documents.tsx`**
   - Ajouter l'option "Créer Document" selon le statut
   - Utiliser `useWorkflowAutomation` pour les créations auto

3. **Créer les interfaces de travail**
   - `TranscriptionEditor.tsx` (refonte)
   - `BookProjectEditor.tsx`
   - `ProofreadingV1Editor.tsx`
   - `ProofreadingV2Editor.tsx`

---

## 📝 NOTES IMPORTANTES

1. **Validation des noms :**
   - Transcription : `interview.mp3` → `interview.txt` ✅
   - R1 : `Mon Livre` → `Mon Livre_R1.pdf` ✅
   - R2 : `Mon Livre` → `Mon Livre_R2.pdf` ✅

2. **Contraintes d'unicité :**
   - 1 projet = 1 R1 UNIQUE
   - 1 R1 = 1 R2 UNIQUE
   - Vérifié par triggers SQL + validation frontend

3. **Triggers automatiques :**
   - Liaison transcription → brut.status = "traité"
   - Liaison projet → transcription.status = "projet_de_livre"
   - Création R1 → projet.status = "relecture_1_en_cours"
   - Validation R1 → projet.status = "relecture_1_validé"
   - Création R2 → R1.status = "relecture_2_en_cours"
   - Validation R2 → R1.status = "relecture_2_validé"

4. **Progression globale :**
   - Brut : 0%
   - Transcription en cours : 15%
   - Transcrit : 30%
   - Projet de livre : 50%
   - R1 en cours : 60%
   - R1 validée : 70%
   - R2 en cours : 85%
   - R2 validée : 100%

---

## 🧪 TESTS À EFFECTUER

```sql
-- 1. Tester la validation de nom
SELECT validate_transcription_name('uuid-brut', 'interview.txt');
SELECT validate_proofreading_v1_name('uuid-projet', 'Mon Livre_R1.pdf');
SELECT validate_proofreading_v2_name('uuid-r1', 'Mon Livre_R2.pdf');

-- 2. Tester l'import d'une transcription
-- (Via l'interface, avec un fichier brut sélectionné)

-- 3. Tester la contrainte d'unicité R1
-- Importer 2 R1 pour le même projet → Doit échouer

-- 4. Tester la contrainte d'unicité R2
-- Importer 2 R2 pour la même R1 → Doit échouer

-- 5. Tester les triggers
-- Après import transcription → Vérifier brut.status = "traité"
-- Après import R1 → Vérifier projet.status = "relecture_1_en_cours"
```

---

**✅ ÉTAPE 1 TERMINÉE !**

**Prochaine étape : Intégration dans MediaLibrary.tsx et Documents.tsx**

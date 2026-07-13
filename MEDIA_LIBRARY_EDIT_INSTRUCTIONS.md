# 📝 GUIDE DE MODIFICATION : MediaLibrary.tsx

## 🎯 OBJECTIF
Remplacer `ImportModal` par `ImportModalWithValidation` pour activer la validation des noms de fichiers.

---

## 🔧 MODIFICATIONS À APPORTER

### **1. LIGNE 9-10 : Changer l'import**

**Fichier :** `src/components/MediaLibrary/MediaLibrary.tsx`

**REMPLACER :**
```typescript
// ✅ IMPORT LAZY POUR IMPORTMODAL
const ImportModal = lazy(() => import('./modals/ImportModal'));
```

**PAR :**
```typescript
// ✅ NOUVEL IMPORT : ImportModalWithValidation
import ImportModalWithValidation from './modals/ImportModalWithValidation';
```

---

### **2. LIGNE ~24 : Ajouter les états pour les IDs liés**

**AJOUTER** après `const [statusFilter, setStatusFilter] = useState<string>("Tous");` :

```typescript
  // ✅ ÉTATS POUR LES IDs LIÉS (NOUVEAU - Pour ImportModalWithValidation)
  const [linkedRawFileId, setLinkedRawFileId] = useState<string>('');
  const [linkedBookProjectId, setLinkedBookProjectId] = useState<string>('');
  const [linkedProofreadingV1Id, setLinkedProofreadingV1Id] = useState<string>('');
  const [linkedTranscriptionIds, setLinkedTranscriptionIds] = useState<string[]>([]);
```

---

### **3. LIGNE ~69 : Ajouter le hook useImportWorkflow**

**AJOUTER** après `const { createDocument } = useDocuments();` :

```typescript
  // ✅ NOUVEAU HOOK : useImportWorkflow
  const { 
    importRawFile, 
    importTranscription, 
    importBookProject, 
    importProofreadingV1, 
    importProofreadingV2 
  } = useImportWorkflow();
```

**AJOUTER** l'import en haut du fichier (ligne ~7) :
```typescript
import { useImportWorkflow } from '../../hooks/useImportWorkflow';
```

---

### **4. LIGNES ~388-400 : Remplacer le rendu ImportModal**

**SUPPRIMER** ce bloc (lignes ~388-400) :
```typescript
      {/* ✅ MODALE AVEC LAZY LOADING */}
      {isImportModalOpen && (
        <Suspense fallback={<ModalLoader />}>
          <ImportModal
            isOpen={isImportModalOpen}
            onClose={() => {
              setIsImportModalOpen(false);
              setImportType(null);
              setSelectedFiles([]);
              setUploadProgress(0);
              setIsUploading(false);
            }}
            importType={importType}
            setImportType={setImportType}
            selectedFiles={selectedFiles}
            setSelectedFiles={setSelectedFiles}
            uploadProgress={uploadProgress}
            setUploadProgress={setUploadProgress}
            isUploading={isUploading}
            setIsUploading={setIsUploading}
            onUpload={uploadRawFile}
          />
        </Suspense>
      )}
```

**REMPLACER PAR :**
```typescript
      {/* ✅ NOUVELLE MODALE AVEC VALIDATION */}
      {isImportModalOpen && (
        <ImportModalWithValidation
          isOpen={isImportModalOpen}
          onClose={() => {
            setIsImportModalOpen(false);
            setImportType(null);
            setSelectedFiles([]);
            setLinkedRawFileId('');
            setLinkedBookProjectId('');
            setLinkedProofreadingV1Id('');
            setLinkedTranscriptionIds([]);
          }}
          importType={importType}
          setImportType={setImportType}
          linkedRawFileId={linkedRawFileId || undefined}
          linkedBookProjectId={linkedBookProjectId || undefined}
          linkedProofreadingV1Id={linkedProofreadingV1Id || undefined}
          linkedTranscriptionIds={linkedTranscriptionIds.length > 0 ? linkedTranscriptionIds : undefined}
          onImportSuccess={(result) => {
            refreshAll();
            console.log('Import réussi:', result);
          }}
        />
      )}
```

---

### **5. MediaLibraryGrid : Ajouter la prop onOpenImportWithContext**

**Dans la définition du composant** (ligne ~455) :

**AJOUTER** dans les props :
```typescript
  // ✅ NOUVELLE PROP : Pour ouvrir l'import avec contexte
  onOpenImportWithContext?: (
    type: 'raw' | 'transcription' | 'book' | 'proofreading1' | 'proofreading2', 
    linkedId?: string
  ) => void;
```

**Dans le MediaLibraryGrid** (vers ligne ~550), trouver le bouton "IMPORTER" et **MODIFIER** :

**AVANT :**
```typescript
<button
  onClick={onOpenImport}
  className="..."
>
  Importer
</button>
```

**APRÈS (exemple pour un fichier brut) :**
```typescript
<button
  onClick={() => onOpenImportWithContext?.('raw')}
  className="..."
>
  Importer Fichier Brut
</button>
```

---

## ✅ VÉRIFICATION APRÈS MODIFICATION

### **Imports en haut du fichier :**
```typescript
import React, { useState, useMemo, lazy, Suspense, useEffect } from "react";
import EditorialFlow from "./EditorialFlow";
import { useMediaLibrary } from '../../hooks/MediaLibrary';
import { useDocumentMediaSync } from '../../hooks/useDocumentMediaSync';
import { useDocuments } from '../../hooks/useDocuments';
import { useImportWorkflow } from '../../hooks/useImportWorkflow';  // ✅ AJOUTÉ
import type { DocumentFormData, DocumentStatus } from '../Documents/document';

// ✅ NOUVEL IMPORT
import ImportModalWithValidation from './modals/ImportModalWithValidation';
```

### **États dans le composant :**
```typescript
const [view, setView] = useState<'library' | 'flow'>('library');
const [isImportModalOpen, setIsImportModalOpen] = useState(false);
const [importType, setImportType] = useState<'raw' | 'transcription' | 'book' | 'proofreading1' | 'proofreading2' | null>(null);
const [selectedFiles, setSelectedFiles] = useState<File[]>([]);

// ✅ NOUVEAUX ÉTATS
const [linkedRawFileId, setLinkedRawFileId] = useState<string>('');
const [linkedBookProjectId, setLinkedBookProjectId] = useState<string>('');
const [linkedProofreadingV1Id, setLinkedProofreadingV1Id] = useState<string>('');
const [linkedTranscriptionIds, setLinkedTranscriptionIds] = useState<string[]>([]);
```

### **Hook utilisé :**
```typescript
const { 
  importRawFile, 
  importTranscription, 
  importBookProject, 
  importProofreadingV1, 
  importProofreadingV2 
} = useImportWorkflow();
```

---

## 🧪 TEST APRÈS MODIFICATION

1. **Redémarrez l'application :**
```bash
npm run dev
```

2. **Allez dans MediaLibrary**

3. **Cliquez sur "Importer"**

4. **Sélectionnez "Transcription"**

5. **Sélectionnez un fichier .txt**

6. **La validation doit s'afficher !** ✅

---

## 🐛 DÉBOGAGE

**Si erreur "Module not found" :**
```bash
# Vérifiez que le fichier existe
ls src/components/MediaLibrary/modals/ImportModalWithValidation.tsx
```

**Si erreur "useImportWorkflow is not defined" :**
```typescript
// Ajoutez l'import
import { useImportWorkflow } from '../../hooks/useImportWorkflow';
```

**Si la modale ne s'ouvre pas :**
```typescript
// Vérifiez dans la console
console.log('isImportModalOpen:', isImportModalOpen);
console.log('importType:', importType);
```

---

## 📊 RÉSULTAT ATTENDU

Après ces modifications :
- ✅ La modale `ImportModalWithValidation` s'ouvre
- ✅ La validation des noms fonctionne
- ✅ Les imports avec liaison fonctionnent
- ✅ Les triggers SQL mettent à jour les statuts automatiquement

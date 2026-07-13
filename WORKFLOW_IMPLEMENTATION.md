# 📊 IMPLÉMENTATION WORKFLOW ÉDITORIAL - DOCUMENTATION COMPLÈTE

## 🎯 VUE D'ENSEMBLE

Ce dossier contient l'implémentation complète du workflow éditorial pour BCM-GEST, incluant :
- La validation des noms de fichiers
- Les automatismes de transition de statut
- Le suivi de la lignée éditoriale complète

---

## 📁 STRUCTURE DES FICHIERS

### **Backend (Supabase Migrations)**

```
Supabase/migrations/
├── 007_create_lineage_function.sql       # Fonction get_raw_file_lineage()
├── 008_create_status_triggers.sql        # 9 triggers d'automatisation
├── 009_add_unique_constraints.sql        # Contraintes d'unicité R1/R2
└── 010_create_validation_functions.sql   # 10 fonctions de validation
```

### **Frontend (React Hooks)**

```
src/hooks/
├── useFileValidation.ts       # Validation des noms de fichiers
├── useWorkflowAutomation.ts   # Automatismes de workflow
├── useLineage.ts              # Lignée éditoriale
└── index.ts                   # Exports
```

---

## 🔄 WORKFLOW COMPLET

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           WORKFLOW ÉDITORIAL COMPLET                        │
└─────────────────────────────────────────────────────────────────────────────┘

ÉTAPE 1: FICHIER BRUT (0%)
┌──────────────────────────────────────────────────────────────────────────────┐
│ 1. Import dans MediaLibrary                                                  │
│    • Fichier: interview_001.mp3                                              │
│    • Statut: libre                                                           │
│    • is_linked: false                                                        │
│                                                                              │
│ 2. Création d'une transcription                                              │
│    • Validation: interview_001.txt ✓                                         │
│    • Liaison automatique via trigger                                         │
│    • Statut brut → "traité"                                                  │
└──────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
ÉTAPE 2: TRANSCRIPTION (15-30%)
┌──────────────────────────────────────────────────────────────────────────────┐
│ 1. Transcription créée                                                       │
│    • Statut: transcription_en_cours (15%)                                    │
│    • Liaison: interview_001.mp3 → interview_001.txt                          │
│                                                                              │
│ 2. Finalisation (Bouton "Fin")                                               │
│    • Statut → "transcrit" (30%)                                              │
│    • Trigger: statut brut → "transcrit"                                      │
│                                                                              │
│ 3. Création d'un projet de livre                                             │
│    • Validation: titre = titre projet                                        │
│    • Liaison: transcription → projet                                         │
│    • Trigger: statut transcription → "projet_de_livre"                       │
└──────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
ÉTAPE 3: PROJET DE LIVRE (50%)
┌──────────────────────────────────────────────────────────────────────────────┐
│ 1. Projet créé                                                               │
│    • Statut: projet_de_livre (50%)                                           │
│    • Titre: "Mon Livre"                                                      │
│    • Transcriptions liées: interview_001.txt, interview_002.txt...           │
│                                                                              │
│ 2. Création Relecture 1                                                      │
│    • Validation: "Mon Livre_R1.pdf" ✓                                        │
│    • Contrainte: 1 projet = 1 R1 UNIQUE                                      │
│    • Trigger: statut projet → "relecture_1_en_cours"                         │
└──────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
ÉTAPE 4: RELECTURE 1 (60-70%)
┌──────────────────────────────────────────────────────────────────────────────┐
│ 1. Relecture 1 en cours                                                      │
│    • Statut: relecture_1_en_cours (60%)                                      │
│    • Corrections: 15                                                         │
│    • Relecteur: Marie Dubois                                                 │
│                                                                              │
│ 2. Validation (Bouton "Fin")                                                 │
│    • Statut → "relecture_1_validé" (70%)                                     │
│    • Trigger: statut projet → "relecture_1_validé"                           │
│                                                                              │
│ 3. Création Relecture 2                                                      │
│    • Validation: "Mon Livre_R2.pdf" ✓                                        │
│    • Contrainte: 1 R1 = 1 R2 UNIQUE                                          │
│    • Trigger: statut R1 → "relecture_2_en_cours"                             │
└──────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
ÉTAPE 5: RELECTURE 2 (85-100%)
┌──────────────────────────────────────────────────────────────────────────────┐
│ 1. Relecture 2 en cours                                                      │
│    • Statut: relecture_2_en_cours (85%)                                      │
│    • Corrections: 5                                                          │
│    • Relecteur: Thomas Martin                                                │
│                                                                              │
│ 2. Validation finale (Bouton "Fin")                                          │
│    • Statut → "relecture_2_validé" (100%)                                    │
│    • Trigger: statut R1 → "relecture_2_validé"                               │
│    • ✅ WORKFLOW TERMINÉ                                                     │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## 📊 FONCTIONS SQL CRÉÉES

### **Migration 007: get_raw_file_lineage()**

```sql
SELECT get_raw_file_lineage('uuid-du-fichier-brut');
```

**Retourne :**
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

### **Migration 008: Triggers d'automatisation**

| Trigger | Table | Action | Résultat |
|---------|-------|--------|----------|
| `trigger_update_raw_file_status_on_transcription_link` | `transcription_raw_files` | INSERT | brut.status = "traité" |
| `trigger_update_transcription_status_on_book_project_link` | `book_project_transcriptions` | INSERT | transcription.status = "projet_de_livre" |
| `trigger_update_book_project_status_on_proofreading_v1` | `proofreading_v1` | INSERT | projet.status = "relecture_1_en_cours" |
| `trigger_update_book_project_status_on_proofreading_v1_validated` | `proofreading_v1` | UPDATE | projet.status = "relecture_1_validé" |
| `trigger_update_proofreading_v1_status_on_proofreading_v2` | `proofreading_v2` | INSERT | R1.status = "relecture_2_en_cours" |
| `trigger_update_proofreading_v1_status_on_proofreading_v2_validated` | `proofreading_v2` | UPDATE | R1.status = "relecture_2_validé" |
| `trigger_update_raw_file_link_count_on_document_link` | `document_media_links` | INSERT | brut.is_linked = true |
| `trigger_update_raw_file_link_count_on_document_unlink` | `document_media_links` | DELETE | brut.is_linked = false |
| `trigger_cleanup_transcription_links_on_raw_file_delete` | `raw_files` | UPDATE (deleted) | Supprime liaisons |

### **Migration 009: Contraintes d'unicité**

```sql
-- 1 projet = 1 R1 UNIQUE
CREATE UNIQUE INDEX idx_proofreading_v1_unique_book_project
  ON proofreading_v1(book_project_id) WHERE is_deleted = FALSE;

-- 1 R1 = 1 R2 UNIQUE
CREATE UNIQUE INDEX idx_proofreading_v2_unique_proofreading_v1
  ON proofreading_v2(proofreading_v1_id) WHERE is_deleted = FALSE;
```

**Triggers de validation :**
- `trigger_check_proofreading_v1_uniqueness` → Vérifie avant insertion R1
- `trigger_check_proofreading_v2_uniqueness` → Vérifie avant insertion R2
- `trigger_validate_proofreading_v1_book_project` → Valide existence projet
- `trigger_validate_proofreading_v2_proofreading_v1` → Valide existence R1

### **Migration 010: Validation des noms**

| Fonction | Paramètres | Retour | Exemple |
|----------|------------|--------|---------|
| `validate_transcription_name()` | rawFileId, fileName | boolean | "interview.mp3" → "interview.txt" ✓ |
| `validate_proofreading_v1_name()` | projectId, fileName | boolean | "Mon Livre" → "Mon Livre_R1.pdf" ✓ |
| `validate_proofreading_v2_name()` | r1Id, fileName | boolean | "Mon Livre" → "Mon Livre_R2.pdf" ✓ |
| `generate_expected_transcription_name()` | rawFileId | string | "interview.txt" |
| `generate_expected_proofreading_v1_name()` | projectId | string | "Mon Livre_R1.pdf" |
| `generate_expected_proofreading_v2_name()` | r1Id | string | "Mon Livre_R2.pdf" |
| `validate_and_suggest_*_correction()` | id, fileName | JSONB | {is_valid, expected_name, suggestion} |
| `check_transcription_import_requirements()` | fileName | JSONB | {is_valid, matching_files, message} |

---

## ⚛️ HOOKS REACT

### **useFileValidation**

```typescript
import { useFileValidation } from './hooks';

function MonComposant() {
  const {
    validateTranscriptionName,
    validateProofreadingV1Name,
    validateProofreadingV2Name,
    generateExpectedTranscriptionName,
    validateAndSuggestTranscriptionCorrection,
    checkTranscriptionImportRequirements
  } = useFileValidation();

  // Exemple d'utilisation
  const isValid = await validateTranscriptionName(rawFileId, 'interview.txt');
}
```

### **useWorkflowAutomation**

```typescript
import { useWorkflowAutomation } from './hooks';

function MonComposant() {
  const {
    autoLinkTranscriptionToRaw,
    autoCreateDocumentFromBookProject,
    finalizeTranscription,
    finalizeProofreadingV1,
    finalizeProofreadingV2
  } = useWorkflowAutomation();

  // Exemple: Finaliser une transcription
  const handleFinish = async () => {
    const result = await finalizeTranscription(transcriptionId, rawFileId, content);
    if (result.success) {
      alert('Transcription finalisée !');
    }
  };
}
```

### **useLineage**

```typescript
import { useLineage } from './hooks';

function MonComposant() {
  const { lineage, loading, error, getLineageSummary, getNextStep } = useLineage(rawFileId);

  if (loading) return <Chargement />;
  if (error) return <Erreur message={error} />;

  return (
    <div>
      <h2>Lignée éditoriale</h2>
      <pre>{getLineageSummary()}</pre>
      <p>Prochaine étape: {getNextStep()}</p>
      <p>Progression: {lineage?.global_progress}%</p>
    </div>
  );
}
```

---

## 🎯 CAS D'UTILISATION

### **CAS 1: Import d'une transcription avec validation**

```typescript
import { useFileValidation, useWorkflowAutomation } from './hooks';

async function handleImportTranscription(file: File, selectedRawFileId: string) {
  const { checkTranscriptionImportRequirements } = useFileValidation();
  const { autoLinkTranscriptionToRaw } = useWorkflowAutomation();

  // 1. Vérifier les requirements
  const check = await checkTranscriptionImportRequirements(file.name);
  
  if (!check?.is_valid) {
    // Proposer la correction
    const confirm = window.confirm(
      `Le nom ne correspond pas. Voulez-vous renommer en "${check.matching_raw_files[0]?.validation?.expected_name}" ?`
    );
    if (!confirm) return;
  }

  // 2. Import du fichier (à implémenter)
  const transcription = await uploadTranscription(file);

  // 3. Liaison automatique
  const result = await autoLinkTranscriptionToRaw(transcription.id, selectedRawFileId);
  
  if (result.success) {
    alert('✅ Transcription importée et liée automatiquement');
  }
}
```

### **CAS 2: Création d'un document depuis un projet**

```typescript
import { useWorkflowAutomation } from './hooks';

async function handleCreateDocumentFromProject(projectId: string) {
  const { autoCreateDocumentFromBookProject } = useWorkflowAutomation();

  const result = await autoCreateDocumentFromBookProject(projectId);
  
  if (result.success) {
    // Rediriger vers l'interface de relecture
    navigate(`/documents/${result.documentId}/edit`);
  } else {
    alert(`❌ ${result.message}`);
  }
}
```

### **CAS 3: Affichage de la lignée complète**

```typescript
import { useLineage } from './hooks';

function FileLineageView({ rawFileId }: { rawFileId: string }) {
  const { lineage, loading, error } = useLineage(rawFileId);

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorMessage message={error} />;
  if (!lineage) return <NotFoundMessage />;

  return (
    <div className="lineage-view">
      {/* Fichier brut */}
      <FileCard file={lineage.raw_file} />

      {/* Flèche de progression */}
      <ProgressArrow progress={lineage.global_progress} />

      {/* Transcriptions */}
      {lineage.transcriptions.map(t => (
        <TranscriptionCard key={t.id} transcription={t} />
      ))}

      {/* Projets de livre */}
      {lineage.book_projects.map(p => (
        <BookProjectCard key={p.id} project={p} />
      ))}

      {/* Relectures */}
      {lineage.proofreading_v1.map(r => (
        <ProofreadingCard key={r.id} proofreading={r} type="v1" />
      ))}
      {lineage.proofreading_v2.map(r => (
        <ProofreadingCard key={r.id} proofreading={r} type="v2" />
      ))}

      {/* Progression globale */}
      <ProgressBar value={lineage.global_progress} />
    </div>
  );
}
```

---

## 🧪 TESTS ET VALIDATION

### **Vues SQL de contrôle**

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

### **Exemples de requêtes de test**

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

---

## 📋 CHECKLIST D'IMPLÉMENTATION

### **Backend (SQL) ✅**
- [x] Migration 007: Fonction `get_raw_file_lineage()`
- [x] Migration 008: 9 triggers d'automatisation
- [x] Migration 009: Contraintes d'unicité R1/R2
- [x] Migration 010: 10 fonctions de validation

### **Frontend (React) ✅**
- [x] Hook `useFileValidation`
- [x] Hook `useWorkflowAutomation`
- [x] Hook `useLineage`
- [x] Hook `useProofreadingLineage`
- [x] Fichier d'export `index.ts`

### **À implémenter dans les composants existants** ⏳
- [ ] `ImportModal.tsx` : Intégrer la validation des noms
- [ ] `MediaLibrary.tsx` : Ajouter l'option "Créer Document"
- [ ] `Documents.tsx` : Ajouter l'option "Lancer Interface"
- [ ] `TranscriptionEditor.tsx` : Ajouter le bouton "Fin"
- [ ] Créer `BookProjectEditor.tsx`
- [ ] Créer `ProofreadingV1Editor.tsx`
- [ ] Créer `ProofreadingV2Editor.tsx`

---

## 🚀 PROCHAINES ÉTAPES

1. **Appliquer les migrations SQL** dans Supabase
2. **Tester les fonctions SQL** avec des données de test
3. **Intégrer les hooks** dans les composants existants
4. **Créer les interfaces dédiées** (BookProjectEditor, ProofreadingV1Editor, ProofreadingV2Editor)
5. **Tester le workflow complet** de bout en bout

---

## 📞 SUPPORT

Pour toute question ou problème :
1. Vérifier les logs de la console pour les erreurs
2. Utiliser les vues de contrôle pour diagnostiquer les problèmes
3. Consulter la documentation des fonctions SQL dans Supabase

# 🚀 IMPLÉMENTATION — BOUTON "LANCER" & CONVERSION

## 📋 RÉCAPITULATIF DES MODIFICATIONS

### 1. Hook de conversion créé
**Fichier :** `src/hooks/useDocumentConverter.ts`

**Fonctionnalités :**
- `convertDocumentToBlocks()` — Convertit un document en blocs atomiques
- `convertFileToBlocks()` — Convertit depuis un fichier (DOCX, PDF, TXT)
- `parseContentToBlocks()` — Parse le contenu HTML ou texte
- Politique de formatage Word incluse

---

### 2. Politique de formatage Word
**Fichier :** `WORD_FORMATTING_POLICY.md`

**Contenu :**
- Règles de structure (titres, paragraphes, listes)
- Styles de titre acceptés (Titre 1, Titre 2, Titre 3)
- Longueur max des paragraphes (2000 caractères)
- Formats d'image acceptés (PNG, JPG, GIF, WebP)
- Exemples de documents bien/mal formatés
- Checklist de vérification

---

### 3. Modification de Documents.tsx

#### A. Imports ajoutés
```typescript
import { useDocumentConverter } from "../../hooks/useDocumentConverter";
import { supabase } from "../../supabaseClient";
import { CorrectionEditor } from '../CorrectionEditor/CorrectionEditor';
```

#### B. États ajoutés
```typescript
const [isCollabMode, setIsCollabMode] = useState(false);
const [selectedDocumentForCorrection, setSelectedDocumentForCorrection] = useState<any>(null);
```

#### C. Nouvelle fonction : `handleLaunchCorrecteur()`
```typescript
const handleLaunchCorrecteur = async (doc: any) => {
  // 1. Vérifier le statut (relecture_2_en_cours uniquement)
  if (doc.status !== 'relecture_2_en_cours') {
    alert('Interface non disponible pour ce statut');
    return;
  }

  // 2. Vérifier si des blocs existent
  const { data: existingBlocks } = await supabase...
  
  // 3. Si aucun bloc → convertir
  if (!existingBlocks || existingBlocks.length === 0) {
    const result = await convertDocumentToBlocks(doc.id, doc.content);
    // ...
  }

  // 4. Ouvrir le correcteur
  setSelectedDocumentForCorrection(doc);
  setIsCollabMode(true);
};
```

#### D. Bouton "Lancer" (remplace "Modifier")
```tsx
<button
  onClick={() => handleLaunchCorrecteur(doc)}
  className={doc.status === 'relecture_2_en_cours' 
    ? 'bg-gradient-to-r from-purple-600 to-indigo-600'  // Actif
    : 'bg-gray-400 cursor-not-allowed'                   // Inactif
  }
>
  <i className={doc.status === 'relecture_2_en_cours' ? 'fa-rocket' : 'fa-lock'}></i>
  {doc.status === 'relecture_2_en_cours' ? 'Lancer' : 'Non disponible'}
</button>
```

#### E. Menu contextuel modifié
```tsx
{/* MODIFIER DÉPLACÉ ICI */}
<button onClick={() => handleEditDocument(doc)}>
  <i className="fas fa-pen"></i> Modifier
</button>
```

#### F. Rendu du CorrectionEditor
```tsx
{isCollabMode && selectedDocumentForCorrection && (
  <CorrectionEditor
    documentId={selectedDocumentForCorrection.id}
    documentTitle={selectedDocumentForCorrection.title}
    onClose={() => {
      setIsCollabMode(false);
      setSelectedDocumentForCorrection(null);
    }}
  />
)}
```

---

## 🎯 COMPORTEMENT DU BOUTON "LANCER"

### Selon le statut du document

| Statut | Affichage du bouton | Action au clic |
|--------|---------------------|----------------|
| `relecture_2_en_cours` | ✅ Actif (violet, icône rocket) | Ouvre le correcteur |
| `relecture_1_en_cours` | 🔒 Inactif (gris, icône lock) | Alert "Interface non disponible" |
| `projet_de_livre` | 🔒 Inactif | Alert "Interface non disponible" |
| `transcrit` | 🔒 Inactif | Alert "Interface non disponible" |
| Autres | 🔒 Inactif | Alert "Interface non disponible" |

---

## 🔄 FLUX DE CONVERSION

```
1. Utilisateur clique sur "Lancer"
   │
   ├─→ Statut ≠ relecture_2_en_cours ?
   │   └─→ Alert "Interface non disponible"
   │
   ├─→ Blocs existent déjà ?
   │   └─→ Ouvre CorrectionEditor
   │
   └─→ Aucun bloc ?
       ├─→ Confirm "Convertir le document ?"
       │   └─→ Annuler → Retour
       │
       └─→ Confirmer → convertDocumentToBlocks()
           │
           ├─→ Parse le contenu (HTML ou texte)
           │   ├─→ Titres (h1, h2, h3) → blocs heading
           │   ├─→ Paragraphes → blocs paragraph
           │   ├─→ Listes → blocs list_item
           │   └─→ Images → blocs image
           │
           ├─→ Insère les blocs dans document_blocks
           │
           └─→ Ouvre CorrectionEditor
```

---

## 📊 RÉSULTAT DE CONVERSION

### Exemple : Document Word de 5000 caractères

**Avant :**
```
Document
└── content: "Texte brut de 5000 caractères..."
```

**Après conversion :**
```
Document
├── total_blocks: 12
├── merged_blocks: 0
└── document_blocks:
    ├── §1  heading1   "Chapitre 1"            (15 mots)
    ├── §2  paragraph  "Introduction..."        (150 mots)
    ├── §3  paragraph  "Développement..."       (200 mots)
    ├── §4  heading2   "1.1 Contexte"           (8 mots)
    ├── §5  paragraph  "Le contexte est..."     (100 mots)
    ├── §6  image      "fig_001.png"            (légende)
    ├── §7  list_item  "• Premier point"        (15 mots)
    ├── §8  list_item  "• Deuxième point"       (20 mots)
    └── ...
```

---

## ⚠️ POINTS D'ATTENTION

### 1. Documents sans contenu
Si `doc.content` est vide ou null :
```
❌ Erreur : "Aucun contenu à convertir"
```

**Solution :** Importer un fichier depuis MediaLibrary avant de lancer le correcteur.

### 2. Paragraphes trop longs
Si un paragraphe > 2000 caractères :
```
✅ Découpage automatique en plusieurs blocs
```

### 3. Images non incorporées
Si une image est liée (non incorporée) :
```
⚠️ Avertissement : "Image non convertible"
```

**Solution :** Incorporer les images dans Word (clic droit → "Enregistrer sous forme d'image").

---

## 🧪 TESTS À EFFECTUER

### Test 1 : Document éligible (relecture_2_en_cours)

1. Créer un document avec statut `relecture_2_en_cours`
2. Ajouter du contenu dans `content`
3. Cliquer sur "Lancer"
4. ✅ Le correcteur s'ouvre

### Test 2 : Document non éligible

1. Créer un document avec statut `brouillon`
2. Cliquer sur "Lancer"
3. ✅ Alert "Interface non disponible"

### Test 3 : Conversion automatique

1. Document `relecture_2_en_cours` sans blocs
2. Cliquer sur "Lancer"
3. Confirmer la conversion
4. ✅ Les blocs sont créés
5. ✅ Le correcteur s'ouvre

### Test 4 : Blocs déjà existants

1. Document avec blocs existants
2. Cliquer sur "Lancer"
3. ✅ Le correcteur s'ouvre directement (pas de conversion)

---

## 📁 FICHIERS MODIFIÉS/CRÉÉS

| Fichier | Action | Description |
|---------|--------|-------------|
| `useDocumentConverter.ts` | ✅ Créé | Hook de conversion |
| `WORD_FORMATTING_POLICY.md` | ✅ Créé | Politique de formatage |
| `Documents.tsx` | ✅ Modifié | Bouton "Lancer" + menu contextuel |
| `hooks/index.ts` | ✅ Modifié | Export du hook |

---

## 🎨 CAPTURES D'ÉCRAN

### Bouton "Lancer" (actif)
```
┌─────────────────────────────────────┐
│  🚀 Lancer                          │  ← Violet, actif
└─────────────────────────────────────┘
```

### Bouton "Lancer" (inactif)
```
┌─────────────────────────────────────┐
│  🔒 Non disponible                  │  ← Gris, inactif
└─────────────────────────────────────┘
```

### Menu contextuel
```
┌─────────────────────────────┐
│  ✏️ Modifier                │  ← Déplacé ici
│  ─────────────────────────  │
│  📄 Exporter en PDF         │
│  🔗 Partager                │
│  📋 Dupliquer               │
│  📊 Statistiques            │
│  ─────────────────────────  │
│  🕐 Historique complet      │
└─────────────────────────────┘
```

---

## 🚀 PROCHAINES ÉTAPES

1. **Tester la conversion** avec de vrais documents Word
2. **Ajuster la politique** selon les retours utilisateurs
3. **Créer une Edge Function** pour la conversion DOCX → HTML
4. **Améliorer le parser** pour gérer les tableaux complexes

---

*Document créé le 8 mars 2025 — bcm-gest-react — Version 1.0*

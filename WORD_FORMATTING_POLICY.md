# 📄 POLITIQUE DE FORMATAGE WORD
## Pour une conversion optimale vers le correcteur collaboratif

---

## 🎯 OBJECTIF

Ce document décrit les **règles de formatage** à suivre lors de la création de documents Word (.docx) pour une **conversion optimale** en blocs atomiques dans le correcteur collaboratif BCM-GEST.

---

## 📋 SOMMAIRE

1. [Structure du document](#1-structure-du-document)
2. [Styles de titre](#2-styles-de-titre)
3. [Paragraphes](#3-paragraphes)
4. [Listes](#4-listes)
5. [Images et médias](#5-images-et-médias)
6. [Tableaux](#6-tableaux)
7. [Notes de bas de page](#7-notes-de-bas-de-page)
8. [Exemples](#8-exemples)

---

## 1. STRUCTURE DU DOCUMENT

### ✅ RECOMMANDÉ

```
Document Word
├── Titre principal (Titre 1)
│   ├── Introduction (Titre 2)
│   │   ├── Paragraphe 1
│   │   ├── Paragraphe 2
│   │   └── Liste à puces
│   ├── Chapitre 1 (Titre 2)
│   │   ├── Section 1.1 (Titre 3)
│   │   │   ├── Paragraphe
│   │   │   └── Image
│   │   └── Section 1.2 (Titre 3)
│   └── Chapitre 2 (Titre 2)
└── Conclusion (Titre 1)
```

### ❌ À ÉVITER

- Titres non hiérarchisés (Titre 1 → Titre 3 sans Titre 2)
- Titres vides ou sans contenu
- Structure trop profonde (> 4 niveaux)

---

## 2. STYLES DE TITRE

### ✅ STYLES ACCEPTÉS

| Niveau | Style Word | Style HTML | Usage |
|--------|------------|------------|-------|
| **Niveau 1** | `Titre 1` / `Heading 1` | `<h1>` | Titres de chapitres |
| **Niveau 2** | `Titre 2` / `Heading 2` | `<h2>` | Sections principales |
| **Niveau 3** | `Titre 3` / `Heading 3` | `<h3>` | Sous-sections |

### 📝 RÈGLES

- **Longueur max** : 100 caractères
- **Majuscules** : Éviter les TITRES EN MAJUSCULES
- **Ponctuation** : Pas de point final dans les titres
- **Numérotation** : Manuelle ou automatique Word

### ❌ EXEMPLES À ÉVITER

```
❌ "CHAPITRE 1 — INTRODUCTION GÉNÉRALE ET CONTEXTE DE L'ÉTUDE"  (trop long)
❌ "introduction"  (pas de majuscule)
❌ "Conclusion."  (point final)
```

### ✅ BONS EXEMPLES

```
✅ "Chapitre 1 — Introduction"
✅ "2.1 Contexte historique"
✅ "Annexe A — Glossaire"
```

---

## 3. PARAGRAPHES

### ✅ RÈGLES DE FORMATAGE

| Règle | Valeur | Justification |
|-------|--------|---------------|
| **Longueur max** | 2000 caractères | Au-delà, le paragraphe est découpé automatiquement |
| **Style** | `Normal` | Style Word par défaut |
| **Interligne** | 1.15 à 1.5 | Pour une meilleure lisibilité |
| **Alignement** | Gauche ou Justifié | Éviter centré (sauf titres) |
| **Retrait** | 0 ou 1.25 cm | Cohérent dans tout le document |

### 📝 DÉCOUPAGE AUTOMATIQUE

Si un paragraphe dépasse **2000 caractères**, il est **automatiquement découpé** en plusieurs blocs :

```
Paragraphe original (2500 caractères)
→ Bloc 1 : 0–1999 caractères
→ Bloc 2 : 2000–2500 caractères
```

### ❌ À ÉVITER

- Paragraphes de **plus de 5000 caractères** (trop de découpes)
- Paragraphes **vides** (lignes blanches inutiles)
- **Espaces multiples** entre les mots

---

## 4. LISTES

### ✅ TYPES DE LISTES SUPPORTÉS

| Type | Style Word | Conversion |
|------|------------|------------|
| **Liste à puces** | `Liste à puces` / `List Bullet` | `list_item` (bullet) |
| **Liste numérotée** | `Liste numérotée` / `List Number` | `list_item` (number) |
| **Liste hiérarchique** | Retrait de liste | `list_item` imbriqués |

### 📝 RÈGLES

- **Longueur par élément** : Max 500 caractères
- **Cohérence** : Utiliser le même style de puce dans une liste
- **Hiérarchie** : Max 3 niveaux de retrait

### ✅ EXEMPLE

```
✅ Liste correcte :
• Premier élément
• Deuxième élément
  - Sous-élément 1
  - Sous-élément 2
• Troisième élément
```

### ❌ EXEMPLE À ÉVITER

```
❌ Liste incorrecte :
• Premier élément très long qui dépasse 500 caractères et qui devrait être découpé en plusieurs paragraphes distincts pour une meilleure lisibilité...
- Deuxième élément avec un style de puce différent
  * Sous-élément avec un troisième style de puce
```

---

## 5. IMAGES ET MÉDIAS

### ✅ FORMATS ACCEPTÉS

| Format | Extension | Taille max | Usage |
|--------|-----------|------------|-------|
| **PNG** | `.png` | 5 Mo | Images avec transparence |
| **JPEG** | `.jpg`, `.jpeg` | 5 Mo | Photos, illustrations |
| **GIF** | `.gif` | 2 Mo | Animations simples |
| **WebP** | `.webp` | 5 Mo | Format moderne (recommandé) |

### 📝 RÈGLES DE FORMATAGE

- **Résolution** : Max 1920×1080 (Full HD)
- **Nom de fichier** : Explicite (ex: `fig_003_carte.png`)
- **Légende** : Utiliser la fonction "Insérer une légende" de Word
- **Texte alternatif** : Remplir dans Propriétés de l'image

### ❌ À ÉVITER

- Images **vectorielles** (SVG, EMF) → convertir en PNG
- Images **liées** (non incorporées) → incorporer dans le document
- Captures d'écran **non légendées**

---

## 6. TABLEAUX

### ⚠️ SUPPORT LIMITÉ

Les tableaux sont **convertis en paragraphes** :

```
| Colonne 1 | Colonne 2 |
|-----------|-----------|
| Valeur 1  | Valeur 2  |
```

→ Converti en :
```
Colonne 1 : Valeur 1
Colonne 2 : Valeur 2
```

### ✅ RECOMMANDATION

Pour les tableaux complexes :
1. Exporter en **image PNG**
2. Insérer l'image dans le document
3. Ajouter une **légende détaillée**

---

## 7. NOTES DE BAS DE PAGE

### ❌ NON SUPPORTÉ

Les notes de bas de page Word sont **ignorées** lors de la conversion.

### ✅ ALTERNATIVE

Utiliser l'un de ces formats :

```
✅ Notes entre parenthèses :
Ceci est une phrase importante (Voir annexe A pour plus de détails).

✅ Notes en fin de section :
---
Notes :
1. Détail de la référence bibliographique
2. Explication complémentaire
```

---

## 8. EXEMPLES

### ✅ DOCUMENT BIEN FORMATÉ

```
Titre 1 : La Forêt des Signes
│
├── Titre 2 : Chapitre 1 — L'Arrivée
│   ├── Paragraphe (1200 caractères)
│   ├── Paragraphe (800 caractères)
│   ├── Titre 3 : 1.1 Le Village
│   │   ├── Paragraphe (600 caractères)
│   │   └── Image : fig_001_village.png (légendée)
│   └── Liste à puces :
│       • Premier lieu visité
│       • Deuxième lieu visité
│
├── Titre 2 : Chapitre 2 — L'Enquête
│   ├── Paragraphe (1500 caractères)
│   └── Titre 3 : 2.1 Les Indices
│       └── Liste numérotée :
│           1. Premier indice
│           2. Deuxième indice
│
└── Titre 1 : Conclusion
    └── Paragraphe (900 caractères)
```

**Résultat de la conversion :**
- ✅ 12 blocs créés
- ✅ 0 erreur
- ✅ 0 avertissement

---

### ❌ DOCUMENT MAL FORMATÉ

```
TITRE EN MAJUSCULES SANS STYLE
PARAGRAPHE DE 8000 CARACTÈRES SANS SAUTS DE LIGNE
Image sans légende ni texte alternatif
• Liste avec styles de puces mélangés
Note de bas de page¹ non convertie
Tableau complexe non convertible
```

**Résultat de la conversion :**
- ❌ 3 blocs créés (mais incorrects)
- ❌ 5 erreurs
- ❌ 8 avertissements

---

## 📊 CHECKLIST DE VÉRIFICATION

Avant de convertir un document Word, vérifier :

- [ ] **Titres** : Utiliser les styles `Titre 1`, `Titre 2`, `Titre 3`
- [ ] **Paragraphes** : Max 2000 caractères chacun
- [ ] **Listes** : Style cohérent, éléments < 500 caractères
- [ ] **Images** : Format PNG/JPG, < 5 Mo, légendées
- [ ] **Pas de notes de bas de page**
- [ ] **Pas de tableaux complexes** (ou convertis en images)
- [ ] **Structure hiérarchique** respectée
- [ ] **Pas de caractères spéciaux** problématiques (ex: sauts de page manuels)

---

## 🛠️ OUTILS RECOMMANDÉS

### Dans Word

1. **Volet de navigation** (Affichage → Volet de navigation)
   - Vérifier la structure des titres
   
2. **Statistiques** (Révision → Statistiques)
   - Vérifier le nombre de caractères par paragraphe

3. **Styles** (Accueil → Styles)
   - Appliquer les styles recommandés

### Extensions Word utiles

- **Grammarly** : Vérification orthographe/grammaire
- **Wordtune** : Reformulation de paragraphes trop longs
- **PerfectIt** : Vérification de cohérence stylistique

---

## 📞 SUPPORT

En cas de problème de conversion :

1. Vérifier ce document
2. Consulter les logs de conversion
3. Contacter l'équipe technique BCM-GEST

---

*Document créé le 8 mars 2025 — bcm-gest-react — Version 1.0*

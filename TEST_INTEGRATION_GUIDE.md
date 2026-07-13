# 🧪 GUIDE DE TEST ET D'INTÉGRATION
## Module : Correcteur Collaboratif
### bcm-gest-react — Mars 2025

---

## 📋 SOMMAIRE

1. [Prérequis](#1-prérequis)
2. [Installation](#2-installation)
3. [Configuration](#3-configuration)
4. [Tests unitaires](#4-tests-unitaires)
5. [Tests d'intégration](#5-tests-dintégration)
6. [Tests E2E](#6-tests-e2e)
7. [Débogage](#7-débogage)
8. [Checklist de validation](#8-checklist-de-validation)

---

## 1. PRÉREQUIS

### ✅ Ce qui doit être en place

| Élément | Statut | Vérification |
|---------|--------|--------------|
| Migration 011 (rôles) | ✅ | `SELECT * FROM users LIMIT 5;` |
| Migrations 012-026 (tables) | ✅ | `SELECT COUNT(*) FROM document_blocks;` |
| Hook useUserRoles | ✅ | `src/hooks/useUserRoles.ts` existe |
| Hooks Phase 3 (5 hooks) | ✅ | `src/hooks/*.ts` |
| Composants Phase 4 (10) | ✅ | `src/components/CorrectionEditor/*.tsx` |

### 📦 Dépendances à installer

```bash
# Vérifier les dépendances existantes
npm list yjs y-supabase idb dompurify

# Installer si manquant
npm install yjs y-supabase idb dompurify

# Pour le développement
npm install --save-dev @types/dompurify
```

---

## 2. INSTALLATION

### Étape 1 : Installer les dépendances

```bash
cd bcm-gest-react

# Installer toutes les dépendances
npm install

# Vérifier l'installation
npm ls --depth=0 | grep -E "yjs|idb|dompurify"
```

### Étape 2 : Vérifier les fichiers

```bash
# Vérifier que tous les fichiers existent
ls -la src/hooks/use*.ts
ls -la src/components/CorrectionEditor/*.tsx
```

**Résultat attendu :**
```
src/hooks/useAuth.ts
src/hooks/useDocuments.ts
src/hooks/useUserRoles.ts
src/hooks/useDocumentBlocks.ts
src/hooks/useBlockProposals.ts
src/hooks/useBlockComments.ts
src/hooks/useCollabSession.ts
src/hooks/useOfflineSync.ts

src/components/CorrectionEditor/CorrectionEditor.tsx
src/components/CorrectionEditor/CorrectionTopbar.tsx
src/components/CorrectionEditor/DynamicSummary.tsx
src/components/CorrectionEditor/BlocksEditor.tsx
src/components/CorrectionEditor/BlockEditor.tsx
src/components/CorrectionEditor/RightPanel.tsx
src/components/CorrectionEditor/OfflineBanner.tsx
src/components/CorrectionEditor/BlockHistoryModal.tsx
src/components/CorrectionEditor/BlockDiffModal.tsx
src/components/CorrectionEditor/SessionCloseModal.tsx
```

### Étape 3 : Démarrer le serveur

```bash
# Démarrer en mode développement
npm run dev

# Vérifier que le serveur démarre sans erreur
# Doit afficher :
# ➜  Local:   http://localhost:3000/
# ➜  Network: use --host to expose
```

---

## 3. CONFIGURATION

### 3.1. Variables d'environnement

Vérifier `.env` :

```env
VITE_SUPABASE_URL=https://vuggjlvdgahcanjtrfvv.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_ogzqJ2mmmgD0CQwOQbir6g_WAfZidfH
```

### 3.2. Activer Realtime dans Supabase

1. Aller sur https://supabase.com
2. Dashboard → Database → Replication
3. Cliquer sur "Enable Realtime"
4. Cocher toutes les tables :
   - ☑ document_blocks
   - ☑ block_operations
   - ☑ block_proposals
   - ☑ block_comments
   - ☑ document_sessions
   - ☑ document_collaborators
   - ☑ notifications
5. Cliquer sur "Enable"

### 3.3. Créer des données de test

Exécute ce SQL dans Supabase SQL Editor :

```sql
-- 1. Créer un document de test
INSERT INTO documents (
  id,
  title,
  type,
  status,
  user_id,
  total_blocks,
  merged_blocks
) VALUES (
  gen_random_uuid(),
  'Chapitre 3 — Test',
  'correction',
  'in_review',
  (SELECT id FROM users WHERE email = 'kamfotsobruno@gmail.com'),
  0,
  0
) RETURNING id;

-- 2. Créer des blocs de test
DO $$
DECLARE
  v_doc_id UUID;
  v_user_id UUID;
BEGIN
  -- Récupérer le document
  SELECT id INTO v_doc_id FROM documents WHERE title = 'Chapitre 3 — Test' LIMIT 1;
  
  -- Récupérer l'utilisateur
  SELECT id INTO v_user_id FROM users WHERE email = 'kamfotsobruno@gmail.com' LIMIT 1;
  
  -- Créer 5 blocs de test
  FOR i IN 1..5 LOOP
    INSERT INTO document_blocks (
      document_id,
      type,
      position,
      content,
      status,
      created_by,
      word_count,
      char_count
    ) VALUES (
      v_doc_id,
      CASE 
        WHEN i = 1 THEN 'heading1'
        ELSE 'paragraph'
      END,
      i - 1,
      jsonb_build_object(
        'content', 'Contenu du bloc ' || i,
        'type', 'paragraph'
      ),
      CASE 
        WHEN i <= 2 THEN 'merged'
        WHEN i = 3 THEN 'proposed'
        ELSE 'draft'
      END,
      v_user_id,
      50,
      300
    );
  END LOOP;
END $$;

-- 3. Vérifier
SELECT 
  d.title,
  COUNT(b.id) as nb_blocks,
  COUNT(*) FILTER (WHERE b.status = 'merged') as merged,
  COUNT(*) FILTER (WHERE b.status = 'proposed') as proposed,
  COUNT(*) FILTER (WHERE b.status = 'draft') as draft
FROM documents d
LEFT JOIN document_blocks b ON d.id = b.document_id
WHERE d.title = 'Chapitre 3 — Test'
GROUP BY d.title;
```

---

## 4. TESTS UNITAIRES

### Test 1 : useUserRoles

```typescript
// Dans la console du navigateur (F12)
import { useUserRoles } from './src/hooks/useUserRoles';

// Tester le hook
const { users, loading, error } = useUserRoles();

console.log('Users:', users);
console.log('Loading:', loading);
console.log('Error:', error);
```

**Résultat attendu :**
```
Users: [{ id: '...', email: 'kamfotsobruno@gmail.com', role: 'admin', ... }]
Loading: false
Error: null
```

### Test 2 : useDocumentBlocks

```typescript
// Tester avec un document ID
const { blocks, loading, error } = useDocumentBlocks('uuid-du-document');

console.log('Blocks:', blocks);
console.log('Nombre de blocs:', blocks.length);
```

**Résultat attendu :**
```
Blocks: [{ id: '...', type: 'heading1', position: 0, ... }, ...]
Nombre de blocs: 5
```

### Test 3 : useCollabSession

```typescript
// Tester la session
const { collaborators, myColor, joinSession } = useCollabSession('uuid-du-document');

// Rejoindre la session
await joinSession('uuid-du-document');

console.log('Ma couleur:', myColor);
console.log('Collaborateurs:', collaborators);
```

---

## 5. TESTS D'INTÉGRATION

### Test 1 : Ouvrir le correcteur

1. **Démarrer l'application**
   ```bash
   npm run dev
   ```

2. **Se connecter**
   - URL : http://localhost:3000
   - Email : `kamfotsobruno@gmail.com`
   - Mot de passe : `123456789`

3. **Aller dans Documents**
   - Cliquer sur l'onglet "Documents"
   - Trouver le document "Chapitre 3 — Test"

4. **Ouvrir le correcteur**
   - Cliquer sur le document
   - Le mode "CorrectionEditor" devrait s'ouvrir en plein écran

**Résultat attendu :**
- ✅ Topbar avec fil d'ariane
- ✅ Sommaire à gauche avec 5 blocs
- ✅ Zone centrale avec les blocs
- ✅ Panneau droit avec 3 onglets

### Test 2 : Navigation dans les blocs

1. **Cliquer sur un bloc dans le sommaire**
   - Le bloc devrait être surligné
   - Scroll automatique vers le bloc

2. **Ouvrir le menu d'un bloc (···)**
   - Les options devraient s'afficher
   - "Modifier", "Commenter", "Historique", etc.

3. **Cliquer sur "Historique"**
   - La modal BlockHistoryModal devrait s'ouvrir

**Résultat attendu :**
- ✅ Sélection de bloc fonctionne
- ✅ Menu contextuel s'ouvre
- ✅ Modal d'historique s'affiche

### Test 3 : Panneau droit

1. **Onglet "Propositions"**
   - Devrait afficher "3 propositions en attente"
   - Boutons "Approuver" et "Rejeter"

2. **Onglet "Activité"**
   - Flux d'activité en temps réel
   - "Aminata a édité §p03"

3. **Onglet "Offline"**
   - Statut "🟢 En ligne"
   - "0 opérations en attente"

**Résultat attendu :**
- ✅ 3 onglets fonctionnels
- ✅ Changement d'onglet fluide
- ✅ Données affichées correctement

### Test 4 : Test de déconnexion

1. **Ouvrir les DevTools (F12)**
2. **Aller dans Network**
3. **Cliquer sur "No throttling" → "Offline"**
4. **Observer la bannière**

**Résultat attendu :**
- ✅ Bannière rouge "🔴 Hors ligne" apparaît
- ✅ Compteur d'opérations en attente
- ✅ Bouton "Réessayer" fonctionnel

---

## 6. TESTS E2E (End-to-End)

### Scénario 1 : Session collaborative complète

```
1. Utilisateur A ouvre le document
   → Rejoint la session
   → Curseur bleu assigné

2. Utilisateur B ouvre le même document
   → Rejoint la session
   → Curseur vert assigné

3. Utilisateur A édite un bloc
   → Indicateur "Aminata écrit..." apparaît
   → Curseur se déplace

4. Utilisateur B voit la modification en temps réel
   → Le bloc est mis à jour
   → Notification toast

5. Utilisateur A soumet une proposition
   → Statut du bloc → "proposed"
   → Notification pour l'admin

6. Admin approuve la proposition
   → Statut du bloc → "merged"
   → Progression augmente

7. Admin clôture la session
   → Modal SessionCloseModal
   → Document passe en "Correction finale"
```

### Scénario 2 : Gestion offline

```
1. Utilisateur édite un bloc en ligne
   → Modification synchronisée

2. Utilisateur passe hors ligne
   → Bannière "Hors ligne" apparaît
   → Compteur = 0

3. Utilisateur modifie un bloc
   → Opération ajoutée à la file
   → Compteur = 1

4. Utilisateur modifie un autre bloc
   → Compteur = 2

5. Utilisateur revient en ligne
   → Synchronisation automatique
   → Compteur = 0
   → Toast "2 opérations synchronisées"
```

---

## 7. DÉBOGAGE

### Erreur 1 : "Failed to fetch"

**Cause :** Problème de connexion à Supabase

**Solution :**
```bash
# Vérifier la connexion
ping vuggjlvdgahcanjtrfvv.supabase.co

# Vérifier les variables d'environnement
cat .env

# Redémarrer le serveur
Ctrl+C
npm run dev
```

### Erreur 2 : "Realtime not enabled"

**Cause :** Realtime non activé dans Supabase

**Solution :**
1. Dashboard Supabase → Database → Replication
2. Activer les tables
3. Redémarrer l'application

### Erreur 3 : "Cannot read property 'blocks' of undefined"

**Cause :** Hook appelé sans documentId

**Solution :**
```typescript
// AVANT (erreur)
const { blocks } = useDocumentBlocks();

// APRÈS (correct)
const { blocks } = useDocumentBlocks(documentId);
```

### Erreur 4 : Modal ne s'ouvre pas

**Cause :** Problème de z-index ou d'animation

**Solution :**
```css
/* Dans tailwind.config.js */
module.exports = {
  theme: {
    extend: {
      animation: {
        'fade-in': 'fadeIn 0.2s ease-in-out',
        'scale-in': 'scaleIn 0.2s ease-out',
        'slide-up': 'slideUp 0.3s ease-out',
      }
    }
  }
}
```

---

## 8. CHECKLIST DE VALIDATION

### ✅ Backend (SQL)

- [ ] Migration 011 appliquée (rôles)
- [ ] Migrations 012-026 appliquées (tables)
- [ ] Realtime activé sur les 7 tables
- [ ] Fonctions SQL testées (`merge_block()`, etc.)
- [ ] Triggers fonctionnels (notifications)

### ✅ Hooks (Phase 3)

- [ ] `useUserRoles` — Retourne les utilisateurs
- [ ] `useDocumentBlocks` — Charge les blocs
- [ ] `useBlockProposals` — Gère les propositions
- [ ] `useBlockComments` — Gère les commentaires
- [ ] `useCollabSession` — Session live
- [ ] `useOfflineSync` — Sync offline

### ✅ Composants (Phase 4)

- [ ] `CorrectionEditor` — S'ouvre en plein écran
- [ ] `CorrectionTopbar` — Affiche fil d'ariane + progression
- [ ] `DynamicSummary` — Sommaire avec stats
- [ ] `BlocksEditor` — Zone centrale fonctionnelle
- [ ] `BlockEditor` — Blocs avec menu contextuel
- [ ] `RightPanel` — 3 onglets fonctionnels
- [ ] `OfflineBanner` — S'affiche hors ligne
- [ ] `BlockHistoryModal` — Historique des opérations
- [ ] `BlockDiffModal` — Comparaison de versions
- [ ] `SessionCloseModal` — Clôture de session

### ✅ Intégration

- [ ] Module s'ouvre depuis Documents.tsx
- [ ] Bouton "Retour" fonctionne
- [ ] Navigation fluide entre les vues
- [ ] Pas d'erreurs dans la console
- [ ] Realtime fonctionne (2 navigateurs)

### ✅ Performance

- [ ] Chargement < 2 secondes
- [ ] Scroll fluide
- [ ] Animations à 60 FPS
- [ ] Pas de memory leak

---

## 🎯 RÉSULTAT ATTENDU

Si tous les tests sont verts ✅, le module est **PRÊT POUR LA PRODUCTION**.

---

*Document créé le 8 mars 2025 — bcm-gest-react*

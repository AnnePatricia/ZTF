# 🧪 TEST DU MODULE USERS — PHASE 1

## 🎯 OBJECTIF

Tester le module de gestion des utilisateurs avec les nouveaux rôles techniques.

---

## 📋 PRÉREQUIS

### 1. Migration 011 appliquée ✅
```sql
-- Vérifier que la migration est appliquée
SELECT conname FROM pg_constraint WHERE conname = 'users_role_check';
```

### 2. Hook `useUserRoles` créé ✅
- Fichier : `src/hooks/useUserRoles.ts`

### 3. Composants UI créés ✅
- `Users.tsx` — Composant principal
- `UsersTable.tsx` — Tableau des utilisateurs
- `RoleBadge.tsx` — Badge coloré par rôle
- `PermissionsPanel.tsx` — Panneau des permissions
- `RoleEditModal.tsx` — Modal de changement de rôle
- `UserEditModal.tsx` — Modal d'édition des permissions

---

## 🔐 CRÉER LE COMPTE ADMIN DE TEST

### Option 1 : Via SQL (recommandé pour le test)

Exécute ce SQL dans Supabase SQL Editor :

```sql
-- 1. Créer l'utilisateur dans auth.users
-- Remplace le mot de passe si nécessaire
INSERT INTO auth.users (
  id,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_user_meta_data,
  created_at,
  updated_at
) VALUES (
  gen_random_uuid(),  -- Génère un UUID automatique
  'kamfotsobruno@gmail.com',
  crypt('123456789', gen_salt('bf')),  -- Hachage du mot de passe
  NOW(),  -- Email confirmé
  '{"full_name": "Bruno Kamfotsa"}',  -- Métadonnées
  NOW(),
  NOW()
) RETURNING id;
```

**⚠️ IMPORTANT :** Copie l'UUID retourné par cette requête !

```sql
-- 2. Créer le profil dans public.users avec le rôle admin
-- Remplace <UUID_CI_DESSUS> par l'UUID retourné ci-dessus
INSERT INTO public.users (
  id,
  email,
  full_name,
  role,
  timezone,
  preferred_lang,
  can_import,
  can_transcribe,
  can_review,
  can_edit,
  can_delete,
  can_manage_users
) VALUES (
  '<UUID_CI_DESSUS>',  -- ← Remplace par l'UUID de l'étape 1
  'kamfotsobruno@gmail.com',
  'Bruno Kamfotsa',
  'admin',  -- ← Rôle technique ADMIN
  'Africa/Douala',
  'fr',
  TRUE,  -- can_import
  TRUE,  -- can_transcribe
  TRUE,  -- can_review
  TRUE,  -- can_edit
  TRUE,  -- can_delete
  TRUE   -- can_manage_users
);
```

### Option 2 : Via l'interface (après que le module fonctionne)

1. Aller dans l'onglet "Utilisateurs"
2. Cliquer sur "Nouvel utilisateur"
3. Remplir :
   - Email : `kamfotsobruno@gmail.com`
   - Nom : `Bruno Kamfotsa`
   - Rôle : `admin`
4. Cliquer sur "Inviter"

---

## 🧪 TESTER LE MODULE

### Étape 1 : Se connecter

1. Ouvrir l'application : http://localhost:3000
2. Se connecter avec :
   - Email : `kamfotsobruno@gmail.com`
   - Mot de passe : `123456789`

### Étape 2 : Accéder au module Users

1. Cliquer sur l'onglet "Utilisateurs" dans la navigation
2. Vérifier que le tableau s'affiche

### Étape 3 : Tester les fonctionnalités

#### A. Voir les utilisateurs
- [ ] Le tableau affiche tous les utilisateurs
- [ ] Les badges de rôle sont colorés correctement
- [ ] Les permissions sont visibles (icônes)

#### B. Changer un rôle
1. Cliquer sur l'icône 👤 (Modifier le rôle)
2. Sélectionner un nouveau rôle (ex: `corrector`)
3. Cliquer sur "Enregistrer"
4. [ ] Le rôle est mis à jour
5. [ ] Le badge change de couleur

#### C. Modifier les permissions
1. Cliquer sur l'icône ✏️ (Modifier permissions)
2. Aller dans l'onglet "Permissions"
3. Cocher/décocher des cases (ex: `can_import`)
4. Cliquer sur "Enregistrer"
5. [ ] Les permissions sont mises à jour

#### D. Modifier le profil
1. Cliquer sur ✏️
2. Aller dans l'onglet "Profil"
3. Modifier le nom, département, timezone
4. Cliquer sur "Enregistrer"
5. [ ] Le profil est mis à jour

#### E. Supprimer un utilisateur
1. Cliquer sur l'icône 🗑️
2. Confirmer la suppression
3. [ ] L'utilisateur est supprimé (ou désactivé)

#### F. Inviter un nouvel utilisateur
1. Cliquer sur "Nouvel utilisateur"
2. Remplir le formulaire :
   - Email : `test@bcm-gest.com`
   - Nom : `Utilisateur Test`
   - Rôle : `corrector`
3. Cliquer sur "Inviter"
4. [ ] L'utilisateur est créé
5. [ ] Il apparaît dans le tableau

---

## 🎨 VÉRIFICATIONS VISUELLES

### Rôles et couleurs

| Rôle | Badge | Couleur |
|------|-------|---------|
| `admin` | 👑 Admin | Rouge |
| `editor` | 📝 Éditeur | Bleu |
| `redacteur_chef` | ✒️ Rédac. chef | Violet |
| `corrector` | ✅ Correcteur | Vert |
| `reviewer` | 👁️ Relecteur | Gris |
| `user` | 👤 Utilisateur | Blanc |

### Permissions (icônes)

| Permission | Icône | Couleur |
|------------|-------|---------|
| `can_import` | 📁 Upload | Vert |
| `can_transcribe` | ✏️ Pen | Bleu |
| `can_review` | 👁️ Eye | Violet |
| `can_edit` | ✏️ Edit | Amber |
| `can_delete` | 🗑️ Trash | Rouge |
| `can_manage_users` | 👥 Users | Indigo |

---

## 🐛 DÉBOGAGE

### Erreur : "user_has_permission n'existe pas"

**Solution :** Re-exécuter la migration 011

```sql
-- Vérifier que la fonction existe
SELECT proname FROM pg_proc WHERE proname = 'user_has_permission';
```

### Erreur : "Constraint users_role_check is violated"

**Cause :** Un utilisateur a un rôle invalide

**Solution :**
```sql
-- Voir les rôles invalides
SELECT email, role FROM users 
WHERE role NOT IN ('user', 'editor', 'admin', 'redacteur_chef', 'corrector', 'reviewer');

-- Corriger
UPDATE users SET role = 'user' 
WHERE role NOT IN ('user', 'editor', 'admin', 'redacteur_chef', 'corrector', 'reviewer');
```

### Erreur : "Column is_active does not exist"

**Cause :** La migration 011 essaie de créer un index sur `is_active`

**Solution :** La migration a été corrigée, mais si l'erreur persiste, vérifier que la colonne n'existe pas :

```sql
-- Vérifier
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'users' AND column_name = 'is_active';
```

---

## ✅ CRITÈRES DE VALIDATION

La Phase 1 est validée si :

- [ ] La migration 011 est appliquée sans erreur
- [ ] Le compte admin `kamfotsobruno@gmail.com` existe
- [ ] La connexion fonctionne
- [ ] Le module Users s'affiche
- [ ] On peut changer un rôle
- [ ] On peut modifier les permissions
- [ ] On peut inviter un utilisateur
- [ ] Les badges sont colorés correctement
- [ ] La matrice des permissions est respectée

---

## 📊 REQUÊTES DE VÉRIFICATION

```sql
-- 1. Voir tous les utilisateurs avec leurs rôles
SELECT 
  email,
  full_name,
  role,
  timezone,
  preferred_lang,
  can_import,
  can_transcribe,
  can_review,
  can_edit,
  can_delete,
  can_manage_users,
  created_at
FROM users
ORDER BY created_at DESC;

-- 2. Compter par rôle
SELECT role, COUNT(*) as nb_users
FROM users
GROUP BY role
ORDER BY nb_users DESC;

-- 3. Tester les permissions
SELECT 
  email,
  role,
  user_has_permission(id, 'import_files') as can_importer,
  user_has_permission(id, 'transcribe') as can_transcrire,
  user_has_permission(id, 'merge_blocks') as can_merger,
  user_has_permission(id, 'propose_modification') as can_proposer,
  user_has_permission(id, 'comment') as can_commenter,
  user_has_permission(id, 'close_session') as can_clore_session
FROM users;
```

---

*Document de test — Phase 1 — bcm-gest-react — Mars 2025*

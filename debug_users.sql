-- =====================================================
-- DEBUG : VÉRIFIER LES UTILISATEURS
-- =====================================================

-- 1. Vérifier dans auth.users
SELECT 
  id,
  email,
  email_confirmed_at,
  created_at
FROM auth.users
WHERE email LIKE '%kamfotso%' OR email LIKE '%bruno%';

-- 2. Vérifier dans public.users
SELECT 
  id,
  email,
  full_name,
  role,
  can_import,
  can_transcribe,
  can_review,
  can_edit,
  can_delete,
  can_manage_users,
  created_at
FROM public.users
ORDER BY created_at DESC;

-- 3. Vérifier la correspondance entre les deux tables
SELECT 
  auth.email as auth_email,
  auth.created_at as auth_created,
  pub.full_name as public_name,
  pub.role as public_role,
  CASE 
    WHEN pub.id IS NULL THEN '❌ Orphelin dans auth.users'
    ELSE '✅ Lié'
  END as status
FROM auth.users auth
LEFT JOIN public.users pub ON auth.id = pub.id
WHERE auth.email LIKE '%kamfotso%' OR auth.email LIKE '%bruno%' OR auth.email LIKE '%gmail%';

-- 4. Compter les utilisateurs
SELECT 
  (SELECT COUNT(*) FROM auth.users) as total_auth_users,
  (SELECT COUNT(*) FROM public.users) as total_public_users;

-- 5. Voir TOUS les utilisateurs de public.users
SELECT 
  id,
  email,
  full_name,
  role,
  created_at
FROM public.users
ORDER BY email;

-- 6. Si kamfotsobruno@gmail.com n'est pas dans public.users, le créer
DO $$
DECLARE
  auth_user_id UUID;
BEGIN
  -- Trouver dans auth.users
  SELECT id INTO auth_user_id
  FROM auth.users
  WHERE email = 'kamfotsobruno@gmail.com';
  
  IF auth_user_id IS NOT NULL THEN
    -- Vérifier s'il est dans public.users
    IF NOT EXISTS (SELECT 1 FROM public.users WHERE id = auth_user_id) THEN
      -- Créer le profil
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
        auth_user_id,
        'kamfotsobruno@gmail.com',
        'KAMDEM FOTSO Bruno',
        'admin',
        'Africa/Douala',
        'fr',
        TRUE,
        TRUE,
        TRUE,
        TRUE,
        TRUE,
        TRUE
      );
      
      RAISE NOTICE '✅ Utilisateur créé dans public.users !';
    ELSE
      RAISE NOTICE 'ℹ️ Utilisateur déjà dans public.users';
    END IF;
  ELSE
    RAISE NOTICE '❌ Utilisateur non trouvé dans auth.users';
  END IF;
END $$;

-- 7. Re-vérifier après création
SELECT 
  id,
  email,
  full_name,
  role,
  can_import,
  can_transcribe,
  can_review,
  can_edit,
  can_delete,
  can_manage_users
FROM public.users
WHERE email = 'kamfotsobruno@gmail.com';

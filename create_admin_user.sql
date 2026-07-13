-- =====================================================
-- CRÉATION DU COMPTE ADMIN DE TEST
-- Email: kamfotsobruno@gmail.com
-- Mot de passe: 123456789
-- =====================================================

-- ÉTAPE 1 : Créer l'utilisateur dans auth.users
-- Exécute cette requête et COPIE L'UUID retourné
DO $$
DECLARE
  new_user_id UUID;
BEGIN
  -- Insérer dans auth.users
  INSERT INTO auth.users (
    id,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_user_meta_data,
    created_at,
    updated_at
  ) VALUES (
    gen_random_uuid(),
    'kamfotsobruno@gmail.com',
    crypt('123456789', gen_salt('bf')),
    NOW(),
    '{"full_name": "Bruno Kamfotsa"}',
    NOW(),
    NOW()
  ) RETURNING id INTO new_user_id;

  -- ÉTAPE 2 : Créer le profil dans public.users
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
    new_user_id,
    'kamfotsobruno@gmail.com',
    'Bruno Kamfotsa',
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

  -- Afficher un message de confirmation
  RAISE NOTICE '✅ Compte admin créé avec succès !';
  RAISE NOTICE '   Email: kamfotsobruno@gmail.com';
  RAISE NOTICE '   Mot de passe: 123456789';
  RAISE NOTICE '   Rôle: admin';
  RAISE NOTICE '   UUID: %', new_user_id;
END $$;

-- =====================================================
-- VÉRIFICATION
-- =====================================================

-- Voir le compte créé
SELECT 
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
FROM users
WHERE email = 'kamfotsobruno@gmail.com';

-- Tester les permissions
SELECT 
  user_has_permission(id, 'import_files') as can_import,
  user_has_permission(id, 'transcribe') as can_transcribe,
  user_has_permission(id, 'merge_blocks') as can_merge,
  user_has_permission(id, 'propose_modification') as can_propose,
  user_has_permission(id, 'comment') as can_comment,
  user_has_permission(id, 'close_session') as can_close_session,
  user_has_permission(id, 'manage_users') as can_manage_users
FROM users
WHERE email = 'kamfotsobruno@gmail.com';

-- =====================================================
-- CRÉATION DU COMPTE ADMIN
-- Email: kamfotsobruno@gmail.com
-- Mot de passe: 123456789
-- =====================================================

-- Activer pgcrypto si nécessaire
CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$
DECLARE
  new_user_id UUID;
BEGIN
  -- Vérifier si l'utilisateur existe déjà
  SELECT id INTO new_user_id
  FROM auth.users
  WHERE email = 'kamfotsobruno@gmail.com';
  
  IF new_user_id IS NOT NULL THEN
    -- L'utilisateur existe, mettre à jour le mot de passe
    UPDATE auth.users
    SET 
      encrypted_password = crypt('123456789', gen_salt('bf')),
      email_confirmed_at = NOW(),
      raw_user_meta_data = '{"full_name": "KAMDEM FOTSO Bruno"}',
      updated_at = NOW()
    WHERE email = 'kamfotsobruno@gmail.com';
    
    RAISE NOTICE '✅ Compte mis à jour !';
  ELSE
    -- Créer le nouvel utilisateur
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
      '{"full_name": "KAMDEM FOTSO Bruno"}',
      NOW(),
      NOW()
    ) RETURNING id INTO new_user_id;
    
    RAISE NOTICE '✅ Nouveau compte créé !';
  END IF;
  
  -- Créer/mettre à jour le profil dans public.users
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
  )
  ON CONFLICT (id) DO UPDATE SET
    full_name = 'KAMDEM FOTSO Bruno',
    role = 'admin',
    timezone = 'Africa/Douala',
    preferred_lang = 'fr',
    can_import = TRUE,
    can_transcribe = TRUE,
    can_review = TRUE,
    can_edit = TRUE,
    can_delete = TRUE,
    can_manage_users = TRUE,
    updated_at = NOW();
  
  RAISE NOTICE '✅ Profil public créé/mis à jour !';
  RAISE NOTICE '   Email: kamfotsobruno@gmail.com';
  RAISE NOTICE '   Mot de passe: 123456789';
  RAISE NOTICE '   Rôle: admin';
END $$;

-- Vérification
SELECT
  u.id,
  u.email,
  u.full_name,
  u.role,
  user_has_permission(u.id, 'merge_blocks') as can_merge,
  user_has_permission(u.id, 'propose_modification') as can_propose,
  user_has_permission(u.id, 'comment') as can_comment
FROM public.users u
WHERE u.email = 'kamfotsobruno@gmail.com';
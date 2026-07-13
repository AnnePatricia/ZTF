-- =====================================================
-- VÉRIFICATION / CRÉATION DU COMPTE ADMIN
-- Email: kamfotsobruno@gmail.com
-- =====================================================

-- Vérifier si l'utilisateur existe déjà
DO $$
DECLARE
  existing_user_id UUID;
  user_exists BOOLEAN;
BEGIN
  -- Vérifier dans auth.users
  SELECT id INTO existing_user_id 
  FROM auth.users 
  WHERE email = 'kamfotsobruno@gmail.com';
  
  IF existing_user_id IS NOT NULL THEN
    -- L'utilisateur existe, vérifier le rôle
    SELECT role INTO user_exists
    FROM public.users
    WHERE id = existing_user_id AND role = 'admin';
    
    IF user_exists THEN
      -- Déjà admin, rien à faire
      RAISE NOTICE '✅ Le compte admin existe déjà !';
      RAISE NOTICE '   Email: kamfotsobruno@gmail.com';
      RAISE NOTICE '   Rôle: admin';
    ELSE
      -- Existe mais pas admin, mettre à jour
      UPDATE public.users
      SET 
        role = 'admin',
        can_import = TRUE,
        can_transcribe = TRUE,
        can_review = TRUE,
        can_edit = TRUE,
        can_delete = TRUE,
        can_manage_users = TRUE,
        updated_at = NOW()
      WHERE id = existing_user_id;
      
      RAISE NOTICE '⚠️ Compte trouvé mais pas admin. Rôle mis à jour vers admin !';
      RAISE NOTICE '   Email: kamfotsobruno@gmail.com';
    END IF;
  ELSE
    -- N'existe pas, créer
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
      '{"full_name": "Bruno KAMDEM FOTSO"}',
      NOW(),
      NOW()
    ) RETURNING id INTO existing_user_id;
    
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
      existing_user_id,
      'kamfotsobruno@gmail.com',
      'Bruno KAMDEM FOTSO',
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
    
    RAISE NOTICE '✅ Nouveau compte admin créé !';
    RAISE NOTICE '   Email: kamfotsobruno@gmail.com';
    RAISE NOTICE '   Mot de passe: 123456789';
    RAISE NOTICE '   Rôle: admin';
  END IF;
END $$;

-- =====================================================
-- AFFICHER LES INFORMATIONS DU COMPTE
-- =====================================================

SELECT 
  u.id,
  u.email,
  u.full_name,
  u.role,
  u.timezone,
  u.preferred_lang,
  u.can_import,
  u.can_transcribe,
  u.can_review,
  u.can_edit,
  u.can_delete,
  u.can_manage_users,
  u.created_at,
  -- Tester les permissions du correcteur
  user_has_permission(u.id, 'merge_blocks') as can_merge_blocks,
  user_has_permission(u.id, 'propose_modification') as can_propose,
  user_has_permission(u.id, 'comment') as can_comment,
  user_has_permission(u.id, 'close_session') as can_close_session
FROM public.users u
WHERE u.email = 'kamfotsobruno@gmail.com';

-- =====================================================
-- STATISTIQUES DES RÔLES
-- =====================================================

SELECT 
  role,
  COUNT(*) as nb_utilisateurs,
  STRING_AGG(email, ', ') as emails
FROM public.users
GROUP BY role
ORDER BY nb_utilisateurs DESC;

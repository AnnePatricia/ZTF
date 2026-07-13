-- =====================================================
-- CRÉER LE PROFIL PUBLIC POUR L'UTILISATEUR EXISTANT
-- Email: kamfotsobruno@gmail.com
-- Nom: KAMDEM FOTSO Bruno
-- =====================================================

-- Vérifier si l'utilisateur existe dans auth.users mais pas dans public.users
DO $$
DECLARE
  auth_user_id UUID;
  public_user_exists BOOLEAN;
BEGIN
  -- Trouver l'utilisateur dans auth.users
  SELECT id INTO auth_user_id
  FROM auth.users
  WHERE email = 'kamfotsobruno@gmail.com';
  
  IF auth_user_id IS NOT NULL THEN
    -- Vérifier s'il existe dans public.users
    SELECT EXISTS(
      SELECT 1 FROM public.users WHERE id = auth_user_id
    ) INTO public_user_exists;
    
    IF public_user_exists THEN
      -- Déjà dans public.users, mettre à jour
      UPDATE public.users
      SET 
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
        updated_at = NOW()
      WHERE id = auth_user_id;
      
      RAISE NOTICE '✅ Profil public mis à jour !';
      RAISE NOTICE '   Email: kamfotsobruno@gmail.com';
      RAISE NOTICE '   Nom: KAMDEM FOTSO Bruno';
      RAISE NOTICE '   Rôle: admin';
    ELSE
      -- N'existe pas dans public.users, le créer
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
      
      RAISE NOTICE '✅ Profil public créé avec succès !';
      RAISE NOTICE '   Email: kamfotsobruno@gmail.com';
      RAISE NOTICE '   Nom: KAMDEM FOTSO Bruno';
      RAISE NOTICE '   Rôle: admin';
      RAISE NOTICE '   Toutes les permissions sont activées';
    END IF;
  ELSE
    RAISE NOTICE '❌ Utilisateur non trouvé dans auth.users !';
    RAISE NOTICE '   Veuillez d''abord créer le compte dans auth.users';
  END IF;
END $$;

-- =====================================================
-- VÉRIFICATION
-- =====================================================

-- Afficher le profil créé/mis à jour
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
  u.updated_at
FROM public.users u
WHERE u.email = 'kamfotsobruno@gmail.com';

-- =====================================================
-- TESTER LES PERMISSIONS
-- =====================================================

SELECT 
  u.email,
  u.full_name,
  u.role,
  -- Permissions du workflow (booléens)
  u.can_import as workflow_import,
  u.can_transcribe as workflow_transcribe,
  u.can_review as workflow_review,
  u.can_edit as workflow_edit,
  u.can_delete as workflow_delete,
  u.can_manage_users as workflow_manage,
  -- Permissions du correcteur (dérivées du rôle)
  user_has_permission(u.id, 'merge_blocks') as correcteur_merge,
  user_has_permission(u.id, 'propose_modification') as correcteur_propose,
  user_has_permission(u.id, 'comment') as correcteur_comment,
  user_has_permission(u.id, 'close_session') as correcteur_close,
  user_has_permission(u.id, 'edit_directly') as correcteur_edit
FROM public.users u
WHERE u.email = 'kamfotsobruno@gmail.com';

-- =====================================================
-- STATISTIQUES GLOBALES
-- =====================================================

SELECT 
  role,
  COUNT(*) as nombre_utilisateurs,
  STRING_AGG(full_name, ', ') as noms
FROM public.users
GROUP BY role
ORDER BY nombre_utilisateurs DESC;

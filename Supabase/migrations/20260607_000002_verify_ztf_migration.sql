-- =====================================================
-- VÉRIFICATION DE LA MIGRATION ZTF-GEST
-- =====================================================

-- 1. Compter les nouvelles tables
SELECT 'Tables créées' as check_type, COUNT(*) as count
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN (
  'ztf_books', 'super_correction_books', 'sc_correctors',
  'sc_guest_links', 'sc_comments', 'sc_validations',
  'transmission_slips', 'd0_activity_log'
);

-- 2. Vérifier les colonnes ZTF sur book_projects
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'book_projects'
AND column_name IN ('ztf_status', 'ztf_id', 'theme', 'language', 'current_department');

-- 3. Vérifier les rôles acceptés
SELECT column_name, udt_name
FROM information_schema.columns
WHERE table_name = 'users' AND column_name = 'role';

-- 4. Tester la fonction de nomenclature
SELECT validate_ztf_nomenclature('TRANS_2026_05_13_001.docx') as test_valid;
SELECT validate_ztf_nomenclature('fichier_invalide.pdf') as test_invalid;

-- 5. Tester la génération d'ID ZTF
SELECT generate_ztf_id('BOOK', 2026) as test_ztf_id;

-- 6. Vérifier les vues
SELECT 'v_ztf_dashboard' as view_name, COUNT(*) as rows FROM v_ztf_dashboard
UNION ALL
SELECT 'v_ztf_pipeline' as view_name, COUNT(*) as rows FROM v_ztf_pipeline
UNION ALL
SELECT 'v_sc_books_status' as view_name, COUNT(*) as rows FROM v_sc_books_status;

-- 7. Résumé
SELECT 
  '✅ Migration ZTF-GEST vérifiée' as status,
  (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_name IN ('ztf_books', 'super_correction_books', 'sc_correctors', 'sc_guest_links', 'sc_comments', 'sc_validations', 'transmission_slips', 'd0_activity_log')) as new_tables,
  (SELECT COUNT(*) FROM information_schema.views WHERE table_schema = 'public' AND table_name LIKE 'v_%') as new_views,
  (SELECT COUNT(*) FROM information_schema.routines WHERE routine_schema = 'public' AND routine_name IN ('generate_ztf_id', 'validate_ztf_nomenclature', 'transition_book_status', 'check_sc_threshold')) as new_functions;
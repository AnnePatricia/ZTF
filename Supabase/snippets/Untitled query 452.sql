-- ✅ 1. Désactiver RLS sur TOUTES les tables
ALTER TABLE ztf_users DISABLE ROW LEVEL SECURITY;
ALTER TABLE ztf_books DISABLE ROW LEVEL SECURITY;
ALTER TABLE super_correction_books DISABLE ROW LEVEL SECURITY;
ALTER TABLE super_correction_comments DISABLE ROW LEVEL SECURITY;
ALTER TABLE super_correction_validations DISABLE ROW LEVEL SECURITY;

-- ✅ 2. Vérifier que RLS est désactivé
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename LIKE 'ztf_%' OR tablename LIKE 'super_correction_%';

-- ✅ 3. Tester la connexion à la base
SELECT current_database(), current_user, version();
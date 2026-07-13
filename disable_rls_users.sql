-- =====================================================
-- DÉSACTIVER RLS SUR public.users POUR TEST
-- =====================================================

-- Vérifier si RLS est activé
SELECT 
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE tablename = 'users' AND schemaname = 'public';

-- Si RLS est activé (true), on peut le désactiver temporairement pour tester
-- ATTENTION: Ne pas faire en production !

-- Désactiver RLS
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;

-- Vérifier
SELECT 
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE tablename = 'users' AND schemaname = 'public';

-- Vérifier les policies existantes
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'users';

-- Si tu veux réactiver RLS plus tard :
-- ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

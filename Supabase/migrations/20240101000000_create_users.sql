-- =====================================================
-- TABLE: users (Utilisateurs avec Rôles)
-- Description: Table principale des utilisateurs avec rôles et permissions
-- =====================================================

-- ✅ FONCTION: Met à jour automatiquement updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION update_updated_at_column() IS 'Met à jour automatiquement la colonne updated_at lors d''un UPDATE';

-- ✅ TABLE: users
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE,
  full_name TEXT,
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'editor', 'admin', 'redacteur_chef', 'corrector', 'reviewer')),
  avatar_url TEXT,
  department TEXT,
  team TEXT,
  timezone TEXT DEFAULT 'UTC',
  preferred_lang TEXT DEFAULT 'fr',
  can_import BOOLEAN DEFAULT TRUE,
  can_transcribe BOOLEAN DEFAULT TRUE,
  can_review BOOLEAN DEFAULT FALSE,
  can_edit BOOLEAN DEFAULT FALSE,
  can_delete BOOLEAN DEFAULT FALSE,
  can_manage_users BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  is_deleted BOOLEAN DEFAULT FALSE,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ✅ INDEX
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_is_active ON users(is_active);

-- ✅ TRIGGER pour updated_at
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ✅ TRIGGER pour auth.users (Sécurisé)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name, role)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name', 'user');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.schemata WHERE schema_name = 'auth') THEN
    DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
    CREATE TRIGGER on_auth_user_created
      AFTER INSERT ON auth.users
      FOR EACH ROW
      EXECUTE FUNCTION public.handle_new_user();
  ELSE
    RAISE NOTICE 'Schéma auth non trouvé, trigger on_auth_user_created ignoré.';
  END IF;
END $$;

-- ✅ ROW LEVEL SECURITY (RLS)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Supprimer les policies existantes avant de les recréer
DROP POLICY IF EXISTS "Users can view their own profile" ON users;
DROP POLICY IF EXISTS "Admins can view all profiles" ON users;
DROP POLICY IF EXISTS "Users can update their own profile" ON users;

-- Créer les policies
CREATE POLICY "Users can view their own profile" 
  ON users FOR SELECT 
  TO authenticated 
  USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles" 
  ON users FOR SELECT 
  TO authenticated 
  USING (EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin'));

CREATE POLICY "Users can update their own profile" 
  ON users FOR UPDATE 
  TO authenticated 
  USING (auth.uid() = id);

-- ✅ VUE: Utilisateurs actifs
DROP VIEW IF EXISTS active_users;
CREATE VIEW active_users AS
SELECT 
  id, 
  email, 
  full_name, 
  role, 
  avatar_url, 
  timezone, 
  preferred_lang, 
  created_at, 
  updated_at
FROM users 
WHERE is_active = TRUE 
ORDER BY created_at DESC;

COMMENT ON TABLE users IS 'Profils utilisateurs avec rôles et permissions';
COMMENT ON VIEW active_users IS 'Vue des utilisateurs actifs';
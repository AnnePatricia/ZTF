-- =====================================================
-- MIGRATION ZTF-GEST v2.0 — VERSION FINALE
-- Transformation BCM-GEST → ZTF-GEST
-- Date: 2026-06-07
-- Auteur: Secrétariat Éditorial ZTF
-- =====================================================
-- Ce script est IDÉMPOTENT : il peut être exécuté plusieurs fois
-- sans causer d'erreurs (IF EXISTS, IF NOT EXISTS, DROP + CREATE).
-- =====================================================

-- =====================================================
-- PARTIE 1 : GESTION DES DÉPENDANCES RLS
-- Suppression des policies qui bloquent ALTER COLUMN
-- =====================================================

-- 1.1. Supprimer les policies sur users
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.users;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.users;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.users;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.users;
DROP POLICY IF EXISTS "Enable read for authenticated users" ON public.users;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON public.users;
DROP POLICY IF EXISTS "Admins can insert users" ON public.users;
DROP POLICY IF EXISTS "Admins can delete users" ON public.users;
DROP POLICY IF EXISTS "Admins can update all profiles" ON public.users;

-- 1.2. Supprimer les policies sur book_projects (bloquantes pour ALTER COLUMN role)
DROP POLICY IF EXISTS "Users can soft delete book projects" ON public.book_projects;
DROP POLICY IF EXISTS "Enable read for authenticated users" ON public.book_projects;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.book_projects;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON public.book_projects;
DROP POLICY IF EXISTS "Enable delete for authenticated users" ON public.book_projects;

-- 1.3. Supprimer les policies sur transcriptions
DROP POLICY IF EXISTS "Users can soft delete transcriptions" ON public.transcriptions;
DROP POLICY IF EXISTS "Enable read for authenticated users" ON public.transcriptions;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.transcriptions;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON public.transcriptions;
DROP POLICY IF EXISTS "Enable delete for authenticated users" ON public.transcriptions;

-- 1.4. Supprimer les policies sur proofreading_v1
DROP POLICY IF EXISTS "Enable read for authenticated users" ON public.proofreading_v1;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.proofreading_v1;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON public.proofreading_v1;

-- 1.5. Supprimer les policies sur proofreading_v2
DROP POLICY IF EXISTS "Enable read for authenticated users" ON public.proofreading_v2;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.proofreading_v2;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON public.proofreading_v2;

-- 1.6. Supprimer les policies sur raw_files
DROP POLICY IF EXISTS "Enable read for authenticated users" ON public.raw_files;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.raw_files;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON public.raw_files;

-- =====================================================
-- PARTIE 2 : MODIFICATION DU TYPE DE role (TEXT)
-- =====================================================

ALTER TABLE users ALTER COLUMN role TYPE TEXT;

-- Ajouter les nouvelles colonnes ZTF à users
ALTER TABLE users ADD COLUMN IF NOT EXISTS department TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_native_english BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS sc_corrector BOOLEAN DEFAULT FALSE;

-- Mettre à jour les rôles existants vers le format ZTF
UPDATE users SET role = 'admin' WHERE role IN ('admin', 'super_admin');
UPDATE users SET role = 'user' 
WHERE role NOT IN ('admin', 'editor', 'redacteur_chef', 'corrector', 'reviewer', 'user');

-- Contraintes CHECK sur les rôles ZTF
ALTER TABLE users DROP CONSTRAINT IF EXISTS chk_users_ztf_role;
ALTER TABLE users ADD CONSTRAINT chk_users_ztf_role 
  CHECK (role IN (
    'admin',
    'chef_d2', 'chef_d3', 'chef_d4', 'chef_d5', 'chef_d6', 'chef_d7', 'chef_d8',
    'membre_d2', 'membre_d3', 'membre_d4', 'membre_d5', 'membre_d6', 'membre_d7', 'membre_d8',
    'correcteur_communautaire',
    'editor', 'redacteur_chef', 'corrector', 'reviewer', 'user'
  ));

ALTER TABLE users DROP CONSTRAINT IF EXISTS chk_users_department;
ALTER TABLE users ADD CONSTRAINT chk_users_department 
  CHECK (department IS NULL OR department IN ('D0', 'D2', 'D3', 'D4', 'D5', 'D6', 'D7', 'D8'));

-- =====================================================
-- PARTIE 3 : RECRIER LES POLICIES RLS DE BASE
-- =====================================================

ALTER TABLE users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read for authenticated users" ON public.users
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Enable insert for authenticated users" ON public.users
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Enable update for authenticated users" ON public.users
  FOR UPDATE TO authenticated USING (auth.uid() = id OR role = 'admin');

-- book_projects
ALTER TABLE book_projects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable read for authenticated users" ON public.book_projects FOR SELECT TO authenticated USING (true);
CREATE POLICY "Enable insert for authenticated users" ON public.book_projects FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Enable update for authenticated users" ON public.book_projects FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Enable delete for authenticated users" ON public.book_projects FOR DELETE TO authenticated USING (true);

-- transcriptions
ALTER TABLE transcriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable read for authenticated users" ON public.transcriptions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Enable insert for authenticated users" ON public.transcriptions FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Enable update for authenticated users" ON public.transcriptions FOR UPDATE TO authenticated USING (true);

-- proofreading_v1
ALTER TABLE proofreading_v1 ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable read for authenticated users" ON public.proofreading_v1 FOR SELECT TO authenticated USING (true);
CREATE POLICY "Enable insert for authenticated users" ON public.proofreading_v1 FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Enable update for authenticated users" ON public.proofreading_v1 FOR UPDATE TO authenticated USING (true);

-- proofreading_v2
ALTER TABLE proofreading_v2 ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable read for authenticated users" ON public.proofreading_v2 FOR SELECT TO authenticated USING (true);
CREATE POLICY "Enable insert for authenticated users" ON public.proofreading_v2 FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Enable update for authenticated users" ON public.proofreading_v2 FOR UPDATE TO authenticated USING (true);

-- raw_files
ALTER TABLE raw_files ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable read for authenticated users" ON public.raw_files FOR SELECT TO authenticated USING (true);
CREATE POLICY "Enable insert for authenticated users" ON public.raw_files FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Enable update for authenticated users" ON public.raw_files FOR UPDATE TO authenticated USING (true);

-- =====================================================
-- PARTIE 4 : AJOUTER LES COLONNES ZTF AUX TABLES EXISTANTES
-- =====================================================

-- book_projects
ALTER TABLE book_projects ADD COLUMN IF NOT EXISTS ztf_status TEXT DEFAULT 'DRAFT';
ALTER TABLE book_projects ADD COLUMN IF NOT EXISTS ztf_id TEXT UNIQUE;
ALTER TABLE book_projects ADD COLUMN IF NOT EXISTS theme TEXT;
ALTER TABLE book_projects ADD COLUMN IF NOT EXISTS language TEXT DEFAULT 'EN';
ALTER TABLE book_projects ADD COLUMN IF NOT EXISTS current_department TEXT DEFAULT 'D0';
ALTER TABLE book_projects ADD COLUMN IF NOT EXISTS responsible_id UUID REFERENCES auth.users(id);
ALTER TABLE book_projects ADD COLUMN IF NOT EXISTS target_date TIMESTAMPTZ;
ALTER TABLE book_projects ADD COLUMN IF NOT EXISTS source_ids UUID[];
ALTER TABLE book_projects ADD COLUMN IF NOT EXISTS nomenclature_valid BOOLEAN DEFAULT FALSE;
ALTER TABLE book_projects ADD COLUMN IF NOT EXISTS sc_status TEXT DEFAULT 'NONE';

-- transcriptions
ALTER TABLE transcriptions ADD COLUMN IF NOT EXISTS ztf_status TEXT DEFAULT 'DRAFT';
ALTER TABLE transcriptions ADD COLUMN IF NOT EXISTS ztf_id TEXT UNIQUE;
ALTER TABLE transcriptions ADD COLUMN IF NOT EXISTS theme TEXT;
ALTER TABLE transcriptions ADD COLUMN IF NOT EXISTS language TEXT DEFAULT 'EN';
ALTER TABLE transcriptions ADD COLUMN IF NOT EXISTS current_department TEXT DEFAULT 'D2';
ALTER TABLE transcriptions ADD COLUMN IF NOT EXISTS responsible_id UUID REFERENCES auth.users(id);
ALTER TABLE transcriptions ADD COLUMN IF NOT EXISTS target_date TIMESTAMPTZ;
ALTER TABLE transcriptions ADD COLUMN IF NOT EXISTS source_ids UUID[];
ALTER TABLE transcriptions ADD COLUMN IF NOT EXISTS nomenclature_valid BOOLEAN DEFAULT FALSE;
ALTER TABLE transcriptions ADD COLUMN IF NOT EXISTS transcription_level INTEGER DEFAULT 1;
ALTER TABLE transcriptions ADD COLUMN IF NOT EXISTS verified_by UUID REFERENCES auth.users(id);
ALTER TABLE transcriptions ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ;

-- proofreading_v1
ALTER TABLE proofreading_v1 ADD COLUMN IF NOT EXISTS ztf_status TEXT DEFAULT 'DRAFT';
ALTER TABLE proofreading_v1 ADD COLUMN IF NOT EXISTS ztf_id TEXT UNIQUE;
ALTER TABLE proofreading_v1 ADD COLUMN IF NOT EXISTS theme TEXT;
ALTER TABLE proofreading_v1 ADD COLUMN IF NOT EXISTS language TEXT DEFAULT 'EN';
ALTER TABLE proofreading_v1 ADD COLUMN IF NOT EXISTS current_department TEXT DEFAULT 'D3';
ALTER TABLE proofreading_v1 ADD COLUMN IF NOT EXISTS responsible_id UUID REFERENCES auth.users(id);
ALTER TABLE proofreading_v1 ADD COLUMN IF NOT EXISTS target_date TIMESTAMPTZ;
ALTER TABLE proofreading_v1 ADD COLUMN IF NOT EXISTS source_ids UUID[];
ALTER TABLE proofreading_v1 ADD COLUMN IF NOT EXISTS nomenclature_valid BOOLEAN DEFAULT FALSE;

-- proofreading_v2
ALTER TABLE proofreading_v2 ADD COLUMN IF NOT EXISTS ztf_status TEXT DEFAULT 'DRAFT';
ALTER TABLE proofreading_v2 ADD COLUMN IF NOT EXISTS ztf_id TEXT UNIQUE;
ALTER TABLE proofreading_v2 ADD COLUMN IF NOT EXISTS theme TEXT;
ALTER TABLE proofreading_v2 ADD COLUMN IF NOT EXISTS language TEXT DEFAULT 'EN';
ALTER TABLE proofreading_v2 ADD COLUMN IF NOT EXISTS current_department TEXT DEFAULT 'D6';
ALTER TABLE proofreading_v2 ADD COLUMN IF NOT EXISTS responsible_id UUID REFERENCES auth.users(id);
ALTER TABLE proofreading_v2 ADD COLUMN IF NOT EXISTS target_date TIMESTAMPTZ;
ALTER TABLE proofreading_v2 ADD COLUMN IF NOT EXISTS source_ids UUID[];
ALTER TABLE proofreading_v2 ADD COLUMN IF NOT EXISTS nomenclature_valid BOOLEAN DEFAULT FALSE;

-- raw_files
ALTER TABLE raw_files ADD COLUMN IF NOT EXISTS ztf_id TEXT UNIQUE;
ALTER TABLE raw_files ADD COLUMN IF NOT EXISTS ztf_type TEXT;
ALTER TABLE raw_files ADD COLUMN IF NOT EXISTS theme TEXT;
ALTER TABLE raw_files ADD COLUMN IF NOT EXISTS language TEXT DEFAULT 'EN';
ALTER TABLE raw_files ADD COLUMN IF NOT EXISTS nomenclature_valid BOOLEAN DEFAULT FALSE;
ALTER TABLE raw_files ADD COLUMN IF NOT EXISTS expected_nomenclature TEXT;

-- Contraintes CHECK sur ztf_status
ALTER TABLE book_projects DROP CONSTRAINT IF EXISTS chk_book_projects_ztf_status;
ALTER TABLE book_projects ADD CONSTRAINT chk_book_projects_ztf_status 
  CHECK (ztf_status IN (
    'DRAFT', 'TRANSCRIBED', 'CLEANED', 'STRUCTURED', 
    'REWRITTEN', 'CORRECTED', 'TRANSLATED', 
    'BAT_PENDING', 'BAT_APPROVED', 'PUBLISHED', 'ARCHIVED',
    'SUPER_CORRECTION_OPEN', 'SUPER_CORRECTION_LOCKED', 'SUPER_CORRECTION_CLOSED'
  ));

ALTER TABLE transcriptions DROP CONSTRAINT IF EXISTS chk_transcriptions_ztf_status;
ALTER TABLE transcriptions ADD CONSTRAINT chk_transcriptions_ztf_status 
  CHECK (ztf_status IN ('DRAFT', 'TRANSCRIBED', 'CLEANED'));

ALTER TABLE proofreading_v1 DROP CONSTRAINT IF EXISTS chk_proofreading_v1_ztf_status;
ALTER TABLE proofreading_v1 ADD CONSTRAINT chk_proofreading_v1_ztf_status 
  CHECK (ztf_status IN ('DRAFT', 'CLEANED', 'STRUCTURED'));

ALTER TABLE proofreading_v2 DROP CONSTRAINT IF EXISTS chk_proofreading_v2_ztf_status;
ALTER TABLE proofreading_v2 ADD CONSTRAINT chk_proofreading_v2_ztf_status 
  CHECK (ztf_status IN ('DRAFT', 'STRUCTURED', 'CORRECTED'));

-- Contraintes CHECK sur language
ALTER TABLE book_projects DROP CONSTRAINT IF EXISTS chk_book_projects_language;
ALTER TABLE book_projects ADD CONSTRAINT chk_book_projects_language CHECK (language IN ('EN', 'FR', 'EN+FR'));

ALTER TABLE transcriptions DROP CONSTRAINT IF EXISTS chk_transcriptions_language;
ALTER TABLE transcriptions ADD CONSTRAINT chk_transcriptions_language CHECK (language IN ('EN', 'FR', 'EN+FR'));

-- Contraintes CHECK sur current_department
ALTER TABLE book_projects DROP CONSTRAINT IF EXISTS chk_book_projects_dept;
ALTER TABLE book_projects ADD CONSTRAINT chk_book_projects_dept 
  CHECK (current_department IN ('D0', 'D2', 'D3', 'D4', 'D5', 'D6', 'D7', 'D8'));

-- =====================================================
-- PARTIE 5 : TABLE REGISTRE CENTRAL D0 (ztf_books)
-- =====================================================

CREATE TABLE IF NOT EXISTS ztf_books (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ztf_id TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  subtitle TEXT,
  theme TEXT NOT NULL,
  language TEXT NOT NULL DEFAULT 'EN' CHECK (language IN ('EN', 'FR', 'EN+FR')),
  ztf_status TEXT NOT NULL DEFAULT 'DRAFT' 
    CHECK (ztf_status IN (
      'DRAFT', 'TRANSCRIBED', 'CLEANED', 'STRUCTURED', 
      'REWRITTEN', 'CORRECTED', 'TRANSLATED', 
      'BAT_PENDING', 'BAT_APPROVED', 'PUBLISHED', 'ARCHIVED',
      'SUPER_CORRECTION_OPEN', 'SUPER_CORRECTION_LOCKED', 'SUPER_CORRECTION_CLOSED'
    )),
  current_department TEXT NOT NULL DEFAULT 'D0' 
    CHECK (current_department IN ('D0', 'D2', 'D3', 'D4', 'D5', 'D6', 'D7', 'D8')),
  responsible_id UUID REFERENCES auth.users(id),
  target_date TIMESTAMPTZ,
  published_date TIMESTAMPTZ,
  archived_date TIMESTAMPTZ,
  source_ids UUID[],
  book_project_id UUID REFERENCES book_projects(id),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE ztf_books IS 'Registre central D0 — Colonne vertébrale des 2 000 titres ZTF';

CREATE INDEX IF NOT EXISTS idx_ztf_books_ztf_id ON ztf_books(ztf_id);
CREATE INDEX IF NOT EXISTS idx_ztf_books_status ON ztf_books(ztf_status);
CREATE INDEX IF NOT EXISTS idx_ztf_books_dept ON ztf_books(current_department);
CREATE INDEX IF NOT EXISTS idx_ztf_books_theme ON ztf_books(theme);
CREATE INDEX IF NOT EXISTS idx_ztf_books_responsible ON ztf_books(responsible_id);

-- =====================================================
-- PARTIE 6 : MODULE SUPER CORRECTION (Priorité n°1)
-- =====================================================

-- 6.1. Table des livres publiés en Super Correction
CREATE TABLE IF NOT EXISTS super_correction_books (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ztf_book_id UUID NOT NULL REFERENCES ztf_books(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  language TEXT NOT NULL DEFAULT 'EN' CHECK (language IN ('EN', 'FR', 'EN+FR')),
  validation_threshold INTEGER NOT NULL DEFAULT 3 CHECK (validation_threshold > 0),
  total_correctors INTEGER NOT NULL DEFAULT 0,
  validated_count INTEGER NOT NULL DEFAULT 0,
  sc_status TEXT NOT NULL DEFAULT 'OPEN' 
    CHECK (sc_status IN ('OPEN', 'LOCKED', 'CLOSED')),
  published_by UUID NOT NULL REFERENCES auth.users(id),
  published_at TIMESTAMPTZ DEFAULT NOW(),
  locked_at TIMESTAMPTZ,
  closed_at TIMESTAMPTZ,
  unlock_reason TEXT,
  unlocked_by UUID REFERENCES auth.users(id),
  unlocked_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE super_correction_books IS 'Livres publiés en Super Correction — plateforme de validation communautaire';

CREATE INDEX IF NOT EXISTS idx_sc_books_ztf_book ON super_correction_books(ztf_book_id);
CREATE INDEX IF NOT EXISTS idx_sc_books_status ON super_correction_books(sc_status);

-- 6.2. Table des correcteurs communautaires (permanents)
CREATE TABLE IF NOT EXISTS sc_correctors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  is_active BOOLEAN DEFAULT TRUE,
  books_validated INTEGER DEFAULT 0,
  books_in_progress INTEGER DEFAULT 0,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  last_activity TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'
);

COMMENT ON TABLE sc_correctors IS 'Correcteurs communautaires permanents de Super Correction';

-- 6.3. Table des liens invités (correcteurs temporaires)
CREATE TABLE IF NOT EXISTS sc_guest_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sc_book_id UUID NOT NULL REFERENCES super_correction_books(id) ON DELETE CASCADE,
  token TEXT UNIQUE NOT NULL,
  email TEXT,
  guest_name TEXT,
  expires_at TIMESTAMPTZ NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  used_at TIMESTAMPTZ,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE sc_guest_links IS 'Liens temporaires pour correcteurs invités Super Correction';

CREATE INDEX IF NOT EXISTS idx_sc_guest_links_token ON sc_guest_links(token);
CREATE INDEX IF NOT EXISTS idx_sc_guest_links_expires ON sc_guest_links(expires_at);

-- 6.4. Table des commentaires inline
CREATE TABLE IF NOT EXISTS sc_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sc_book_id UUID NOT NULL REFERENCES super_correction_books(id) ON DELETE CASCADE,
  corrector_id UUID NOT NULL REFERENCES auth.users(id),
  guest_link_id UUID REFERENCES sc_guest_links(id),
  anchor_start INTEGER NOT NULL,
  anchor_end INTEGER NOT NULL,
  anchor_text TEXT,
  content TEXT NOT NULL,
  comment_type TEXT NOT NULL DEFAULT 'suggestion'
    CHECK (comment_type IN (
      'typo', 'doctrinal_error', 'stylistic_suggestion', 
      'question', 'validation', 'suggestion'
    )),
  is_resolved BOOLEAN DEFAULT FALSE,
  resolved_by UUID REFERENCES auth.users(id),
  resolved_at TIMESTAMPTZ,
  parent_id UUID REFERENCES sc_comments(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE sc_comments IS 'Commentaires inline Super Correction — ancrés dans le texte';

CREATE INDEX IF NOT EXISTS idx_sc_comments_book ON sc_comments(sc_book_id);
CREATE INDEX IF NOT EXISTS idx_sc_comments_corrector ON sc_comments(corrector_id);
CREATE INDEX IF NOT EXISTS idx_sc_comments_type ON sc_comments(comment_type);
CREATE INDEX IF NOT EXISTS idx_sc_comments_resolved ON sc_comments(is_resolved);

-- 6.5. Table des validations
CREATE TABLE IF NOT EXISTS sc_validations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sc_book_id UUID NOT NULL REFERENCES super_correction_books(id) ON DELETE CASCADE,
  corrector_id UUID NOT NULL REFERENCES auth.users(id),
  guest_link_id UUID REFERENCES sc_guest_links(id),
  is_validated BOOLEAN NOT NULL DEFAULT TRUE,
  reading_progress NUMERIC DEFAULT 0 CHECK (reading_progress >= 0 AND reading_progress <= 100),
  comments_count INTEGER DEFAULT 0,
  validated_at TIMESTAMPTZ DEFAULT NOW(),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(sc_book_id, corrector_id)
);

COMMENT ON TABLE sc_validations IS 'Validations des correcteurs Super Correction';

CREATE INDEX IF NOT EXISTS idx_sc_validations_book ON sc_validations(sc_book_id);

-- =====================================================
-- PARTIE 7 : FICHES DE TRANSMISSION (workflow D2→D3→D4...)
-- =====================================================

CREATE TABLE IF NOT EXISTS transmission_slips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ztf_book_id UUID NOT NULL REFERENCES ztf_books(id),
  from_department TEXT NOT NULL 
    CHECK (from_department IN ('D0', 'D2', 'D3', 'D4', 'D5', 'D6', 'D7', 'D8')),
  to_department TEXT NOT NULL 
    CHECK (to_department IN ('D0', 'D2', 'D3', 'D4', 'D5', 'D6', 'D7', 'D8')),
  interventions TEXT[],
  flagged_passages TEXT[],
  signed_by UUID NOT NULL REFERENCES auth.users(id),
  signed_at TIMESTAMPTZ DEFAULT NOW(),
  received_by UUID REFERENCES auth.users(id),
  received_at TIMESTAMPTZ,
  notes TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE transmission_slips IS 'Fiches de transmission entre départements du pipeline ZTF';

CREATE INDEX IF NOT EXISTS idx_transmission_slips_book ON transmission_slips(ztf_book_id);
CREATE INDEX IF NOT EXISTS idx_transmission_slips_from ON transmission_slips(from_department);
CREATE INDEX IF NOT EXISTS idx_transmission_slips_to ON transmission_slips(to_department);

-- =====================================================
-- PARTIE 8 : JOURNAL D'ACTIVITÉ D0
-- =====================================================

CREATE TABLE IF NOT EXISTS d0_activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ztf_book_id UUID REFERENCES ztf_books(id),
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  action_type TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  department TEXT,
  details JSONB,
  previous_status TEXT,
  new_status TEXT,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE d0_activity_log IS 'Journal d''activité D0 — traçabilité de toutes les actions';

CREATE INDEX IF NOT EXISTS idx_d0_activity_book ON d0_activity_log(ztf_book_id);
CREATE INDEX IF NOT EXISTS idx_d0_activity_user ON d0_activity_log(user_id);
CREATE INDEX IF NOT EXISTS idx_d0_activity_created ON d0_activity_log(created_at DESC);

-- =====================================================
-- PARTIE 9 : FONCTIONS UTILITAIRES ZTF
-- =====================================================

-- 9.1. Générateur d'ID ZTF (format: BOOK-2026-00042)
CREATE OR REPLACE FUNCTION generate_ztf_id(
  p_type TEXT,
  p_year INTEGER DEFAULT EXTRACT(YEAR FROM NOW())::INTEGER
) RETURNS TEXT AS $$
DECLARE
  v_next_number INTEGER;
  v_ztf_id TEXT;
BEGIN
  SELECT COALESCE(MAX(
    CAST(SUBSTRING(ztf_id FROM '\d+$') AS INTEGER)
  ), 0) + 1 INTO v_next_number
  FROM ztf_books
  WHERE ztf_id LIKE p_type || '-' || p_year || '-%';
  
  v_ztf_id := p_type || '-' || p_year || '-' || LPAD(v_next_number::TEXT, 5, '0');
  RETURN v_ztf_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9.2. Validation de la nomenclature ZTF
-- Format: [TYPE]_[ANNEE]_[MOIS]_[JOUR]_[NUMERO].[ext]
CREATE OR REPLACE FUNCTION validate_ztf_nomenclature(
  p_file_name TEXT
) RETURNS JSONB AS $$
DECLARE
  v_pattern TEXT := '^(AUD|TRANS|CLEAN|BOOK|STYLE|CORR|TRAD|BAT)_(\d{4})_(\d{2})_(\d{2})_(\d{3})\.[a-zA-Z0-9]+$';
  v_matches BOOLEAN;
  v_parts TEXT[];
  v_type TEXT;
  v_year TEXT;
  v_month TEXT;
  v_day TEXT;
  v_number TEXT;
  v_ext TEXT;
BEGIN
  v_matches := (p_file_name ~ v_pattern);
  
  IF NOT v_matches THEN
    RETURN jsonb_build_object(
      'valid', FALSE,
      'message', 'Format invalide. Attendu: [TYPE]_[ANNEE]_[MOIS]_[JOUR]_[NUMERO].[ext]',
      'expected_format', 'TRANS_2026_05_13_001.docx',
      'provided', p_file_name
    );
  END IF;
  
  v_parts := regexp_split_to_array(
    regexp_replace(p_file_name, '\.[a-zA-Z0-9]+$', ''), 
    '_'
  );
  
  v_type := v_parts[1];
  v_year := v_parts[2];
  v_month := v_parts[3];
  v_day := v_parts[4];
  v_number := v_parts[5];
  v_ext := regexp_replace(p_file_name, '.*\.', '');
  
  IF CAST(v_month AS INTEGER) < 1 OR CAST(v_month AS INTEGER) > 12 THEN
    RETURN jsonb_build_object('valid', FALSE, 'message', 'Mois invalide: ' || v_month);
  END IF;
  
  IF CAST(v_day AS INTEGER) < 1 OR CAST(v_day AS INTEGER) > 31 THEN
    RETURN jsonb_build_object('valid', FALSE, 'message', 'Jour invalide: ' || v_day);
  END IF;
  
  RETURN jsonb_build_object(
    'valid', TRUE,
    'type', v_type,
    'year', v_year,
    'month', v_month,
    'day', v_day,
    'number', v_number,
    'extension', v_ext,
    'message', 'Nomenclature valide'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9.3. Fonction de transition de statut (avec journal D0)
CREATE OR REPLACE FUNCTION transition_book_status(
  p_ztf_book_id UUID,
  p_new_status TEXT,
  p_user_id UUID,
  p_department TEXT
) RETURNS VOID AS $$
DECLARE
  v_old_status TEXT;
BEGIN
  SELECT ztf_status INTO v_old_status 
  FROM ztf_books WHERE id = p_ztf_book_id;
  
  IF v_old_status IS NULL THEN
    RAISE EXCEPTION 'Livre ZTF non trouvé: %', p_ztf_book_id;
  END IF;
  
  UPDATE ztf_books 
  SET ztf_status = p_new_status,
      current_department = p_department,
      updated_at = NOW()
  WHERE id = p_ztf_book_id;
  
  INSERT INTO d0_activity_log (
    ztf_book_id, entity_type, entity_id, action_type,
    user_id, department, previous_status, new_status
  ) VALUES (
    p_ztf_book_id, 'ztf_book', p_ztf_book_id, 'status_transition',
    p_user_id, p_department, v_old_status, p_new_status
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- PARTIE 10 : TRIGGERS
-- =====================================================

-- 10.1. Trigger updated_at sur ztf_books
CREATE OR REPLACE FUNCTION trigger_set_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_ztf_books_updated_at ON ztf_books;
CREATE TRIGGER trg_ztf_books_updated_at
  BEFORE UPDATE ON ztf_books
  FOR EACH ROW
  EXECUTE FUNCTION trigger_set_timestamp();

-- 10.2. Trigger sur super_correction_books pour recalculer validated_count
CREATE OR REPLACE FUNCTION trg_sc_update_validation_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE super_correction_books
    SET validated_count = (
      SELECT COUNT(*) FROM sc_validations 
      WHERE sc_book_id = NEW.sc_book_id AND is_validated = TRUE
    ),
    updated_at = NOW()
    WHERE id = NEW.sc_book_id;
    
    PERFORM check_sc_threshold(NEW.sc_book_id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sc_validation_count ON sc_validations;
CREATE TRIGGER trg_sc_validation_count
  AFTER INSERT ON sc_validations
  FOR EACH ROW
  EXECUTE FUNCTION trg_sc_update_validation_count();

-- 10.3. Fonction de vérification du seuil SC
CREATE OR REPLACE FUNCTION check_sc_threshold(p_sc_book_id UUID) RETURNS VOID AS $$
DECLARE
  v_threshold INTEGER;
  v_validated INTEGER;
BEGIN
  SELECT validation_threshold, validated_count 
  INTO v_threshold, v_validated
  FROM super_correction_books WHERE id = p_sc_book_id;
  
  IF v_validated >= v_threshold THEN
    UPDATE super_correction_books
    SET sc_status = 'LOCKED',
        locked_at = NOW()
    WHERE id = p_sc_book_id AND sc_status = 'OPEN';
    
    UPDATE ztf_books
    SET sc_status = 'SUPER_CORRECTION_LOCKED',
        updated_at = NOW()
    WHERE id = (SELECT ztf_book_id FROM super_correction_books WHERE id = p_sc_book_id);
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- PARTIE 11 : RLS SUR LES NOUVELLES TABLES
-- =====================================================

-- 11.1. ztf_books
ALTER TABLE ztf_books ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ztf_books_select_authenticated" ON ztf_books;
CREATE POLICY "ztf_books_select_authenticated" ON ztf_books
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "ztf_books_insert_chef" ON ztf_books;
CREATE POLICY "ztf_books_insert_chef" ON ztf_books
  FOR INSERT TO authenticated WITH CHECK (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'chef_d2', 'chef_d3', 'chef_d4', 'chef_d5', 'chef_d6', 'chef_d7', 'chef_d8')
    )
  );

DROP POLICY IF EXISTS "ztf_books_update_responsible" ON ztf_books;
CREATE POLICY "ztf_books_update_responsible" ON ztf_books
  FOR UPDATE TO authenticated USING (
    responsible_id = auth.uid() OR 
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

-- 11.2. super_correction_books
ALTER TABLE super_correction_books ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "sc_books_select" ON super_correction_books;
CREATE POLICY "sc_books_select" ON super_correction_books
  FOR SELECT TO authenticated USING (
    published_by = auth.uid() OR
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin') OR
    EXISTS (SELECT 1 FROM sc_correctors WHERE user_id = auth.uid())
  );

-- 11.3. sc_comments
ALTER TABLE sc_comments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "sc_comments_select" ON sc_comments;
CREATE POLICY "sc_comments_select" ON sc_comments
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "sc_comments_insert" ON sc_comments;
CREATE POLICY "sc_comments_insert" ON sc_comments
  FOR INSERT TO authenticated WITH CHECK (
    corrector_id = auth.uid() OR guest_link_id IS NOT NULL
  );

DROP POLICY IF EXISTS "sc_comments_update" ON sc_comments;
CREATE POLICY "sc_comments_update" ON sc_comments
  FOR UPDATE TO authenticated USING (
    corrector_id = auth.uid() OR
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

-- 11.4. sc_validations
ALTER TABLE sc_validations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "sc_validations_select" ON sc_validations;
CREATE POLICY "sc_validations_select" ON sc_validations
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "sc_validations_insert" ON sc_validations;
CREATE POLICY "sc_validations_insert" ON sc_validations
  FOR INSERT TO authenticated WITH CHECK (
    corrector_id = auth.uid() OR guest_link_id IS NOT NULL
  );

-- 11.5. sc_guest_links
ALTER TABLE sc_guest_links ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "sc_guest_links_select" ON sc_guest_links;
CREATE POLICY "sc_guest_links_select" ON sc_guest_links
  FOR SELECT TO authenticated USING (
    created_by = auth.uid() OR
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

DROP POLICY IF EXISTS "sc_guest_links_insert" ON sc_guest_links;
CREATE POLICY "sc_guest_links_insert" ON sc_guest_links
  FOR INSERT TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

-- 11.6. sc_correctors
ALTER TABLE sc_correctors ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "sc_correctors_select" ON sc_correctors;
CREATE POLICY "sc_correctors_select" ON sc_correctors
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "sc_correctors_manage" ON sc_correctors;
CREATE POLICY "sc_correctors_manage" ON sc_correctors
  FOR ALL TO authenticated USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

-- 11.7. transmission_slips
ALTER TABLE transmission_slips ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "transmission_slips_select" ON transmission_slips;
CREATE POLICY "transmission_slips_select" ON transmission_slips
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "transmission_slips_insert" ON transmission_slips;
CREATE POLICY "transmission_slips_insert" ON transmission_slips
  FOR INSERT TO authenticated WITH CHECK (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
      AND role LIKE 'chef_%'
    )
  );

-- 11.8. d0_activity_log
ALTER TABLE d0_activity_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "d0_activity_log_select" ON d0_activity_log;
CREATE POLICY "d0_activity_log_select" ON d0_activity_log
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "d0_activity_log_insert" ON d0_activity_log;
CREATE POLICY "d0_activity_log_insert" ON d0_activity_log
  FOR INSERT TO authenticated WITH CHECK (
    user_id = auth.uid() OR
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

-- =====================================================
-- PARTIE 12 : VUES UTILES
-- =====================================================

-- 12.1. Vue Dashboard D0 : progression des 2 000 titres
CREATE OR REPLACE VIEW v_ztf_dashboard AS
SELECT 
  ztf_status,
  current_department,
  COUNT(*) as book_count,
  ROUND(COUNT(*) * 100.0 / NULLIF((SELECT COUNT(*) FROM ztf_books), 0), 2) as percentage
FROM ztf_books
GROUP BY ztf_status, current_department
ORDER BY ztf_status;

-- 12.2. Vue Super Correction : état de validation
CREATE OR REPLACE VIEW v_sc_books_status AS
SELECT 
  sb.id,
  sb.title,
  sb.sc_status,
  sb.validation_threshold,
  sb.validated_count,
  sb.total_correctors,
  ROUND(sb.validated_count * 100.0 / NULLIF(sb.validation_threshold, 0), 2) as validation_percentage,
  zb.ztf_id,
  zb.theme,
  zb.language,
  sb.published_at,
  sb.locked_at
FROM super_correction_books sb
JOIN ztf_books zb ON zb.id = sb.ztf_book_id
ORDER BY sb.published_at DESC;

-- 12.3. Vue pipeline complet
CREATE OR REPLACE VIEW v_ztf_pipeline AS
SELECT 
  zb.ztf_id,
  zb.title,
  zb.theme,
  zb.language,
  zb.ztf_status,
  zb.current_department,
  zb.responsible_id,
  u.full_name as responsible_name,
  zb.target_date,
  zb.created_at,
  zb.updated_at,
  CASE 
    WHEN zb.target_date < NOW() AND zb.ztf_status NOT IN ('PUBLISHED', 'ARCHIVED') THEN 'OVERDUE'
    WHEN zb.target_date < NOW() + INTERVAL '7 days' THEN 'AT_RISK'
    ELSE 'ON_TRACK'
  END as deadline_status
FROM ztf_books zb
LEFT JOIN users u ON u.id = zb.responsible_id
ORDER BY zb.ztf_status, zb.current_department, zb.target_date;

COMMENT ON VIEW v_ztf_pipeline IS 'Vue complète du pipeline ZTF avec alertes délais';

-- =====================================================
-- FIN DE LA MIGRATION
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '✅ Migration ZTF-GEST v2.0 appliquée avec succès!';
  RAISE NOTICE '   - Nouveaux statuts pipeline: DRAFT → PUBLISHED';
  RAISE NOTICE '   - Nouveaux rôles: chef_d2...d8, membre_d2...d8, correcteur_communautaire';
  RAISE NOTICE '   - Table ztf_books (registre central D0) créée';
  RAISE NOTICE '   - Module Super Correction: 5 tables créées';
  RAISE NOTICE '   - Fiches de transmission créées';
  RAISE NOTICE '   - Journal D0 créé';
  RAISE NOTICE '   - Fonctions utilitaires: generate_ztf_id, validate_ztf_nomenclature, transition_book_status';
  RAISE NOTICE '   - RLS activé sur toutes les nouvelles tables';
  RAISE NOTICE '   - Vues dashboard: v_ztf_dashboard, v_sc_books_status, v_ztf_pipeline';
END $$;
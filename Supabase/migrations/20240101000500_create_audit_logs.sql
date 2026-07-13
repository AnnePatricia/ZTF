-- =====================================================
-- TABLE: audit_logs (Journal d'Audit)
-- Description: Traçabilité INFAILLIBLE de toutes les actions
-- =====================================================

CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Entité concernée
  entity_type TEXT NOT NULL CHECK (entity_type IN (
    'raw_file',
    'transcription',
    'book_project',
    'proofreading_v1',
    'proofreading_v2',
    'document'
  )),
  entity_id UUID NOT NULL,
  
  -- Action effectuée
  action_type TEXT NOT NULL CHECK (action_type IN (
    'CREATE',
    'UPDATE',
    'DELETE',
    'RESTORE',
    'STATUS_CHANGE',
    'REASSIGN',
    'LINK',
    'UNLINK',
    'EXPORT',
    'IMPORT'
  )),
  
  -- Utilisateur
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  user_email TEXT,
  user_name TEXT,
  
  -- Détails
  details JSONB DEFAULT '{}',
  previous_values JSONB,
  new_values JSONB,
  reason TEXT,
  
  -- Contexte
  ip_address INET,
  user_agent TEXT,
  session_id UUID,
  
  -- Timestamp
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ✅ INDEX pour les performances
CREATE INDEX idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_action_type ON audit_logs(action_type);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at DESC);
CREATE INDEX idx_audit_logs_entity_type ON audit_logs(entity_type);

-- ✅ VUE pour faciliter les requêtes
CREATE OR REPLACE VIEW audit_logs_summary AS
SELECT 
  entity_type,
  action_type,
  DATE(created_at) as action_date,
  COUNT(*) as action_count
FROM audit_logs
GROUP BY entity_type, action_type, DATE(created_at)
ORDER BY action_date DESC;

-- ✅ ROW LEVEL SECURITY (RLS)
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Policy: Les admins peuvent tout voir
CREATE POLICY "Admins can view all audit logs"
  ON audit_logs FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin'
  ));

-- Policy: Les utilisateurs peuvent voir leurs propres logs
CREATE POLICY "Users can view their own audit logs"
  ON audit_logs FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Policy: Seul le système peut insérer des logs (via trigger)
CREATE POLICY "System can insert audit logs"
  ON audit_logs FOR INSERT
  TO authenticated
  WITH CHECK (TRUE);

-- ✅ TRIGGER pour créer automatiquement les logs
CREATE OR REPLACE FUNCTION create_audit_log()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO audit_logs (entity_type, entity_id, action_type, user_id, new_values, created_at)
    VALUES (TG_TABLE_NAME, NEW.id, 'CREATE', auth.uid(), to_jsonb(NEW), NOW());
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO audit_logs (entity_type, entity_id, action_type, user_id, previous_values, new_values, created_at)
    VALUES (TG_TABLE_NAME, NEW.id, 'UPDATE', auth.uid(), to_jsonb(OLD), to_jsonb(NEW), NOW());
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO audit_logs (entity_type, entity_id, action_type, user_id, previous_values, created_at)
    VALUES (TG_TABLE_NAME, OLD.id, 'DELETE', auth.uid(), to_jsonb(OLD), NOW());
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- ✅ Appliquer le trigger à toutes les tables
DROP TRIGGER IF EXISTS update_raw_files_updated_at ON raw_files;
CREATE TRIGGER audit_raw_files AFTER INSERT OR UPDATE OR DELETE ON raw_files FOR EACH ROW EXECUTE FUNCTION create_audit_log();

DROP TRIGGER IF EXISTS update_transcriptions_updated_at ON transcriptions;
CREATE TRIGGER audit_transcriptions AFTER INSERT OR UPDATE OR DELETE ON transcriptions FOR EACH ROW EXECUTE FUNCTION create_audit_log();

DROP TRIGGER IF EXISTS update_book_projects_updated_at ON book_projects;
CREATE TRIGGER audit_book_projects AFTER INSERT OR UPDATE OR DELETE ON book_projects FOR EACH ROW EXECUTE FUNCTION create_audit_log();

DROP TRIGGER IF EXISTS update_proofreading_v1_updated_at ON proofreading_v1;
CREATE TRIGGER audit_proofreading_v1 AFTER INSERT OR UPDATE OR DELETE ON proofreading_v1 FOR EACH ROW EXECUTE FUNCTION create_audit_log();

DROP TRIGGER IF EXISTS update_proofreading_v2_updated_at ON proofreading_v2;
CREATE TRIGGER audit_proofreading_v2 AFTER INSERT OR UPDATE OR DELETE ON proofreading_v2 FOR EACH ROW EXECUTE FUNCTION create_audit_log();



COMMENT ON TABLE audit_logs IS 'Traçabilité INFAILLIBLE de toutes les actions sur les entités';

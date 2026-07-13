-- =====================================================
-- TABLE: document_versions (Historique des versions)
-- Description: Snapshot des blocs à un instant T
-- =====================================================

CREATE TABLE IF NOT EXISTS document_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,
  title TEXT,
  description TEXT,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(document_id, version_number)
);

-- Index
CREATE INDEX IF NOT EXISTS idx_document_versions_document ON document_versions(document_id);
CREATE INDEX IF NOT EXISTS idx_document_versions_created ON document_versions(document_id, created_at DESC);

COMMENT ON TABLE document_versions IS 'Historique des versions de documents (snapshots)';
COMMENT ON COLUMN document_versions.version_number IS 'Numéro de version séquentiel';
COMMENT ON COLUMN document_versions.created_by IS 'Utilisateur qui a créé cette version';
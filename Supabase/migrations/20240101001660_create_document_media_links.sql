-- =====================================================
-- TABLE: document_media_links (Liaison Documents <-> Fichiers Bruts)
-- =====================================================
CREATE TABLE IF NOT EXISTS document_media_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  media_file_id UUID NOT NULL REFERENCES raw_files(id) ON DELETE CASCADE,
  media_status TEXT DEFAULT 'linked',
  document_status TEXT DEFAULT 'active',
  linked_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(document_id, media_file_id)
);

-- Index
CREATE INDEX IF NOT EXISTS idx_document_media_links_document ON document_media_links(document_id);
CREATE INDEX IF NOT EXISTS idx_document_media_links_media ON document_media_links(media_file_id);

COMMENT ON TABLE document_media_links IS 'Table de liaison entre les documents et les fichiers bruts';
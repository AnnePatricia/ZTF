-- =====================================================
-- TABLE: transcription_raw_files (Relation Many-to-One)
-- Description: Une transcription peut provenir de PLUSIEURS fichiers bruts
-- =====================================================

CREATE TABLE IF NOT EXISTS transcription_raw_files (
  transcription_id UUID NOT NULL REFERENCES transcriptions(id) ON DELETE CASCADE,
  raw_file_id UUID NOT NULL REFERENCES raw_files(id) ON DELETE CASCADE,
  linked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  linked_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  
  PRIMARY KEY (transcription_id, raw_file_id)
);

-- ✅ INDEX
CREATE INDEX idx_transcription_raw_files_transcription ON transcription_raw_files(transcription_id);
CREATE INDEX idx_transcription_raw_files_raw_file ON transcription_raw_files(raw_file_id);

COMMENT ON TABLE transcription_raw_files IS 'Relation Many-to-One: Une transcription peut provenir de PLUSIEURS fichiers bruts';

-- =====================================================
-- TABLE: book_project_transcriptions (Relation Many-to-One)
-- Description: Un projet de livre peut provenir de PLUSIEURS transcriptions
-- =====================================================

CREATE TABLE IF NOT EXISTS book_project_transcriptions (
  book_project_id UUID NOT NULL REFERENCES book_projects(id) ON DELETE CASCADE,
  transcription_id UUID NOT NULL REFERENCES transcriptions(id) ON DELETE CASCADE,
  order_index INTEGER DEFAULT 0, -- Ordre des transcriptions dans le livre
  linked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  linked_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  
  PRIMARY KEY (book_project_id, transcription_id)
);

-- ✅ INDEX
CREATE INDEX idx_book_project_transcriptions_book ON book_project_transcriptions(book_project_id);
CREATE INDEX idx_book_project_transcriptions_transcription ON book_project_transcriptions(transcription_id);

COMMENT ON TABLE book_project_transcriptions IS 'Relation Many-to-One: Un projet de livre peut provenir de PLUSIEURS transcriptions';

-- =====================================================
-- VUES UTILES (CORRIGÉES)
-- =====================================================

-- ✅ Vue: Arborescence complète d'un projet de livre
CREATE OR REPLACE VIEW book_project_tree AS
SELECT 
  bp.id as book_project_id,
  bp.title as book_title,
  bp.status as book_status,
  t.id as transcription_id,
  t.title as transcription_title,
  t.status as transcription_status,
  rf.id as raw_file_id,
  rf.file_name as raw_file_name,
  rf.file_type as raw_file_type,
  pr1.id as proofreading_v1_id,
  pr1.status as proofreading_v1_status,
  pr2.id as proofreading_v2_id,
  pr2.status as proofreading_v2_status
FROM book_projects bp
LEFT JOIN book_project_transcriptions bpt ON bp.id = bpt.book_project_id
LEFT JOIN transcriptions t ON bpt.transcription_id = t.id
LEFT JOIN transcription_raw_files trf ON t.id = trf.transcription_id
LEFT JOIN raw_files rf ON trf.raw_file_id = rf.id
LEFT JOIN proofreading_v1 pr1 ON bp.id = pr1.book_project_id
LEFT JOIN proofreading_v2 pr2 ON pr1.id = pr2.proofreading_v1_id
WHERE bp.is_deleted = FALSE;

-- ✅ Vue: Statistiques par statut (CORRIGÉE - raw_files n'a pas de status)
CREATE OR REPLACE VIEW media_library_stats AS
SELECT 
  'raw_files' as entity_type,
  file_type as status_or_type,  -- ✅ raw_files utilise file_type
  COUNT(*) as count
FROM raw_files
WHERE is_deleted = FALSE
GROUP BY file_type

UNION ALL

SELECT 
  'transcriptions' as entity_type,
  status as status_or_type,  -- ✅ transcriptions utilise status
  COUNT(*) as count
FROM transcriptions
WHERE is_deleted = FALSE
GROUP BY status

UNION ALL

SELECT 
  'book_projects' as entity_type,
  status as status_or_type,  -- ✅ book_projects utilise status
  COUNT(*) as count
FROM book_projects
WHERE is_deleted = FALSE
GROUP BY status

UNION ALL

SELECT 
  'proofreading_v1' as entity_type,
  status as status_or_type,  -- ✅ proofreading_v1 utilise status
  COUNT(*) as count
FROM proofreading_v1
WHERE is_deleted = FALSE
GROUP BY status

UNION ALL

SELECT 
  'proofreading_v2' as entity_type,
  status as status_or_type,  -- ✅ proofreading_v2 utilise status
  COUNT(*) as count
FROM proofreading_v2
WHERE is_deleted = FALSE
GROUP BY status;

-- ✅ Vue: Résumé de l'activité récente
CREATE OR REPLACE VIEW recent_activity AS
SELECT 
  al.entity_type,
  al.entity_id,
  al.action_type,
  al.user_email,
  al.created_at,
  CASE 
    WHEN al.entity_type = 'raw_files' THEN rf.file_name
    WHEN al.entity_type = 'transcriptions' THEN t.title
    WHEN al.entity_type = 'book_projects' THEN bp.title
    ELSE NULL
  END as entity_name
FROM audit_logs al
LEFT JOIN raw_files rf ON al.entity_id = rf.id AND al.entity_type = 'raw_files'
LEFT JOIN transcriptions t ON al.entity_id = t.id AND al.entity_type = 'transcriptions'
LEFT JOIN book_projects bp ON al.entity_id = bp.id AND al.entity_type = 'book_projects'
ORDER BY al.created_at DESC
LIMIT 100;

COMMENT ON VIEW book_project_tree IS 'Arborescence complète: Livre → Transcriptions → Fichiers bruts + Relectures';
COMMENT ON VIEW media_library_stats IS 'Statistiques par statut/type pour tous les types d''entités';
COMMENT ON VIEW recent_activity IS 'Dernières 100 activités sur toutes les entités';

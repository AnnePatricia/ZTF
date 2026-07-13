-- =====================================================
-- MIGRATION 014: Extension documents (sessions de correction)
-- Description: Ajoute les colonnes pour les sessions de correction collaborative
-- Date: Mars 2025
-- =====================================================

-- =====================================================
-- 1. AJOUTER LES COLONNES MANQUANTES
-- =====================================================

-- Format et chemin de la source
ALTER TABLE documents
  ADD COLUMN IF NOT EXISTS source_format TEXT CHECK (source_format IN ('docx', 'md', 'epub', 'odt')),
  ADD COLUMN IF NOT EXISTS source_path TEXT,
  ADD COLUMN IF NOT EXISTS source_size INTEGER;

-- Métriques de progression
ALTER TABLE documents
  ADD COLUMN IF NOT EXISTS total_blocks INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS merged_blocks INTEGER DEFAULT 0;

-- Dates de session
ALTER TABLE documents
  ADD COLUMN IF NOT EXISTS started_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS deadline TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;

-- Commentaires
COMMENT ON COLUMN documents.source_format IS 'Format du document source (docx, md, epub, odt)';
COMMENT ON COLUMN documents.source_path IS 'Chemin dans le bucket Storage "sources"';
COMMENT ON COLUMN documents.source_size IS 'Taille du fichier source en octets';
COMMENT ON COLUMN documents.total_blocks IS 'Nombre total de blocs atomiques';
COMMENT ON COLUMN documents.merged_blocks IS 'Nombre de blocs mergés (validés)';
COMMENT ON COLUMN documents.started_at IS 'Date de début de la session de correction';
COMMENT ON COLUMN documents.deadline IS 'Date limite de la session';
COMMENT ON COLUMN documents.completed_at IS 'Date de clôture de la session';

-- =====================================================
-- 2. METTRE À JOUR LES TYPES ACCEPTÉS
-- =====================================================

-- Étendre la contrainte CHECK sur type
ALTER TABLE documents DROP CONSTRAINT IF EXISTS documents_type_check;

ALTER TABLE documents ADD CONSTRAINT documents_type_check
  CHECK (type IN (
    'correction',      -- Session de correction collaborative (NOUVEAU)
    'proofreading',    -- Relecture
    'translation',     -- Traduction
    'review',          -- Révision
    'transcription',   -- Transcription (existant)
    'document',        -- Document générique (existant)
    'report',          -- Rapport (existant)
    NULL
  ));

-- =====================================================
-- 3. METTRE À JOUR LES STATUTS ACCEPTÉS
-- =====================================================

-- Étendre la contrainte CHECK sur status
ALTER TABLE documents DROP CONSTRAINT IF EXISTS documents_status_check;

ALTER TABLE documents ADD CONSTRAINT documents_status_check
  CHECK (status IN (
    'draft',              -- Brouillon, pas encore lancé
    'converting',         -- Conversion Pandoc en cours
    'in_review',          -- Session de correction active (NOUVEAU)
    'completed',          -- Session clôturée
    'archived',           -- Archivé
    'à_traiter',          -- Statut existant
    'transcription_en_cours',
    'transcrit',
    'projet_de_livre',
    'relecture_1_en_cours',
    'relecture_1_validé',
    'relecture_2_en_cours',
    'relecture_2_validé'
  ));

-- =====================================================
-- 4. INDEX POUR PERFORMANCES
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_documents_source_format ON documents(source_format);
CREATE INDEX IF NOT EXISTS idx_documents_status ON documents(status);
CREATE INDEX IF NOT EXISTS idx_documents_started_at ON documents(started_at) WHERE started_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_documents_deadline ON documents(deadline) WHERE deadline IS NOT NULL;

-- =====================================================
-- 5. FONCTIONS UTILITAIRES
-- =====================================================

-- Fonction pour calculer la progression d'une session
CREATE OR REPLACE FUNCTION get_document_session_progress(
  p_document_id UUID
) RETURNS TABLE (
  total_blocks INTEGER,
  merged_blocks INTEGER,
  draft_blocks INTEGER,
  proposed_blocks INTEGER,
  progress_pct NUMERIC
) AS $$
BEGIN
  -- Si la table document_blocks n'existe pas encore, retourner des valeurs par défaut
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'document_blocks'
  ) THEN
    RETURN QUERY SELECT 0, 0, 0, 0, 0::NUMERIC;
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    COUNT(*)::INTEGER AS total_blocks,
    COUNT(*) FILTER (WHERE status = 'merged')::INTEGER AS merged_blocks,
    COUNT(*) FILTER (WHERE status = 'draft')::INTEGER AS draft_blocks,
    COUNT(*) FILTER (WHERE status = 'proposed')::INTEGER AS proposed_blocks,
    ROUND(
      COUNT(*) FILTER (WHERE status = 'merged') * 100.0 / NULLIF(COUNT(*), 0),
      1
    ) AS progress_pct
  FROM document_blocks
  WHERE document_id = p_document_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_document_session_progress IS 'Calcule la progression d''une session de correction (blocs mergés / total)';

-- =====================================================
-- 6. VUE UTILITAIRE
-- =====================================================

-- Vue pour voir les sessions de correction
-- NOTE: user_id est utilisé au lieu de created_by (schéma existant)
CREATE OR REPLACE VIEW correction_sessions AS
SELECT
  d.id,
  d.title,
  d.type,
  d.status,
  d.source_format,
  d.source_size,
  d.total_blocks,
  d.merged_blocks,
  d.started_at,
  d.deadline,
  d.completed_at,
  d.user_id,
  u.full_name as created_by_name,
  CASE 
    WHEN d.status = 'in_review' THEN 'Active'
    WHEN d.status = 'completed' THEN 'Terminée'
    WHEN d.status = 'converting' THEN 'En conversion'
    ELSE 'En attente'
  END as session_state,
  CASE 
    WHEN d.total_blocks > 0 THEN ROUND(d.merged_blocks * 100.0 / d.total_blocks, 1)
    ELSE 0
  END as progress_percentage,
  CASE
    WHEN d.deadline < NOW() AND d.status != 'completed' THEN 'En retard'
    WHEN d.deadline IS NOT NULL THEN 'Dans les temps'
    ELSE 'Pas de deadline'
  END as deadline_status
FROM documents d
LEFT JOIN users u ON d.user_id = u.id
WHERE d.type = 'correction'
ORDER BY d.created_at DESC;

COMMENT ON VIEW correction_sessions IS 'Vue des sessions de correction collaborative avec progression';

-- =====================================================
-- 7. CONFIRMATION
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '✅ Migration 014 appliquée avec succès !';
  RAISE NOTICE '   - Colonnes ajoutées à documents (source_*, total_blocks, merged_blocks, dates)';
  RAISE NOTICE '   - Contraintes CHECK mises à jour (type, status)';
  RAISE NOTICE '   - Fonction get_document_session_progress() créée';
  RAISE NOTICE '   - Vue correction_sessions créée';
  RAISE NOTICE '';
  RAISE NOTICE '   Pour vérifier :';
  RAISE NOTICE '   SELECT title, type, status, total_blocks, merged_blocks FROM documents;';
END $$;


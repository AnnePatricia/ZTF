-- =====================================================
-- MIGRATION 013: Extension proofreading_v2 (session)
-- Description: Ajoute session_document_id pour lier au correcteur collaboratif
-- Date: Mars 2025
-- =====================================================

-- =====================================================
-- 1. AJOUTER LA COLONNE session_document_id
-- =====================================================

ALTER TABLE proofreading_v2
  ADD COLUMN IF NOT EXISTS session_document_id UUID;

-- Commentaire
COMMENT ON COLUMN proofreading_v2.session_document_id IS '
  Référence vers la session de correction collaborative (table documents).
  Quand une R2 est créée, on peut lancer une session de correction collaborative.
  Cette session contient les blocs atomiques (document_blocks).
';

-- =====================================================
-- 2. CONTRAINTE DE CLÉ ÉTRANGÈRE (SÉCURISÉ)
-- =====================================================

-- Ajouter la FK seulement si la table documents existe
DO $$
BEGIN
  -- Vérifier si la table documents existe ET si la contrainte n'existe pas déjà
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'documents')
     AND NOT EXISTS (
       SELECT 1 FROM information_schema.table_constraints 
       WHERE constraint_name = 'fk_proofreading_v2_session_document'
     ) THEN
    -- Ajouter la contrainte
    ALTER TABLE proofreading_v2
      ADD CONSTRAINT fk_proofreading_v2_session_document
      FOREIGN KEY (session_document_id)
      REFERENCES documents(id)
      ON DELETE SET NULL;
      
    RAISE NOTICE 'Contrainte fk_proofreading_v2_session_document ajoutée';
  ELSE
    RAISE NOTICE 'Table documents introuvable ou contrainte déjà existante, FK ignorée';
  END IF;
END $$;

-- =====================================================
-- 3. INDEX POUR PERFORMANCES
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_proofreading_v2_session_document 
  ON proofreading_v2(session_document_id) 
  WHERE session_document_id IS NOT NULL;

-- =====================================================
-- 4. FONCTION UTILITAIRE (SÉCURISÉ)
-- =====================================================

-- Fonction pour vérifier si une R2 a une session active
CREATE OR REPLACE FUNCTION proofreading_v2_has_active_session(
  p_proofreading_v2_id UUID
) RETURNS BOOLEAN AS $$
DECLARE
  session_doc_id UUID;
  session_status TEXT;
BEGIN
  -- Récupérer le session_document_id
  SELECT session_document_id INTO session_doc_id
  FROM proofreading_v2
  WHERE id = p_proofreading_v2_id;
  
  IF session_doc_id IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Vérifier si la table documents existe avant de faire le SELECT
  IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'documents') THEN
    RETURN FALSE;
  END IF;
  
  -- Vérifier le statut de la session
  SELECT status INTO session_status
  FROM documents
  WHERE id = session_doc_id;
  
  RETURN session_status = 'in_review';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION proofreading_v2_has_active_session IS 'Vérifie si une R2 a une session de correction active';

-- =====================================================
-- 5. VUE UTILITAIRE (SÉCURISÉ)
-- =====================================================

-- Vue pour voir les R2 avec leurs sessions (seulement si documents existe)
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'documents') THEN
    -- Créer la vue avec JOIN sur documents
    EXECUTE '
      CREATE OR REPLACE VIEW proofreading_v2_with_sessions AS
      SELECT
        pr2.id,
        pr2.proofreading_v1_id,
        pr2.status as proofreading_v2_status,
        pr2.session_document_id,
        pr2.reviewer_id,
        pr2.reviewer_name,
        pr2.corrections_count,
        pr2.created_at,
        d.title as session_title,
        d.status as session_status,
        CASE 
          WHEN d.status = ''in_review'' THEN ''Active''
          WHEN d.status = ''completed'' THEN ''Terminée''
          WHEN d.status IS NOT NULL THEN ''Incomplète''
          ELSE ''Aucune''
        END as session_state,
        0 as progress_percentage
      FROM proofreading_v2 pr2
      LEFT JOIN documents d ON pr2.session_document_id = d.id
      ORDER BY pr2.created_at DESC
    ';
    
    COMMENT ON VIEW proofreading_v2_with_sessions IS 'Vue des R2 avec leurs sessions de correction';
  ELSE
    -- Créer une vue simplifiée sans JOIN sur documents
    EXECUTE '
      CREATE OR REPLACE VIEW proofreading_v2_with_sessions AS
      SELECT
        pr2.id,
        pr2.proofreading_v1_id,
        pr2.status as proofreading_v2_status,
        pr2.session_document_id,
        pr2.reviewer_id,
        pr2.reviewer_name,
        pr2.corrections_count,
        pr2.created_at,
        NULL as session_title,
        NULL as session_status,
        ''Aucune'' as session_state,
        0 as progress_percentage
      FROM proofreading_v2 pr2
      ORDER BY pr2.created_at DESC
    ';
    
    RAISE NOTICE 'Table documents introuvable, vue créée sans jointure';
  END IF;
END $$;

-- =====================================================
-- 6. CONFIRMATION
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '✅ Migration 013 appliquée avec succès !';
  RAISE NOTICE '   - Colonne session_document_id ajoutée à proofreading_v2';
  RAISE NOTICE '   - Fonction proofreading_v2_has_active_session() créée';
  RAISE NOTICE '   - Vue proofreading_v2_with_sessions créée';
  RAISE NOTICE '';
  RAISE NOTICE '   Pour vérifier :';
  RAISE NOTICE '   SELECT id, session_document_id FROM proofreading_v2;';
END $$;
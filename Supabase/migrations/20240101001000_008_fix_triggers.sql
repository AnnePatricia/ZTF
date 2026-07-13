-- =====================================================
-- MIGRATION: Correction des triggers (Fix Triggers)
-- Description: Supprime les anciens triggers et recrée les bons
-- IMPORTANT: Nommez ce fichier avec un timestamp (ex: 20240101001000_fix_triggers.sql)
-- =====================================================

-- ✅ 1. SUPPRIMER LES ANCIENS TRIGGERS CONFLICTUELS
DROP TRIGGER IF EXISTS trigger_update_raw_file_status_on_transcription_link ON transcription_raw_files;
DROP TRIGGER IF EXISTS trigger_update_transcription_status_on_book_project_link ON book_project_transcriptions;
DROP TRIGGER IF EXISTS trigger_update_book_project_status_on_proofreading_v1 ON proofreading_v1;
DROP TRIGGER IF EXISTS trigger_update_book_project_status_on_proofreading_v1_validated ON proofreading_v1;
DROP TRIGGER IF EXISTS trigger_update_proofreading_v1_status_on_proofreading_v2 ON proofreading_v2;
DROP TRIGGER IF EXISTS trigger_update_proofreading_v1_status_on_proofreading_v2_validated ON proofreading_v2;

-- Triggers sur document_media_links (Sécurisés car la table peut ne pas exister encore)
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'document_media_links') THEN
        DROP TRIGGER IF EXISTS trigger_update_raw_file_link_count_on_document_link ON document_media_links;
        DROP TRIGGER IF EXISTS trigger_update_raw_file_link_count_on_document_unlink ON document_media_links;
    END IF;
END $$;

DROP TRIGGER IF EXISTS trigger_cleanup_transcription_links_on_raw_file_delete ON raw_files;

-- ✅ 2. SUPPRIMER LES ANCIENS TRIGGERS CONFLICTUELS (SUPPLÉMENTAIRES)
DROP TRIGGER IF EXISTS trg_propagate_transcription_status ON transcriptions;
DROP TRIGGER IF EXISTS propagate_transcription_status ON transcriptions;

-- ✅ 3. SUPPRIMER LES ANCIENNES FONCTIONS CONFLICTUELLES
DROP FUNCTION IF EXISTS update_raw_file_status_on_transcription_link() CASCADE;
DROP FUNCTION IF EXISTS update_transcription_status_on_book_project_link() CASCADE;
DROP FUNCTION IF EXISTS update_book_project_status_on_proofreading_v1() CASCADE;
DROP FUNCTION IF EXISTS update_book_project_status_on_proofreading_v1_validated() CASCADE;
DROP FUNCTION IF EXISTS update_proofreading_v1_status_on_proofreading_v2() CASCADE;
DROP FUNCTION IF EXISTS update_proofreading_v1_status_on_proofreading_v2_validated() CASCADE;
DROP FUNCTION IF EXISTS update_raw_file_link_count_on_document_link() CASCADE;
DROP FUNCTION IF EXISTS update_raw_file_link_count_on_document_unlink() CASCADE;
DROP FUNCTION IF EXISTS cleanup_transcription_links_on_raw_file_delete() CASCADE;
DROP FUNCTION IF EXISTS propagate_transcription_status() CASCADE;

-- ✅ 4. RECRÉER LES BONNES FONCTIONS

-- 4.1 TRIGGER: Quand une transcription est liée à un brut → statut brut = "traité"
CREATE OR REPLACE FUNCTION update_raw_file_status_on_transcription_link()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE raw_files
  SET 
    status = 'traité',
    is_linked = TRUE,
    linked_documents_count = (SELECT COUNT(*) FROM transcription_raw_files WHERE raw_file_id = NEW.raw_file_id),
    metadata = jsonb_set(COALESCE(metadata, '{}'::jsonb), '{status_history}', (COALESCE(metadata->'status_history', '[]'::jsonb) || jsonb_build_array(jsonb_build_object('status', 'traité', 'timestamp', NOW(), 'reason', 'Liaison avec transcription', 'transcription_id', NEW.transcription_id)))::jsonb),
    updated_at = NOW()
  WHERE id = NEW.raw_file_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_raw_file_status_on_transcription_link ON transcription_raw_files;
CREATE TRIGGER trigger_update_raw_file_status_on_transcription_link
  AFTER INSERT ON transcription_raw_files
  FOR EACH ROW
  EXECUTE FUNCTION update_raw_file_status_on_transcription_link();

-- 4.2 TRIGGER: Quand une transcription est liée à un projet → statut transcription = "projet_de_livre"
CREATE OR REPLACE FUNCTION update_transcription_status_on_book_project_link()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE transcriptions
  SET 
    status = 'projet_de_livre',
    metadata = jsonb_set(COALESCE(metadata, '{}'::jsonb), '{status_history}', (COALESCE(metadata->'status_history', '[]'::jsonb) || jsonb_build_array(jsonb_build_object('status', 'projet_de_livre', 'timestamp', NOW(), 'reason', 'Liaison avec projet de livre', 'book_project_id', NEW.book_project_id)))::jsonb),
    updated_at = NOW()
  WHERE id = NEW.transcription_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_transcription_status_on_book_project_link ON book_project_transcriptions;
CREATE TRIGGER trigger_update_transcription_status_on_book_project_link
  AFTER INSERT ON book_project_transcriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_transcription_status_on_book_project_link();

-- 4.3 TRIGGER: Quand une relecture 1 est créée → statut projet = "relecture_1_en_cours"
CREATE OR REPLACE FUNCTION update_book_project_status_on_proofreading_v1()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE book_projects
  SET 
    status = 'relecture_1_en_cours',
    metadata = jsonb_set(COALESCE(metadata, '{}'::jsonb), '{status_history}', (COALESCE(metadata->'status_history', '[]'::jsonb) || jsonb_build_array(jsonb_build_object('status', 'relecture_1_en_cours', 'timestamp', NOW(), 'reason', 'Création relecture 1', 'proofreading_v1_id', NEW.id)))::jsonb),
    updated_at = NOW()
  WHERE id = NEW.book_project_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_book_project_status_on_proofreading_v1 ON proofreading_v1;
CREATE TRIGGER trigger_update_book_project_status_on_proofreading_v1
  AFTER INSERT ON proofreading_v1
  FOR EACH ROW
  EXECUTE FUNCTION update_book_project_status_on_proofreading_v1();

-- 4.4 TRIGGER: Quand une relecture 1 est validée → statut projet = "relecture_1_validé"
CREATE OR REPLACE FUNCTION update_book_project_status_on_proofreading_v1_validated()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'relecture_1_validé' AND (OLD.status IS NULL OR OLD.status != 'relecture_1_validé') THEN
    UPDATE book_projects
    SET 
      status = 'relecture_1_validé',
      metadata = jsonb_set(COALESCE(metadata, '{}'::jsonb), '{status_history}', (COALESCE(metadata->'status_history', '[]'::jsonb) || jsonb_build_array(jsonb_build_object('status', 'relecture_1_validé', 'timestamp', NOW(), 'reason', 'Validation relecture 1', 'proofreading_v1_id', NEW.id)))::jsonb),
      updated_at = NOW()
    WHERE id = NEW.book_project_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_book_project_status_on_proofreading_v1_validated ON proofreading_v1;
CREATE TRIGGER trigger_update_book_project_status_on_proofreading_v1_validated
  AFTER UPDATE ON proofreading_v1
  FOR EACH ROW
  WHEN (NEW.status = 'relecture_1_validé' AND (OLD.status IS NULL OR OLD.status != 'relecture_1_validé'))
  EXECUTE FUNCTION update_book_project_status_on_proofreading_v1_validated();

-- 4.5 TRIGGER: Quand une relecture 2 est créée → statut R1 = "relecture_2_en_cours"
CREATE OR REPLACE FUNCTION update_proofreading_v1_status_on_proofreading_v2()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE proofreading_v1
  SET 
    status = 'relecture_2_en_cours',
    metadata = jsonb_set(COALESCE(metadata, '{}'::jsonb), '{status_history}', (COALESCE(metadata->'status_history', '[]'::jsonb) || jsonb_build_array(jsonb_build_object('status', 'relecture_2_en_cours', 'timestamp', NOW(), 'reason', 'Création relecture 2', 'proofreading_v2_id', NEW.id)))::jsonb),
    updated_at = NOW()
  WHERE id = NEW.proofreading_v1_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_proofreading_v1_status_on_proofreading_v2 ON proofreading_v2;
CREATE TRIGGER trigger_update_proofreading_v1_status_on_proofreading_v2
  AFTER INSERT ON proofreading_v2
  FOR EACH ROW
  EXECUTE FUNCTION update_proofreading_v1_status_on_proofreading_v2();

-- 4.6 TRIGGER: Quand une relecture 2 est validée → statut R1 = "relecture_2_validé"
CREATE OR REPLACE FUNCTION update_proofreading_v1_status_on_proofreading_v2_validated()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'relecture_2_validé' AND (OLD.status IS NULL OR OLD.status != 'relecture_2_validé') THEN
    UPDATE proofreading_v1
    SET 
      status = 'relecture_2_validé',
      metadata = jsonb_set(COALESCE(metadata, '{}'::jsonb), '{status_history}', (COALESCE(metadata->'status_history', '[]'::jsonb) || jsonb_build_array(jsonb_build_object('status', 'relecture_2_validé', 'timestamp', NOW(), 'reason', 'Validation relecture 2', 'proofreading_v2_id', NEW.id)))::jsonb),
      updated_at = NOW()
    WHERE id = NEW.proofreading_v1_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_proofreading_v1_status_on_proofreading_v2_validated ON proofreading_v2;
CREATE TRIGGER trigger_update_proofreading_v1_status_on_proofreading_v2_validated
  AFTER UPDATE ON proofreading_v2
  FOR EACH ROW
  WHEN (NEW.status = 'relecture_2_validé' AND (OLD.status IS NULL OR OLD.status != 'relecture_2_validé'))
  EXECUTE FUNCTION update_proofreading_v1_status_on_proofreading_v2_validated();

-- 4.7 TRIGGER: Quand un document est lié à un fichier brut → mettre à jour is_linked (SÉCURISÉ)
CREATE OR REPLACE FUNCTION update_raw_file_link_count_on_document_link()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE raw_files
  SET 
    is_linked = TRUE,
    linked_documents_count = (SELECT COUNT(*) FROM document_media_links WHERE media_file_id = NEW.media_file_id),
    updated_at = NOW()
  WHERE id = NEW.media_file_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'document_media_links') THEN
        DROP TRIGGER IF EXISTS trigger_update_raw_file_link_count_on_document_link ON document_media_links;
        CREATE TRIGGER trigger_update_raw_file_link_count_on_document_link
          AFTER INSERT ON document_media_links
          FOR EACH ROW
          EXECUTE FUNCTION update_raw_file_link_count_on_document_link();
    ELSE
        RAISE NOTICE 'Table document_media_links introuvable, trigger 4.7 reporté.';
    END IF;
END $$;

-- 4.8 TRIGGER: Quand un document est délié → mettre à jour is_linked (SÉCURISÉ)
CREATE OR REPLACE FUNCTION update_raw_file_link_count_on_document_unlink()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE raw_files
  SET 
    linked_documents_count = (SELECT COUNT(*) FROM document_media_links WHERE media_file_id = OLD.media_file_id),
    is_linked = (SELECT COUNT(*) > 0 FROM document_media_links WHERE media_file_id = OLD.media_file_id),
    updated_at = NOW()
  WHERE id = OLD.media_file_id;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'document_media_links') THEN
        DROP TRIGGER IF EXISTS trigger_update_raw_file_link_count_on_document_unlink ON document_media_links;
        CREATE TRIGGER trigger_update_raw_file_link_count_on_document_unlink
          AFTER DELETE ON document_media_links
          FOR EACH ROW
          EXECUTE FUNCTION update_raw_file_link_count_on_document_unlink();
    ELSE
        RAISE NOTICE 'Table document_media_links introuvable, trigger 4.8 reporté.';
    END IF;
END $$;

-- 4.9 TRIGGER: Supprimer la liaison transcription quand le brut est supprimé (soft delete)
CREATE OR REPLACE FUNCTION cleanup_transcription_links_on_raw_file_delete()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_deleted = TRUE AND OLD.is_deleted = FALSE THEN
    DELETE FROM transcription_raw_files WHERE raw_file_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_cleanup_transcription_links_on_raw_file_delete ON raw_files;
CREATE TRIGGER trigger_cleanup_transcription_links_on_raw_file_delete
  AFTER UPDATE ON raw_files
  FOR EACH ROW
  WHEN (NEW.is_deleted = TRUE AND OLD.is_deleted = FALSE)
  EXECUTE FUNCTION cleanup_transcription_links_on_raw_file_delete();

-- ✅ COMMENTAIRES
COMMENT ON FUNCTION update_raw_file_status_on_transcription_link IS 'Met à jour le statut d''un fichier brut quand il est lié à une transcription';
COMMENT ON FUNCTION update_transcription_status_on_book_project_link IS 'Met à jour le statut d''une transcription quand elle est liée à un projet de livre';
COMMENT ON FUNCTION update_book_project_status_on_proofreading_v1 IS 'Met à jour le statut d''un projet de livre quand une relecture 1 est créée';
COMMENT ON FUNCTION update_book_project_status_on_proofreading_v1_validated IS 'Met à jour le statut d''un projet de livre quand la relecture 1 est validée';
COMMENT ON FUNCTION update_proofreading_v1_status_on_proofreading_v2 IS 'Met à jour le statut d''une relecture 1 quand une relecture 2 est créée';
COMMENT ON FUNCTION update_proofreading_v1_status_on_proofreading_v2_validated IS 'Met à jour le statut d''une relecture 1 quand la relecture 2 est validée';
COMMENT ON FUNCTION update_raw_file_link_count_on_document_link IS 'Met à jour le compteur de liaisons d''un fichier brut quand un document est lié';
COMMENT ON FUNCTION update_raw_file_link_count_on_document_unlink IS 'Met à jour le compteur de liaisons d''un fichier brut quand un document est délié';
COMMENT ON FUNCTION cleanup_transcription_links_on_raw_file_delete IS 'Supprime les liaisons de transcription quand un fichier brut est supprimé';
-- =====================================================
-- MIGRATION 023: Row Level Security (RLS) policies
-- Description: Sécurité des tables du correcteur collaboratif
-- Date: Mars 2025
-- =====================================================

-- =====================================================
-- NOTE IMPORTANTE
-- =====================================================
-- Cette migration configure RLS pour les NOUVELLES tables créées.
-- La table `users` a déjà RLS désactivé (voir migration 011).
-- Pour les tables existantes (documents, book_projects, etc.),
-- RLS est déjà configuré dans les migrations précédentes.

-- =====================================================
-- 1. document_blocks
-- =====================================================

ALTER TABLE document_blocks ENABLE ROW LEVEL SECURITY;

-- Lecture : membres du projet
CREATE POLICY "blocks_select" ON document_blocks FOR SELECT
USING (
  document_id IN (
    SELECT id FROM documents
    WHERE user_id = auth.uid()
    OR id IN (
      SELECT document_id FROM document_collaborators WHERE user_id = auth.uid()
    )
  )
);

-- Insertion : collaborateurs de la session
CREATE POLICY "blocks_insert" ON document_blocks FOR INSERT
WITH CHECK (
  document_id IN (
    SELECT document_id FROM document_collaborators WHERE user_id = auth.uid()
  )
);

-- Mise à jour : collaborateurs avec permission selon le statut
CREATE POLICY "blocks_update" ON document_blocks FOR UPDATE
USING (
  document_id IN (
    SELECT document_id FROM document_collaborators WHERE user_id = auth.uid()
  )
);

-- Suppression : admins et editors uniquement
CREATE POLICY "blocks_delete" ON document_blocks FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'editor')
  )
);


-- =====================================================
-- 2. block_operations
-- =====================================================

ALTER TABLE block_operations ENABLE ROW LEVEL SECURITY;

-- Lecture : membres du projet
CREATE POLICY "operations_select" ON block_operations FOR SELECT
USING (
  document_id IN (
    SELECT id FROM documents
    WHERE user_id = auth.uid()
    OR id IN (
      SELECT document_id FROM document_collaborators WHERE user_id = auth.uid()
    )
  )
);

-- Insertion : collaborateurs de la session
CREATE POLICY "operations_insert" ON block_operations FOR INSERT
WITH CHECK (
  document_id IN (
    SELECT document_id FROM document_collaborators WHERE user_id = auth.uid()
  )
);

-- Suppression : admins uniquement (nettoyage)
CREATE POLICY "operations_delete" ON block_operations FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
  )
);


-- =====================================================
-- 3. block_proposals
-- =====================================================

ALTER TABLE block_proposals ENABLE ROW LEVEL SECURITY;

-- Lecture : membres du projet
CREATE POLICY "proposals_select" ON block_proposals FOR SELECT
USING (
  document_id IN (
    SELECT id FROM documents
    WHERE user_id = auth.uid()
    OR id IN (
      SELECT document_id FROM document_collaborators WHERE user_id = auth.uid()
    )
  )
);

-- Insertion : correcteurs et rédacteurs en chef
CREATE POLICY "proposals_insert" ON block_proposals FOR INSERT
WITH CHECK (
  proposed_by = auth.uid()
  AND document_id IN (
    SELECT document_id FROM document_collaborators
    WHERE user_id = auth.uid()
  )
);

-- Mise à jour : reviewers (redacteur_chef, editor) pour approbation/rejet
CREATE POLICY "proposals_update" ON block_proposals FOR UPDATE
USING (
  document_id IN (
    SELECT document_id FROM document_collaborators
    WHERE user_id = auth.uid()
    AND (permissions->>'can_merge')::boolean = true
  )
  OR proposed_by = auth.uid()
);

-- Suppression : admins uniquement
CREATE POLICY "proposals_delete" ON block_proposals FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
  )
);


-- =====================================================
-- 4. block_comments
-- =====================================================

ALTER TABLE block_comments ENABLE ROW LEVEL SECURITY;

-- Lecture : membres du projet
CREATE POLICY "comments_select" ON block_comments FOR SELECT
USING (
  document_id IN (
    SELECT id FROM documents
    WHERE user_id = auth.uid()
    OR id IN (
      SELECT document_id FROM document_collaborators WHERE user_id = auth.uid()
    )
  )
);

-- Insertion : tout collaborateur invité
CREATE POLICY "comments_insert" ON block_comments FOR INSERT
WITH CHECK (
  user_id = auth.uid()
  AND document_id IN (
    SELECT document_id FROM document_collaborators WHERE user_id = auth.uid()
  )
);

-- Mise à jour : auteur du commentaire ou reviewer (pour résoudre)
CREATE POLICY "comments_update" ON block_comments FOR UPDATE
USING (
  user_id = auth.uid()
  OR resolved_by = auth.uid()
  OR EXISTS (
    SELECT 1 FROM document_collaborators
    WHERE document_id = block_comments.document_id
    AND user_id = auth.uid()
    AND (permissions->>'can_merge')::boolean = true
  )
);

-- Suppression : auteur ou admins
CREATE POLICY "comments_delete" ON block_comments FOR DELETE
USING (
  user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
  )
);


-- =====================================================
-- 5. document_collaborators
-- =====================================================

ALTER TABLE document_collaborators ENABLE ROW LEVEL SECURITY;

-- Lecture : membres du même document
CREATE POLICY "collaborators_select" ON document_collaborators FOR SELECT
USING (
  document_id IN (
    SELECT document_id FROM document_collaborators WHERE user_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM documents WHERE id = document_id AND user_id = auth.uid()
  )
);

-- Insertion : owner du document ou admins
CREATE POLICY "collaborators_insert" ON document_collaborators FOR INSERT
WITH CHECK (
  document_id IN (
    SELECT id FROM documents WHERE user_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'editor')
  )
);

-- Mise à jour : owner du document ou admins
CREATE POLICY "collaborators_update" ON document_collaborators FOR UPDATE
USING (
  document_id IN (
    SELECT id FROM documents WHERE user_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'editor')
  )
);

-- Suppression : owner du document ou admins
CREATE POLICY "collaborators_delete" ON document_collaborators FOR DELETE
USING (
  document_id IN (
    SELECT id FROM documents WHERE user_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'editor')
  )
);


-- =====================================================
-- 6. document_sessions
-- =====================================================

ALTER TABLE document_sessions ENABLE ROW LEVEL SECURITY;

-- Lecture : membres du même document
CREATE POLICY "sessions_select" ON document_sessions FOR SELECT
USING (
  document_id IN (
    SELECT document_id FROM document_collaborators WHERE user_id = auth.uid()
  )
  OR user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM documents WHERE id = document_id AND user_id = auth.uid()
  )
);

-- Insertion : collaborateurs
CREATE POLICY "sessions_insert" ON document_sessions FOR INSERT
WITH CHECK (
  user_id = auth.uid()
  AND (
    document_id IN (
      SELECT document_id FROM document_collaborators WHERE user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM documents WHERE id = document_id AND user_id = auth.uid()
    )
  )
);

-- Mise à jour : owner de la session
CREATE POLICY "sessions_update" ON document_sessions FOR UPDATE
USING (
  user_id = auth.uid()
);

-- Suppression : owner ou admins
CREATE POLICY "sessions_delete" ON document_sessions FOR DELETE
USING (
  user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
  )
);


-- =====================================================
-- 7. notifications
-- =====================================================

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Lecture : chaque utilisateur ne voit que ses notifications
CREATE POLICY "notifications_select" ON notifications FOR SELECT
USING (user_id = auth.uid());

-- Insertion : système (via fonctions SECURITY DEFINER)
CREATE POLICY "notifications_insert" ON notifications FOR INSERT
WITH CHECK (
  user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
  )
);

-- Mise à jour : owner de la notification (pour marquer comme lu)
CREATE POLICY "notifications_update" ON notifications FOR UPDATE
USING (user_id = auth.uid());

-- Suppression : owner ou admins (nettoyage)
CREATE POLICY "notifications_delete" ON notifications FOR DELETE
USING (
  user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
  )
);


-- =====================================================
-- 8. CONFIRMATION
-- =====================================================

DO $$
DECLARE
  v_table TEXT;
  v_count INTEGER := 0;
BEGIN
  -- Compter les policies créées
  FOR v_table IN 
    SELECT DISTINCT tablename 
    FROM pg_policies 
    WHERE schemaname = 'public'
    AND tablename IN (
      'document_blocks', 'block_operations', 'block_proposals',
      'block_comments', 'document_collaborators', 'document_sessions',
      'notifications'
    )
  LOOP
    v_count := v_count + 1;
  END LOOP;
  
  RAISE NOTICE '✅ Migration 023 appliquée avec succès !';
  RAISE NOTICE '   RLS activé sur 7 tables';
  RAISE NOTICE '   Policies créées : %', v_count;
  RAISE NOTICE '';
  RAISE NOTICE '   Tables sécurisées :';
  RAISE NOTICE '   - document_blocks (4 policies)';
  RAISE NOTICE '   - block_operations (3 policies)';
  RAISE NOTICE '   - block_proposals (4 policies)';
  RAISE NOTICE '   - block_comments (4 policies)';
  RAISE NOTICE '   - document_collaborators (4 policies)';
  RAISE NOTICE '   - document_sessions (4 policies)';
  RAISE NOTICE '   - notifications (4 policies)';
  RAISE NOTICE '';
  RAISE NOTICE '   Pour vérifier :';
  RAISE NOTICE '   SELECT tablename, policyname FROM pg_policies WHERE schemaname = ''public'';';
END $$;


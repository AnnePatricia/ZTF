-- =====================================================
-- MIGRATION 024: Activation Supabase Realtime
-- Description: Active Realtime sur les tables du correcteur collaboratif
-- Date: Mars 2025
-- =====================================================

-- =====================================================
-- NOTE IMPORTANTE
-- =====================================================
-- Supabase Realtime permet les mises à jour en temps réel via WebSockets.
-- Nécessite que REPLICA IDENTITY soit configuré correctement.
-- 
-- Pour activer Realtime dans Supabase Dashboard :
-- 1. Aller dans Database → Replication
-- 2. Activer les tables listées ci-dessous
-- 3. Ou utiliser l'API : /api/v1/publications

-- =====================================================
-- 1. CONFIGURER REPLICA IDENTITY
-- =====================================================

-- document_blocks : FULL pour suivre tous les changements
ALTER TABLE document_blocks REPLICA IDENTITY FULL;

-- block_operations : FULL pour le journal CRDT
ALTER TABLE block_operations REPLICA IDENTITY FULL;

-- block_proposals : FULL pour les propositions
ALTER TABLE block_proposals REPLICA IDENTITY FULL;

-- block_comments : FULL pour les commentaires
ALTER TABLE block_comments REPLICA IDENTITY FULL;

-- document_sessions : FULL pour la présence live
ALTER TABLE document_sessions REPLICA IDENTITY FULL;

-- document_collaborators : DEFAULT (id suffit)
ALTER TABLE document_collaborators REPLICA IDENTITY DEFAULT;

-- notifications : DEFAULT (id suffit)
ALTER TABLE notifications REPLICA IDENTITY DEFAULT;

-- =====================================================
-- 2. PUBLICATION REALTIME
-- =====================================================

-- Créer une publication pour le correcteur collaboratif
DROP PUBLICATION IF EXISTS supabase_realtime_collab;

CREATE PUBLICATION supabase_realtime_collab FOR TABLE
  document_blocks,
  block_operations,
  block_proposals,
  block_comments,
  document_sessions,
  document_collaborators,
  notifications;

-- =====================================================
-- 3. VÉRIFICATION
-- =====================================================

DO $$
DECLARE
  v_table TEXT;
  v_replica_identity TEXT;
BEGIN
  RAISE NOTICE '✅ Migration 024 appliquée avec succès !';
  RAISE NOTICE '   Realtime activé sur les tables suivantes :';
  RAISE NOTICE '';
  
  FOR v_table, v_replica_identity IN 
    SELECT 
      tablename,
      CASE relreplident
        WHEN 'd' THEN 'DEFAULT (primary key)'
        WHEN 'n' THEN 'NOTHING'
        WHEN 'f' THEN 'FULL (all columns)'
        WHEN 'i' THEN 'INDEX'
      END
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    JOIN pg_publication_tables pt ON pt.tablename = c.relname
    WHERE n.nspname = 'public'
    AND c.relkind = 'r'
    AND pt.pubname = 'supabase_realtime_collab'
    ORDER BY tablename
  LOOP
    RAISE NOTICE '   - % : %', v_table, v_replica_identity;
  END LOOP;
  
  RAISE NOTICE '';
  RAISE NOTICE '   Pour activer dans Supabase Dashboard :';
  RAISE NOTICE '   1. Database → Replication';
  RAISE NOTICE '   2. Source : supabase_realtime_collab';
  RAISE NOTICE '   3. Activer toutes les tables';
  RAISE NOTICE '';
  RAISE NOTICE '   OU via API :';
  RAISE NOTICE '   POST /api/v1/publications/supabase_realtime_collab/tables';
END $$;

-- =====================================================
-- 4. INSTRUCTIONS D'UTILISATION
-- =====================================================

/*
╔═══════════════════════════════════════════════════════════════════════════════╗
║                    ACTIVATION REALTIME - INSTRUCTIONS                         ║
╠═══════════════════════════════════════════════════════════════════════════════╣
║                                                                               ║
║  OPTION 1 : Via Supabase Dashboard (recommandé)                               ║
║  ─────────────────────────────────────────────────────                        ║
║                                                                               ║
║  1. Aller dans Database → Replication                                         ║
║  2. Cliquer sur "Enable Realtime"                                             ║
║  3. Sélectionner la publication : supabase_realtime_collab                    ║
║  4. Cocher toutes les tables :                                                ║
║     ☑ document_blocks                                                         ║
║     ☑ block_operations                                                        ║
║     ☑ block_proposals                                                         ║
║     ☑ block_comments                                                          ║
║     ☑ document_sessions                                                       ║
║     ☑ document_collaborators                                                  ║
║     ☑ notifications                                                           ║
║  5. Cliquer sur "Enable"                                                      ║
║                                                                               ║
║  OPTION 2 : Via API                                                           ║
║  ───────────────────────                                                      ║
║                                                                               ║
║  curl -X POST \                                                               ║
║    'https://<project-ref>.supabase.co/api/v1/publications' \                  ║
║    -H 'Authorization: Bearer <service-role-key>' \                            ║
║    -H 'apikey: <service-role-key>' \                                          ║
║    -d '{                                                                      ║
║      "name": "supabase_realtime_collab",                                      ║
║      "tables": [                                                              ║
║        {"schema": "public", "name": "document_blocks"},                       ║
║        {"schema": "public", "name": "block_operations"},                      ║
║        ...                                                                    ║
║      ]                                                                        ║
║    }'                                                                         ║
║                                                                               ║
║  OPTION 3 : Via SQL (si accès superuser)                                      ║
║  ─────────────────────────────────────                                        ║
║                                                                               ║
║  -- Déjà fait par cette migration !                                           ║
║  CREATE PUBLICATION supabase_realtime_collab FOR TABLE ...                    ║
║                                                                               ║
╚═══════════════════════════════════════════════════════════════════════════════╝
*/


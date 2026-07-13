// =====================================================
// HOOK: useOfflineSync
// Description: Synchronisation des opérations hors ligne
// =====================================================

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import { openDB, DBSchema, IDBPDatabase } from 'idb';

// =====================================================
// TYPES
// =====================================================

interface OfflineOperation {
  id: string;
  block_id: string;
  document_id: string;
  user_id: string;
  op_type: string;
  op_data: any;
  vector_clock: Record<string, number>;
  created_at: string;
  synced?: boolean;
}

interface OfflineDB extends DBSchema {
  operations: {
    key: string;
    value: OfflineOperation;
  };
}

export interface UseOfflineSyncReturn {
  isOffline: boolean;
  pendingOps: number;
  queueOperation: (op: Omit<OfflineOperation, 'id' | 'created_at'>) => Promise<void>;
  syncPendingOperations: () => Promise<number>;
  getPendingOperations: () => Promise<OfflineOperation[]>;
  clearSyncedOperations: () => Promise<void>;
}

// =====================================================
// CONSTANTES
// =====================================================

const DB_NAME = 'bcm-gest-offline';
const STORE_NAME = 'operations';
const DB_VERSION = 1;

// =====================================================
// INITIALISATION INDEXEDDB
// =====================================================

async function initDB(): Promise<IDBPDatabase<OfflineDB>> {
  return openDB<OfflineDB>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    },
  });
}

// =====================================================
// HOOK
// =====================================================

export function useOfflineSync(documentId?: string): UseOfflineSyncReturn {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [pendingOps, setPendingOps] = useState(0);

  // =====================================================
  // 1. DÉTECTER L'ÉTAT DE CONNEXION
  // =====================================================

  useEffect(() => {
    const handleOnline = () => {
      console.log('🟢 En ligne - Synchronisation...');
      setIsOffline(false);
      syncPendingOperations();
    };

    const handleOffline = () => {
      console.log('🔴 Hors ligne - Mode local activé');
      setIsOffline(true);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // =====================================================
  // 2. METTRE À JOUR LE COMPTEUR D'OPÉRATIONS EN ATTENTE
  // =====================================================

  useEffect(() => {
    const updatePendingCount = async () => {
      try {
        const db = await initDB();
        const count = await db.count(STORE_NAME);
        setPendingOps(count);
      } catch (err) {
        console.error('Erreur updatePendingCount:', err);
      }
    };

    updatePendingCount();
  }, [isOffline]);

  // =====================================================
  // 3. AJOUTER UNE OPÉRATION À LA FILE
  // =====================================================

  const queueOperation = useCallback(async (
    op: Omit<OfflineOperation, 'id' | 'created_at'>
  ) => {
    try {
      const db = await initDB();

      const operation: OfflineOperation = {
        ...op,
        id: crypto.randomUUID(),
        created_at: new Date().toISOString(),
      };

      await db.put(STORE_NAME, operation);
      console.log('📝 Opération ajoutée à la file:', operation.id);

      setPendingOps(prev => prev + 1);

      // Si on est en ligne, synchroniser immédiatement
      if (!isOffline) {
        await syncOperation(operation);
      }
    } catch (err: any) {
      console.error('Erreur queueOperation:', err);
    }
  }, [isOffline]);

  // =====================================================
  // 4. SYNCHRONISER UNE OPÉRATION
  // =====================================================

  async function syncOperation(operation: OfflineOperation): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('block_operations')
        .insert([{
          block_id: operation.block_id,
          document_id: operation.document_id,
          user_id: operation.user_id,
          op_type: operation.op_type,
          op_data: operation.op_data,
          vector_clock: operation.vector_clock,
          is_offline: false,
          synced_at: new Date().toISOString(),
          applied_at: operation.created_at,
        }]);

      if (error) throw error;

      // Supprimer de IndexedDB
      const db = await initDB();
      await db.delete(STORE_NAME, operation.id);

      console.log('✅ Opération synchronisée:', operation.id);
      return true;
    } catch (err: any) {
      console.error('❌ Échec synchronisation:', err);
      return false;
    }
  }

  // =====================================================
  // 5. SYNCHRONISER TOUTES LES OPÉRATIONS EN ATTENTE
  // =====================================================

  const syncPendingOperations = useCallback(async (): Promise<number> => {
    if (isOffline) {
      console.log('⚠️ Impossible de synchroniser (hors ligne)');
      return 0;
    }

    try {
      const db = await initDB();
      const operations = await db.getAll(STORE_NAME);

      if (operations.length === 0) {
        return 0;
      }

      console.log('🔄 Synchronisation de', operations.length, 'opérations...');

      let successCount = 0;

      for (const op of operations) {
        const success = await syncOperation(op);
        if (success) {
          successCount++;
        }
      }

      setPendingOps(prev => prev - successCount);
      console.log('✅ Synchronisation terminée:', successCount, '/', operations.length);

      return successCount;
    } catch (err: any) {
      console.error('Erreur syncPendingOperations:', err);
      return 0;
    }
  }, [isOffline]);

  // =====================================================
  // 6. OBTENIR LES OPÉRATIONS EN ATTENTE
  // =====================================================

  const getPendingOperations = useCallback(async (): Promise<OfflineOperation[]> => {
    try {
      const db = await initDB();
      return await db.getAll(STORE_NAME);
    } catch (err: any) {
      console.error('Erreur getPendingOperations:', err);
      return [];
    }
  }, []);

  // =====================================================
  // 7. SUPPRIMER LES OPÉRATIONS SYNCHRONISÉES
  // =====================================================

  const clearSyncedOperations = useCallback(async () => {
    try {
      const db = await initDB();
      const tx = db.transaction(STORE_NAME, 'readwrite');
      await tx.store.clear();
      await tx.done;

      setPendingOps(0);
      console.log('🗑️ File d\'attente vidée');
    } catch (err: any) {
      console.error('Erreur clearSyncedOperations:', err);
    }
  }, []);

  // =====================================================
  // RETOUR DU HOOK
  // =====================================================

  return {
    isOffline,
    pendingOps,
    queueOperation,
    syncPendingOperations,
    getPendingOperations,
    clearSyncedOperations,
  };
}

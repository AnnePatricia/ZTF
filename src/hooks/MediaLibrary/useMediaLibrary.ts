// src/hooks/MediaLibrary/useMediaLibrary.ts
import { useRawFiles } from './useRawFiles';
import { useTranscriptions } from './useTranscriptions';
import { useBookProjects } from './useBookProjects';
import { useProofreading } from './useProofreading';
import { useAuditLog } from './useAuditLog';
import { useEffect, useCallback } from 'react'; // ✅ Ajouter useCallback
import { supabase } from '../../supabaseClient';

export function useMediaLibrary(linkStatusFilter?: 'all' | 'linked' | 'free') {
  const rawFiles = useRawFiles(linkStatusFilter);
  const transcriptions = useTranscriptions();
  const bookProjects = useBookProjects();
  const proofreading = useProofreading();
  const auditLog = useAuditLog();

  const stats = {
    rawFilesCount: rawFiles.rawFiles.length,
    transcriptionsCount: transcriptions.transcriptions.length,
    bookProjectsCount: bookProjects.bookProjects.length,
    proofreadingV1Count: proofreading.proofreadingV1.length,
    proofreadingV2Count: proofreading.proofreadingV2.length,
    linkedFilesCount: rawFiles.rawFiles.filter((f: any) => f.is_linked).length,
    freeFilesCount: rawFiles.rawFiles.filter((f: any) => !f.is_linked).length,
    total:
      rawFiles.rawFiles.length +
      transcriptions.transcriptions.length +
      bookProjects.bookProjects.length +
      proofreading.proofreadingV1.length +
      proofreading.proofreadingV2.length,
  };

  const loading =
    rawFiles.loading ||
    transcriptions.loading ||
    bookProjects.loading ||
    proofreading.loading;

  const error =
    rawFiles.error ||
    transcriptions.error ||
    bookProjects.error ||
    proofreading.error ||
    auditLog.error;

  // ✅ MÉMOISER refreshAll pour éviter les re-créations
  const refreshAll = useCallback(() => {
    console.log('🔄 Refresh manuel déclenché');
    rawFiles.fetchRawFiles(linkStatusFilter);
    transcriptions.fetchTranscriptions();
    bookProjects.fetchBookProjects();
    proofreading.fetchProofreading();
  }, [linkStatusFilter, rawFiles.fetchRawFiles, transcriptions.fetchTranscriptions, bookProjects.fetchBookProjects, proofreading.fetchProofreading]);

  // ✅ REALTIME : Une seule subscription stable
  useEffect(() => {
    console.log('🔔 Setup Realtime pour raw_files (une seule fois)');
    
    const channel = supabase
      .channel('media_library_changes')
      .on(
        'postgres_changes',
        {
          event: '*', // INSERT, UPDATE, DELETE
          schema: 'public',
          table: 'raw_files'
        },
        (payload) => {
          console.log('📨 Changement détecté sur raw_files:', {
            eventType: payload.eventType,
            old: payload.old,
            new: payload.new,
            timestamp: new Date().toISOString()
          });
          
          // Rafraîchir les données
          rawFiles.fetchRawFiles(linkStatusFilter);
        }
      )
      .subscribe((status) => {
        console.log('📡 Statut abonnement Realtime:', status);
      });

    // Cleanup
    return () => {
      console.log('🔕 Désabonnement Realtime');
      supabase.removeChannel(channel);
    };
  }, [linkStatusFilter, rawFiles.fetchRawFiles]); // ✅ Dépendances stables

  return {
    // Données
    rawFiles: rawFiles.rawFiles,
    transcriptions: transcriptions.transcriptions,
    bookProjects: bookProjects.bookProjects,
    proofreadingV1: proofreading.proofreadingV1,
    proofreadingV2: proofreading.proofreadingV2,

    // Statistiques
    stats,

    // État
    loading,
    error,

    // Actions Raw Files
    uploadRawFile: rawFiles.uploadRawFile,
    deleteRawFile: rawFiles.deleteRawFile,

    // Actions Transcriptions
    createTranscription: transcriptions.createTranscription,
    updateTranscription: transcriptions.updateTranscription,
    linkRawFiles: transcriptions.linkRawFiles,

    // Actions Book Projects
    createBookProject: bookProjects.createBookProject,
    updateBookProject: bookProjects.updateBookProject,
    linkTranscriptions: bookProjects.linkTranscriptions,

    // Actions Proofreading
    createProofreadingV1: proofreading.createProofreadingV1,
    createProofreadingV2: proofreading.createProofreadingV2,
    updateProofreading: proofreading.updateProofreading,

    // Audit Log
    logAction: auditLog.logAction,
    getAuditLogs: auditLog.getAuditLogs,

    // Refresh
    refreshAll,
  };
}
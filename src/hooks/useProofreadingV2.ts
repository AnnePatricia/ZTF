// src/hooks/useProofreadingV2.ts
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import type { 
  ProofreadingV2Task, 
  ProofreadingV2Observation,
  ObservationType,
  ObservationSeverity,
  DigitalSignature,
  SignatureType,
  FinalArchive
} from '../types/proofreadingV2';
import { useRoles } from './useRoles';

export function useProofreadingV2() {
  const { currentUser } = useRoles();
  const [tasks, setTasks] = useState<ProofreadingV2Task[]>([]);
  const [archives, setArchives] = useState<FinalArchive[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadTasks = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error: fetchError } = await supabase
        .from('proofreading_v2_tasks')
        .select(`
          *,
          book:ztf_books(ztf_id, title, theme),
          assigned_user:ztf_users!assigned_to(id, full_name, email)
        `)
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;
      setTasks(data || []);
      setError(null);
    } catch (err: any) {
      console.error('Erreur chargement tâches:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadArchives = useCallback(async () => {
    try {
      const { data, error: fetchError } = await supabase
        .from('final_archives')
        .select(`
          *,
          book:ztf_books(ztf_id, title),
          archived_user:ztf_users!archived_by(id, full_name)
        `)
        .order('archive_date', { ascending: false });

      if (fetchError) throw fetchError;
      setArchives(data || []);
    } catch (err: any) {
      console.error('Erreur chargement archives:', err);
    }
  }, []);

  useEffect(() => {
    loadTasks();
    loadArchives();
  }, [loadTasks, loadArchives]);

  const createTask = useCallback(async (
    bookId: string,
    proofreadingV1TaskId?: string
  ): Promise<ProofreadingV2Task | null> => {
    try {
      let content = '';
      let wordCount = 0;
      let pageCount = 0;

      if (proofreadingV1TaskId) {
        const { data: v1Task } = await supabase
          .from('proofreading_v1_tasks')
          .select('content, word_count, page_count')
          .eq('id', proofreadingV1TaskId)
          .single();
        
        content = v1Task?.content || '';
        wordCount = v1Task?.word_count || 0;
        pageCount = v1Task?.page_count || 0;
      }

      const { data, error } = await supabase
        .from('proofreading_v2_tasks')
        .insert({
          book_id: bookId,
          proofreading_v1_task_id: proofreadingV1TaskId || null,
          content,
          content_html: content,
          word_count: wordCount,
          page_count: pageCount,
          status: 'pending',
          bat_status: 'pending'
        })
        .select()
        .single();

      if (error) throw error;
      await loadTasks();
      return data;
    } catch (err: any) {
      console.error('Erreur création tâche:', err);
      setError(err.message);
      return null;
    }
  }, [loadTasks]);

  const startTask = useCallback(async (taskId: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('proofreading_v2_tasks')
        .update({ status: 'in_progress' })
        .eq('id', taskId);

      if (error) throw error;
      await loadTasks();
      return true;
    } catch (err: any) {
      setError(err.message);
      return false;
    }
  }, [loadTasks]);

  const saveContent = useCallback(async (
    taskId: string,
    content: string
  ): Promise<boolean> => {
    try {
      const wordCount = content.trim().split(/\s+/).filter((w: string) => w).length;
      
      const { error } = await supabase
        .from('proofreading_v2_tasks')
        .update({
          content,
          content_html: content,
          word_count: wordCount,
          updated_at: new Date().toISOString()
        })
        .eq('id', taskId);

      if (error) throw error;
      return true;
    } catch (err: any) {
      setError(err.message);
      return false;
    }
  }, []);

  const addObservation = useCallback(async (
    taskId: string,
    observationType: ObservationType,
    severity: ObservationSeverity,
    description: string,
    pageNumber?: number
  ): Promise<boolean> => {
    if (!currentUser) return false;

    try {
      const { error } = await supabase
        .from('proofreading_v2_observations')
        .insert({
          task_id: taskId,
          user_id: currentUser.id,
          observation_type: observationType,
          severity,
          description,
          page_number: pageNumber || null
        });

      if (error) throw error;
      return true;
    } catch (err: any) {
      console.error('Erreur ajout observation:', err);
      return false;
    }
  }, [currentUser]);

  const resolveObservation = useCallback(async (
    observationId: string,
    resolutionNotes?: string
  ): Promise<boolean> => {
    if (!currentUser) return false;

    try {
      const { error } = await supabase
        .from('proofreading_v2_observations')
        .update({
          resolved: true,
          resolved_by: currentUser.id,
          resolved_at: new Date().toISOString(),
          resolution_notes: resolutionNotes || null
        })
        .eq('id', observationId);

      if (error) throw error;
      return true;
    } catch (err: any) {
      return false;
    }
  }, [currentUser]);

  const loadObservations = useCallback(async (
    taskId: string
  ): Promise<ProofreadingV2Observation[]> => {
    try {
      const { data, error } = await supabase
        .from('proofreading_v2_observations')
        .select('*, user:ztf_users(id, full_name)')
        .eq('task_id', taskId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data || [];
    } catch (err) {
      return [];
    }
  }, []);

  const submitForBat = useCallback(async (
    taskId: string,
    notes?: string
  ): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('proofreading_v2_tasks')
        .update({
          status: 'bat_pending',
          bat_status: 'submitted',
          bat_notes: notes || null,
          bat_submitted_at: new Date().toISOString()
        })
        .eq('id', taskId);

      if (error) throw error;
      await loadTasks();
      return true;
    } catch (err: any) {
      setError(err.message);
      return false;
    }
  }, [loadTasks]);

  const validateBat = useCallback(async (
    taskId: string,
    decision: 'approve' | 'reject' | 'request_changes',
    notes?: string
  ): Promise<boolean> => {
    if (!currentUser) return false;

    try {
      const newBatStatus = decision === 'approve' ? 'bat_validated' : 
                          decision === 'reject' ? 'bat_rejected' : 'bat_pending';
      const newStatus = decision === 'approve' ? 'bat_validated' : 
                       decision === 'reject' ? 'bat_rejected' : 'bat_pending';

      const { error } = await supabase
        .from('proofreading_v2_tasks')
        .update({
          bat_status: newBatStatus,
          status: newStatus,
          bat_validated_at: new Date().toISOString(),
          bat_validated_by: currentUser.id,
          rejection_reason: decision === 'reject' ? notes : null
        })
        .eq('id', taskId);

      if (error) throw error;

      await supabase
        .from('bat_validations')
        .insert({
          task_id: taskId,
          user_id: currentUser.id,
          action: 'validate',
          decision,
          notes: notes || null
        });

      await loadTasks();
      return true;
    } catch (err: any) {
      return false;
    }
  }, [currentUser, loadTasks]);

  const addSignature = useCallback(async (
    taskId: string,
    signatureType: SignatureType,
    signatureData: string,
    signatureImageUrl?: string
  ): Promise<DigitalSignature | null> => {
    if (!currentUser) return null;

    try {
      const { data, error } = await supabase
        .from('digital_signatures')
        .insert({
          task_id: taskId,
          user_id: currentUser.id,
          signature_type: signatureType,
          signature_data: signatureData,
          signature_image_url: signatureImageUrl || null,
          ip_address: window.location.hostname,
          user_agent: navigator.userAgent
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (err: any) {
      console.error('Erreur signature:', err);
      return null;
    }
  }, [currentUser]);

  const loadSignatures = useCallback(async (
    taskId: string
  ): Promise<DigitalSignature[]> => {
    try {
      const { data, error } = await supabase
        .from('digital_signatures')
        .select('*, user:ztf_users(id, full_name)')
        .eq('task_id', taskId)
        .order('signed_at', { ascending: true });

      if (error) throw error;
      return data || [];
    } catch (err) {
      return [];
    }
  }, []);

  const archiveTask = useCallback(async (
    taskId: string,
    finalPdfUrl?: string,
    finalPdfPath?: string,
    notes?: string
  ): Promise<FinalArchive | null> => {
    if (!currentUser) return null;

    try {
      const { data: task } = await supabase
        .from('proofreading_v2_tasks')
        .select('book_id')
        .eq('id', taskId)
        .single();

      if (!task) return null;

      const { data, error } = await supabase
        .from('final_archives')
        .insert({
          book_id: task.book_id,
          proofreading_v2_task_id: taskId,
          archive_date: new Date().toISOString(),
          archived_by: currentUser.id,
          final_pdf_url: finalPdfUrl || null,
          final_pdf_storage_path: finalPdfPath || null,
          archive_status: 'archived',
          retention_years: 10,
          notes: notes || null,
          metadata: {
            archived_at: new Date().toISOString(),
            archived_by: currentUser.id
          }
        })
        .select(`
          *,
          book:ztf_books(ztf_id, title),
          archived_user:ztf_users!archived_by(id, full_name)
        `)
        .single();

      if (error) throw error;

      // Mettre à jour le statut de la tâche
      await supabase
        .from('proofreading_v2_tasks')
        .update({ status: 'archived' })
        .eq('id', taskId);

      await Promise.all([loadTasks(), loadArchives()]);
      return data;
    } catch (err: any) {
      console.error('Erreur archivage:', err);
      return null;
    }
  }, [currentUser, loadTasks, loadArchives]);

  const deleteTask = useCallback(async (taskId: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('proofreading_v2_tasks')
        .delete()
        .eq('id', taskId);

      if (error) throw error;
      await loadTasks();
      return true;
    } catch (err: any) {
      return false;
    }
  }, [loadTasks]);

  return {
    tasks,
    archives,
    loading,
    error,
    refresh: loadTasks,
    createTask,
    startTask,
    saveContent,
    addObservation,
    resolveObservation,
    loadObservations,
    submitForBat,
    validateBat,
    addSignature,
    loadSignatures,
    archiveTask,
    deleteTask,
  };
}
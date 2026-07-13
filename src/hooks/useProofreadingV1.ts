// src/hooks/useProofreadingV1.ts
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import type { 
  ProofreadingV1Task, 
  ResidualError, 
  ResidualErrorType,
  ResidualErrorSeverity
} from '../types/proofreadingV1';
import { useRoles } from './useRoles';

export function useProofreadingV1() {
  const { currentUser } = useRoles();
  const [tasks, setTasks] = useState<ProofreadingV1Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadTasks = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error: fetchError } = await supabase
        .from('proofreading_v1_tasks')
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

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  const createTask = useCallback(async (
    bookId: string,
    superCorrectionTaskId?: string,
    planId?: string
  ): Promise<ProofreadingV1Task | null> => {
    try {
      let content = '';
      
      if (planId) {
        const { data: plan } = await supabase
          .from('editorial_plans')
          .select('title')
          .eq('id', planId)
          .single();
        content = `<h1>${plan?.title || 'Plan éditorial'}</h1><p>Contenu assemblé...</p>`;
      } else if (superCorrectionTaskId) {
        const { data: scTask } = await supabase
          .from('super_correction_tasks')
          .select('content')
          .eq('id', superCorrectionTaskId)
          .single();
        content = scTask?.content || '';
      } else {
        const { data: cleaningTask } = await supabase
          .from('cleaning_tasks')
          .select('cleaned_content')
          .eq('book_id', bookId)
          .eq('status', 'verified')
          .single();
        content = cleaningTask?.cleaned_content || '';
      }

      const wordCount = content.trim().split(/\s+/).filter((w: string) => w).length;
      const pageCount = Math.ceil(wordCount / 300);

      const { data, error } = await supabase
        .from('proofreading_v1_tasks')
        .insert({
          book_id: bookId,
          super_correction_task_id: superCorrectionTaskId || null,
          plan_id: planId || null,
          content,
          content_html: content,
          word_count: wordCount,
          page_count: pageCount,
          status: 'pending',
          validation_count: 0,
          max_validations: 2,
          is_locked: false,
          residual_errors_count: 0
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
        .from('proofreading_v1_tasks')
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
      const pageCount = Math.ceil(wordCount / 300);
      
      const { error } = await supabase
        .from('proofreading_v1_tasks')
        .update({
          content,
          content_html: content,
          word_count: wordCount,
          page_count: pageCount,
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

  const addResidualError = useCallback(async (
    taskId: string,
    errorType: ResidualErrorType,
    severity: ResidualErrorSeverity,
    description: string,
    originalText?: string,
    correctedText?: string,
    pageNumber?: number,
    paragraphNumber?: number
  ): Promise<boolean> => {
    if (!currentUser) return false;

    try {
      const { error } = await supabase
        .from('residual_errors')
        .insert({
          task_id: taskId,
          user_id: currentUser.id,
          error_type: errorType,
          severity,
          description,
          original_text: originalText || null,
          corrected_text: correctedText || null,
          page_number: pageNumber || null,
          paragraph_number: paragraphNumber || null
        });

      if (error) throw error;

      // Incrémenter le compteur
      const { count } = await supabase
        .from('residual_errors')
        .select('*', { count: 'exact', head: true })
        .eq('task_id', taskId);

      await supabase
        .from('proofreading_v1_tasks')
        .update({ residual_errors_count: count || 0 })
        .eq('id', taskId);

      return true;
    } catch (err: any) {
      console.error('Erreur ajout erreur:', err);
      setError(err.message);
      return false;
    }
  }, [currentUser]);

  const resolveError = useCallback(async (
    errorId: string,
    resolutionNotes?: string
  ): Promise<boolean> => {
    if (!currentUser) return false;

    try {
      const { error } = await supabase
        .from('residual_errors')
        .update({
          resolved: true,
          resolved_by: currentUser.id,
          resolved_at: new Date().toISOString(),
          resolution_notes: resolutionNotes || null
        })
        .eq('id', errorId);

      if (error) throw error;
      return true;
    } catch (err: any) {
      return false;
    }
  }, [currentUser]);

  const loadErrors = useCallback(async (
    taskId: string
  ): Promise<ResidualError[]> => {
    try {
      const { data, error } = await supabase
        .from('residual_errors')
        .select('*, user:ztf_users(id, full_name)')
        .eq('task_id', taskId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data || [];
    } catch (err) {
      return [];
    }
  }, []);

  const submitForValidation = useCallback(async (
    taskId: string,
    notes?: string
  ): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('proofreading_v1_tasks')
        .update({
          status: 'submitted',
          submitted_at: new Date().toISOString(),
          notes: notes || null
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

  const validateTask = useCallback(async (
    taskId: string,
    notes?: string
  ): Promise<{ success: boolean; locked?: boolean; error?: string }> => {
    if (!currentUser) return { success: false, error: 'Non authentifié' };

    try {
      const { data: task } = await supabase
        .from('proofreading_v1_tasks')
        .select('validation_count, max_validations')
        .eq('id', taskId)
        .single();

      if (!task) return { success: false, error: 'Tâche non trouvée' };

      const { count: errorCount } = await supabase
        .from('residual_errors')
        .select('*', { count: 'exact', head: true })
        .eq('task_id', taskId);

      const { count: resolvedCount } = await supabase
        .from('residual_errors')
        .select('*', { count: 'exact', head: true })
        .eq('task_id', taskId)
        .eq('resolved', true);

      const { error } = await supabase
        .from('proofreading_v1_validations')
        .insert({
          task_id: taskId,
          user_id: currentUser.id,
          action: 'validate',
          error_count: errorCount || 0,
          resolved_count: resolvedCount || 0,
          notes: notes || null
        });

      if (error) throw error;

      const willLock = (task.validation_count + 1) >= task.max_validations;
      
      if (willLock) {
        await supabase
          .from('proofreading_v1_tasks')
          .update({ status: 'verified' })
          .eq('id', taskId);
      }

      await loadTasks();
      return { success: true, locked: willLock };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }, [currentUser, loadTasks]);

  const rejectTask = useCallback(async (
    taskId: string,
    reason: string
  ): Promise<boolean> => {
    if (!currentUser) return false;

    try {
      await supabase
        .from('proofreading_v1_validations')
        .insert({
          task_id: taskId,
          user_id: currentUser.id,
          action: 'reject',
          notes: reason
        });

      const { error } = await supabase
        .from('proofreading_v1_tasks')
        .update({
          status: 'rejected',
          rejection_reason: reason
        })
        .eq('id', taskId);

      if (error) throw error;
      await loadTasks();
      return true;
    } catch (err: any) {
      setError(err.message);
      return false;
    }
  }, [currentUser, loadTasks]);

  const deleteTask = useCallback(async (taskId: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('proofreading_v1_tasks')
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
    loading,
    error,
    refresh: loadTasks,
    createTask,
    startTask,
    saveContent,
    addResidualError,
    resolveError,
    loadErrors,
    submitForValidation,
    validateTask,
    rejectTask,
    deleteTask,
  };
}
// src/hooks/useCleaning.ts
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import type { CleaningTask, CleaningAnnotation, AnnotationType } from '../types/cleaning';
import { DEFAULT_CLEANING_CHECKLIST } from '../types/cleaning';
import { useRoles } from './useRoles';

export function useCleaning() {
  const { currentUser } = useRoles();
  const [tasks, setTasks] = useState<CleaningTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadTasks = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error: fetchError } = await supabase
        .from('cleaning_tasks')
        .select(`
          *,
          book:ztf_books(ztf_id, title, theme, language),
          assigned_user:ztf_users!assigned_to(id, full_name, email)
        `)
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;
      setTasks(data || []);
      setError(null);
    } catch (err: any) {
      console.error('Erreur chargement tâches nettoyage:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  // Créer une tâche de nettoyage depuis une transcription vérifiée
  const createCleaningTask = useCallback(async (
    bookId: string,
    sourceTaskId?: string
  ): Promise<CleaningTask | null> => {
    try {
      // Récupérer le contenu de la transcription source
      let originalContent = '';
      if (sourceTaskId) {
        const { data: source } = await supabase
          .from('transcription_tasks')
          .select('transcription_content')
          .eq('id', sourceTaskId)
          .single();
        originalContent = source?.transcription_content || '';
      }

      const wordCount = originalContent.trim().split(/\s+/).filter(w => w).length;

      const { data, error } = await supabase
        .from('cleaning_tasks')
        .insert({
          book_id: bookId,
          source_task_id: sourceTaskId || null,
          original_content: originalContent,
          word_count_original: wordCount,
          checklist: DEFAULT_CLEANING_CHECKLIST,
          status: 'pending'
        })
        .select()
        .single();

      if (error) throw error;
      await loadTasks();
      return data;
    } catch (err: any) {
      console.error('Erreur création tâche nettoyage:', err);
      setError(err.message);
      return null;
    }
  }, [loadTasks]);

  // Démarrer le nettoyage
  const startCleaning = useCallback(async (taskId: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('cleaning_tasks')
        .update({ status: 'in_progress' })
        .eq('id', taskId);

      if (error) throw error;
      await loadTasks();
      return true;
    } catch (err: any) {
      console.error('Erreur démarrage nettoyage:', err);
      setError(err.message);
      return false;
    }
  }, [loadTasks]);

  // Sauvegarder le contenu nettoyé
  const saveCleaning = useCallback(async (
    taskId: string,
    content: string,
    autoSave: boolean = false
  ): Promise<boolean> => {
    try {
      const wordCount = content.trim().split(/\s+/).filter(w => w).length;
      
      const { error: taskError } = await supabase
        .from('cleaning_tasks')
        .update({
          cleaned_content: content,
          word_count_cleaned: wordCount,
          updated_at: new Date().toISOString()
        })
        .eq('id', taskId);

      if (taskError) throw taskError;

      if (autoSave) {
        await supabase.from('cleaning_drafts').insert({
          task_id: taskId,
          content,
          word_count: wordCount,
          auto_saved: true
        });
      }

      return true;
    } catch (err: any) {
      console.error('Erreur sauvegarde nettoyage:', err);
      setError(err.message);
      return false;
    }
  }, []);

  // Mettre à jour la checklist
  const updateChecklist = useCallback(async (
    taskId: string,
    checklist: any[]
  ): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('cleaning_tasks')
        .update({ checklist })
        .eq('id', taskId);

      if (error) throw error;
      await loadTasks();
      return true;
    } catch (err: any) {
      console.error('Erreur mise à jour checklist:', err);
      return false;
    }
  }, [loadTasks]);

  // Ajouter une annotation
  const addAnnotation = useCallback(async (
    taskId: string,
    type: AnnotationType,
    content: string,
    originalText?: string,
    suggestedCorrection?: string
  ): Promise<boolean> => {
    if (!currentUser) return false;

    try {
      const { error } = await supabase
        .from('cleaning_annotations')
        .insert({
          task_id: taskId,
          user_id: currentUser.id,
          type,
          content,
          original_text: originalText || null,
          suggested_correction: suggestedCorrection || null
        });

      if (error) throw error;

      // Incrémenter le compteur
      await supabase
        .from('cleaning_tasks')
        .update({ annotations_count: supabase.rpc('increment', { count: 1 }) })
        .eq('id', taskId);

      return true;
    } catch (err: any) {
      console.error('Erreur ajout annotation:', err);
      setError(err.message);
      return false;
    }
  }, [currentUser]);

  // Résoudre une annotation
  const resolveAnnotation = useCallback(async (
    annotationId: string
  ): Promise<boolean> => {
    if (!currentUser) return false;

    try {
      const { error } = await supabase
        .from('cleaning_annotations')
        .update({
          resolved: true,
          resolved_by: currentUser.id,
          resolved_at: new Date().toISOString()
        })
        .eq('id', annotationId);

      if (error) throw error;
      return true;
    } catch (err: any) {
      console.error('Erreur résolution annotation:', err);
      return false;
    }
  }, [currentUser]);

  // Charger les annotations d'une tâche
  const loadAnnotations = useCallback(async (
    taskId: string
  ): Promise<CleaningAnnotation[]> => {
    try {
      const { data, error } = await supabase
        .from('cleaning_annotations')
        .select('*, user:ztf_users(full_name)')
        .eq('task_id', taskId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data || [];
    } catch (err) {
      return [];
    }
  }, []);

  // Soumettre pour validation
  const submitForVerification = useCallback(async (
    taskId: string,
    notes?: string
  ): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('cleaning_tasks')
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
      console.error('Erreur soumission:', err);
      setError(err.message);
      return false;
    }
  }, [loadTasks]);

  // Valider le nettoyage
  const verifyCleaning = useCallback(async (
    taskId: string
  ): Promise<{ success: boolean; error?: string }> => {
    if (!currentUser) return { success: false, error: 'Non authentifié' };

    try {
      const { data: task } = await supabase
        .from('cleaning_tasks')
        .select('assigned_to')
        .eq('id', taskId)
        .single();

      if (task?.assigned_to === currentUser.id) {
        return { success: false, error: '❌ Un nettoyeur ne peut pas valider son propre travail' };
      }

      const { error } = await supabase
        .from('cleaning_tasks')
        .update({
          status: 'verified',
          verified_by: currentUser.id,
          verified_at: new Date().toISOString()
        })
        .eq('id', taskId);

      if (error) throw error;

      // Mettre à jour le livre
      const { data: taskWithBook } = await supabase
        .from('cleaning_tasks')
        .select('book_id')
        .eq('id', taskId)
        .single();

      if (taskWithBook) {
        await supabase
          .from('ztf_books')
          .update({
            status: 'CLEANED',
            current_department: 'D4',
            updated_at: new Date().toISOString()
          })
          .eq('id', taskWithBook.book_id);
      }

      await loadTasks();
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }, [currentUser, loadTasks]);

  // Rejeter
  const rejectCleaning = useCallback(async (
    taskId: string,
    reason: string
  ): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('cleaning_tasks')
        .update({
          status: 'rejected',
          rejection_reason: reason
        })
        .eq('id', taskId);

      if (error) throw error;
      await loadTasks();
      return true;
    } catch (err: any) {
      console.error('Erreur rejet:', err);
      return false;
    }
  }, [loadTasks]);

  // Supprimer une tâche
  const deleteTask = useCallback(async (taskId: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('cleaning_tasks')
        .delete()
        .eq('id', taskId);

      if (error) throw error;
      await loadTasks();
      return true;
    } catch (err: any) {
      console.error('Erreur suppression:', err);
      return false;
    }
  }, [loadTasks]);

  return {
    tasks,
    loading,
    error,
    refresh: loadTasks,
    createCleaningTask,
    startCleaning,
    saveCleaning,
    updateChecklist,
    addAnnotation,
    resolveAnnotation,
    loadAnnotations,
    submitForVerification,
    verifyCleaning,
    rejectCleaning,
    deleteTask,
  };
}
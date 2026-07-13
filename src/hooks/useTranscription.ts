// src/hooks/useTranscription.ts
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import type { TranscriptionTask } from '../types/transcription';
import { useRoles } from './useRoles';

export function useTranscription() {
    const { currentUser } = useRoles();
    const [tasks, setTasks] = useState<TranscriptionTask[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Charger toutes les tâches de transcription
    const loadTasks = useCallback(async () => {
        try {
            setLoading(true);
            const { data, error: fetchError } = await supabase
                .from('transcription_tasks')
                .select(`
          *,
          book:ztf_books(ztf_id, title, theme, language),
          assigned_user:ztf_users!assigned_to(id, full_name, email),
          verified_user:ztf_users!verified_by(id, full_name, email)
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

    // Créer une nouvelle tâche de transcription
    const createTask = useCallback(async (
        bookId: string,
        level: 1 | 2 = 1,
        assignedTo?: string
    ): Promise<TranscriptionTask | null> => {
        try {
            const { data, error } = await supabase
                .from('transcription_tasks')
                .insert({
                    book_id: bookId,
                    transcription_level: level,
                    assigned_to: assignedTo || null,
                    status: assignedTo ? 'pending' : 'pending',
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

    // Assigner une tâche à un transcripteur
    const assignTask = useCallback(async (
        taskId: string,
        userId: string
    ): Promise<boolean> => {
        try {
            const { error } = await supabase
                .from('transcription_tasks')
                .update({
                    assigned_to: userId,
                    status: 'pending'
                })
                .eq('id', taskId);

            if (error) throw error;
            await loadTasks();
            return true;
        } catch (err: any) {
            console.error('Erreur assignation:', err);
            setError(err.message);
            return false;
        }
    }, [loadTasks]);

    // Démarrer la transcription
    const startTranscription = useCallback(async (taskId: string): Promise<boolean> => {
        try {
            const { error } = await supabase
                .from('transcription_tasks')
                .update({ status: 'in_progress' })
                .eq('id', taskId);

            if (error) throw error;
            await loadTasks();
            return true;
        } catch (err: any) {
            console.error('Erreur démarrage:', err);
            setError(err.message);
            return false;
        }
    }, [loadTasks]);

    // Sauvegarder le contenu (avec auto-save)
    const saveTranscription = useCallback(async (
        taskId: string,
        content: string,
        autoSave: boolean = false
    ): Promise<boolean> => {
        try {
            const wordCount = content.trim().split(/\s+/).filter(w => w).length;

            // Mise à jour de la tâche principale
            const { error: taskError } = await supabase
                .from('transcription_tasks')
                .update({
                    transcription_content: content,
                    word_count: wordCount,
                    updated_at: new Date().toISOString()
                })
                .eq('id', taskId);

            if (taskError) throw taskError;

            // Sauvegarde du brouillon si auto-save
            if (autoSave) {
                await supabase.from('transcription_drafts').insert({
                    task_id: taskId,
                    content,
                    word_count: wordCount,
                    auto_saved: true
                });
            }

            return true;
        } catch (err: any) {
            console.error('Erreur sauvegarde:', err);
            setError(err.message);
            return false;
        }
    }, []);

    // Soumettre pour validation
    const submitForVerification = useCallback(async (
        taskId: string,
        aiUsed: boolean,
        aiPercentage: number,
        humanRevisionDone: boolean,
        notes?: string
    ): Promise<boolean> => {
        // Règle métier : la sortie IA ne peut jamais être publiée directement
        if (aiUsed && !humanRevisionDone) {
            setError('❌ Une révision humaine est obligatoire lorsque l\'IA a été utilisée');
            return false;
        }

        try {
            const { error } = await supabase
                .from('transcription_tasks')
                .update({
                    status: 'submitted',
                    submitted_at: new Date().toISOString(),
                    ai_used: aiUsed,
                    ai_percentage: aiPercentage,
                    human_revision_done: humanRevisionDone,
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

    // Valider la transcription (vérificateur/chef uniquement)
    const verifyTranscription = useCallback(async (
        taskId: string
    ): Promise<{ success: boolean; error?: string }> => {
        if (!currentUser) {
            return { success: false, error: 'Non authentifié' };
        }

        try {
            // Récupérer la tâche pour vérifier les règles métier
            const { data: task } = await supabase
                .from('transcription_tasks')
                .select('assigned_to')
                .eq('id', taskId)
                .single();

            // Règle métier : un transcripteur ne peut pas valider sa propre transcription
            if (task?.assigned_to === currentUser.id) {
                return {
                    success: false,
                    error: '❌ Un transcripteur ne peut pas valider sa propre transcription'
                };
            }

            // Mettre à jour la tâche
            const { error } = await supabase
                .from('transcription_tasks')
                .update({
                    status: 'verified',
                    verified_by: currentUser.id,
                    verified_at: new Date().toISOString()
                })
                .eq('id', taskId);

            if (error) throw error;

            // Mettre à jour le statut du livre à TRANSCRIBED (15%)
            const { data: taskWithBook } = await supabase
                .from('transcription_tasks')
                .select('book_id')
                .eq('id', taskId)
                .single();

            if (taskWithBook) {
                await supabase
                    .from('ztf_books')
                    .update({
                        status: 'TRANSCRIBED',
                        current_department: 'D3',
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', taskWithBook.book_id);
            }

            await loadTasks();
            return { success: true };
        } catch (err: any) {
            console.error('Erreur validation:', err);
            return { success: false, error: err.message };
        }
    }, [currentUser, loadTasks]);

    // Rejeter la transcription (retour au transcripteur)
    const rejectTranscription = useCallback(async (
        taskId: string,
        reason: string
    ): Promise<boolean> => {
        try {
            const { error } = await supabase
                .from('transcription_tasks')
                .update({
                    status: 'rejected',
                    rejection_reason: reason,
                    verified_at: new Date().toISOString()
                })
                .eq('id', taskId);

            if (error) throw error;
            await loadTasks();
            return true;
        } catch (err: any) {
            console.error('Erreur rejet:', err);
            setError(err.message);
            return false;
        }
    }, [loadTasks]);

    // Charger le dernier brouillon
    const loadLatestDraft = useCallback(async (taskId: string): Promise<any | null> => {
        try {
            const { data, error } = await supabase
                .from('transcription_drafts')
                .select('*')
                .eq('task_id', taskId)
                .order('created_at', { ascending: false })
                .limit(1)
                .single();

            if (error) return null;
            return data;
        } catch (err) {
            return null;
        }
    }, []);

    // Fonction utilitaire pour filtrer par statut (utilisée dans le composant)
    const getTasksByStatus = useCallback((status: string): TranscriptionTask[] => {
        return tasks.filter(task => task.status === status);
    }, [tasks]);

    // src/hooks/useTranscription.ts

    // Ajouter cette fonction (vers la ligne 200, avant le return)
    const deleteTask = useCallback(async (taskId: string): Promise<boolean> => {
        try {
            const { error } = await supabase
                .from('transcription_tasks')
                .delete()
                .eq('id', taskId);

            if (error) throw error;
            await loadTasks();
            return true;
        } catch (err: any) {
            console.error('Erreur suppression tâche:', err);
            setError(err.message);
            return false;
        }
    }, [loadTasks]);

    return {
        tasks,
        loading,
        error,
        refresh: loadTasks,
        createTask,
        assignTask,
        startTranscription,
        saveTranscription,
        submitForVerification,
        verifyTranscription,
        rejectTranscription,
        loadLatestDraft,
        getTasksByStatus, // ✅ Exporté pour utilisation dans les composants
        deleteTask,
    };
}


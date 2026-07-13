// src/hooks/useAnalysis.ts
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';

export interface AnalysisTask {
    id: string;
    book_id: string | null;  // Pour documents
    audio_file_id: string | null;  // ✅ NOUVEAU : Pour fichiers audio
    assigned_to: string | null;
    status: 'pending' | 'in_progress' | 'validated' | 'rejected';

    // Métriques pour documents
    quality_score: number | null;
    content_length: number | null;
    word_count: number | null;
    has_tables: boolean;
    has_images: boolean;
    has_special_chars: boolean;

    // ✅ NOUVEAU : Métriques pour audio
    audio_duration: string | null;  // Format ISO 8601
    audio_quality: string | null;   // 'excellent', 'good', 'fair', 'poor'
    speaker_count: number | null;
    has_background_noise: boolean;

    analyst_notes: string | null;
    rejection_reason: string | null;
    analyzed_at: string | null;
    created_at: string;
    updated_at: string;

    // Relations
    book?: {
        id: string;
        ztf_id: string;
        title: string;
        raw_file_id?: string;
    };
    audio_file?: {  // ✅ NOUVEAU
        id: string;
        file_name: string;
        file_type: string;
        file_url?: string;
    };
    assigned_user?: {
        id: string;
        full_name: string;
        email: string;
    };
}

export function useAnalysis() {
    const [tasks, setTasks] = useState<AnalysisTask[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchTasks = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);

            const { data, error: fetchError } = await supabase
                .from('analysis_tasks')
                .select(`
          *,
          book:ztf_books(id, ztf_id, title, raw_file_id),
          assigned_user:ztf_users!assigned_to(id, full_name, email)
        `)
                .order('created_at', { ascending: false });

            if (fetchError) throw fetchError;
            setTasks(data || []);
        } catch (err: any) {
            console.error('Erreur chargement analysis_tasks:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchTasks();
    }, [fetchTasks]);

    const createTask = async (bookId: string) => {
        const { data, error } = await supabase
            .from('analysis_tasks')
            .insert({ book_id: bookId, status: 'pending' })
            .select()
            .single();

        if (error) throw error;
        await fetchTasks();
        return data;
    };

    const startAnalysis = async (taskId: string, userId: string) => {
        const { error } = await supabase
            .from('analysis_tasks')
            .update({
                status: 'in_progress',
                assigned_to: userId,
                updated_at: new Date().toISOString()
            })
            .eq('id', taskId);

        if (error) throw error;
        await fetchTasks();
    };

    const validateAnalysis = async (
        taskId: string,
        qualityScore: number,
        notes: string,
        metrics: {
            content_length: number;
            word_count: number;
            has_tables: boolean;
            has_images: boolean;
            has_special_chars: boolean;
        }
    ) => {
        const { error } = await supabase
            .from('analysis_tasks')
            .update({
                status: 'validated',
                quality_score: qualityScore,
                analyst_notes: notes,
                analyzed_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
                ...metrics
            })
            .eq('id', taskId);

        if (error) throw error;

        // Mettre à jour le statut du livre pour qu'il soit prêt pour D2
        const { data: task } = await supabase
            .from('analysis_tasks')
            .select('book_id')
            .eq('id', taskId)
            .single();

        if (task) {
            await supabase
                .from('ztf_books')
                .update({ status: 'READY_FOR_TRANSCRIPTION', updated_at: new Date().toISOString() })
                .eq('id', task.book_id);
        }

        await fetchTasks();
    };

    const rejectAnalysis = async (taskId: string, reason: string) => {
        const { error } = await supabase
            .from('analysis_tasks')
            .update({
                status: 'rejected',
                rejection_reason: reason,
                analyzed_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            })
            .eq('id', taskId);

        if (error) throw error;
        await fetchTasks();
    };

    const deleteTask = async (taskId: string) => {
        const { error } = await supabase
            .from('analysis_tasks')
            .delete()
            .eq('id', taskId);

        if (error) throw error;
        await fetchTasks();
    };

    return {
        tasks,
        loading,
        error,
        refresh: fetchTasks,
        createTask,
        startAnalysis,
        validateAnalysis,
        rejectAnalysis,
        deleteTask
    };
}
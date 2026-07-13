import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../supabaseClient';
import type { DocumentStatus, WorkflowStep } from '../../components/Documents/document';

export interface BookProject {
  id: string;
  title: string;
  content?: string;
  status: DocumentStatus;
  workflow_step: WorkflowStep;
  progress: number;
  author?: string;
  publisher?: string;
  publication_year?: number;
  isbn?: string;
  volume_number?: number;
  chapter_count?: number;
  tags: string[];
  metadata: Record<string, any>;
  assigned_to?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
  is_deleted: boolean;
  transcriptions?: any[];
  proofreading_v1?: any;
  proofreading_v2?: any;
}

export function useBookProjects() {
  const [bookProjects, setBookProjects] = useState<BookProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchBookProjects = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      // ✅ CORRECTION : Une seule jointure pour proofreading_v1
      const { data, error } = await supabase
        .from('book_projects')
        .select(`
          *,
          transcriptions:book_project_transcriptions (
            transcription_id,
            order_index,
            transcriptions:transcriptions (*)
          ),
          proofreading_v1:proofreading_v1 (
            *,
            proofreading_v2:proofreading_v2 (*)
          )
        `)
        .eq('is_deleted', false)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      const transformed = data?.map((bp: any) => ({
        ...bp,
        transcriptions: bp.transcriptions?.map((t: any) => ({
          ...t.transcriptions,
          order_index: t.order_index,
        })) || [],
        proofreading_v1: bp.proofreading_v1?.[0] || null,
        proofreading_v2: bp.proofreading_v1?.[0]?.proofreading_v2?.[0] || null,
      })) || [];
      
      setBookProjects(transformed);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const createBookProject = useCallback(async (data: Partial<BookProject>) => {
    try {
      const user = await supabase.auth.getUser();
      
      const { data: dbData, error } = await supabase
        .from('book_projects')
        .insert({
          title: data.title,
          content: data.content,
          status: data.status || 'book_project',
          workflow_step: data.workflow_step || 3,
          progress: data.progress || 60,
          author: data.author,
          publisher: data.publisher,
          publication_year: data.publication_year,
          isbn: data.isbn,
          volume_number: data.volume_number,
          chapter_count: data.chapter_count,
          tags: data.tags || [],
          metadata: data.metadata || {},
          assigned_to: data.assigned_to,
          created_by: user.data.user?.id,
        })
        .select()
        .single();
      
      if (error) throw error;
      
      setBookProjects(prev => [dbData, ...prev]);
      
      return dbData;
    } catch (err: any) {
      setError(err.message);
      return null;
    }
  }, []);

  const updateBookProject = useCallback(async (id: string, updates: Partial<BookProject>) => {
    try {
      const { error } = await supabase
        .from('book_projects')
        .update(updates)
        .eq('id', id);
      
      if (error) throw error;
      
      setBookProjects(prev => prev.map(bp => bp.id === id ? { ...bp, ...updates } : bp));
      
      return true;
    } catch (err: any) {
      setError(err.message);
      return false;
    }
  }, []);

  const linkTranscriptions = useCallback(async (
    bookProjectId: string,
    transcriptionIds: string[]
  ): Promise<boolean> => {
    try {
      const user = await supabase.auth.getUser();
      
      const links = transcriptionIds.map((id, index) => ({
        book_project_id: bookProjectId,
        transcription_id: id,
        order_index: index,
        linked_by: user.data.user?.id,
      }));
      
      const { error } = await supabase
        .from('book_project_transcriptions')
        .insert(links);
      
      if (error) throw error;
      
      return true;
    } catch (err: any) {
      setError(err.message);
      return false;
    }
  }, []);

  useEffect(() => {
    fetchBookProjects();
  }, [fetchBookProjects]);

  return {
    bookProjects,
    loading,
    error,
    fetchBookProjects,
    createBookProject,
    updateBookProject,
    linkTranscriptions,
  };
}
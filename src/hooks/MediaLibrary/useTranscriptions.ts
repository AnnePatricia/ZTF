import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../supabaseClient';
import type { DocumentStatus, WorkflowStep } from '../../components/Documents/document';

export interface Transcription {
  id: string;
  title: string;
  content?: string;
  status: DocumentStatus;
  workflow_step: WorkflowStep;
  progress: number;
  assigned_to?: string;
  tags: string[];
  metadata: Record<string, any>;
  source?: string;
  language: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
  is_deleted: boolean;
  deleted_at?: string;
  deleted_by?: string;
  raw_files?: any[];
}

export interface UseTranscriptionsReturn {
  transcriptions: Transcription[];
  loading: boolean;
  error: string | null;
  fetchTranscriptions: () => Promise<void>;
  createTranscription: (data: Partial<Transcription>) => Promise<Transcription | null>;
  updateTranscription: (id: string, updates: Partial<Transcription>) => Promise<boolean>;
  deleteTranscription: (id: string) => Promise<boolean>;
  linkRawFiles: (transcriptionId: string, rawFileIds: string[]) => Promise<boolean>;
  getTranscriptionWithFiles: (id: string) => Promise<Transcription | null>;
}

export function useTranscriptions(): UseTranscriptionsReturn {
  const [transcriptions, setTranscriptions] = useState<Transcription[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTranscriptions = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const { data, error } = await supabase
        .from('transcriptions')
        .select(`
          *,
          raw_files:transcription_raw_files (
            raw_file_id,
            raw_files:raw_files (*)
          )
        `)
        .eq('is_deleted', false)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      const transformed = data?.map((t: any) => ({
        ...t,
        raw_files: t.raw_files?.map((rf: any) => rf.raw_files) || [],
      })) || [];
      
      setTranscriptions(transformed);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const createTranscription = useCallback(async (
    data: Partial<Transcription>
  ): Promise<Transcription | null> => {
    try {
      const user = await supabase.auth.getUser();
      
      const { data: dbData, error } = await supabase
        .from('transcriptions')
        .insert({
          title: data.title,
          content: data.content,
          status: data.status || 'imported',
          workflow_step: data.workflow_step || 1,
          progress: data.progress || 0,
          assigned_to: data.assigned_to,
          tags: data.tags || [],
          metadata: data.metadata || {},
          source: data.source,
          language: data.language || 'fr',
          created_by: user.data.user?.id,
        })
        .select()
        .single();
      
      if (error) throw error;
      
      setTranscriptions(prev => [dbData, ...prev]);
      
      return dbData;
    } catch (err: any) {
      setError(err.message);
      return null;
    }
  }, []);

  const updateTranscription = useCallback(async (
    id: string,
    updates: Partial<Transcription>
  ): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('transcriptions')
        .update(updates)
        .eq('id', id);
      
      if (error) throw error;
      
      setTranscriptions(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));
      
      return true;
    } catch (err: any) {
      setError(err.message);
      return false;
    }
  }, []);

  const deleteTranscription = useCallback(async (id: string): Promise<boolean> => {
    try {
      const user = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from('transcriptions')
        .update({
          is_deleted: true,
          deleted_at: new Date().toISOString(),
          deleted_by: user.data.user?.id,
        })
        .eq('id', id);
      
      if (error) throw error;
      
      setTranscriptions(prev => prev.filter(t => t.id !== id));
      
      return true;
    } catch (err: any) {
      setError(err.message);
      return false;
    }
  }, []);

  const linkRawFiles = useCallback(async (
    transcriptionId: string,
    rawFileIds: string[]
  ): Promise<boolean> => {
    try {
      const user = await supabase.auth.getUser();
      
      const links = rawFileIds.map(fileId => ({
        transcription_id: transcriptionId,
        raw_file_id: fileId,
        linked_by: user.data.user?.id,
      }));
      
      const { error } = await supabase
        .from('transcription_raw_files')
        .insert(links);
      
      if (error) throw error;
      
      return true;
    } catch (err: any) {
      setError(err.message);
      return false;
    }
  }, []);

  const getTranscriptionWithFiles = useCallback(async (
    id: string
  ): Promise<Transcription | null> => {
    try {
      const { data, error } = await supabase
        .from('transcriptions')
        .select(`
          *,
          raw_files:transcription_raw_files (
            raw_file_id,
            raw_files:raw_files (*)
          )
        `)
        .eq('id', id)
        .single();
      
      if (error) throw error;
      
      return {
        ...data,
        raw_files: data.raw_files?.map((rf: any) => rf.raw_files) || [],
      };
    } catch (err: any) {
      setError(err.message);
      return null;
    }
  }, []);

  useEffect(() => {
    fetchTranscriptions();
  }, [fetchTranscriptions]);

  return {
    transcriptions,
    loading,
    error,
    fetchTranscriptions,
    createTranscription,
    updateTranscription,
    deleteTranscription,
    linkRawFiles,
    getTranscriptionWithFiles,
  };
}
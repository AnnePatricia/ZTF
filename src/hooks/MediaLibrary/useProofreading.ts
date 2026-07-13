import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../supabaseClient';
import type { DocumentStatus, WorkflowStep } from '../../components/Documents/document';

export interface Proofreading {
  id: string;
  content?: string;
  status: DocumentStatus;
  workflow_step: WorkflowStep;
  progress: number;
  reviewer_id?: string;
  reviewer_name?: string;
  notes?: string;
  corrections_count: number;
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export function useProofreading() {
  const [proofreadingV1, setProofreadingV1] = useState<any[]>([]);
  const [proofreadingV2, setProofreadingV2] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProofreading = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // ✅ R1 : Récupérer avec le titre du projet
      const { data: v1Data, error: v1Error } = await supabase
        .from('proofreading_v1')
        .select(`
          id,
          status,
          workflow_step,
          progress,
          book_project_id,
          created_at,
          updated_at,
          book_projects!inner (
            id,
            title
          )
        `)
        .eq('is_deleted', false);

      if (v1Error) throw v1Error;

      // ✅ Transformer les données R1
      const v1WithTitles = (v1Data || []).map((pr1: any) => ({
        ...pr1,
        book_project_title: pr1.book_projects?.title || ''
      }));

      // ✅ R2 : Récupérer avec le titre du projet via R1
      const { data: v2Data, error: v2Error } = await supabase
        .from('proofreading_v2')
        .select(`
          id,
          status,
          workflow_step,
          progress,
          proofreading_v1_id,
          created_at,
          updated_at,
          proofreading_v1!inner (
            book_project_id,
            book_projects (
              title
            )
          )
        `)
        .eq('is_deleted', false);

      if (v2Error) throw v2Error;

      // ✅ Transformer les données R2
      const v2WithTitles = (v2Data || []).map((pr2: any) => ({
        ...pr2,
        book_project_title: pr2.proofreading_v1?.book_projects?.title || '',
        proofreading_v1_title: pr2.proofreading_v1?.book_projects?.title 
          ? `${pr2.proofreading_v1.book_projects.title}_R1` 
          : ''
      }));

      setProofreadingV1(v1WithTitles);
      setProofreadingV2(v2WithTitles);
    } catch (err: any) {
      setError(err.message);
      console.error('Erreur fetchProofreading:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const createProofreadingV1 = useCallback(async (bookProjectId: string, data: Partial<Proofreading>) => {
    try {
      const { data: dbData, error } = await supabase
        .from('proofreading_v1')
        .insert({
          book_project_id: bookProjectId,
          content: data.content,
          status: data.status || 'proofreading_1',
          workflow_step: data.workflow_step || 4,
          progress: data.progress || 80,
          reviewer_id: data.reviewer_id,
          reviewer_name: data.reviewer_name,
          notes: data.notes,
          corrections_count: data.corrections_count || 0,
          metadata: data.metadata || {},
        })
        .select()
        .single();
      
      if (error) throw error;
      
      setProofreadingV1(prev => [...prev, dbData]);
      
      return dbData;
    } catch (err: any) {
      setError(err.message);
      return null;
    }
  }, []);

  const createProofreadingV2 = useCallback(async (proofreadingV1Id: string, data: Partial<Proofreading>) => {
    try {
      const { data: dbData, error } = await supabase
        .from('proofreading_v2')
        .insert({
          proofreading_v1_id: proofreadingV1Id,
          content: data.content,
          status: data.status || 'proofreading_2',
          workflow_step: data.workflow_step || 5,
          progress: data.progress || 100,
          reviewer_id: data.reviewer_id,
          reviewer_name: data.reviewer_name,
          notes: data.notes,
          corrections_count: data.corrections_count || 0,
          metadata: data.metadata || {},
        })
        .select()
        .single();
      
      if (error) throw error;
      
      setProofreadingV2(prev => [...prev, dbData]);
      
      return dbData;
    } catch (err: any) {
      setError(err.message);
      return null;
    }
  }, []);

  const updateProofreading = useCallback(async (
    version: 'v1' | 'v2',
    id: string,
    updates: Partial<Proofreading>
  ): Promise<boolean> => {
    try {
      const table = version === 'v1' ? 'proofreading_v1' : 'proofreading_v2';
      
      const { error } = await supabase
        .from(table)
        .update(updates)
        .eq('id', id);
      
      if (error) throw error;
      
      if (version === 'v1') {
        setProofreadingV1(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p));
      } else {
        setProofreadingV2(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p));
      }
      
      return true;
    } catch (err: any) {
      setError(err.message);
      return false;
    }
  }, []);

  useEffect(() => {
    fetchProofreading();
  }, [fetchProofreading]);

  return {
    proofreadingV1,
    proofreadingV2,
    loading,
    error,
    fetchProofreading,
    createProofreadingV1,
    createProofreadingV2,
    updateProofreading,
  };
}
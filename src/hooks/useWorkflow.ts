// src/hooks/useWorkflow.ts
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';

export interface WorkflowDocument {
  id: string;
  title: string;
  source: string;
  workflow_step: number;
  assigned_to: string | null;
  created_at: string;
  updated_at: string;
  metadata: any;
}

export interface WorkflowStep {
  id: number;
  label: string;
  color: string;
  icon: string;
}

export const WORKFLOW_STEPS: WorkflowStep[] = [
  { id: 1, label: 'Import', color: 'blue', icon: 'fa-upload' },
  { id: 2, label: 'Transcription', color: 'yellow', icon: 'fa-keyboard' },
  { id: 3, label: 'Relecture', color: 'purple', icon: 'fa-eye' },
  { id: 4, label: 'Tagging', color: 'indigo', icon: 'fa-tags' },
];

export function useWorkflow() {
  const [documents, setDocuments] = useState<WorkflowDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDocuments = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: fetchError } = await supabase
        .from('workflow_documents')
        .select('*')
        .order('workflow_step', { ascending: true })
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;
      setDocuments(data || []);
    } catch (err: any) {
      console.error('Erreur chargement workflow:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  const moveDocument = async (documentId: string, newStep: number) => {
    try {
      const { error: updateError } = await supabase
        .from('workflow_documents')
        .update({ 
          workflow_step: newStep,
          updated_at: new Date().toISOString()
        })
        .eq('id', documentId);

      if (updateError) throw updateError;

      // Mettre à jour l'état local
      setDocuments(prev => prev.map(doc => 
        doc.id === documentId 
          ? { ...doc, workflow_step: newStep, updated_at: new Date().toISOString() }
          : doc
      ));

      return { success: true };
    } catch (err: any) {
      console.error('Erreur déplacement:', err);
      return { success: false, error: err.message };
    }
  };

  const addDocument = async (title: string, source: string, step: number = 1, assignedTo?: string) => {
    try {
      const { data, error: insertError } = await supabase
        .from('workflow_documents')
        .insert({
          title,
          source,
          workflow_step: step,
          assigned_to: assignedTo || null
        })
        .select()
        .single();

      if (insertError) throw insertError;
      setDocuments(prev => [...prev, data]);
      return { success: true, document: data };
    } catch (err: any) {
      console.error('Erreur ajout:', err);
      return { success: false, error: err.message };
    }
  };

  const deleteDocument = async (documentId: string) => {
    try {
      const { error: deleteError } = await supabase
        .from('workflow_documents')
        .delete()
        .eq('id', documentId);

      if (deleteError) throw deleteError;
      setDocuments(prev => prev.filter(doc => doc.id !== documentId));
      return { success: true };
    } catch (err: any) {
      console.error('Erreur suppression:', err);
      return { success: false, error: err.message };
    }
  };

  const getDocumentsByStep = (step: number) => {
    return documents.filter(doc => doc.workflow_step === step);
  };

  const getDocumentCount = (step: number) => {
    return getDocumentsByStep(step).length;
  };

  return {
    documents,
    loading,
    error,
    moveDocument,
    addDocument,
    deleteDocument,
    getDocumentsByStep,
    getDocumentCount,
    refresh: fetchDocuments
  };
}
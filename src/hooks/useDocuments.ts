import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useDocumentMediaSync } from './useDocumentMediaSync';
import type { Document, DocumentFormData, DocumentStatus } from '../components/Documents/document';
import { STATUS_TO_STEP, STATUS_TO_PROGRESS } from '../components/Documents/document';

export function useDocuments() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [documentVersions, setDocumentVersions] = useState<any[]>([]);

  const { updateMediaStatusFromDocument, linkMediaToDocument } = useDocumentMediaSync();

  // ✅ DOIT RESSEMBLER À CECI
  const fetchDocuments = async () => {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      setDocuments(data || []);
      setError(null);
    } catch (err) {
      console.error('Erreur chargement documents:', err);
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
    } finally {
      setLoading(false);
    }
  };

  const filterDocuments = async (
    searchTerm: string = '',
    statusFilter: string = 'Tous',
    typeFilter: string = 'Tous'
  ) => {
    try {
      setLoading(true);

      let query = supabase
        .from('documents')
        .select('*')
        .order('created_at', { ascending: false });

      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        query = query.or(
          `title.ilike.%${searchLower}%,source.ilike.%${searchLower}%`
        );
      }

      if (statusFilter !== 'Tous') {
        query = query.eq('status', statusFilter);
      }

      if (typeFilter !== 'Tous') {
        query = query.eq('type', typeFilter);
      }

      const { data, error } = await query;

      if (error) throw error;
      setDocuments(data || []);
      setError(null);
    } catch (err) {
      console.error('Erreur filtrage:', err);
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
    } finally {
      setLoading(false);
    }
  };

  const createDocument = async (documentData: DocumentFormData) => {
    try {
      const sessionResponse = await supabase.auth.getSession();
      const session = sessionResponse.data.session;

      if (!session?.user) {
        throw new Error("Session invalide");
      }

      if (documentData.media_file_id) {
        const completeData = {
          ...documentData,
          status: documentData.status || 'à_traiter',
          workflow_step: STATUS_TO_STEP[documentData.status || 'à_traiter'],
          progress: STATUS_TO_PROGRESS[documentData.status || 'à_traiter'],
          tags: documentData.tags || [],
          user_id: session.user.id,
          file_url: documentData.file_url || ''
        };

        const { data, error } = await supabase
          .from('documents')
          .insert([completeData])
          .select()
          .single();

        if (error) throw error;

        await linkMediaToDocument(
          data.id,
          documentData.media_file_id,
          'libre',
          documentData.status || 'à_traiter'
        );

        setDocuments(prev => [data, ...prev]);
        return data;
      }

      const completeData = {
        ...documentData,
        status: documentData.status || 'à_traiter',
        workflow_step: STATUS_TO_STEP[documentData.status || 'à_traiter'],
        progress: STATUS_TO_PROGRESS[documentData.status || 'à_traiter'],
        tags: documentData.tags || [],
        user_id: session.user.id
      };

      const { data, error } = await supabase
        .from('documents')
        .insert([completeData])
        .select()
        .single();

      if (error) throw error;

      setDocuments(prev => [data, ...prev]);
      return data;
    } catch (err) {
      console.error('Erreur création:', err);
      throw err;
    }
  };

  const advanceWorkflow = async (
    documentId: string,
    actionType: string,
    notes?: string
  ) => {
    try {
      const sessionResponse = await supabase.auth.getSession();
      const session = sessionResponse.data.session;

      if (!session?.user) {
        throw new Error("Session invalide");
      }

      const document = documents.find(d => d.id === documentId);
      if (!document) throw new Error("Document non trouvé");

      let newStatus: DocumentStatus;
      switch (actionType) {
        case 'start_transcription':
          newStatus = 'transcription_en_cours';
          break;
        case 'complete_transcription':
          newStatus = 'transcrit';
          break;
        case 'start_review':
          newStatus = 'projet_de_livre';
          break;
        case 'complete_review':
          newStatus = 'relecture_1_en_cours';
          break;
        case 'validate_review_1':
          newStatus = 'relecture_1_validé';
          break;
        case 'start_review_2':
          newStatus = 'relecture_2_en_cours';
          break;
        case 'validate_review_2':
          newStatus = 'relecture_2_validé';
          break;
        case 'reopen_document':
          newStatus = 'à_traiter';
          break;
        default:
          throw new Error(`Action invalide: ${actionType}`);
      }

      await updateMediaStatusFromDocument(documentId, newStatus);

      await updateDocumentWithVersioning(documentId, {
        status: newStatus,
        workflow_step: STATUS_TO_STEP[newStatus],
        progress: STATUS_TO_PROGRESS[newStatus]
      });

      await supabase
        .from('workflow_actions')
        .insert([{
          document_id: documentId,
          action_type: actionType,
          from_status: document.status,
          to_status: newStatus,
          performed_by: session.user.id,
          notes: notes || null
        }]);

      return { success: true, newStatus };
    } catch (err) {
      console.error('Erreur transition workflow:', err);
      throw err;
    }
  };

  const updateDocumentWithVersioning = async (
    documentId: string,
    updates: Partial<DocumentFormData>
  ) => {
    try {
      const sessionResponse = await supabase.auth.getSession();
      const session = sessionResponse.data.session;

      if (!session?.user) {
        throw new Error("Session invalide");
      }

      const { data: currentDoc, error: fetchError } = await supabase
        .from('documents')
        .select('*')
        .eq('id', documentId)
        .single();
      if (fetchError) throw fetchError;

      const { count } = await supabase
        .from('document_versions')
        .select('*', { count: 'exact', head: true })
        .eq('document_id', documentId);
      const nextVersion = (count || 0) + 1;

      const versionData = {
        document_id: documentId,
        version_number: nextVersion,
        title: currentDoc.title,
        type: currentDoc.type,
        source: currentDoc.source,
        status: currentDoc.status,
        workflow_step: currentDoc.workflow_step,
        progress: currentDoc.progress,
        assigned_to: currentDoc.assigned_to,
        tags: currentDoc.tags,
        file_url: currentDoc.file_url || null,
        content: currentDoc.content || null,
        created_by: session.user.id,
        restored_from_version: null,
        restoration_reason: null
      };

      const { error: versionError } = await supabase
        .from('document_versions')
        .insert([versionData]);
      if (versionError) throw versionError;

      let finalUpdates = { ...updates };
      if (updates.status) {
        finalUpdates = {
          ...updates,
          workflow_step: STATUS_TO_STEP[updates.status as DocumentStatus],
          progress: STATUS_TO_PROGRESS[updates.status as DocumentStatus]
        };
      }

      // ✅ CORRIGÉ: data: updatedDoc
      const { data: updatedDoc, error: updateError } = await supabase
        .from('documents')
        .update(finalUpdates)
        .eq('id', documentId)
        .select()
        .single();
      if (updateError) throw updateError;

      setDocuments(prev =>
        prev.map(doc => doc.id === documentId ? { ...doc, ...updatedDoc } : doc)
      );

      return updatedDoc;
    } catch (err) {
      console.error('Erreur versioning:', err);
      throw err;
    }
  };

  const fetchDocumentVersions = async (documentId: string) => {
    try {
      const { data, error } = await supabase
        .from('document_versions')
        .select('*')
        .eq('document_id', documentId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDocumentVersions(data || []);
      return data;
    } catch (err) {
      console.error('Erreur chargement versions:', err);
      throw err;
    }
  };

  const restoreDocumentVersion = async (
    documentId: string,
    versionId: string,
    restorationReason: string
  ) => {
    try {
      const sessionResponse = await supabase.auth.getSession();
      const session = sessionResponse.data.session;

      if (!session?.user) {
        throw new Error("Session invalide");
      }

      // ✅ CORRIGÉ: data: versionToRestore
      const { data: versionToRestore, error: versionError } = await supabase
        .from('document_versions')
        .select('*')
        .eq('id', versionId)
        .single();
      if (versionError) throw versionError;

      const currentDoc = documents.find(d => d.id === documentId);
      if (currentDoc) {
        await updateDocumentWithVersioning(documentId, {
          title: currentDoc.title,
          type: currentDoc.type,
          source: currentDoc.source,
          status: currentDoc.status,
          workflow_step: currentDoc.workflow_step,
          progress: currentDoc.progress,
          assigned_to: currentDoc.assigned_to,
          tags: currentDoc.tags,
          file_url: currentDoc.file_url || '',
          content: currentDoc.content || ''
        });
      }

      // ✅ CORRIGÉ: data: restoredDoc
      const { data: restoredDoc, error: restoreError } = await supabase
        .from('documents')
        .update({
          title: versionToRestore.title,
          type: versionToRestore.type,
          source: versionToRestore.source,
          status: versionToRestore.status,
          workflow_step: versionToRestore.workflow_step,
          progress: versionToRestore.progress,
          assigned_to: versionToRestore.assigned_to,
          tags: versionToRestore.tags,
          file_url: versionToRestore.file_url,
          content: versionToRestore.content,
          updated_at: new Date().toISOString()
        })
        .eq('id', documentId)
        .select()
        .single();
      if (restoreError) throw restoreError;

      await supabase
        .from('document_versions')
        .update({
          restored_from_version: versionId,
          restoration_reason: restorationReason
        })
        .eq('id', versionId);

      setDocuments(prev =>
        prev.map(doc => doc.id === documentId ? { ...doc, ...restoredDoc } : doc)
      );

      await fetchDocumentVersions(documentId);

      return restoredDoc;
    } catch (err) {
      console.error('Erreur restauration:', err);
      throw err;
    }
  };

  const deleteDocument = async (id: string) => {
    try {
      const { error } = await supabase
        .from('documents')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setDocuments(prev => prev.filter(doc => doc.id !== id));
    } catch (err) {
      console.error('Erreur suppression:', err);
      throw err;
    }
  };

  // ✅ DOIT RESSEMBLER À CECI
  const deleteDocuments = async (ids: string[]) => {
    try {
      console.log('🗑️ Suppression des documents:', ids);

      const { error } = await supabase
        .from('documents')
        .delete()
        .in('id', ids);

      if (error) {
        console.error('❌ Erreur suppression:', error);
        throw error;
      }

      console.log('✅ Documents supprimés avec succès');

      // ✅ METTRE À JOUR L'ÉTAT LOCAL IMMÉDIATEMENT
      setDocuments(prev => prev.filter(doc => !ids.includes(doc.id)));

      return { success: true };
    } catch (err) {
      console.error('Erreur deleteDocuments:', err);
      throw err;
    }
  };

  useEffect(() => {
    const channel = supabase
      .channel('documents-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'documents' },
        () => {
          fetchDocuments();
        }
      )
      .subscribe();

    fetchDocuments();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return {
    documents,
    loading,
    error,
    documentVersions,
    fetchDocuments,
    filterDocuments,
    createDocument,
    advanceWorkflow,
    updateDocumentWithVersioning,
    fetchDocumentVersions,
    restoreDocumentVersion,
    deleteDocument,
    deleteDocuments,
  };
}
import { supabase } from '../supabaseClient';
import type { DocumentStatus, MediaLibraryStatus } from '../components/Documents/document';

export function useDocumentMediaSync() {
  
  const linkMediaToDocument = async (
    documentId: string,
    mediaFileId: string,
    mediaStatus: MediaLibraryStatus = 'traité',  // ✅ PAR DÉFAUT: N'EST PLUS LIBRE
    documentStatus: DocumentStatus = 'à_traiter'
  ) => {
    try {
      const {  data : userData } = await supabase.auth.getUser();
      
      if (!userData?.user) {
        console.error('❌ Utilisateur non authentifié');
        throw new Error('Utilisateur non authentifié');
      }

      // ✅ 1. VÉRIFIER SI LE LIEN EXISTE DÉJÀ (FORMAT CORRIGÉ)
      const {  data : existingLinks, error: fetchError } = await supabase
        .from('document_media_links')
        .select('id')
        .eq('document_id', documentId)
        .eq('media_file_id', mediaFileId);

      if (fetchError) {
        console.error('Erreur vérification lien:', fetchError);
        throw fetchError;
      }

      // ✅ 2. SI LE LIEN EXISTE, LE METTRE À JOUR
      if (existingLinks && existingLinks.length > 0) {
        console.log('⚠️ Lien existant, mise à jour...');
        
        const {  data : updatedLink, error: updateError } = await supabase
          .from('document_media_links')
          .update({
            media_status: mediaStatus,
            document_status: documentStatus,
            linked_by: userData.user.id
          })
          .eq('document_id', documentId)
          .eq('media_file_id', mediaFileId)
          .select()
          .single();

        if (updateError) throw updateError;
        
        await updateMediaFileStatus(mediaFileId, mediaStatus);
        
        return updatedLink;
      }

      // ✅ 3. SINON, CRÉER LE NOUVEAU LIEN
      const {  data : linkData, error } = await supabase
        .from('document_media_links')
        .insert([{
          document_id: documentId,
          media_file_id: mediaFileId,
          media_status: mediaStatus,
          document_status: documentStatus,
          linked_by: userData.user.id
        }])
        .select()
        .single();

      if (error) throw error;

      await updateMediaFileStatus(mediaFileId, mediaStatus);

      return linkData;
    } catch (error: any) {
      console.error('Erreur linkMediaToDocument:', error);
      throw error;
    }
  };

  const updateMediaStatusFromDocument = async (
    documentId: string,
    newDocumentStatus: DocumentStatus
  ) => {
    try {
      const statusMap: Record<DocumentStatus, MediaLibraryStatus | null> = {
        'à_traiter': null,
        'transcription_en_cours': 'traité',
        'transcrit': 'transcrit',
        'projet_de_livre': 'projet_livre',
        'relecture_1_en_cours': null,
        'relecture_1_validé': 'relecture_1',
        'relecture_2_en_cours': null,
        'relecture_2_validé': 'relecture_2'
      };

      const newMediaStatus = statusMap[newDocumentStatus];
      
      if (!newMediaStatus) {
        console.log('Pas de mise à jour MediaLibrary pour ce statut');
        return;
      }

      const {   data : links } = await supabase
        .from('document_media_links')
        .select('media_file_id')
        .eq('document_id', documentId);

      if (!links || links.length === 0) {
        console.log('Aucun fichier MediaLibrary lié à ce document');
        return;
      }

      for (const link of links) {
        await updateMediaFileStatus(link.media_file_id, newMediaStatus);
        
        await supabase
          .from('document_media_links')
          .update({ 
            media_status: newMediaStatus,
            document_status: newDocumentStatus
          })
          .eq('document_id', documentId)
          .eq('media_file_id', link.media_file_id);
      }

      return { success: true, updatedCount: links.length };
    } catch (error: any) {
      console.error('Erreur updateMediaStatusFromDocument:', error);
      throw error;
    }
  };

  const updateMediaFileStatus = async (
    mediaFileId: string,
    status: MediaLibraryStatus
  ) => {
    try {
      const {   data : existingData } = await supabase
        .from('raw_files')
        .select('metadata')
        .eq('id', mediaFileId)
        .single();

      const existingMetadata = existingData?.metadata || {};

      const { error } = await supabase
        .from('raw_files')
        .update({ 
          status,
          metadata: {
            ...existingMetadata,
            last_status_update: new Date().toISOString(),
            status_history: [
              ...(existingMetadata.status_history || []),
              { status, timestamp: new Date().toISOString() }
            ]
          }
        })
        .eq('id', mediaFileId);

      if (error) throw error;
      return { success: true };
    } catch (error: any) {
      console.error('Erreur updateMediaFileStatus:', error);
      throw error;
    }
  };

  const isMediaFileProcessed = async (mediaFileId: string) => {
    try {
      const {  data } = await supabase
        .from('raw_files')
        .select('status')
        .eq('id', mediaFileId)
        .single();
      
      return data?.status === 'traité' || data?.status === 'transcrit';
    } catch (error: any) {
      console.error('Erreur isMediaFileProcessed:', error);
      return false;
    }
  };

  const getLinkedDocuments = async (mediaFileId: string) => {
    try {
      const {  data } = await supabase
        .from('document_media_links')
        .select(`
          *,
          documents (
            id,
            title,
            status,
            workflow_step,
            progress,
            assigned_to
          )
        `)
        .eq('media_file_id', mediaFileId);

      if (!data) return [];
      return data;
    } catch (error: any) {
      console.error('Erreur getLinkedDocuments:', error);
      return [];
    }
  };

  const unlinkMediaFromDocument = async (
    documentId: string,
    mediaFileId: string
  ) => {
    try {
      const { error } = await supabase
        .from('document_media_links')
        .delete()
        .eq('document_id', documentId)
        .eq('media_file_id', mediaFileId);

      if (error) throw error;

      // ✅ NE PAS REMETTRE À "libre" (le fichier reste traité)
      // await updateMediaFileStatus(mediaFileId, 'libre');

      return { success: true };
    } catch (error: any) {
      console.error('Erreur unlinkMediaFromDocument:', error);
      throw error;
    }
  };

  return {
    linkMediaToDocument,
    updateMediaStatusFromDocument,
    updateMediaFileStatus,
    isMediaFileProcessed,
    getLinkedDocuments,
    unlinkMediaFromDocument
  };
}
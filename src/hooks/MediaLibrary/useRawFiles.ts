import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../supabaseClient';

export interface RawFile {
    id: string;
    file_name: string;
    file_url: string;
    file_type: 'pdf' | 'audio' | 'image';
    file_size: number;
    mime_type?: string;
    storage_path: string;
    bucket_name: string;
    metadata: Record<string, any>;
    duration_seconds?: number;
    page_count?: number;
    imported_by?: string;
    imported_at: string;
    is_deleted: boolean;
    deleted_at?: string;
    deleted_by?: string;
    created_at: string;
    updated_at: string;
    // ✅ NOUVELLES COLONNES POUR LE SUIVI DES LIAISONS
    is_linked?: boolean;
    linked_documents_count?: number;
    status?: string;
}

export interface UseRawFilesReturn {
    rawFiles: RawFile[];
    loading: boolean;
    error: string | null;
    fetchRawFiles: (linkStatusFilter?: 'all' | 'linked' | 'free') => Promise<void>;
    uploadRawFile: (file: File, metadata?: Record<string, any>) => Promise<RawFile | null>;
    updateRawFile: (id: string, updates: Partial<RawFile>) => Promise<boolean>;
    deleteRawFile: (id: string) => Promise<boolean>;
    restoreRawFile: (id: string) => Promise<boolean>;
}

export function useRawFiles(linkStatusFilter?: 'all' | 'linked' | 'free'): UseRawFilesReturn {
    const [rawFiles, setRawFiles] = useState<RawFile[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchRawFiles = useCallback(async (filter?: 'all' | 'linked' | 'free') => {
        try {
            setLoading(true);
            setError(null);

            let query;
            
            // ✅ UTILISER LA FONCTION BACKEND SI FILTRE SPÉCIFIÉ
            const activeFilter = filter || linkStatusFilter;
            
            if (activeFilter === 'linked') {
                // Fichiers déjà liés
                query = supabase.rpc('get_raw_files_by_link_status', { p_is_linked: true });
            } else if (activeFilter === 'free') {
                // Fichiers libres (non liés)
                query = supabase.rpc('get_raw_files_by_link_status', { p_is_linked: false });
            } else {
                // Tous les fichiers
                query = supabase
                    .from('raw_files')
                    .select('*')
                    .eq('is_deleted', false)
                    .order('imported_at', { ascending: false });
            }

            const { data, error } = await query;

            if (error) throw error;
            setRawFiles(data || []);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [linkStatusFilter]);

    const uploadRawFile = useCallback(async (
        file: File,
        metadata?: Record<string, any>
    ): Promise<RawFile | null> => {
        try {

            console.log('🔍 Début upload:', file.name);
            const fileExt = file.name.split('.').pop();
            const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
            const storagePath = `raw-files/${fileName}`;

            console.log('📁 Chemin storage:', storagePath);

            const { data: _uploadData, error: uploadError } = await supabase.storage
                .from('document-files')
                .upload(storagePath, file, {
                    cacheControl: '3600',
                    upsert: false, // ✅ Ne pas écraser les fichiers existants
                    contentType: file.type,
                });

            if (uploadError) {
                console.error('❌ Erreur upload storage:', uploadError);
                console.error('❌ Détails:', uploadError.message);
                throw uploadError;
            }

            const { data: urlData } = supabase.storage
                .from('document-files')
                .getPublicUrl(storagePath);

            let fileType: 'pdf' | 'audio' | 'image' = 'pdf';
            if (file.type.startsWith('audio/')) fileType = 'audio';
            else if (file.type.startsWith('image/')) fileType = 'image';
            else if (file.type === 'application/pdf') fileType = 'pdf';

            const user = await supabase.auth.getUser();

            if (!user.data.user) {
                throw new Error('Utilisateur non authentifié');
            }

            const { data: dbData, error: dbError } = await supabase
                .from('raw_files')
                .insert({
                    file_name: file.name,
                    file_url: urlData.publicUrl,
                    file_type: fileType,
                    file_size: file.size,
                    mime_type: file.type,
                    storage_path: storagePath,
                    bucket_name: 'document-files',
                    metadata: metadata || {},
                    imported_by: user.data.user?.id,
                })
                .select()
                .single();

            if (dbError) {
                console.error('❌ Erreur DB:', dbError);
                throw dbError;
            }

            console.log('✅ Insert DB réussi:', dbData);

            setRawFiles(prev => [dbData, ...prev]);

            return dbData;
        } catch (err: any) {
            console.error('❌ Erreur upload complète:', err);
            console.error('❌ Message:', err.message);
            console.error('❌ Stack:', err.stack);
            setError(err.message);
            return null;
        }
    }, []);

    const updateRawFile = useCallback(async (
        id: string,
        updates: Partial<RawFile>
    ): Promise<boolean> => {
        try {
            const { error } = await supabase
                .from('raw_files')
                .update(updates)
                .eq('id', id);

            if (error) throw error;

            setRawFiles(prev => prev.map(f => f.id === id ? { ...f, ...updates } : f));

            return true;
        } catch (err: any) {
            setError(err.message);
            return false;
        }
    }, []);

   // Dans la fonction deleteRawFile
    const deleteRawFile = async (id: string): Promise<boolean> => {
    try {
        // 1. Récupérer le fichier pour obtenir son ztf_id
        const { data: file, error: fetchError } = await supabase
        .from('raw_files')
        .select('ztf_id, storage_path, bucket_name')
        .eq('id', id)
        .single();

        if (fetchError) {
        console.error('Erreur lors de la récupération du fichier:', fetchError);
        return false;
        }

        // 2. Supprimer d'abord dans ztf_books si ztf_id existe
        if (file?.ztf_id) {
        console.log('🗑️ Suppression dans ztf_books pour ztf_id:', file.ztf_id);
        
        const { error: deleteBookError } = await supabase
            .from('ztf_books')
            .delete()
            .eq('ztf_id', file.ztf_id);

        if (deleteBookError) {
            console.error('Erreur suppression ztf_books:', deleteBookError);
            // Continuer quand même avec la suppression du fichier
        } else {
            console.log('✅ ztf_books supprimé avec succès');
        }
        }

        // 3. Supprimer le fichier du Storage (si storage_path existe)
        if (file?.storage_path && file?.bucket_name) {
        console.log('🗑️ Suppression du fichier Storage:', file.storage_path);
        
        const { error: storageError } = await supabase.storage
            .from(file.bucket_name)
            .remove([file.storage_path]);

        if (storageError) {
            console.error('Erreur suppression Storage:', storageError);
        }
        }

        // 4. Supprimer le fichier de raw_files
        console.log('🗑️ Suppression dans raw_files pour id:', id);
        
        const { error: deleteError } = await supabase
        .from('raw_files')
        .delete()
        .eq('id', id);

        if (deleteError) {
        console.error('Erreur suppression raw_files:', deleteError);
        throw deleteError;
        }

        console.log('✅ Fichier supprimé avec succès');
        return true;

    } catch (error) {
        console.error('Erreur globale suppression:', error);
        return false;
    }
    };

    const restoreRawFile = useCallback(async (id: string): Promise<boolean> => {
        try {
            const { error } = await supabase
                .from('raw_files')
                .update({
                    is_deleted: false,
                    deleted_at: null,
                    deleted_by: null,
                })
                .eq('id', id);

            if (error) throw error;

            await fetchRawFiles();

            return true;
        } catch (err: any) {
            setError(err.message);
            return false;
        }
    }, [fetchRawFiles]);

    useEffect(() => {
        fetchRawFiles();
    }, [fetchRawFiles]);

    return {
        rawFiles,
        loading,
        error,
        fetchRawFiles,
        uploadRawFile,
        updateRawFile,
        deleteRawFile,
        restoreRawFile,
    };
}
// =====================================================
// HOOK: useDocumentBlocks
// Description: Gestion des blocs atomiques d'un document
// =====================================================

import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

// =====================================================
// TYPES
// =====================================================

export type BlockType =
  | 'heading1'
  | 'heading2'
  | 'heading3'
  | 'paragraph'
  | 'blockquote'
  | 'image'
  | 'list'
  | 'list_item'
  | 'divider';

export type BlockStatus = 'draft' | 'proposed' | 'merged' | 'rejected';

export interface DocumentBlock {
  id: string;
  document_id: string;
  type: BlockType;
  position: number;
  content: any; // JSON ProseMirror
  status: BlockStatus;
  word_count: number;
  char_count: number;
  created_by: string;
  merged_by?: string;
  merged_at?: string;
  created_at: string;
  updated_at: string;
}

export interface UseDocumentBlocksReturn {
  blocks: DocumentBlock[];
  loading: boolean;
  error: string | null;
  fetchBlocks: (documentId: string) => Promise<void>;
  createBlock: (block: Partial<DocumentBlock>) => Promise<DocumentBlock | null>;
  updateBlock: (blockId: string, updates: Partial<DocumentBlock>) => Promise<boolean>;
  deleteBlock: (blockId: string) => Promise<boolean>;
  reorderBlocks: (documentId: string, blockIds: string[]) => Promise<boolean>;
  getBlockHistory: (blockId: string) => Promise<any[]>;
}

// =====================================================
// HOOK
// =====================================================

export function useDocumentBlocks(documentId?: string): UseDocumentBlocksReturn {
  const [blocks, setBlocks] = useState<DocumentBlock[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // =====================================================
  // 1. CHARGER LES BLOCS
  // =====================================================

  const fetchBlocks = async (docId: string) => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('document_blocks')
        .select('*')
        .eq('document_id', docId)
        .order('position', { ascending: true });

      if (fetchError) throw fetchError;

      setBlocks(data || []);
    } catch (err: any) {
      console.error('Erreur fetchBlocks:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // =====================================================
  // 2. CRÉER UN BLOC
  // =====================================================

  const createBlock = async (block: Partial<DocumentBlock>): Promise<DocumentBlock | null> => {
    try {
      const { data, error: createError } = await supabase
        .from('document_blocks')
        .insert([{
          document_id: documentId,
          type: block.type || 'paragraph',
          position: block.position || 0,
          content: block.content || {},
          status: 'draft',
          word_count: 0,
          char_count: 0,
          created_by: (await supabase.auth.getUser()).data.user?.id,
        }])
        .select()
        .single();

      if (createError) throw createError;

      setBlocks(prev => [...prev, data]);
      return data;
    } catch (err: any) {
      console.error('Erreur createBlock:', err);
      return null;
    }
  };

  // =====================================================
  // 3. METTRE À JOUR UN BLOC
  // =====================================================

  const updateBlock = async (
    blockId: string,
    updates: Partial<DocumentBlock>
  ): Promise<boolean> => {
    try {
      const { error: updateError } = await supabase
        .from('document_blocks')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', blockId);

      if (updateError) throw updateError;

      setBlocks(prev =>
        prev.map(block =>
          block.id === blockId ? { ...block, ...updates } : block
        )
      );

      return true;
    } catch (err: any) {
      console.error('Erreur updateBlock:', err);
      return false;
    }
  };

  // =====================================================
  // 4. SUPPRIMER UN BLOC
  // =====================================================

  const deleteBlock = async (blockId: string): Promise<boolean> => {
    try {
      const { error: deleteError } = await supabase
        .from('document_blocks')
        .delete()
        .eq('id', blockId);

      if (deleteError) throw deleteError;

      setBlocks(prev => prev.filter(block => block.id !== blockId));
      return true;
    } catch (err: any) {
      console.error('Erreur deleteBlock:', err);
      return false;
    }
  };

  // =====================================================
  // 5. RÉORDONNER LES BLOCS
  // =====================================================

  const reorderBlocks = async (
    docId: string,
    blockIds: string[]
  ): Promise<boolean> => {
    try {
      // Appeler la fonction SQL de réordonnancement
      const { error } = await supabase.rpc('reorder_document_blocks', {
        p_document_id: docId,
        p_block_ids: blockIds,
      });

      if (error) throw error;

      // Mettre à jour localement
      const newBlocks = blockIds
        .map((id, index) => {
          const block = blocks.find(b => b.id === id);
          return block ? { ...block, position: index } : null;
        })
        .filter(Boolean) as DocumentBlock[];

      setBlocks(newBlocks);
      return true;
    } catch (err: any) {
      console.error('Erreur reorderBlocks:', err);
      return false;
    }
  };

  // =====================================================
  // 6. OBTENIR L'HISTORIQUE D'UN BLOC
  // =====================================================

  const getBlockHistory = async (blockId: string): Promise<any[]> => {
    try {
      const { data, error } = await supabase.rpc('get_block_history', {
        p_block_id: blockId,
      });

      if (error) throw error;
      return data || [];
    } catch (err: any) {
      console.error('Erreur getBlockHistory:', err);
      return [];
    }
  };

  // =====================================================
  // CHARGEMENT INITIAL
  // =====================================================

  useEffect(() => {
    if (documentId) {
      fetchBlocks(documentId);
    }
  }, [documentId]);

  // =====================================================
  // REALTIME SUBSCRIPTION
  // =====================================================

  useEffect(() => {
    if (!documentId) return;

    const channel = supabase
      .channel(`blocks-${documentId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'document_blocks',
          filter: `document_id=eq.${documentId}`,
        },
        (payload) => {
          console.log('Changement détecté sur document_blocks:', payload);

          if (payload.eventType === 'INSERT') {
            setBlocks(prev => [...prev, payload.new as DocumentBlock]);
          } else if (payload.eventType === 'UPDATE') {
            setBlocks(prev =>
              prev.map(block =>
                block.id === payload.new.id ? { ...block, ...payload.new } : block
              )
            );
          } else if (payload.eventType === 'DELETE') {
            setBlocks(prev => prev.filter(block => block.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [documentId]);

  // =====================================================
  // RETOUR DU HOOK
  // =====================================================

  return {
    blocks,
    loading,
    error,
    fetchBlocks,
    createBlock,
    updateBlock,
    deleteBlock,
    reorderBlocks,
    getBlockHistory,
  };
}

// =====================================================
// HOOK: useBlockComments
// Description: Gestion des commentaires ancrés
// =====================================================

import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

// =====================================================
// TYPES
// =====================================================

export type CommentStatus = 'open' | 'resolved';

export interface BlockComment {
  id: string;
  block_id: string;
  document_id: string;
  user_id: string;
  parent_id?: string;
  anchor_text?: string;
  anchor_start?: number;
  anchor_end?: number;
  content: string;
  status: CommentStatus;
  resolved_by?: string;
  resolved_at?: string;
  created_at: string;
  updated_at: string;
}

export interface UseBlockCommentsReturn {
  comments: BlockComment[];
  openComments: BlockComment[];
  loading: boolean;
  error: string | null;
  fetchComments: (documentId: string) => Promise<void>;
  addComment: (comment: Partial<BlockComment>) => Promise<BlockComment | null>;
  replyToComment: (parentId: string, content: string) => Promise<BlockComment | null>;
  resolveComment: (commentId: string, resolverId: string) => Promise<boolean>;
  deleteComment: (commentId: string) => Promise<boolean>;
  getCommentCount: () => number;
}

// =====================================================
// HOOK
// =====================================================

export function useBlockComments(documentId?: string): UseBlockCommentsReturn {
  const [comments, setComments] = useState<BlockComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // =====================================================
  // 1. CHARGER LES COMMENTAIRES
  // =====================================================

  const fetchComments = async (docId: string) => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('block_comments')
        .select('*')
        .eq('document_id', docId)
        .order('created_at', { ascending: true });

      if (fetchError) throw fetchError;

      setComments(data || []);
    } catch (err: any) {
      console.error('Erreur fetchComments:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // =====================================================
  // 2. AJOUTER UN COMMENTAIRE
  // =====================================================

  const addComment = async (
    comment: Partial<BlockComment>
  ): Promise<BlockComment | null> => {
    try {
      const user = await supabase.auth.getUser();

      const { data, error: createError } = await supabase
        .from('block_comments')
        .insert([{
          block_id: comment.block_id,
          document_id: comment.document_id,
          user_id: user.data.user?.id,
          parent_id: comment.parent_id || null,
          anchor_text: comment.anchor_text,
          anchor_start: comment.anchor_start,
          anchor_end: comment.anchor_end,
          content: comment.content,
          status: 'open',
        }])
        .select()
        .single();

      if (createError) throw createError;

      setComments(prev => [...prev, data]);
      return data;
    } catch (err: any) {
      console.error('Erreur addComment:', err);
      return null;
    }
  };

  // =====================================================
  // 3. RÉPONDRE À UN COMMENTAIRE
  // =====================================================

  const replyToComment = async (
    parentId: string,
    content: string
  ): Promise<BlockComment | null> => {
    try {
      // Récupérer le commentaire parent pour avoir block_id et document_id
      const parentComment = comments.find(c => c.id === parentId);
      if (!parentComment) {
        throw new Error('Commentaire parent non trouvé');
      }

      return await addComment({
        block_id: parentComment.block_id,
        document_id: parentComment.document_id,
        parent_id: parentId,
        content,
      });
    } catch (err: any) {
      console.error('Erreur replyToComment:', err);
      return null;
    }
  };

  // =====================================================
  // 4. RÉSOUDRE UN COMMENTAIRE
  // =====================================================

  const resolveComment = async (
    commentId: string,
    resolverId: string
  ): Promise<boolean> => {
    try {
      // Utiliser la fonction SQL resolve_block_comment
      const { error } = await supabase.rpc('resolve_block_comment', {
        p_comment_id: commentId,
        p_resolver_id: resolverId,
      });

      if (error) throw error;

      // Mettre à jour localement
      setComments(prev =>
        prev.map(c =>
          c.id === commentId
            ? {
                ...c,
                status: 'resolved',
                resolved_by: resolverId,
                resolved_at: new Date().toISOString(),
              }
            : c
        )
      );

      return true;
    } catch (err: any) {
      console.error('Erreur resolveComment:', err);
      return false;
    }
  };

  // =====================================================
  // 5. SUPPRIMER UN COMMENTAIRE
  // =====================================================

  const deleteComment = async (commentId: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('block_comments')
        .delete()
        .eq('id', commentId);

      if (error) throw error;

      setComments(prev => prev.filter(c => c.id !== commentId));
      return true;
    } catch (err: any) {
      console.error('Erreur deleteComment:', err);
      return false;
    }
  };

  // =====================================================
  // 6. OBTENIR LE NOMBRE DE COMMENTAIRES OUVERTS
  // =====================================================

  const getCommentCount = (): number => {
    return comments.filter(c => c.status === 'open').length;
  };

  // =====================================================
  // CHARGEMENT INITIAL
  // =====================================================

  useEffect(() => {
    if (documentId) {
      fetchComments(documentId);
    }
  }, [documentId]);

  // =====================================================
  // REALTIME SUBSCRIPTION
  // =====================================================

  useEffect(() => {
    if (!documentId) return;

    const channel = supabase
      .channel(`comments-${documentId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'block_comments',
          filter: `document_id=eq.${documentId}`,
        },
        (payload) => {
          console.log('Changement détecté sur block_comments:', payload);

          if (payload.eventType === 'INSERT') {
            setComments(prev => [...prev, payload.new as BlockComment]);
          } else if (payload.eventType === 'UPDATE') {
            setComments(prev =>
              prev.map(c =>
                c.id === payload.new.id ? { ...c, ...payload.new } : c
              )
            );
          } else if (payload.eventType === 'DELETE') {
            setComments(prev => prev.filter(c => c.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [documentId]);

  // =====================================================
  // COMMENTAIRES OUVERTS
  // =====================================================

  const openComments = comments.filter(c => c.status === 'open');

  // =====================================================
  // RETOUR DU HOOK
  // =====================================================

  return {
    comments,
    openComments,
    loading,
    error,
    fetchComments,
    addComment,
    replyToComment,
    resolveComment,
    deleteComment,
    getCommentCount,
  };
}

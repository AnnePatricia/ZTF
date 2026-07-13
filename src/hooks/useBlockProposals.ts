// =====================================================
// HOOK: useBlockProposals
// Description: Gestion des propositions de modification
// =====================================================

import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

// =====================================================
// TYPES
// =====================================================

export type ProposalStatus = 'pending' | 'approved' | 'rejected' | 'superseded';

export interface BlockProposal {
  id: string;
  block_id: string;
  document_id: string;
  proposed_by: string;
  content_before: any; // JSON ProseMirror
  content_after: any; // JSON ProseMirror
  diff_summary?: string;
  justification?: string;
  status: ProposalStatus;
  reviewed_by?: string;
  reviewed_at?: string;
  review_comment?: string;
  created_at: string;
  updated_at: string;
}

export interface UseBlockProposalsReturn {
  proposals: BlockProposal[];
  pendingProposals: BlockProposal[];
  loading: boolean;
  error: string | null;
  fetchProposals: (documentId: string) => Promise<void>;
  submitProposal: (proposal: Partial<BlockProposal>) => Promise<BlockProposal | null>;
  approveProposal: (proposalId: string, reviewerId: string, comment?: string) => Promise<boolean>;
  rejectProposal: (proposalId: string, reviewerId: string, comment?: string) => Promise<boolean>;
  getProposalCount: () => number;
}

// =====================================================
// HOOK
// =====================================================

export function useBlockProposals(documentId?: string): UseBlockProposalsReturn {
  const [proposals, setProposals] = useState<BlockProposal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // =====================================================
  // 1. CHARGER LES PROPOSITIONS
  // =====================================================

  const fetchProposals = async (docId: string) => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('block_proposals')
        .select('*')
        .eq('document_id', docId)
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;

      setProposals(data || []);
    } catch (err: any) {
      console.error('Erreur fetchProposals:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // =====================================================
  // 2. SOUMETTRE UNE PROPOSITION
  // =====================================================

  const submitProposal = async (
    proposal: Partial<BlockProposal>
  ): Promise<BlockProposal | null> => {
    try {
      const user = await supabase.auth.getUser();

      const { data, error: createError } = await supabase
        .from('block_proposals')
        .insert([{
          block_id: proposal.block_id,
          document_id: proposal.document_id,
          proposed_by: user.data.user?.id,
          content_before: proposal.content_before,
          content_after: proposal.content_after,
          diff_summary: proposal.diff_summary,
          justification: proposal.justification,
          status: 'pending',
        }])
        .select()
        .single();

      if (createError) throw createError;

      setProposals(prev => [data, ...prev]);
      return data;
    } catch (err: any) {
      console.error('Erreur submitProposal:', err);
      return null;
    }
  };

  // =====================================================
  // 3. APPROUVER UNE PROPOSITION
  // =====================================================

  const approveProposal = async (
    proposalId: string,
    reviewerId: string,
    comment?: string
  ): Promise<boolean> => {
    try {
      // Utiliser la fonction SQL approve_block_proposal
      const { data, error } = await supabase.rpc('approve_block_proposal', {
        p_proposal_id: proposalId,
        p_reviewer_id: reviewerId,
        p_review_comment: comment || null,
      });

      if (error) throw error;

      // Mettre à jour localement
      setProposals(prev =>
        prev.map(p =>
          p.id === proposalId
            ? {
                ...p,
                status: 'approved',
                reviewed_by: reviewerId,
                reviewed_at: new Date().toISOString(),
                review_comment: comment,
              }
            : p
        )
      );

      return data;
    } catch (err: any) {
      console.error('Erreur approveProposal:', err);
      return false;
    }
  };

  // =====================================================
  // 4. REJETER UNE PROPOSITION
  // =====================================================

  const rejectProposal = async (
    proposalId: string,
    reviewerId: string,
    comment?: string
  ): Promise<boolean> => {
    try {
      // Utiliser la fonction SQL reject_block_proposal
      const { error } = await supabase.rpc('reject_block_proposal', {
        p_proposal_id: proposalId,
        p_reviewer_id: reviewerId,
        p_review_comment: comment || null,
      });

      if (error) throw error;

      // Mettre à jour localement
      setProposals(prev =>
        prev.map(p =>
          p.id === proposalId
            ? {
                ...p,
                status: 'rejected',
                reviewed_by: reviewerId,
                reviewed_at: new Date().toISOString(),
                review_comment: comment,
              }
            : p
        )
      );

      return true;
    } catch (err: any) {
      console.error('Erreur rejectProposal:', err);
      return false;
    }
  };

  // =====================================================
  // 5. OBTENIR LE NOMBRE DE PROPOSITIONS EN ATTENTE
  // =====================================================

  const getProposalCount = (): number => {
    return proposals.filter(p => p.status === 'pending').length;
  };

  // =====================================================
  // CHARGEMENT INITIAL
  // =====================================================

  useEffect(() => {
    if (documentId) {
      fetchProposals(documentId);
    }
  }, [documentId]);

  // =====================================================
  // REALTIME SUBSCRIPTION
  // =====================================================

  useEffect(() => {
    if (!documentId) return;

    const channel = supabase
      .channel(`proposals-${documentId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'block_proposals',
          filter: `document_id=eq.${documentId}`,
        },
        (payload) => {
          console.log('Changement détecté sur block_proposals:', payload);

          if (payload.eventType === 'INSERT') {
            setProposals(prev => [payload.new as BlockProposal, ...prev]);
          } else if (payload.eventType === 'UPDATE') {
            setProposals(prev =>
              prev.map(p =>
                p.id === payload.new.id ? { ...p, ...payload.new } : p
              )
            );
          } else if (payload.eventType === 'DELETE') {
            setProposals(prev => prev.filter(p => p.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [documentId]);

  // =====================================================
  // PROPOSITIONS EN ATTENTE
  // =====================================================

  const pendingProposals = proposals.filter(p => p.status === 'pending');

  // =====================================================
  // RETOUR DU HOOK
  // =====================================================

  return {
    proposals,
    pendingProposals,
    loading,
    error,
    fetchProposals,
    submitProposal,
    approveProposal,
    rejectProposal,
    getProposalCount,
  };
}

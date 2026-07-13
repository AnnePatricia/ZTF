// src/hooks/useSuperCorrectionRealtime.ts
import { useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useQueryClient } from '@tanstack/react-query';

export function useSuperCorrectionRealtime(bookId: string | null) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!bookId) return;

    console.log(' Abonnement Realtime pour le livre:', bookId);

    // ✅ Canal pour les commentaires en direct
    const channel = supabase
      .channel(`sc-comments-${bookId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'super_correction_comments',
          filter: `book_id=eq.${bookId}`,
        },
        (payload) => {
          console.log(' Commentaire en direct:', payload.eventType);
          queryClient.invalidateQueries({
            queryKey: ['superCorrectionComments', bookId],
          });
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'super_correction_validations',
          filter: `book_id=eq.${bookId}`,
        },
        (payload) => {
          console.log('✅ Validation en direct:', payload.eventType);
          queryClient.invalidateQueries({
            queryKey: ['superCorrectionValidations', bookId],
          });
          queryClient.invalidateQueries({
            queryKey: ['superCorrectionBook', bookId],
          });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'super_correction_books',
          filter: `book_id=eq.${bookId}`,
        },
        (payload) => {
          console.log(' Statut SC mis à jour:', payload.new);
          queryClient.invalidateQueries({
            queryKey: ['superCorrectionBook', bookId],
          });
          queryClient.invalidateQueries({
            queryKey: ['superCorrectionBooks'],
          });
        }
      )
      .subscribe((status) => {
        console.log('📡 Statut Realtime:', status);
      });

    return () => {
      console.log('🔕 Désabonnement Realtime:', bookId);
      supabase.removeChannel(channel);
    };
  }, [bookId, queryClient]);
}
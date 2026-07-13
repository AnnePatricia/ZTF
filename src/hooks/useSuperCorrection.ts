// src/hooks/useSuperCorrection.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { SuperCorrectionService } from '../services/superCorrectionService';

export function useSuperCorrectionStats() {
  return useQuery({
    queryKey: ['sc-stats'],
    queryFn: () => SuperCorrectionService.getStats()
  });
}

export function useSuperCorrectionPublications() {
  return useQuery({
    queryKey: ['sc-publications'],
    queryFn: () => SuperCorrectionService.getPublications(),
    staleTime: 1000 * 60 * 5,
  });
}

export function useSuperCorrectionPublication(id: string | undefined) {
  return useQuery({
    queryKey: ['sc-publication', id],
    queryFn: () => id ? SuperCorrectionService.getPublication(id) : Promise.resolve(null),
    enabled: !!id,
  });
}

export function useValidateBook() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (correcteurId: string) => SuperCorrectionService.validateBook(correcteurId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sc-publications'] });
      queryClient.invalidateQueries({ queryKey: ['sc-stats'] });
    }
  });
}

export function useAddComment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (params: {
      publicationId: string;
      correcteurId: string;
      contenu: string;
      type: string;
      selectedText?: string;
      anchor?: any;
    }) => SuperCorrectionService.addCommentaire(
      params.publicationId,
      params.correcteurId,
      0,
      0,
      0,
      params.type as any,
      params.contenu
    ),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['sc-publication', variables.publicationId] });
    }
  });
}

export function useResolveComment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ commentId, userId }: { commentId: string, userId: string }) =>
      SuperCorrectionService.resolveCommentaire(commentId, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sc-publications'] });
    }
  });
}
// src/hooks/useEditorialization.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { EditorializationService } from '../services/editorializationService';
import type { PlanItem } from '../types/editorialization';

// =====================================================
// 📚 QUERIES - TÂCHES D'ÉDITORIALISATION
// =====================================================
export function useEditorializationTasks() {
  return useQuery({
    queryKey: ['editorialization-tasks'],
    queryFn: () => EditorializationService.getTasks(),
    staleTime: 1000 * 60 * 2,
  });
}

export function useEditorializationTask(id: string | undefined) {
  return useQuery({
    queryKey: ['editorialization-task', id],
    queryFn: () => id ? EditorializationService.getTask(id) : Promise.resolve(null),
    enabled: !!id,
    staleTime: 1000 * 60 * 5,
  });
}

export function useEditorializationStats() {
  return useQuery({
    queryKey: ['editorialization-stats'],
    queryFn: () => EditorializationService.getStats(),
    staleTime: 1000 * 60 * 5,
  });
}

// =====================================================
// 🧩 QUERIES - FRAGMENTS
// =====================================================
export function useAvailableFragments() {
  return useQuery({
    queryKey: ['d4-fragments'],
    queryFn: () => EditorializationService.getAvailableFragments(),
    staleTime: 1000 * 60 * 5,
  });
}

export function useFragmentsByTheme(theme: string) {
  return useQuery({
    queryKey: ['d4-fragments', 'theme', theme],
    queryFn: () => EditorializationService.getFragmentsByTheme(theme),
    enabled: !!theme && theme !== 'all',
    staleTime: 1000 * 60 * 5,
  });
}

export function useSearchFragments(query: string) {
  return useQuery({
    queryKey: ['d4-fragments', 'search', query],
    queryFn: () => EditorializationService.searchFragments(query),
    enabled: query.length >= 2,
    staleTime: 1000 * 30,
  });
}

export function useManuscriptFragments(taskId: string | undefined) {
  return useQuery({
    queryKey: ['manuscript-fragments', taskId],
    queryFn: () => taskId ? EditorializationService.getManuscriptFragments(taskId) : Promise.resolve([]),
    enabled: !!taskId,
    staleTime: 1000 * 60 * 2,
  });
}

export function useThemes() {
  return useQuery({
    queryKey: ['d4-themes'],
    queryFn: () => EditorializationService.getThemes(),
    staleTime: 1000 * 60 * 10,
  });
}

export function useTransmissions(taskId?: string) {
  return useQuery({
    queryKey: ['d4-transmissions', taskId],
    queryFn: () => EditorializationService.getTransmissions(taskId),
    staleTime: 1000 * 60 * 5,
  });
}

// =====================================================
// ✏️ MUTATIONS - TÂCHES
// =====================================================
export function useCreateTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (params: {
      bookId: string;
      manuscriptTitle?: string;
      manuscriptTheme?: string;
    }) => EditorializationService.createTask(
      params.bookId,
      params.manuscriptTitle,
      params.manuscriptTheme
    ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['editorialization-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['editorialization-stats'] });
    },
  });
}

export function useStartTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (params: { taskId: string; userId: string }) =>
      EditorializationService.startTask(params.taskId, params.userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['editorialization-tasks'] });
    },
  });
}

export function useSaveManuscript() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (params: {
      taskId: string;
      updates: Partial<{
        manuscript_content: string;
        manuscript_title: string;
        manuscript_theme: string;
        structure_plan: PlanItem[];
        selected_fragments: string[];
        word_count: number;
        notes: string;
      }>;
    }) => EditorializationService.saveManuscript(params.taskId, params.updates),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['editorialization-task', variables.taskId] });
    },
  });
}

export function useSubmitTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (params: {
      taskId: string;
      manuscriptContent: string;
      manuscriptTitle: string;
      manuscriptTheme: string;
      structurePlan: PlanItem[];
      selectedFragments: string[];
      wordCount: number;
      notes?: string;
    }) => EditorializationService.submitTask(
      params.taskId,
      params.manuscriptContent,
      params.manuscriptTitle,
      params.manuscriptTheme,
      params.structurePlan,
      params.selectedFragments,
      params.wordCount,
      params.notes
    ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['editorialization-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['editorialization-stats'] });
    },
  });
}

export function useValidateTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (params: { taskId: string; userId: string }) =>
      EditorializationService.validateTask(params.taskId, params.userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['editorialization-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['editorialization-stats'] });
    },
  });
}

export function useRejectTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (params: { taskId: string; userId: string; notes?: string }) =>
      EditorializationService.rejectTask(params.taskId, params.userId, params.notes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['editorialization-tasks'] });
    },
  });
}

export function useDeleteTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (taskId: string) => EditorializationService.deleteTask(taskId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['editorialization-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['editorialization-stats'] });
    },
  });
}

// =====================================================
// 🧩 MUTATIONS - FRAGMENTS DANS LE MANUSCRIT
// =====================================================
export function useInsertFragmentInManuscript() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (params: {
      taskId: string;
      fragmentId: string;
      positionOrder: number;
      partNumber?: number;
      chapterNumber?: number;
      chapterTitle?: string;
      userId?: string;
    }) => EditorializationService.insertFragmentInManuscript(
      params.taskId,
      params.fragmentId,
      params.positionOrder,
      params.partNumber,
      params.chapterNumber,
      params.chapterTitle,
      params.userId
    ),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['manuscript-fragments', variables.taskId] });
    },
  });
}

export function useRemoveFragmentFromManuscript() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (params: { taskId: string; fragmentId: string }) =>
      EditorializationService.removeFragmentFromManuscript(params.taskId, params.fragmentId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['manuscript-fragments', variables.taskId] });
    },
  });
}

export function useReorderFragments() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (params: { taskId: string; fragmentIds: string[] }) =>
      EditorializationService.reorderFragments(params.taskId, params.fragmentIds),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['manuscript-fragments', variables.taskId] });
    },
  });
}

// =====================================================
// 📋 MUTATIONS - PLAN DE STRUCTURE
// =====================================================
export function useSaveStructurePlan() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (params: { taskId: string; plan: PlanItem[] }) =>
      EditorializationService.saveStructurePlan(params.taskId, params.plan),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['editorialization-task', variables.taskId] });
    },
  });
}

// =====================================================
// 📤 MUTATIONS - TRANSMISSION D4 → D5
// =====================================================
export function useCreateTransmission() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (params: {
      taskId: string;
      userId: string;
      structureSummary?: string;
      sourcesUsed?: string[];
      notes?: string;
    }) => EditorializationService.createTransmission(
      params.taskId,
      params.userId,
      params.structureSummary,
      params.sourcesUsed,
      params.notes
    ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['editorialization-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['editorialization-stats'] });
      queryClient.invalidateQueries({ queryKey: ['d4-transmissions'] });
    },
  });
}

// =====================================================
// 🎯 HOOK COMBINÉ POUR L'ÉDITEUR DE MANUSCRIT
// =====================================================
export function useManuscriptEditor(taskId: string | undefined) {
  // ✅ CORRECTION : queryClient est maintenant utilisé via les mutations
  const { data: task, isLoading: taskLoading } = useEditorializationTask(taskId);
  const { data: fragments, isLoading: fragmentsLoading } = useAvailableFragments();
  const { data: manuscriptFragments } = useManuscriptFragments(taskId);
  const { data: themes } = useThemes();

  const saveMutation = useSaveManuscript();
  const submitMutation = useSubmitTask();
  const validateMutation = useValidateTask();
  const insertFragmentMutation = useInsertFragmentInManuscript();
  const removeFragmentMutation = useRemoveFragmentFromManuscript();
  const savePlanMutation = useSaveStructurePlan();
  const createTransmissionMutation = useCreateTransmission();

  const saveManuscript = async (updates: Parameters<typeof saveMutation.mutateAsync>[0]['updates']) => {
    if (!taskId) return;
    await saveMutation.mutateAsync({ taskId, updates });
  };

  const submitManuscript = async (params: Omit<Parameters<typeof submitMutation.mutateAsync>[0], 'taskId'>) => {
    if (!taskId) throw new Error('Task ID requis');
    await submitMutation.mutateAsync({ taskId, ...params });
  };

  const validateManuscript = async (userId: string) => {
    if (!taskId) throw new Error('Task ID requis');
    await validateMutation.mutateAsync({ taskId, userId });
  };

  const insertFragment = async (fragmentId: string, positionOrder: number, userId?: string) => {
    if (!taskId) throw new Error('Task ID requis');
    await insertFragmentMutation.mutateAsync({
      taskId,
      fragmentId,
      positionOrder,
      userId,
    });
  };

  const removeFragment = async (fragmentId: string) => {
    if (!taskId) throw new Error('Task ID requis');
    await removeFragmentMutation.mutateAsync({ taskId, fragmentId });
  };

  const savePlan = async (plan: PlanItem[]) => {
    if (!taskId) throw new Error('Task ID requis');
    await savePlanMutation.mutateAsync({ taskId, plan });
  };

  const createTransmission = async (params: Omit<Parameters<typeof createTransmissionMutation.mutateAsync>[0], 'taskId'>) => {
    if (!taskId) throw new Error('Task ID requis');
    await createTransmissionMutation.mutateAsync({ taskId, ...params });
  };

  return {
    task,
    fragments,
    manuscriptFragments,
    themes,
    loading: taskLoading || fragmentsLoading,
    saving: saveMutation.isPending,
    submitting: submitMutation.isPending,
    saveManuscript,
    submitManuscript,
    validateManuscript,
    insertFragment,
    removeFragment,
    savePlan,
    createTransmission,
    error: saveMutation.error || submitMutation.error || validateMutation.error,
  };
}
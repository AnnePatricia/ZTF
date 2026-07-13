// src/hooks/useZtfBooksQuery.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../supabaseClient';

export interface ZtfBook {
  id: string;
  ztf_id: string;
  title: string;
  subtitle?: string;
  theme: string;
  language: string;
  ztf_status: string;
  current_department: string;
  responsible_id?: string;
  target_date?: string;
  published_date?: string;
  archived_date?: string;
  source_ids?: string[];
  book_project_id?: string;
  metadata?: any;
  created_at: string;
  updated_at: string;
  responsible_name?: string;
  responsible_email?: string;
}

export interface ZtfStats {
  total: number;
  byStatus: Record<string, number>;
  byDepartment: Record<string, number>;
  overdue: number;
  atRisk: number;
  onTrack: number;
}

// ✅ Récupérer les livres avec filtres
export function useZtfBooksQuery(filters?: {
  status?: string | 'all';
  department?: string | 'all';
  theme?: string | 'all';
  language?: string | 'all';
  search?: string;
}) {
  return useQuery({
    queryKey: ['ztfBooks', filters],
    queryFn: async () => {
      let query = supabase
        .from('ztf_books')
        .select(`
          *,
          users!ztf_books_responsible_id_fkey (
            full_name,
            email
          )
        `)
        .order('updated_at', { ascending: false });

      if (filters?.status && filters.status !== 'all') {
        query = query.eq('ztf_status', filters.status);
      }
      if (filters?.department && filters.department !== 'all') {
        query = query.eq('current_department', filters.department);
      }
      if (filters?.theme && filters.theme !== 'all') {
        query = query.eq('theme', filters.theme);
      }
      if (filters?.language && filters.language !== 'all') {
        query = query.eq('language', filters.language);
      }
      if (filters?.search) {
        query = query.ilike('title', `%${filters.search}%`);
      }

      const { data, error } = await query;
      if (error) throw error;

      return (data || []).map((book: any) => ({
        ...book,
        responsible_name: book.users?.full_name || 'Non assigné',
        responsible_email: book.users?.email || '',
      })) as ZtfBook[];
    },
    staleTime: 1000 * 60 * 2, // 2 minutes
  });
}

// ✅ Récupérer un livre unique
export function useZtfBookQuery(bookId: string | null) {
  return useQuery({
    queryKey: ['ztfBook', bookId],
    queryFn: async () => {
      if (!bookId) return null;
      const { data, error } = await supabase
        .from('ztf_books')
        .select(`
          *,
          users!ztf_books_responsible_id_fkey (full_name, email)
        `)
        .eq('id', bookId)
        .single();

      if (error) throw error;
      return data as ZtfBook;
    },
    enabled: !!bookId,
  });
}

// ✅ Créer un livre
export function useCreateZtfBook() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (newBook: Partial<ZtfBook>) => {
      const { data, error } = await supabase
        .from('ztf_books')
        .insert([newBook])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ztfBooks'] });
    },
  });
}

// ✅ Mettre à jour un livre
export function useUpdateZtfBook() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<ZtfBook> }) => {
      const { data, error } = await supabase
        .from('ztf_books')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ztfBooks'] });
      queryClient.invalidateQueries({ queryKey: ['ztfBook'] });
    },
  });
}

// ✅ Supprimer un livre
export function useDeleteZtfBook() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('ztf_books')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ztfBooks'] });
    },
  });
}

// ✅ Changer le statut d'un livre (transition pipeline)
export function useTransitionZtfBookStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      newStatus,
      newDepartment,
    }: {
      id: string;
      newStatus: string;
      newDepartment?: string;
    }) => {
      const updates: any = {
        ztf_status: newStatus,
        updated_at: new Date().toISOString(),
      };
      if (newDepartment) {
        updates.current_department = newDepartment;
      }

      const { data, error } = await supabase
        .from('ztf_books')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ztfBooks'] });
      queryClient.invalidateQueries({ queryKey: ['ztfBook'] });
    },
  });
}

// ✅ Statistiques globales
export function useZtfStats() {
  return useQuery({
    queryKey: ['ztfStats'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ztf_books')
        .select('ztf_status, current_department, target_date');

      if (error) throw error;

      const now = new Date();
      const in7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      const byStatus: Record<string, number> = {};
      const byDepartment: Record<string, number> = {};
      let overdue = 0, atRisk = 0, onTrack = 0;

      (data || []).forEach((book: any) => {
        byStatus[book.ztf_status] = (byStatus[book.ztf_status] || 0) + 1;
        byDepartment[book.current_department] = (byDepartment[book.current_department] || 0) + 1;

        if (book.target_date) {
          const target = new Date(book.target_date);
          if (target < now && !['PUBLISHED', 'ARCHIVED'].includes(book.ztf_status)) {
            overdue++;
          } else if (target < in7Days && !['PUBLISHED', 'ARCHIVED'].includes(book.ztf_status)) {
            atRisk++;
          } else {
            onTrack++;
          }
        }
      });

      return {
        total: (data || []).length,
        byStatus,
        byDepartment,
        overdue,
        atRisk,
        onTrack,
      } as ZtfStats;
    },
    staleTime: 1000 * 60 * 5,
  });
}
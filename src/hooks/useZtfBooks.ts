// src/hooks/useZtfBooks.ts
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';

// Utiliser string au lieu des types spécifiques qui n'existent pas encore
export interface ZtfBook {
  id: string;
  ztf_id: string;
  title: string;
  subtitle?: string;
  theme: string;
  language: string; // Au lieu de ZtfLanguage
  ztf_status: string; // Au lieu de ZtfStatus
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

export function useZtfBooks(filters?: {
  status?: string | 'all';
  department?: string | 'all';
  theme?: string | 'all';
  language?: string | 'all';
  search?: string;
}) {
  const [books, setBooks] = useState<ZtfBook[]>([]);
  const [stats, setStats] = useState<ZtfStats>({
    total: 0,
    byStatus: {},
    byDepartment: {},
    overdue: 0,
    atRisk: 0,
    onTrack: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchBooks = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
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

      const { data, error: fetchError } = await query;
      if (fetchError) throw fetchError;

      const mappedBooks: ZtfBook[] = (data || []).map((book: any) => ({
        ...book,
        responsible_name: book.users?.full_name || 'Non assigné',
        responsible_email: book.users?.email || '',
      }));

      setBooks(mappedBooks);

      const now = new Date();
      const in7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      const byStatus: Record<string, number> = {};
      const byDepartment: Record<string, number> = {};
      let overdue = 0, atRisk = 0, onTrack = 0;

      mappedBooks.forEach(book => {
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

      setStats({
        total: mappedBooks.length,
        byStatus,
        byDepartment,
        overdue,
        atRisk,
        onTrack,
      });
    } catch (err: any) {
      console.error('Erreur fetch ztf_books:', err);
      setError(err.message || 'Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  }, [filters?.status, filters?.department, filters?.theme, filters?.language, filters?.search]);

  useEffect(() => {
    fetchBooks();
  }, [fetchBooks]);

  useEffect(() => {
    console.log('🔔 Setup Realtime pour ztf_books...');
    const channel = supabase
      .channel('ztf_books_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'ztf_books'
        },
        (payload) => {
          console.log('📨 Changement détecté sur ztf_books:', {
            eventType: payload.eventType,
            old: payload.old,
            new: payload.new
          });
          fetchBooks();
        }
      )
      .subscribe((status) => {
        console.log('📡 Statut abonnement Realtime ztf_books:', status);
      });

    return () => {
      console.log('🔕 Désabonnement Realtime ztf_books');
      supabase.removeChannel(channel);
    };
  }, [fetchBooks]);

  return {
    books,
    stats,
    loading,
    error,
    refresh: fetchBooks,
  };
}
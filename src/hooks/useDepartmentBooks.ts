// src/hooks/useDepartmentBooks.ts
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import { DEPARTMENTS } from '../config/departments';
import type { ZtfDepartment, ZtfBook } from '../types/ztf';

export interface DepartmentStats {
  total: number;
  pending: number;
  inProgress: number;
  completed: number;
  returned: number;
}

export function useDepartmentBooks(department: ZtfDepartment) {
  const [books, setBooks] = useState<ZtfBook[]>([]);
  const [stats, setStats] = useState<DepartmentStats>({
    total: 0,
    pending: 0,
    inProgress: 0,
    completed: 0,
    returned: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchBooks = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from('ztf_books')
        .select(`
          *,
          users!ztf_books_responsible_id_fkey (
            full_name,
            email
          )
        `)
        .eq('current_department', department)
        .order('updated_at', { ascending: false });

      if (fetchError) throw fetchError;

      const mappedBooks: ZtfBook[] = (data || []).map((book: any) => ({
        ...book,
        responsible_name: book.users?.full_name || 'Non assigné',
        responsible_email: book.users?.email || ''
      }));

      setBooks(mappedBooks);

      setStats({
        total: mappedBooks.length,
        pending: mappedBooks.filter(b => b.ztf_status === 'PENDING_REVIEW').length,
        inProgress: mappedBooks.filter(b => ['IN_PROGRESS', 'IN_REVIEW'].includes(b.ztf_status)).length,
        completed: mappedBooks.filter(b => b.ztf_status === 'COMPLETED').length,
        returned: mappedBooks.filter(b => b.ztf_status === 'RETURNED').length
      });

    } catch (err: any) {
      console.error(`Erreur fetch ${department}:`, err);
      setError(err.message || 'Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  }, [department]);

  useEffect(() => {
    fetchBooks();
  }, [fetchBooks]);

  // ✅ REALTIME avec filtre par département
  useEffect(() => {
    const channel = supabase
      .channel(`dept_${department}_changes`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'ztf_books',
        filter: `current_department=eq.${department}`
      }, () => {
        console.log('🔄 Realtime: Changement détecté pour', department);
        fetchBooks();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [department, fetchBooks]);

  // ✅ Actions workflow avec REFRESH FORCÉ
  const acceptBook = async (bookId: string, notes?: string) => {
    const book = books.find(b => b.id === bookId);
    if (!book) return { success: false, error: 'Livre non trouvé' };

    const nextDept = DEPARTMENTS[department].nextDepartment;
    const targetStatus = (!nextDept || nextDept === 'PUBLISHED') ? 'PUBLISHED' : 'DRAFT';
    const targetDept = nextDept && nextDept !== 'PUBLISHED' ? nextDept as ZtfDepartment : null;

    const result = await updateBookStatus(bookId, targetStatus, targetDept, notes);
    
    // ✅ FORCER LE REFRESH APRÈS SUCCÈS
    if (result.success) await fetchBooks();
    return result;
  };

  const returnBook = async (bookId: string, reason: string) => {
    const prevDept = DEPARTMENTS[department].previousDepartment;
    if (!prevDept) return { success: false, error: 'Aucun département précédent' };

    const result = await updateBookStatus(bookId, 'RETURNED', prevDept as ZtfDepartment, reason);
    
    // ✅ FORCER LE REFRESH APRÈS SUCCÈS
    if (result.success) await fetchBooks();
    return result;
  };

  const rejectBook = async (bookId: string, reason: string) => {
    const result = await updateBookStatus(bookId, 'REJECTED', null, reason);
    
    // ✅ FORCER LE REFRESH APRÈS SUCCÈS
    if (result.success) await fetchBooks();
    return result;
  };

  const startWork = async (bookId: string) => {
    const result = await updateBookStatus(bookId, 'IN_PROGRESS', null, 'Travail commencé');
    
    // ✅ FORCER LE REFRESH APRÈS SUCCÈS
    if (result.success) await fetchBooks();
    return result;
  };

  const submitForReview = async (bookId: string, notes?: string) => {
    const result = await updateBookStatus(bookId, 'IN_REVIEW', null, notes || 'Soumis pour validation');
    
    // ✅ FORCER LE REFRESH APRÈS SUCCÈS
    if (result.success) await fetchBooks();
    return result;
  };

  const updateBookStatus = async (
    bookId: string,
    status: string,
    newDepartment: ZtfDepartment | null,
    notes?: string
  ) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Non authentifié');

      const updateData: any = {
        ztf_status: status,
        updated_at: new Date().toISOString()
      };

      if (newDepartment) {
        updateData.current_department = newDepartment;
      }

      if (status === 'PUBLISHED') {
        updateData.published_date = new Date().toISOString();
      }

      const { error: updateError } = await supabase
        .from('ztf_books')
        .update(updateData)
        .eq('id', bookId);

      if (updateError) throw updateError;

      await supabase.from('d0_activity_log').insert({
        entity_type: 'ztf_book',
        entity_id: bookId,
        action_type: `workflow_${status.toLowerCase()}`,
        user_id: user.id,
        department: department,
        details: {
          notes,
          from_department: department,
          to_department: newDepartment || 'same'
        },
        new_status: status
      });

      return { success: true };
    } catch (err: any) {
      console.error('Erreur workflow:', err);
      return { success: false, error: err.message };
    }
  };

  return {
    books,
    stats,
    loading,
    error,
    refresh: fetchBooks,
    acceptBook,
    returnBook,
    rejectBook,
    startWork,
    submitForReview
  };
}
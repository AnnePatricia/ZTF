// src/hooks/useZtfPipeline.ts
import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

// Statuts officiels ZTF selon le cahier des charges
export const ZTF_STATUSES = [
  { code: 'DRAFT', label: 'Brouillon', dept: 'D0', color: 'bg-gray-500', icon: 'fa-file', percentage: 0 },
  { code: 'TRANSCRIBED', label: 'Transcrit', dept: 'D2', color: 'bg-blue-500', icon: 'fa-keyboard', percentage: 15 },
  { code: 'CLEANED', label: 'Nettoyé', dept: 'D3', color: 'bg-cyan-500', icon: 'fa-broom', percentage: 30 },
  { code: 'STRUCTURED', label: 'Structuré', dept: 'D4', color: 'bg-indigo-500', icon: 'fa-sitemap', percentage: 50 },
  { code: 'REWRITTEN', label: 'Réécrit', dept: 'D5', color: 'bg-purple-500', icon: 'fa-pen-fancy', percentage: 65 },
  { code: 'CORRECTED', label: 'Corrigé', dept: 'D6', color: 'bg-teal-500', icon: 'fa-spell-check', percentage: 75 },
  { code: 'TRANSLATED', label: 'Traduit', dept: 'D7', color: 'bg-pink-500', icon: 'fa-language', percentage: 88 },
  { code: 'BAT_PENDING', label: 'BAT en attente', dept: 'D8', color: 'bg-orange-500', icon: 'fa-file-pdf', percentage: 95 },
  { code: 'BAT_APPROVED', label: 'BAT approuvé', dept: 'D8', color: 'bg-green-500', icon: 'fa-check-circle', percentage: 98 },
  { code: 'PUBLISHED', label: 'Publié', dept: 'D0', color: 'bg-emerald-600', icon: 'fa-book', percentage: 100 },
];

export interface ZtfBook {
  id: string;
  ztf_id: string;
  title: string;
  theme: string;
  language: string;
  ztf_status: string;
  current_department: string;
  word_count: number;
  created_at: string;
  updated_at: string;
}

export function useZtfPipeline() {
  const [books, setBooks] = useState<ZtfBook[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadBooks = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('ztf_books')
        .select('*')
        .order('updated_at', { ascending: false });

      if (error) throw error;
      setBooks(data || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBooks();
  }, []);

  // Regrouper les livres par statut
  const booksByStatus = ZTF_STATUSES.reduce((acc, status) => {
    acc[status.code] = books.filter(b => b.ztf_status === status.code);
    return acc;
  }, {} as Record<string, ZtfBook[]>);

  // Statistiques
  const stats = {
    total: books.length,
    byDept: ZTF_STATUSES.reduce((acc, status) => {
      const dept = status.dept;
      if (!acc[dept]) acc[dept] = 0;
      acc[dept] += booksByStatus[status.code]?.length || 0;
      return acc;
    }, {} as Record<string, number>),
    published: booksByStatus['PUBLISHED']?.length || 0,
    inProgress: books.filter(b => !['PUBLISHED', 'ARCHIVED', 'DRAFT'].includes(b.ztf_status)).length,
  };

  // Changer le statut d'un livre
  const updateBookStatus = async (bookId: string, newStatus: string) => {
    try {
      const newStatusConfig = ZTF_STATUSES.find(s => s.code === newStatus);
      if (!newStatusConfig) throw new Error('Statut invalide');

      const { error } = await supabase
        .from('ztf_books')
        .update({
          ztf_status: newStatus,
          current_department: newStatusConfig.dept,
          updated_at: new Date().toISOString()
        })
        .eq('id', bookId);

      if (error) throw error;
      
      await loadBooks();
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  };

  return {
    books,
    booksByStatus,
    stats,
    loading,
    error,
    updateBookStatus,
    refresh: loadBooks,
  };
}
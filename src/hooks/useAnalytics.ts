// src/hooks/useAnalytics.ts
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';

export interface KPI {
  totalBooks: number;
  published: number;
  inProgress: number;
  draft: number;
  returned: number;
  rejected: number;
  totalWords: number;
  avgWordsPerBook: number;
  avgDaysPerBook: number;
}

export interface DepartmentStats {
  department: string;
  label: string;
  icon: string;
  color: string;
  totalBooks: number;
  completed: number;
  inProgress: number;
  pending: number;
  avgDays: number;
  totalWords: number;
}

export interface StatusDistribution {
  status: string;
  label: string;
  count: number;
  percentage: number;
  color: string;
}

export interface Activity {
  id: string;
  action_type: string;
  entity_type: string;
  entity_id: string;
  user_id: string;
  department: string;
  details: any;
  new_status: string;
  created_at: string;
  user_name?: string;
  book_title?: string;
}

export interface TopContributor {
  user_id: string;
  user_name: string;
  books_count: number;
  words_count: number;
  departments: string[];
}

export interface FilterOptions {
  period: 'week' | 'month' | 'quarter' | 'year' | 'all';
  department: string | 'all';
  status: string | 'all';
  responsible: string | 'all';
}

export function useAnalytics() {
  const [kpi, setKpi] = useState<KPI | null>(null);
  const [departmentStats, setDepartmentStats] = useState<DepartmentStats[]>([]);
  const [statusDistribution, setStatusDistribution] = useState<StatusDistribution[]>([]);
  const [recentActivity, setRecentActivity] = useState<Activity[]>([]);
  const [topContributors, setTopContributors] = useState<TopContributor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<FilterOptions>({
    period: 'month',
    department: 'all',
    status: 'all',
    responsible: 'all'
  });

  const DEPARTMENTS_CONFIG = [
    { dept: 'D0', label: 'Registre', icon: 'fa-database', color: 'bg-purple-500' },
    { dept: 'D2', label: 'Transcription', icon: 'fa-keyboard', color: 'bg-blue-500' },
    { dept: 'D3', label: 'Nettoyage', icon: 'fa-broom', color: 'bg-cyan-500' },
    { dept: 'D4', label: 'Éditorialisation', icon: 'fa-book', color: 'bg-indigo-500' },
    { dept: 'D5', label: 'Style', icon: 'fa-pen-fancy', color: 'bg-pink-500' },
    { dept: 'D6', label: 'Super Correction', icon: 'fa-edit', color: 'bg-emerald-500' },
    { dept: 'D7', label: 'Traduction', icon: 'fa-language', color: 'bg-amber-500' },
    { dept: 'D8', label: 'BAT', icon: 'fa-check-circle', color: 'bg-violet-500' },
  ];

  const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
    'DRAFT': { label: 'Brouillon', color: 'bg-gray-500' },
    'IN_PROGRESS': { label: 'En cours', color: 'bg-blue-500' },
    'IN_REVIEW': { label: 'En revue', color: 'bg-purple-500' },
    'RETURNED': { label: 'Retourné', color: 'bg-orange-500' },
    'REJECTED': { label: 'Rejeté', color: 'bg-red-500' },
    'PUBLISHED': { label: 'Publié', color: 'bg-green-500' },
    'PENDING_REVIEW': { label: 'En attente', color: 'bg-yellow-500' },
  };

  const getPeriodDate = () => {
    const now = new Date();
    switch (filters.period) {
      case 'week': return new Date(now.setDate(now.getDate() - 7)).toISOString();
      case 'month': return new Date(now.setMonth(now.getMonth() - 1)).toISOString();
      case 'quarter': return new Date(now.setMonth(now.getMonth() - 3)).toISOString();
      case 'year': return new Date(now.setFullYear(now.getFullYear() - 1)).toISOString();
      default: return '2020-01-01T00:00:00Z';
    }
  };

  const loadKPI = useCallback(async () => {
    const periodDate = getPeriodDate(); 
    try {
      const { data: books, error } = await supabase
        .from('ztf_books')
        .select('id, ztf_status, created_at, published_date, current_department')
        .gte('created_at', periodDate);

      if (error) throw error;

      const totalBooks = books?.length || 0;
      const published = books?.filter(b => b.ztf_status === 'PUBLISHED').length || 0;
      const inProgress = books?.filter(b => ['IN_PROGRESS', 'IN_REVIEW'].includes(b.ztf_status)).length || 0;
      const draft = books?.filter(b => b.ztf_status === 'DRAFT').length || 0;
      const returned = books?.filter(b => b.ztf_status === 'RETURNED').length || 0;
      const rejected = books?.filter(b => b.ztf_status === 'REJECTED').length || 0;

      // Calculer le total de mots
      const { data: contents } = await supabase
        .from('book_content')
        .select('word_count');

      const totalWords = contents?.reduce((sum, c) => sum + (c.word_count || 0), 0) || 0;
      const avgWordsPerBook = totalBooks > 0 ? Math.round(totalWords / totalBooks) : 0;

      // Calculer le temps moyen par livre (jours entre création et publication)
      const publishedBooks = books?.filter(b => b.ztf_status === 'PUBLISHED' && b.published_date && b.created_at) || [];
      let avgDaysPerBook = 0;
      if (publishedBooks.length > 0) {
        const totalDays = publishedBooks.reduce((sum, b) => {
          const days = (new Date(b.published_date).getTime() - new Date(b.created_at).getTime()) / (1000 * 60 * 60 * 24);
          return sum + days;
        }, 0);
        avgDaysPerBook = Math.round(totalDays / publishedBooks.length);
      }

      setKpi({
        totalBooks,
        published,
        inProgress,
        draft,
        returned,
        rejected,
        totalWords,
        avgWordsPerBook,
        avgDaysPerBook
      });
    } catch (err: any) {
      console.error('Erreur chargement KPI:', err);
      setError(err.message);
    }
  }, []);

  const loadDepartmentStats = useCallback(async () => {
    try {
      const stats: DepartmentStats[] = [];

      for (const dep of DEPARTMENTS_CONFIG) {
        const { data: contents } = await supabase
          .from('book_content')
          .select('book_id, word_count, updated_at')
          .eq('department', dep.dept);

        const uniqueBooks = new Set(contents?.map(c => c.book_id) || []);
        const totalWords = contents?.reduce((sum, c) => sum + (c.word_count || 0), 0) || 0;

        // Calculer les jours moyens
        let avgDays = 0;
        if (contents && contents.length > 0) {
          const dates = contents.map(c => new Date(c.updated_at).getTime());
          const minDate = Math.min(...dates);
          const maxDate = Math.max(...dates);
          avgDays = Math.round((maxDate - minDate) / (1000 * 60 * 60 * 24));
        }

        stats.push({
          department: dep.dept,
          label: dep.label,
          icon: dep.icon,
          color: dep.color,
          totalBooks: uniqueBooks.size,
          completed: uniqueBooks.size,
          inProgress: 0,
          pending: 0,
          avgDays,
          totalWords
        });
      }

      setDepartmentStats(stats);
    } catch (err: any) {
      console.error('Erreur chargement stats départements:', err);
    }
  }, []);

  const loadStatusDistribution = useCallback(async () => {
    try {
      const { data: books } = await supabase
        .from('ztf_books')
        .select('ztf_status');

      const statusCounts: Record<string, number> = {};
      books?.forEach(b => {
        statusCounts[b.ztf_status] = (statusCounts[b.ztf_status] || 0) + 1;
      });

      const total = books?.length || 0;
      const distribution: StatusDistribution[] = Object.entries(statusCounts).map(([status, count]) => ({
        status,
        label: STATUS_CONFIG[status]?.label || status,
        count,
        percentage: total > 0 ? Math.round((count / total) * 100) : 0,
        color: STATUS_CONFIG[status]?.color || 'bg-gray-500'
      }));

      setStatusDistribution(distribution);
    } catch (err: any) {
      console.error('Erreur chargement distribution:', err);
    }
  }, []);

  const loadRecentActivity = useCallback(async () => {
    try {
      const { data: activities } = await supabase
        .from('d0_activity_log')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);

      if (activities && activities.length > 0) {
        const userIds = [...new Set(activities.map(a => a.user_id).filter(Boolean))];
        let usersMap: Record<string, string> = {};

        if (userIds.length > 0) {
          const { data: usersData } = await supabase
            .from('users')
            .select('id, full_name')
            .in('id', userIds);

          if (usersData) {
            usersMap = Object.fromEntries(usersData.map(u => [u.id, u.full_name || 'Utilisateur']));
          }
        }

        // Charger les titres des livres
        const bookIds = [...new Set(activities.map(a => a.entity_id).filter(Boolean))];
        let booksMap: Record<string, string> = {};

        if (bookIds.length > 0) {
          const { data: booksData } = await supabase
            .from('ztf_books')
            .select('id, title')
            .in('id', bookIds);

          if (booksData) {
            booksMap = Object.fromEntries(booksData.map(b => [b.id, b.title]));
          }
        }

        setRecentActivity(activities.map(a => ({
          ...a,
          user_name: usersMap[a.user_id] || 'Inconnu',
          book_title: booksMap[a.entity_id] || 'Livre inconnu'
        })));
      } else {
        setRecentActivity([]);
      }
    } catch (err: any) {
      console.error('Erreur chargement activité:', err);
    }
  }, []);

  const loadTopContributors = useCallback(async () => {
    try {
      const { data: books } = await supabase
        .from('ztf_books')
        .select('responsible_id, id');

      if (!books || books.length === 0) {
        setTopContributors([]);
        return;
      }

      const responsibleMap: Record<string, { books: string[] }> = {};
      books.forEach(b => {
        if (b.responsible_id) {
          if (!responsibleMap[b.responsible_id]) {
            responsibleMap[b.responsible_id] = { books: [] };
          }
          responsibleMap[b.responsible_id].books.push(b.id);
        }
      });

      // Charger les mots par responsable
      const contributors: TopContributor[] = [];
      for (const [userId, data] of Object.entries(responsibleMap)) {
        const { data: contents } = await supabase
          .from('book_content')
          .select('word_count, department')
          .in('book_id', data.books);

        const totalWords = contents?.reduce((sum, c) => sum + (c.word_count || 0), 0) || 0;
        const departments = [...new Set(contents?.map(c => c.department) || [])];

        contributors.push({
          user_id: userId,
          user_name: '',
          books_count: data.books.length,
          words_count: totalWords,
          departments
        });
      }

      // Charger les noms
      const userIds = contributors.map(c => c.user_id);
      if (userIds.length > 0) {
        const { data: usersData } = await supabase
          .from('users')
          .select('id, full_name')
          .in('id', userIds);

        if (usersData) {
          const namesMap = Object.fromEntries(usersData.map(u => [u.id, u.full_name || 'Utilisateur']));
          contributors.forEach(c => {
            c.user_name = namesMap[c.user_id] || 'Inconnu';
          });
        }
      }

      contributors.sort((a, b) => b.words_count - a.words_count);
      setTopContributors(contributors.slice(0, 10));
    } catch (err: any) {
      console.error('Erreur chargement contributeurs:', err);
    }
  }, []);

  const loadAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      await Promise.all([
        loadKPI(),
        loadDepartmentStats(),
        loadStatusDistribution(),
        loadRecentActivity(),
        loadTopContributors()
      ]);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [loadKPI, loadDepartmentStats, loadStatusDistribution, loadRecentActivity, loadTopContributors]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const refresh = () => loadAll();

  return {
    kpi,
    departmentStats,
    statusDistribution,
    recentActivity,
    topContributors,
    loading,
    error,
    filters,
    setFilters,
    refresh
  };
}
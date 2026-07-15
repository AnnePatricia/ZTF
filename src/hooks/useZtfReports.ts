// src/hooks/useZtfReports.ts
import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

export interface ZtfReport {
  totalBooks: number;
  byStatus: Record<string, number>;
  byDepartment: Record<string, number>;
  byTheme: Record<string, number>;
  byLanguage: Record<string, number>;
  totalWords: number;
  averageWordsPerBook: number;
  averageDaysPerBook: number;
  published: number;
  inProgress: number;
  drafts: number;
  rejected: number;
  returned: number;
  activeUsers: number;
  recentActivity: ActivityLog[];
  departmentMetrics: DepartmentMetric[];
  contributorMetrics: ContributorMetric[];
}

export interface ActivityLog {
  id: string;
  book_id: string;
  book_title: string;
  action: string;
  from_status: string | null;
  to_status: string;
  user_email: string;
  user_name: string;
  created_at: string;
}

export interface DepartmentMetric {
  department: string;
  totalTasks: number;
  completed: number;
  inProgress: number;
  pending: number;
  averageDays: number;
  rejectionRate: number;
}

export interface ContributorMetric {
  user_id: string;
  user_name: string;
  user_email: string;
  department: string;
  tasksCompleted: number;
  tasksInProgress: number;
  averageDays: number;
  rejectionRate: number;
}

export function useZtfReports() {
  const [report, setReport] = useState<ZtfReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadReport = async () => {
    setLoading(true);
    try {
      // 1. Statistiques globales des livres
      const { data: books, error: booksError } = await supabase
        .from('ztf_books')
        .select('*');
      
      if (booksError) throw booksError;

      const totalBooks = books?.length || 0;
      const totalWords = books?.reduce((sum, b) => sum + (b.word_count || 0), 0) || 0;
      const averageWordsPerBook = totalBooks > 0 ? Math.round(totalWords / totalBooks) : 0;

      // Par statut
      const byStatus: Record<string, number> = {};
      books?.forEach(b => {
        const status = b.ztf_status || 'DRAFT';
        byStatus[status] = (byStatus[status] || 0) + 1;
      });

      // Par département
      const byDepartment: Record<string, number> = {};
      books?.forEach(b => {
        const dept = b.current_department || 'D0';
        byDepartment[dept] = (byDepartment[dept] || 0) + 1;
      });

      // Par thème
      const byTheme: Record<string, number> = {};
      books?.forEach(b => {
        const theme = b.theme || 'Non catégorisé';
        byTheme[theme] = (byTheme[theme] || 0) + 1;
      });

      // Par langue
      const byLanguage: Record<string, number> = {};
      books?.forEach(b => {
        const lang = b.language || 'EN';
        byLanguage[lang] = (byLanguage[lang] || 0) + 1;
      });

      const published = byStatus['PUBLISHED'] || 0;
      const drafts = byStatus['DRAFT'] || 0;
      const inProgress = totalBooks - published - drafts;
      const rejected = byStatus['REJECTED'] || 0;
      const returned = byStatus['RETURNED'] || 0;

      // 2. Utilisateurs actifs
      const { data: users, error: usersError } = await supabase
        .from('ztf_users')
        .select('id, full_name, email, role, department');
      
      if (usersError) throw usersError;
      const activeUsers = users?.length || 0;

      // 3. Activité récente
      const { data: activity } = await supabase
        .from('ztf_activity_log')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);

      const recentActivity: ActivityLog[] = activity?.map(a => ({
        id: a.id,
        book_id: a.book_id,
        book_title: a.book?.title || 'Inconnu',
        action: a.action,
        from_status: a.from_status,
        to_status: a.to_status,
        user_email: a.user?.email || 'Système',
        user_name: a.user?.full_name || 'Système',
        created_at: a.created_at,
      })) || [];

      // 4. Métriques par département
      const departmentMetrics: DepartmentMetric[] = [
        { department: 'D0', totalTasks: byDepartment['D0'] || 0, completed: 0, inProgress: 0, pending: 0, averageDays: 0, rejectionRate: 0 },
        { department: 'D2', totalTasks: byDepartment['D2'] || 0, completed: 0, inProgress: 0, pending: 0, averageDays: 0, rejectionRate: 0 },
        { department: 'D3', totalTasks: byDepartment['D3'] || 0, completed: 0, inProgress: 0, pending: 0, averageDays: 0, rejectionRate: 0 },
        { department: 'D4', totalTasks: byDepartment['D4'] || 0, completed: 0, inProgress: 0, pending: 0, averageDays: 0, rejectionRate: 0 },
        { department: 'D5', totalTasks: byDepartment['D5'] || 0, completed: 0, inProgress: 0, pending: 0, averageDays: 0, rejectionRate: 0 },
        { department: 'D6', totalTasks: byDepartment['D6'] || 0, completed: 0, inProgress: 0, pending: 0, averageDays: 0, rejectionRate: 0 },
        { department: 'D7', totalTasks: byDepartment['D7'] || 0, completed: 0, inProgress: 0, pending: 0, averageDays: 0, rejectionRate: 0 },
        { department: 'D8', totalTasks: byDepartment['D8'] || 0, completed: 0, inProgress: 0, pending: 0, averageDays: 0, rejectionRate: 0 },
      ];

      // 5. Métriques par contributeur
      const contributorMetrics: ContributorMetric[] = users?.map(u => ({
        user_id: u.id,
        user_name: u.full_name,
        user_email: u.email,
        department: u.department || 'D0',
        tasksCompleted: 0,
        tasksInProgress: 0,
        averageDays: 0,
        rejectionRate: 0,
      })) || [];

      setReport({
        totalBooks,
        byStatus,
        byDepartment,
        byTheme,
        byLanguage,
        totalWords,
        averageWordsPerBook,
        averageDaysPerBook: 0,
        published,
        inProgress,
        drafts,
        rejected,
        returned,
        activeUsers,
        recentActivity,
        departmentMetrics,
        contributorMetrics,
      });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReport();
  }, []);

  const exportCSV = () => {
    if (!report) return;
    
    const csvContent = [
      ['Rapport ZTF-GEST', new Date().toLocaleDateString('fr-FR')],
      [],
      ['Statistiques globales'],
      ['Total livres', report.totalBooks],
      ['Publiés', report.published],
      ['En cours', report.inProgress],
      ['Brouillons', report.drafts],
      ['Rejetés', report.rejected],
      ['Total mots', report.totalWords],
      ['Mots/livre', report.averageWordsPerBook],
      ['Utilisateurs actifs', report.activeUsers],
      [],
      ['Par département'],
      ['Département', 'Nombre'],
      ...Object.entries(report.byDepartment).map(([dept, count]) => [dept, count]),
      [],
      ['Par statut'],
      ['Statut', 'Nombre'],
      ...Object.entries(report.byStatus).map(([status, count]) => [status, count]),
      [],
      ['Par thème'],
      ['Thème', 'Nombre'],
      ...Object.entries(report.byTheme).map(([theme, count]) => [theme, count]),
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `rapport_ztf_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  return {
    report,
    loading,
    error,
    refresh: loadReport,
    exportCSV,
  };
}
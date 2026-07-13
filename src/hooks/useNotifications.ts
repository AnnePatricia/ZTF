// src/hooks/useNotifications.ts
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import type { Notification, Reminder, DailyStats, DepartmentStats, ReminderType } from '../types/notifications';
import { useRoles } from './useRoles';

export function useNotifications() {
  const { currentUser } = useRoles();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [dailyStats, setDailyStats] = useState<DailyStats[]>([]);
  const [departmentStats, setDepartmentStats] = useState<DepartmentStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadNotifications = useCallback(async () => {
    if (!currentUser) return;
    try {
      const { data, error: fetchError } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', currentUser.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (fetchError) throw fetchError;
      setNotifications(data || []);
      setUnreadCount(data?.filter(n => !n.is_read).length || 0);
    } catch (err: any) {
      console.error('Erreur chargement notifications:', err);
      setError(err.message);
    }
  }, [currentUser]);

  const loadReminders = useCallback(async () => {
    try {
      const { data, error: fetchError } = await supabase
        .from('reminders')
        .select('*')
        .eq('is_sent', false)
        .eq('is_cancelled', false)
        .order('scheduled_at', { ascending: true });

      if (fetchError) throw fetchError;
      setReminders(data || []);
    } catch (err: any) {
      console.error('Erreur chargement rappels:', err);
    }
  }, []);

  const loadDailyStats = useCallback(async (days: number = 30) => {
    try {
      const { data, error: fetchError } = await supabase
        .from('daily_stats')
        .select('*')
        .gte('stat_date', new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
        .order('stat_date', { ascending: true });

      if (fetchError) throw fetchError;
      setDailyStats(data || []);
    } catch (err: any) {
      console.error('Erreur chargement stats:', err);
    }
  }, []);

  // ✅ VERSION CORRIGÉE - utilise les VRAIES colonnes de votre BDD
  const loadDepartmentStats = useCallback(async () => {
    try {
      const stats: DepartmentStats[] = [];

      // D2 - Transcription (status + word_count existent)
      const { data: d2Tasks } = await supabase
        .from('transcription_tasks')
        .select('status, word_count, created_at, updated_at');
      
      if (d2Tasks) {
        const total = d2Tasks.length;
        const pending = d2Tasks.filter(t => t.status === 'pending').length;
        const inProgress = d2Tasks.filter(t => t.status === 'in_progress').length;
        const completed = d2Tasks.filter(t => ['verified', 'published'].includes(t.status)).length;
        const rejected = d2Tasks.filter(t => t.status === 'rejected').length;
        const totalWords = d2Tasks.reduce((sum, t) => sum + (t.word_count || 0), 0);
        
        const completedTasks = d2Tasks.filter(t => ['verified', 'published'].includes(t.status));
        let avgHours = 0;
        if (completedTasks.length > 0) {
          const totalHours = completedTasks.reduce((sum, t) => {
            const created = new Date(t.created_at).getTime();
            const updated = new Date(t.updated_at).getTime();
            return sum + (updated - created) / (1000 * 60 * 60);
          }, 0);
          avgHours = totalHours / completedTasks.length;
        }
        
        stats.push({
          department: 'D2',
          total_tasks: total,
          pending,
          in_progress: inProgress,
          completed,
          rejected,
          avg_completion_hours: Math.round(avgHours * 100) / 100,
          total_words: totalWords,
          efficiency_score: total > 0 ? Math.round((completed / total) * 10000) / 100 : 0,
        });
      }

      // D3 - Nettoyage (status existe, mais word_count_cleaned au lieu de word_count)
      const { data: d3Tasks } = await supabase
        .from('cleaning_tasks')
        .select('status, word_count_cleaned, created_at, updated_at');
      
      if (d3Tasks) {
        const total = d3Tasks.length;
        const pending = d3Tasks.filter(t => t.status === 'pending').length;
        const inProgress = d3Tasks.filter(t => t.status === 'in_progress').length;
        const completed = d3Tasks.filter(t => ['verified', 'published'].includes(t.status)).length;
        const rejected = d3Tasks.filter(t => t.status === 'rejected').length;
        const totalWords = d3Tasks.reduce((sum, t) => sum + (t.word_count_cleaned || 0), 0);
        
        const completedTasks = d3Tasks.filter(t => ['verified', 'published'].includes(t.status));
        let avgHours = 0;
        if (completedTasks.length > 0) {
          const totalHours = completedTasks.reduce((sum, t) => {
            const created = new Date(t.created_at).getTime();
            const updated = new Date(t.updated_at).getTime();
            return sum + (updated - created) / (1000 * 60 * 60);
          }, 0);
          avgHours = totalHours / completedTasks.length;
        }
        
        stats.push({
          department: 'D3',
          total_tasks: total,
          pending,
          in_progress: inProgress,
          completed,
          rejected,
          avg_completion_hours: Math.round(avgHours * 100) / 100,
          total_words: totalWords,
          efficiency_score: total > 0 ? Math.round((completed / total) * 10000) / 100 : 0,
        });
      }

      // D4 - Éditorialisation (evaluation au lieu de status, word_count existe)
      const { data: d4Fragments } = await supabase
        .from('thematic_fragments')
        .select('evaluation, word_count, created_at, updated_at');
      
      if (d4Fragments) {
        const total = d4Fragments.length;
        const pending = d4Fragments.filter(f => f.evaluation === 'pending').length;
        const completed = d4Fragments.filter(f => f.evaluation === 'essential' || f.evaluation === 'complementary').length;
        const rejected = d4Fragments.filter(f => f.evaluation === 'off_topic').length;
        const totalWords = d4Fragments.reduce((sum, f) => sum + (f.word_count || 0), 0);
        
        stats.push({
          department: 'D4',
          total_tasks: total,
          pending,
          in_progress: 0,
          completed,
          rejected,
          avg_completion_hours: 0,
          total_words: totalWords,
          efficiency_score: total > 0 ? Math.round((completed / total) * 10000) / 100 : 0,
        });
      }

      // D5 - Super Correction (status + word_count existent)
      const { data: d5Tasks } = await supabase
        .from('super_correction_tasks')
        .select('status, word_count, created_at, updated_at');
      
      if (d5Tasks) {
        const total = d5Tasks.length;
        const pending = d5Tasks.filter(t => t.status === 'pending').length;
        const inProgress = d5Tasks.filter(t => t.status === 'in_progress').length;
        const completed = d5Tasks.filter(t => ['verified', 'locked'].includes(t.status)).length;
        const rejected = d5Tasks.filter(t => t.status === 'rejected').length;
        const totalWords = d5Tasks.reduce((sum, t) => sum + (t.word_count || 0), 0);
        
        const completedTasks = d5Tasks.filter(t => ['verified', 'locked'].includes(t.status));
        let avgHours = 0;
        if (completedTasks.length > 0) {
          const totalHours = completedTasks.reduce((sum, t) => {
            const created = new Date(t.created_at).getTime();
            const updated = new Date(t.updated_at).getTime();
            return sum + (updated - created) / (1000 * 60 * 60);
          }, 0);
          avgHours = totalHours / completedTasks.length;
        }
        
        stats.push({
          department: 'D5',
          total_tasks: total,
          pending,
          in_progress: inProgress,
          completed,
          rejected,
          avg_completion_hours: Math.round(avgHours * 100) / 100,
          total_words: totalWords,
          efficiency_score: total > 0 ? Math.round((completed / total) * 10000) / 100 : 0,
        });
      }

      // D6 - Relecture 1 (status + word_count existent)
      const { data: d6Tasks } = await supabase
        .from('proofreading_v1_tasks')
        .select('status, word_count, created_at, updated_at');
      
      if (d6Tasks) {
        const total = d6Tasks.length;
        const pending = d6Tasks.filter(t => t.status === 'pending').length;
        const inProgress = d6Tasks.filter(t => t.status === 'in_progress').length;
        const completed = d6Tasks.filter(t => ['verified', 'locked'].includes(t.status)).length;
        const rejected = d6Tasks.filter(t => t.status === 'rejected').length;
        const totalWords = d6Tasks.reduce((sum, t) => sum + (t.word_count || 0), 0);
        
        stats.push({
          department: 'D6',
          total_tasks: total,
          pending,
          in_progress: inProgress,
          completed,
          rejected,
          avg_completion_hours: 0,
          total_words: totalWords,
          efficiency_score: total > 0 ? Math.round((completed / total) * 10000) / 100 : 0,
        });
      }

      // D7 - Relecture 2 (status + word_count existent)
      const { data: d7Tasks } = await supabase
        .from('proofreading_v2_tasks')
        .select('status, word_count, created_at, updated_at');
      
      if (d7Tasks) {
        const total = d7Tasks.length;
        const pending = d7Tasks.filter(t => t.status === 'pending').length;
        const inProgress = d7Tasks.filter(t => t.status === 'in_progress').length;
        const completed = d7Tasks.filter(t => ['bat_validated', 'signed', 'archived'].includes(t.status)).length;
        const rejected = d7Tasks.filter(t => t.status === 'rejected').length;
        const totalWords = d7Tasks.reduce((sum, t) => sum + (t.word_count || 0), 0);
        
        stats.push({
          department: 'D7',
          total_tasks: total,
          pending,
          in_progress: inProgress,
          completed,
          rejected,
          avg_completion_hours: 0,
          total_words: totalWords,
          efficiency_score: total > 0 ? Math.round((completed / total) * 10000) / 100 : 0,
        });
      }

      // D8 - Publication (status existe, MAIS PAS word_count !)
      const { data: d8Tasks } = await supabase
        .from('publication_tasks')
        .select('status, created_at, updated_at');
      
      if (d8Tasks) {
        const total = d8Tasks.length;
        const pending = d8Tasks.filter(t => t.status === 'pending').length;
        const inProgress = d8Tasks.filter(t => ['metadata_pending', 'cover_pending', 'formats_generating'].includes(t.status)).length;
        const completed = d8Tasks.filter(t => ['published', 'registered'].includes(t.status)).length;
        const rejected = d8Tasks.filter(t => t.status === 'rejected').length;
        
        stats.push({
          department: 'D8',
          total_tasks: total,
          pending,
          in_progress: inProgress,
          completed,
          rejected,
          avg_completion_hours: 0,
          total_words: 0,  // Pas de word_count dans publication_tasks
          efficiency_score: total > 0 ? Math.round((completed / total) * 10000) / 100 : 0,
        });
      }

      setDepartmentStats(stats);
    } catch (err: any) {
      console.error('Erreur chargement stats départements:', err);
    }
  }, []);

  const markAsRead = useCallback(async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq('id', notificationId);

      if (error) throw error;
      await loadNotifications();
    } catch (err: any) {
      console.error('Erreur markAsRead:', err);
    }
  }, [loadNotifications]);

  const markAllAsRead = useCallback(async () => {
    if (!currentUser) return;
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq('user_id', currentUser.id)
        .eq('is_read', false);

      if (error) throw error;
      await loadNotifications();
    } catch (err: any) {
      console.error('Erreur markAllAsRead:', err);
    }
  }, [currentUser, loadNotifications]);

  const deleteNotification = useCallback(async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', notificationId);

      if (error) throw error;
      await loadNotifications();
    } catch (err: any) {
      console.error('Erreur deleteNotification:', err);
    }
  }, [loadNotifications]);

  const createReminder = useCallback(async (
    taskType: string,
    taskId: string,
    bookId: string,
    assignedTo: string,
    reminderType: ReminderType,
    hoursDelay: number = 48,
    message?: string
  ) => {
    try {
      const { data, error } = await supabase
        .rpc('create_reminder', {
          p_task_type: taskType,
          p_task_id: taskId,
          p_book_id: bookId,
          p_assigned_to: assignedTo,
          p_reminder_type: reminderType,
          p_hours_delay: hoursDelay,
          p_message: message || null
        });

      if (error) throw error;
      await loadReminders();
      return data;
    } catch (err: any) {
      console.error('Erreur createReminder:', err);
      return null;
    }
  }, [loadReminders]);

  const cancelReminder = useCallback(async (reminderId: string) => {
    try {
      const { error } = await supabase
        .from('reminders')
        .update({ is_cancelled: true, updated_at: new Date().toISOString() })
        .eq('id', reminderId);

      if (error) throw error;
      await loadReminders();
    } catch (err: any) {
      console.error('Erreur cancelReminder:', err);
    }
  }, [loadReminders]);

  useEffect(() => {
    if (currentUser) {
      setLoading(true);
      Promise.all([
        loadNotifications(),
        loadReminders(),
        loadDailyStats(),
        loadDepartmentStats()
      ]).finally(() => setLoading(false));
    }
  }, [currentUser, loadNotifications, loadReminders, loadDailyStats, loadDepartmentStats]);

  useEffect(() => {
    if (!currentUser) return;

    const channel = supabase
      .channel('notifications')
      .on('postgres_changes', 
        { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${currentUser.id}` },
        () => {
          loadNotifications();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUser, loadNotifications]);

  return {
    notifications,
    unreadCount,
    reminders,
    dailyStats,
    departmentStats,
    loading,
    error,
    refresh: () => {
      loadNotifications();
      loadReminders();
      loadDailyStats();
      loadDepartmentStats();
    },
    markAsRead,
    markAllAsRead,
    deleteNotification,
    createReminder,
    cancelReminder,
  };
}
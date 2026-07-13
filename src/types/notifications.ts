// src/types/notifications.ts

export type NotificationType = 
  | 'task_assigned'
  | 'task_completed'
  | 'task_rejected'
  | 'task_validated'
  | 'reminder'
  | 'comment'
  | 'system'
  | 'deadline';

export type ReminderType = 
  | 'task_pending'
  | 'validation_pending'
  | 'deadline_approaching'
  | 'overdue';

export interface Notification {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  message: string;
  link: string | null;
  department: string | null;
  is_read: boolean;
  read_at: string | null;
  created_at: string;
  expires_at: string | null;
}

export interface Reminder {
  id: string;
  task_type: string;
  task_id: string;
  book_id: string | null;
  assigned_to: string | null;
  reminder_type: ReminderType;
  scheduled_at: string;
  sent_at: string | null;
  is_sent: boolean;
  is_cancelled: boolean;
  message: string | null;
  created_at: string;
  updated_at: string;
}

export interface DailyStats {
  id: string;
  stat_date: string;
  department: string;
  tasks_created: number;
  tasks_completed: number;
  tasks_in_progress: number;
  tasks_rejected: number;
  avg_completion_time_hours: number | null;
  total_words_processed: number;
  created_at: string;
}

export interface DepartmentStats {
  department: string;
  total_tasks: number;
  pending: number;
  in_progress: number;
  completed: number;
  rejected: number;
  avg_completion_hours: number;
  total_words: number;
  efficiency_score: number;
}

export const NOTIFICATION_TYPE_CONFIG: Record<NotificationType, { label: string; color: string; icon: string; bgColor: string }> = {
  task_assigned: { label: 'Tâche assignée', color: 'text-blue-700', icon: 'fa-user-plus', bgColor: 'bg-blue-100 dark:bg-blue-900/30' },
  task_completed: { label: 'Tâche terminée', color: 'text-green-700', icon: 'fa-check-circle', bgColor: 'bg-green-100 dark:bg-green-900/30' },
  task_rejected: { label: 'Tâche rejetée', color: 'text-red-700', icon: 'fa-times-circle', bgColor: 'bg-red-100 dark:bg-red-900/30' },
  task_validated: { label: 'Tâche validée', color: 'text-emerald-700', icon: 'fa-check-double', bgColor: 'bg-emerald-100 dark:bg-emerald-900/30' },
  reminder: { label: 'Rappel', color: 'text-amber-700', icon: 'fa-bell', bgColor: 'bg-amber-100 dark:bg-amber-900/30' },
  comment: { label: 'Commentaire', color: 'text-purple-700', icon: 'fa-comment', bgColor: 'bg-purple-100 dark:bg-purple-900/30' },
  system: { label: 'Système', color: 'text-gray-700', icon: 'fa-cog', bgColor: 'bg-gray-100 dark:bg-gray-900/30' },
  deadline: { label: 'Échéance', color: 'text-orange-700', icon: 'fa-clock', bgColor: 'bg-orange-100 dark:bg-orange-900/30' },
};

export const DEPARTMENT_LABELS: Record<string, string> = {
  D0: 'Import',
  D2: 'Transcription',
  D3: 'Nettoyage',
  D4: 'Éditorialisation',
  D5: 'Super Correction',
  D6: 'Relecture 1',
  D7: 'Relecture 2',
  D8: 'Publication',
};
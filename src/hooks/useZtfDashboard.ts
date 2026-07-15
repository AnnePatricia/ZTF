// src/hooks/useZtfDashboard.ts
import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

export interface DashboardStats {
    totalBooks: number;
    byStatus: Record<string, number>;
    byDepartment: Record<string, number>;
    inProgress: number;
    published: number;
    delayed: number;
    thisMonth: number;
    blockedFiles: BlockedFile[];
    recentActivity: ActivityLog[];
    departmentWorkload: DepartmentWorkload[];
    progressTo2000: number;
}

export interface BlockedFile {
    id: string;
    ztf_id: string;
    title: string;
    current_department: string;
    days_inactive: number;
    last_updated: string;
}

export interface ActivityLog {
    id: string;
    book_title: string;
    action: string;
    from_status: string | null;
    to_status: string;
    user_name: string;
    created_at: string;
}

export interface DepartmentWorkload {
    department: string;
    total_tasks: number;
    in_progress: number;
    pending: number;
    overdue: number;
    average_days: number;
}

export function useZtfDashboard() {
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const loadDashboard = async () => {
        setLoading(true);
        try {
            // 1. Charger tous les livres
            const { data: books, error: booksError } = await supabase
                .from('ztf_books')
                .select('*');

            if (booksError) throw booksError;

            const totalBooks = books?.length || 0;

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

            // Statuts actifs
            const activeStatuses = ['TRANSCRIBED', 'CLEANED', 'STRUCTURED', 'REWRITTEN', 'CORRECTED', 'TRANSLATED', 'BAT_PENDING'];
            const inProgress = books?.filter(b => activeStatuses.includes(b.ztf_status || '')).length || 0;
            const published = byStatus['PUBLISHED'] || 0;

            // Livres de ce mois
            const thisMonth = books?.filter(b => {
                const date = new Date(b.created_at);
                const now = new Date();
                return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
            }).length || 0;

            // Fichiers bloqués (> 7 jours sans activité)
            const blockedFiles: BlockedFile[] = [];
            const now = new Date();
            books?.forEach(b => {
                const lastUpdate = new Date(b.updated_at);
                const daysInactive = Math.floor((now.getTime() - lastUpdate.getTime()) / (1000 * 60 * 60 * 24));
                if (daysInactive > 7 && !['PUBLISHED', 'ARCHIVED'].includes(b.ztf_status || '')) {
                    blockedFiles.push({
                        id: b.id,
                        ztf_id: b.ztf_id,
                        title: b.title,
                        current_department: b.current_department,
                        days_inactive: daysInactive,
                        last_updated: b.updated_at,
                    });
                }
            });

            // 2. Activité récente - SANS JOIN sur ztf_users
            const { data: activity, error: activityError } = await supabase
                .from('ztf_activity_log')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(10);

            if (activityError) {
                console.warn('Erreur chargement activité:', activityError);
            }

            const recentActivity: ActivityLog[] = activity?.map(a => ({
                id: a.id,
                book_title: a.book_title || 'Livre inconnu',
                action: a.action,
                from_status: a.from_status,
                to_status: a.to_status,
                user_name: a.user_name || 'Utilisateur',
                created_at: a.created_at,
            })) || [];

            // 3. Charge de travail par département
            const departments = ['D0', 'D2', 'D3', 'D4', 'D5', 'D6', 'D7', 'D8'];
            const departmentWorkload: DepartmentWorkload[] = departments.map(dept => {
                const deptBooks = books?.filter(b => b.current_department === dept) || [];
                return {
                    department: dept,
                    total_tasks: deptBooks.length,
                    in_progress: deptBooks.filter(b => activeStatuses.includes(b.ztf_status || '')).length,
                    pending: deptBooks.filter(b => b.ztf_status === 'DRAFT').length,
                    overdue: deptBooks.filter(b => {
                        const lastUpdate = new Date(b.updated_at);
                        const daysInactive = Math.floor((now.getTime() - lastUpdate.getTime()) / (1000 * 60 * 60 * 24));
                        return daysInactive > 7;
                    }).length,
                    average_days: 0,
                };
            });

            // Progression vers 2000
            const progressTo2000 = totalBooks > 0 ? (published / 2000) * 100 : 0;

            setStats({
                totalBooks,
                byStatus,
                byDepartment,
                inProgress,
                published,
                delayed: blockedFiles.length,
                thisMonth,
                blockedFiles,
                recentActivity,
                departmentWorkload,
                progressTo2000,
            });
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadDashboard();
    }, []);

    return {
        stats,
        loading,
        error,
        refresh: loadDashboard,
    };
}
// src/components/departments/D0/ProductionDashboard.tsx
import { useState, useEffect } from 'react';
import { supabase } from '../../../supabaseClient';
import { ZtfBook} from '../../../types/ztf';
import { STATUS_CONFIG, DEPARTMENT_LABELS } from '../../../types/ztf';

export default function ProductionDashboard() {
  const [books, setBooks] = useState<ZtfBook[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      const { data } = await supabase
        .from('ztf_books')
        .select('*')
        .order('created_at', { ascending: false });
      
      setBooks(data || []);
    } catch (error) {
      console.error('Erreur dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const stats = {
    total: books.length,
    target: 2000,
    progress: (books.length / 2000) * 100,
    published: books.filter(b => b.status === 'PUBLISHED').length,
    inProgress: books.filter(b => !['PUBLISHED', 'ARCHIVED', 'DRAFT'].includes(b.status)).length,
    overdue: books.filter(b => b.deadline && new Date(b.deadline) < new Date() && b.status !== 'PUBLISHED').length,
    byStatus: books.reduce((acc, b) => {
      acc[b.status] = (acc[b.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>),
    byDepartment: books.reduce((acc, b) => {
      acc[b.current_department] = (acc[b.current_department] || 0) + 1;
      return acc;
    }, {} as Record<string, number>),
    byTheme: books.reduce((acc, b) => {
      acc[b.theme] = (acc[b.theme] || 0) + 1;
      return acc;
    }, {} as Record<string, number>),
  };

  if (loading) {
    return <div className="text-center py-12">Chargement...</div>;
  }

  return (
    <div className="space-y-6">
      {/* KPIs principaux */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-purple-500 to-purple-700 rounded-xl p-6 text-white shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-purple-100 text-sm">Total livres</p>
              <p className="text-3xl font-bold mt-1">{stats.total}</p>
              <p className="text-purple-200 text-xs mt-2">Objectif : 2 000</p>
            </div>
            <i className="fas fa-book text-4xl opacity-50"></i>
          </div>
          <div className="mt-4 bg-white/20 rounded-full h-2">
            <div className="h-2 rounded-full bg-white" style={{ width: `${Math.min(100, stats.progress)}%` }}></div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-green-500 to-green-700 rounded-xl p-6 text-white shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-100 text-sm">Publiés</p>
              <p className="text-3xl font-bold mt-1">{stats.published}</p>
              <p className="text-green-200 text-xs mt-2">{((stats.published / 2000) * 100).toFixed(1)}% de l'objectif</p>
            </div>
            <i className="fas fa-check-circle text-4xl opacity-50"></i>
          </div>
        </div>

        <div className="bg-gradient-to-br from-blue-500 to-blue-700 rounded-xl p-6 text-white shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100 text-sm">En production</p>
              <p className="text-3xl font-bold mt-1">{stats.inProgress}</p>
              <p className="text-blue-200 text-xs mt-2">Livres en cours</p>
            </div>
            <i className="fas fa-spinner text-4xl opacity-50"></i>
          </div>
        </div>

        <div className="bg-gradient-to-br from-red-500 to-red-700 rounded-xl p-6 text-white shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-red-100 text-sm">En retard</p>
              <p className="text-3xl font-bold mt-1">{stats.overdue}</p>
              <p className="text-red-200 text-xs mt-2">Deadline dépassée</p>
            </div>
            <i className="fas fa-exclamation-triangle text-4xl opacity-50"></i>
          </div>
        </div>
      </div>

      {/* Répartition par statut */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-6">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <i className="fas fa-chart-pie text-purple-600"></i>
          Répartition par statut
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
          {Object.entries(STATUS_CONFIG).map(([status, config]) => (
            <div key={status} className={`${config.color} rounded-lg p-3 text-white`}>
              <p className="text-2xl font-bold">{stats.byStatus[status] || 0}</p>
              <p className="text-xs opacity-90">{config.label}</p>
              <p className="text-xs opacity-75">{config.percentage}%</p>
            </div>
          ))}
        </div>
      </div>

      {/* Répartition par département */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-6">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <i className="fas fa-building text-purple-600"></i>
          Charge par département
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {Object.entries(DEPARTMENT_LABELS).map(([dept, label]) => (
            <div key={dept} className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 border border-gray-200 dark:border-gray-600">
              <div className="flex items-center justify-between mb-2">
                <span className="font-bold text-gray-900 dark:text-white">{dept}</span>
                <span className="text-2xl font-bold text-purple-600">{stats.byDepartment[dept] || 0}</span>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
              <div className="mt-2 bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                <div 
                  className="h-2 rounded-full bg-purple-600"
                  style={{ width: `${Math.min(100, ((stats.byDepartment[dept] || 0) / stats.total) * 100)}%` }}
                ></div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Répartition par thème */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-6">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <i className="fas fa-tags text-purple-600"></i>
          Répartition par thème
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {Object.entries(stats.byTheme).sort((a, b) => b[1] - a[1]).map(([theme, count]) => (
            <div key={theme} className="bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 rounded-lg p-3 border border-indigo-200 dark:border-indigo-800">
              <p className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">{count}</p>
              <p className="text-xs text-gray-700 dark:text-gray-300 font-medium">{theme}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
// src/components/Dashboard/DashboardStats.tsx
import { useNotifications } from '../../hooks/useNotifications';
import { DEPARTMENT_LABELS } from '../../types/notifications';

export default function DashboardStats() {
  const { departmentStats, dailyStats, loading } = useNotifications();

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-12 text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
        <p className="mt-4 text-gray-500">Chargement des statistiques...</p>
      </div>
    );
  }

  const totalTasks = departmentStats.reduce((sum, s) => sum + s.total_tasks, 0);
  const totalCompleted = departmentStats.reduce((sum, s) => sum + s.completed, 0);
  const totalPending = departmentStats.reduce((sum, s) => sum + s.pending, 0);
  const totalWords = departmentStats.reduce((sum, s) => sum + s.total_words, 0);
  const avgEfficiency = departmentStats.length > 0 
    ? departmentStats.reduce((sum, s) => sum + s.efficiency_score, 0) / departmentStats.length 
    : 0;

  return (
    <div className="space-y-6">
      {/* Stats globales */}
      <div className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-xl shadow-lg p-6 text-white">
        <h2 className="text-2xl font-bold mb-6 flex items-center gap-3">
          <i className="fas fa-chart-line"></i>
          Tableau de bord de production
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="bg-white/20 backdrop-blur-sm rounded-lg p-4 text-center">
            <p className="text-3xl font-bold">{totalTasks}</p>
            <p className="text-sm text-purple-100">Total tâches</p>
          </div>
          <div className="bg-white/20 backdrop-blur-sm rounded-lg p-4 text-center">
            <p className="text-3xl font-bold text-green-300">{totalCompleted}</p>
            <p className="text-sm text-purple-100">Terminées</p>
          </div>
          <div className="bg-white/20 backdrop-blur-sm rounded-lg p-4 text-center">
            <p className="text-3xl font-bold text-amber-300">{totalPending}</p>
            <p className="text-sm text-purple-100">En attente</p>
          </div>
          <div className="bg-white/20 backdrop-blur-sm rounded-lg p-4 text-center">
            <p className="text-3xl font-bold">{(totalWords / 1000).toFixed(1)}k</p>
            <p className="text-sm text-purple-100">Mots traités</p>
          </div>
          <div className="bg-white/20 backdrop-blur-sm rounded-lg p-4 text-center">
            <p className="text-3xl font-bold">{avgEfficiency.toFixed(1)}%</p>
            <p className="text-sm text-purple-100">Efficacité</p>
          </div>
        </div>
      </div>

      {/* Stats par département */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-6">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <i className="fas fa-building text-purple-600"></i>
          Statistiques par département
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Département</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">En attente</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">En cours</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Terminées</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rejetées</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Mots</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Efficacité</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-600">
              {departmentStats.map(stat => (
                <tr key={stat.department} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                  <td className="px-4 py-3">
                    <span className="px-2 py-1 text-xs font-semibold bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-200 rounded">
                      {stat.department} - {DEPARTMENT_LABELS[stat.department] || stat.department}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm font-semibold">{stat.total_tasks}</td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-1 text-xs bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-200 rounded">
                      {stat.pending}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-1 text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 rounded">
                      {stat.in_progress}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-1 text-xs bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200 rounded">
                      {stat.completed}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-1 text-xs bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200 rounded">
                      {stat.rejected}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm">{stat.total_words.toLocaleString('fr-FR')}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-16 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                        <div 
                          className={`h-2 rounded-full ${
                            stat.efficiency_score >= 80 ? 'bg-green-500' :
                            stat.efficiency_score >= 50 ? 'bg-amber-500' : 'bg-red-500'
                          }`}
                          style={{ width: `${stat.efficiency_score}%` }}
                        ></div>
                      </div>
                      <span className="text-xs font-semibold">{stat.efficiency_score.toFixed(1)}%</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Graphique d'évolution (simplifié) */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-6">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <i className="fas fa-chart-bar text-purple-600"></i>
          Évolution sur 30 jours
        </h3>
        <div className="space-y-3">
          {dailyStats.slice(-7).map((day) => (
            <div key={day.id} className="flex items-center gap-4">
              <span className="text-xs text-gray-500 w-20">
                {new Date(day.stat_date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}
              </span>
              <div className="flex-1 flex items-center gap-2">
                <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-4 overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-purple-500 to-indigo-500 transition-all"
                    style={{ width: `${Math.min((day.tasks_completed / Math.max(day.tasks_created, 1)) * 100, 100)}%` }}
                  ></div>
                </div>
                <span className="text-xs text-gray-600 dark:text-gray-400 w-24 text-right">
                  {day.tasks_completed}/{day.tasks_created} tâches
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
// src/components/Dashboard/ZtfDashboard.tsx
import { useZtfDashboard } from '../../hooks/useZtfDashboard';

export default function ZtfDashboard() {
  const { stats, loading, error, refresh } = useZtfDashboard();

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-12 text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
        <p className="mt-4 text-gray-500">Chargement du tableau de bord...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-6">
        <p className="text-red-700 dark:text-red-300">❌ Erreur: {error}</p>
      </div>
    );
  }

  if (!stats) return null;

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-xl shadow-lg p-6 text-white">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">Tableau de Bord ZTF-GEST</h1>
            <p className="text-purple-100 mt-2">
              Production des 2 000 titres du Professeur Z.T. Fomum
            </p>
          </div>
          <button
            onClick={refresh}
            className="px-4 py-2 bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-lg flex items-center gap-2 text-white"
          >
            <i className="fas fa-sync-alt"></i>
            Actualiser
          </button>
        </div>
      </div>

      {/* Progression vers 2000 */}
      <div className="bg-gradient-to-r from-purple-500 to-indigo-500 rounded-xl p-6 text-white">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-xl font-bold">Progression vers 2 000 titres</h3>
            <p className="text-purple-100 text-sm">Objectif du Secrétariat Éditorial ZTF</p>
          </div>
          <div className="text-right">
            <p className="text-4xl font-bold">{stats.published}</p>
            <p className="text-sm text-purple-100">/ 2 000 publiés</p>
          </div>
        </div>
        <div className="w-full bg-white/20 rounded-full h-6">
          <div
            className="bg-white rounded-full h-6 transition-all duration-500"
            style={{ width: `${Math.min(stats.progressTo2000, 100)}%` }}
          ></div>
        </div>
        <p className="text-center mt-2 text-lg font-semibold">
          {stats.progressTo2000.toFixed(2)}% complété
        </p>
      </div>

      {/* KPIs principaux */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          icon="fa-book"
          label="Total livres"
          value={stats.totalBooks}
          color="purple"
        />
        <KpiCard
          icon="fa-spinner"
          label="En production"
          value={stats.inProgress}
          color="blue"
        />
        <KpiCard
          icon="fa-check-circle"
          label="Publiés"
          value={stats.published}
          color="green"
        />
        <KpiCard
          icon="fa-calendar"
          label="Ce mois"
          value={stats.thisMonth}
          color="amber"
        />
      </div>

      {/* Alertes */}
      {stats.delayed > 0 && (
        <div className="bg-red-50 dark:bg-red-900/20 border-2 border-red-300 dark:border-red-700 rounded-xl p-6">
          <h3 className="text-lg font-bold text-red-800 dark:text-red-200 flex items-center gap-2 mb-4">
            <i className="fas fa-exclamation-triangle"></i>
            Alertes — {stats.delayed} fichier{stats.delayed > 1 ? 's' : ''} bloqué{stats.delayed > 1 ? 's' : ''}
          </h3>
          <div className="space-y-2">
            {stats.blockedFiles.slice(0, 5).map(file => (
              <div key={file.id} className="flex items-center justify-between bg-white dark:bg-gray-800 rounded-lg p-3">
                <div>
                  <p className="font-semibold text-gray-900 dark:text-white">{file.title}</p>
                  <p className="text-sm text-gray-500">{file.ztf_id} • {file.current_department}</p>
                </div>
                <span className="px-3 py-1 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-full text-sm font-semibold">
                  {file.days_inactive} jours
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Charge de travail par département */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-6">
        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <i className="fas fa-chart-bar text-purple-600"></i>
          Charge de travail par département
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.departmentWorkload.map(dept => (
            <div key={dept.department} className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-bold text-gray-900 dark:text-white">Département {dept.department}</h4>
                <span className="px-2 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded text-xs font-semibold">
                  {dept.total_tasks} tâches
                </span>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">En cours</span>
                  <span className="font-semibold text-blue-600 dark:text-blue-400">{dept.in_progress}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">En attente</span>
                  <span className="font-semibold text-gray-600 dark:text-gray-400">{dept.pending}</span>
                </div>
                {dept.overdue > 0 && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">En retard</span>
                    <span className="font-semibold text-red-600 dark:text-red-400">{dept.overdue}</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Activité récente */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-6">
        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <i className="fas fa-history text-purple-600"></i>
          Activité récente
        </h3>
        {stats.recentActivity.length === 0 ? (
          <p className="text-gray-500 text-center py-8">Aucune activité récente</p>
        ) : (
          <div className="space-y-3">
            {stats.recentActivity.map(activity => (
              <div key={activity.id} className="flex items-start gap-4 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div className="flex-shrink-0">
                  <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center">
                    <i className="fas fa-exchange-alt text-purple-600"></i>
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-900 dark:text-white">
                    <span className="font-semibold">{activity.user_name}</span>
                    {' '}{activity.action}{' '}
                    <span className="font-semibold">{activity.book_title}</span>
                  </p>
                  {activity.from_status && (
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs px-2 py-0.5 bg-gray-200 dark:bg-gray-600 rounded">
                        {activity.from_status}
                      </span>
                      <i className="fas fa-arrow-right text-gray-400 text-xs"></i>
                      <span className="text-xs px-2 py-0.5 bg-green-200 dark:bg-green-900/30 rounded">
                        {activity.to_status}
                      </span>
                    </div>
                  )}
                  <p className="text-xs text-gray-500 mt-1">
                    {new Date(activity.created_at).toLocaleString('fr-FR')}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// Composant KPI
function KpiCard({ icon, label, value, color }: { icon: string; label: string; value: number; color: string }) {
  const colors: Record<string, string> = {
    purple: 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-300',
    blue: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-300',
    green: 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-300',
    amber: 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-300',
    red: 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-300',
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-6">
      <div className="flex items-center gap-4">
        <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${colors[color]}`}>
          <i className={`fas ${icon} text-2xl`}></i>
        </div>
        <div>
          <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
          <p className="text-3xl font-bold text-gray-900 dark:text-white">{value}</p>
        </div>
      </div>
    </div>
  );
}
// src/components/Reports/ZtfReports.tsx
import { useState } from 'react';
import { useZtfReports } from '../../hooks/useZtfReports';

type TabType = 'overview' | 'departments' | 'activity' | 'contributors';

export default function ZtfReports() {
    const { report, loading, error, refresh, exportCSV } = useZtfReports();
    const [activeTab, setActiveTab] = useState<TabType>('overview');

    if (loading) {
        return (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-12 text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
                <p className="mt-4 text-gray-500">Chargement des rapports...</p>
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

    if (!report) return null;

    const tabs = [
        { id: 'overview' as TabType, label: 'Vue d\'ensemble', icon: 'fa-tachometer-alt' },
        { id: 'departments' as TabType, label: 'Départements', icon: 'fa-building' },
        { id: 'activity' as TabType, label: 'Activité', icon: 'fa-history' },
        { id: 'contributors' as TabType, label: 'Contributeurs', icon: 'fa-users' },
    ];

    return (
        <div className="space-y-6">
            {/* En-tête */}
            <div className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-xl shadow-lg p-6 text-white">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-bold flex items-center gap-3">
                            <i className="fas fa-chart-line"></i>
                            Rapports & Analytics
                        </h1>
                        <p className="text-purple-100 mt-2">
                            Tableau de bord global du pipeline éditorial ZTF-GEST
                        </p>
                    </div>
                    <div className="flex gap-3">
                        <button
                            onClick={refresh}
                            className="px-4 py-2 bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-lg flex items-center gap-2 text-white"
                        >
                            <i className="fas fa-sync-alt"></i>
                            Actualiser
                        </button>
                        <button
                            onClick={exportCSV}
                            className="px-4 py-2 bg-white text-purple-600 hover:bg-purple-50 rounded-lg flex items-center gap-2 font-semibold"
                        >
                            <i className="fas fa-file-csv"></i>
                            Export CSV
                        </button>
                    </div>
                </div>
            </div>

            {/* Onglets */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow">
                <div className="border-b border-gray-200 dark:border-gray-700">
                    <nav className="flex overflow-x-auto">
                        {tabs.map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`px-6 py-4 font-medium text-sm whitespace-nowrap flex items-center gap-2 border-b-2 transition-colors ${activeTab === tab.id
                                    ? 'border-purple-600 text-purple-600 dark:text-purple-400'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                                    }`}
                            >
                                <i className={`fas ${tab.icon}`}></i>
                                {tab.label}
                            </button>
                        ))}
                    </nav>
                </div>

                <div className="p-6">
                    {activeTab === 'overview' && <OverviewTab report={report} />}
                    {activeTab === 'departments' && <DepartmentsTab report={report} />}
                    {activeTab === 'activity' && <ActivityTab report={report} />}
                    {activeTab === 'contributors' && <ContributorsTab report={report} />}
                </div>
            </div>
        </div>
    );
}

// ============ ONGLET VUE D'ENSEMBLE ============
function OverviewTab({ report }: { report: any }) {
    const progressPercent = report.totalBooks > 0
        ? Math.round((report.published / report.totalBooks) * 100)
        : 0;

    return (
        <div className="space-y-6">
            {/* KPIs principaux */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <KpiCard
                    icon="fa-book"
                    label="Documents créés"
                    value={report.totalBooks}
                    color="blue"
                />
                <KpiCard
                    icon="fa-check-circle"
                    label="Documents validés"
                    value={report.published}
                    color="green"
                />
                <KpiCard
                    icon="fa-users"
                    label="Utilisateurs actifs"
                    value={report.activeUsers}
                    color="purple"
                />
                <KpiCard
                    icon="fa-tag"
                    label="Thèmes utilisés"
                    value={Object.keys(report.byTheme).length}
                    color="indigo"
                />
            </div>

            {/* Statistiques détaillées */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                <StatCard icon="fa-book" label="Total livres" value={report.totalBooks} color="purple" />
                <StatCard icon="fa-check" label="Publiés" value={report.published} color="green" />
                <StatCard icon="fa-spinner" label="En cours" value={report.inProgress} color="blue" />
                <StatCard icon="fa-file-alt" label="Brouillons" value={report.drafts} color="gray" />
                <StatCard icon="fa-undo" label="Retournés" value={report.returned} color="orange" />
                <StatCard icon="fa-times" label="Rejetés" value={report.rejected} color="red" />
            </div>

            {/* Statistiques mots */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <StatCard icon="fa-font" label="Total mots" value={report.totalWords.toLocaleString('fr-FR')} color="indigo" large />
                <StatCard icon="fa-calculator" label="Mots/livre" value={report.averageWordsPerBook.toLocaleString('fr-FR')} color="cyan" large />
                <StatCard icon="fa-clock" label="Jours/livre" value={report.averageDaysPerBook} color="amber" large />
            </div>

            {/* Progression vers 2000 */}
            <div className="bg-gradient-to-r from-purple-500 to-indigo-500 rounded-xl p-6 text-white">
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <h3 className="text-xl font-bold">Progression vers 2 000 titres</h3>
                        <p className="text-purple-100 text-sm">Objectif du Secrétariat Éditorial ZTF</p>
                    </div>
                    <div className="text-right">
                        <p className="text-3xl font-bold">{report.totalBooks}</p>
                        <p className="text-sm text-purple-100">/ 2 000</p>
                    </div>
                </div>
                <div className="w-full bg-white/20 rounded-full h-4">
                    <div
                        className="bg-white rounded-full h-4 transition-all"
                        style={{ width: `${Math.min(progressPercent, 100)}%` }}
                    ></div>
                </div>
                <p className="text-center mt-2 text-sm">{progressPercent}% complété</p>
            </div>

            {/* Répartition par langue */}
            <div className="bg-white dark:bg-gray-700 rounded-xl p-6">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                    <i className="fas fa-language text-purple-600"></i>
                    Répartition par langue
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {Object.entries(report.byLanguage).map(([lang, count]) => (
                        <div key={lang} className="bg-gray-50 dark:bg-gray-600 rounded-lg p-4 text-center">
                            <p className="text-2xl font-bold text-gray-900 dark:text-white">{String(count)}</p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">{lang}</p>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

// ============ ONGLET DÉPARTEMENTS ============
function DepartmentsTab({ report }: { report: any }) {
    const departments = [
        { code: 'D0', name: 'Base de Données', icon: 'fa-database', color: 'gray' },
        { code: 'D2', name: 'Transcription', icon: 'fa-keyboard', color: 'blue' },
        { code: 'D3', name: 'Nettoyage', icon: 'fa-broom', color: 'cyan' },
        { code: 'D4', name: 'Éditorialisation', icon: 'fa-sitemap', color: 'indigo' },
        { code: 'D5', name: 'Réécriture', icon: 'fa-pen-fancy', color: 'purple' },
        { code: 'D6', name: 'Correction', icon: 'fa-spell-check', color: 'teal' },
        { code: 'D7', name: 'Traduction', icon: 'fa-language', color: 'pink' },
        { code: 'D8', name: 'BAT', icon: 'fa-file-pdf', color: 'orange' },
    ];

    return (
        <div className="space-y-6">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <i className="fas fa-building text-purple-600"></i>
                Charge de travail par département
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {departments.map(dept => {
                    const count = report.byDepartment[dept.code] || 0;
                    const percentage = report.totalBooks > 0 ? Math.round((count / report.totalBooks) * 100) : 0;

                    return (
                        <div key={dept.code} className="bg-white dark:bg-gray-700 rounded-xl shadow p-6 border-l-4 border-purple-500">
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
                                        <i className={`fas ${dept.icon} text-purple-600 text-xl`}></i>
                                    </div>
                                    <div>
                                        <p className="text-sm text-gray-500 dark:text-gray-400">{dept.code}</p>
                                        <p className="font-bold text-gray-900 dark:text-white">{dept.name}</p>
                                    </div>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <span className="text-sm text-gray-500">Livres</span>
                                    <span className="text-2xl font-bold text-gray-900 dark:text-white">{count}</span>
                                </div>
                                <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                                    <div
                                        className="bg-purple-500 rounded-full h-2"
                                        style={{ width: `${percentage}%` }}
                                    ></div>
                                </div>
                                <p className="text-xs text-gray-500">{percentage}% du total</p>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Taux de rejet par département */}
            <div className="bg-white dark:bg-gray-700 rounded-xl p-6">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                    <i className="fas fa-chart-bar text-orange-600"></i>
                    Taux de rejet par département
                </h3>
                <div className="space-y-3">
                    {departments.map(dept => {
                        const count = report.byDepartment[dept.code] || 0;
                        const rejectionRate = count > 0 ? Math.round((report.rejected / count) * 100) : 0;

                        return (
                            <div key={dept.code} className="flex items-center gap-4">
                                <span className="w-32 text-sm font-medium text-gray-700 dark:text-gray-300">{dept.code} - {dept.name}</span>
                                <div className="flex-1 bg-gray-200 dark:bg-gray-600 rounded-full h-4">
                                    <div
                                        className="bg-red-500 rounded-full h-4"
                                        style={{ width: `${rejectionRate}%` }}
                                    ></div>
                                </div>
                                <span className="w-12 text-sm font-bold text-gray-900 dark:text-white">{rejectionRate}%</span>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}

// ============ ONGLET ACTIVITÉ ============
function ActivityTab({ report }: { report: any }) {
    const getStatusColor = (status: string) => {
        const colors: Record<string, string> = {
            DRAFT: 'bg-gray-500',
            TRANSCRIBED: 'bg-blue-500',
            CLEANED: 'bg-cyan-500',
            STRUCTURED: 'bg-indigo-500',
            REWRITTEN: 'bg-purple-500',
            CORRECTED: 'bg-teal-500',
            TRANSLATED: 'bg-pink-500',
            BAT_PENDING: 'bg-orange-500',
            BAT_APPROVED: 'bg-green-500',
            PUBLISHED: 'bg-emerald-600',
        };
        return colors[status] || 'bg-gray-500';
    };

    return (
        <div className="space-y-6">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <i className="fas fa-history text-purple-600"></i>
                Activité récente
            </h3>

            {report.recentActivity.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                    <i className="fas fa-inbox text-5xl mb-4 block opacity-50"></i>
                    <p>Aucune activité récente</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {report.recentActivity.map((activity: any) => (
                        <div key={activity.id} className="bg-white dark:bg-gray-700 rounded-lg p-4 shadow flex items-start gap-4">
                            <div className="flex-shrink-0">
                                <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center">
                                    <i className="fas fa-exchange-alt text-purple-600"></i>
                                </div>
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                    <span className="font-semibold text-gray-900 dark:text-white">
                                        {activity.user_name}
                                    </span>
                                    <span className="text-sm text-gray-500">
                                        {activity.action}
                                    </span>
                                    <span className="font-medium text-gray-900 dark:text-white">
                                        {activity.book_title}
                                    </span>
                                </div>
                                {activity.from_status && (
                                    <div className="flex items-center gap-2 mt-2">
                                        <span className={`px-2 py-1 text-xs font-medium text-white rounded ${getStatusColor(activity.from_status)}`}>
                                            {activity.from_status}
                                        </span>
                                        <i className="fas fa-arrow-right text-gray-400"></i>
                                        <span className={`px-2 py-1 text-xs font-medium text-white rounded ${getStatusColor(activity.to_status)}`}>
                                            {activity.to_status}
                                        </span>
                                    </div>
                                )}
                                <p className="text-xs text-gray-500 mt-2">
                                    {new Date(activity.created_at).toLocaleString('fr-FR')}
                                </p>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

// ============ ONGLET CONTRIBUTEURS ============
function ContributorsTab({ report }: { report: any }) {
    return (
        <div className="space-y-6">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <i className="fas fa-users text-purple-600"></i>
                Contributeurs actifs
            </h3>

            {report.contributorMetrics.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                    <i className="fas fa-users text-5xl mb-4 block opacity-50"></i>
                    <p>Aucun contributeur</p>
                </div>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gray-50 dark:bg-gray-700">
                            <tr>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Utilisateur</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Département</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tâches complétées</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">En cours</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Délai moyen</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Taux de rejet</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-gray-600">
                            {report.contributorMetrics.map((contributor: any) => (
                                <tr key={contributor.user_id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-purple-600 text-white flex items-center justify-center font-medium">
                                                {contributor.user_name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)}
                                            </div>
                                            <div>
                                                <p className="font-medium text-gray-900 dark:text-white">{contributor.user_name}</p>
                                                <p className="text-sm text-gray-500">{contributor.user_email}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className="px-2 py-1 text-xs font-medium bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded">
                                            {contributor.department}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-white font-semibold">
                                        {contributor.tasksCompleted}
                                    </td>
                                    <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                                        {contributor.tasksInProgress}
                                    </td>
                                    <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                                        {contributor.averageDays} jours
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className={`px-2 py-1 text-xs font-medium rounded ${contributor.rejectionRate > 20 ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
                                            }`}>
                                            {contributor.rejectionRate}%
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}

// ============ COMPOSANTS UTILITAIRES ============
function KpiCard({ icon, label, value, color }: { icon: string; label: string; value: number; color: string }) {
    const colors: Record<string, string> = {
        blue: 'bg-blue-100 text-blue-600',
        green: 'bg-green-100 text-green-600',
        purple: 'bg-purple-100 text-purple-600',
        indigo: 'bg-indigo-100 text-indigo-600',
    };

    return (
        <div className="bg-white dark:bg-gray-700 rounded-xl shadow p-6">
            <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${colors[color]}`}>
                    <i className={`fas ${icon} text-xl`}></i>
                </div>
                <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
                    <p className="text-3xl font-bold text-gray-900 dark:text-white">{value}</p>
                </div>
            </div>
        </div>
    );
}

function StatCard({ icon, label, value, color, large }: { icon: string; label: string; value: any; color: string; large?: boolean }) {
    const colors: Record<string, string> = {
        purple: 'bg-purple-500',
        green: 'bg-green-500',
        blue: 'bg-blue-500',
        gray: 'bg-gray-500',
        orange: 'bg-orange-500',
        red: 'bg-red-500',
        indigo: 'bg-indigo-500',
        cyan: 'bg-cyan-500',
        amber: 'bg-amber-500',
    };

    return (
        <div className={`${colors[color]} rounded-xl p-6 text-white ${large ? 'md:col-span-1' : ''}`}>
            <i className={`fas ${icon} text-2xl mb-3`}></i>
            <p className={`${large ? 'text-4xl' : 'text-3xl'} font-bold`}>{value}</p>
            <p className="text-sm opacity-90 mt-1">{label}</p>
        </div>
    );
}
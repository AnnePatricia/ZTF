// src/components/Dashboard/AnalyticsDashboard.tsx
import { useState } from 'react';
import { useAnalytics } from '../../hooks/useAnalytics';

interface AnalyticsDashboardProps {
    onBack?: () => void;
}

export default function AnalyticsDashboard({ onBack }: AnalyticsDashboardProps) {
    const {
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
    } = useAnalytics();

    {
        onBack && (
            <button onClick={onBack} className="mb-4...">
                <i className="fas fa-arrow-left"></i> Retour
            </button>
        )
    }

    const [activeTab, setActiveTab] = useState<'overview' | 'departments' | 'activity' | 'contributors'>('overview');

    const exportCSV = () => {
        if (!kpi) return;

        const csvContent = [
            ['Rapport ZTF-GEST', new Date().toLocaleDateString('fr-FR')],
            [],
            ['KPIs Globaux'],
            ['Total livres', kpi.totalBooks],
            ['Publiés', kpi.published],
            ['En cours', kpi.inProgress],
            ['Brouillons', kpi.draft],
            ['Retournés', kpi.returned],
            ['Rejetés', kpi.rejected],
            ['Total mots', kpi.totalWords],
            ['Mots moyens/livre', kpi.avgWordsPerBook],
            ['Jours moyens/livre', kpi.avgDaysPerBook],
            [],
            ['Statistiques par département'],
            ['Département', 'Livres', 'Mots', 'Jours moyens'],
            ...departmentStats.map(d => [d.label, d.totalBooks, d.totalWords, d.avgDays]),
            [],
            ['Distribution par statut'],
            ['Statut', 'Count', 'Pourcentage'],
            ...statusDistribution.map(s => [s.label, s.count, `${s.percentage}%`])
        ].map(row => row.join(',')).join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `rapport_ztf_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };

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
                    <div className="flex gap-2">
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

            {/* Filtres */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-4">
                <div className="flex flex-wrap gap-3 items-center">
                    <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                        <i className="fas fa-filter mr-2"></i>
                        Filtres:
                    </span>
                    <select
                        value={filters.period}
                        onChange={(e) => setFilters({ ...filters, period: e.target.value as any })}
                        className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm dark:bg-gray-700 dark:text-white"
                    >
                        <option value="week">Cette semaine</option>
                        <option value="month">Ce mois</option>
                        <option value="quarter">Ce trimestre</option>
                        <option value="year">Cette année</option>
                        <option value="all">Tout</option>
                    </select>
                    <select
                        value={filters.department}
                        onChange={(e) => setFilters({ ...filters, department: e.target.value })}
                        className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm dark:bg-gray-700 dark:text-white"
                    >
                        <option value="all">Tous les départements</option>
                        <option value="D0">D0 - Registre</option>
                        <option value="D2">D2 - Transcription</option>
                        <option value="D3">D3 - Nettoyage</option>
                        <option value="D4">D4 - Éditorialisation</option>
                        <option value="D5">D5 - Style</option>
                        <option value="D6">D6 - Super Correction</option>
                        <option value="D7">D7 - Traduction</option>
                        <option value="D8">D8 - BAT</option>
                    </select>
                    <select
                        value={filters.status}
                        onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                        className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm dark:bg-gray-700 dark:text-white"
                    >
                        <option value="all">Tous les statuts</option>
                        <option value="DRAFT">Brouillon</option>
                        <option value="IN_PROGRESS">En cours</option>
                        <option value="PUBLISHED">Publié</option>
                        <option value="RETURNED">Retourné</option>
                        <option value="REJECTED">Rejeté</option>
                    </select>
                </div>
            </div>

            {/* Onglets */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow">
                <div className="border-b border-gray-200 dark:border-gray-700">
                    <nav className="flex gap-2 p-2">
                        {[
                            { id: 'overview', label: 'Vue d\'ensemble', icon: 'fa-tachometer-alt' },
                            { id: 'departments', label: 'Départements', icon: 'fa-building' },
                            { id: 'activity', label: 'Activité', icon: 'fa-history' },
                            { id: 'contributors', label: 'Contributeurs', icon: 'fa-users' }
                        ].map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id as any)}
                                className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-all ${activeTab === tab.id
                                        ? 'bg-purple-600 text-white shadow'
                                        : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                                    }`}
                            >
                                <i className={`fas ${tab.icon}`}></i>
                                {tab.label}
                            </button>
                        ))}
                    </nav>
                </div>

                <div className="p-6">
                    {/* Vue d'ensemble */}
                    {activeTab === 'overview' && kpi && (
                        <div className="space-y-6">
                            {/* KPIs */}
                            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                                <KPICard icon="fa-book" label="Total livres" value={kpi.totalBooks} color="purple" />
                                <KPICard icon="fa-check-circle" label="Publiés" value={kpi.published} color="green" />
                                <KPICard icon="fa-spinner" label="En cours" value={kpi.inProgress} color="blue" />
                                <KPICard icon="fa-file-alt" label="Brouillons" value={kpi.draft} color="gray" />
                                <KPICard icon="fa-undo" label="Retournés" value={kpi.returned} color="orange" />
                                <KPICard icon="fa-times-circle" label="Rejetés" value={kpi.rejected} color="red" />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <KPICard icon="fa-font" label="Total mots" value={kpi.totalWords.toLocaleString('fr-FR')} color="indigo" large />
                                <KPICard icon="fa-calculator" label="Mots/livre" value={kpi.avgWordsPerBook} color="cyan" large />
                                <KPICard icon="fa-clock" label="Jours/livre" value={kpi.avgDaysPerBook} color="amber" large />
                            </div>

                            {/* Distribution par statut */}
                            <div className="bg-gray-50 dark:bg-gray-900 rounded-xl p-6">
                                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                                    <i className="fas fa-chart-pie text-purple-600"></i>
                                    Distribution par statut
                                </h3>
                                <div className="space-y-3">
                                    {statusDistribution.map(s => (
                                        <div key={s.status}>
                                            <div className="flex justify-between text-sm mb-1">
                                                <span className="font-medium text-gray-700 dark:text-gray-300">{s.label}</span>
                                                <span className="text-gray-600 dark:text-gray-400">{s.count} ({s.percentage}%)</span>
                                            </div>
                                            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                                                <div
                                                    className={`h-3 rounded-full ${s.color} transition-all duration-500`}
                                                    style={{ width: `${s.percentage}%` }}
                                                ></div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Départements */}
                    {activeTab === 'departments' && (
                        <div className="space-y-4">
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                <i className="fas fa-building text-purple-600"></i>
                                Statistiques par département
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {departmentStats.map(dep => (
                                    <div key={dep.department} className="bg-gray-50 dark:bg-gray-900 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
                                        <div className="flex items-center justify-between mb-3">
                                            <div className="flex items-center gap-3">
                                                <div className={`w-10 h-10 ${dep.color} rounded-lg flex items-center justify-center text-white`}>
                                                    <i className={`fas ${dep.icon}`}></i>
                                                </div>
                                                <div>
                                                    <h4 className="font-bold text-gray-900 dark:text-white">{dep.label}</h4>
                                                    <p className="text-xs text-gray-500">{dep.department}</p>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-3 gap-2 text-sm">
                                            <div className="bg-white dark:bg-gray-800 rounded p-2 text-center">
                                                <p className="text-xs text-gray-500">Livres</p>
                                                <p className="font-bold text-gray-900 dark:text-white">{dep.totalBooks}</p>
                                            </div>
                                            <div className="bg-white dark:bg-gray-800 rounded p-2 text-center">
                                                <p className="text-xs text-gray-500">Mots</p>
                                                <p className="font-bold text-gray-900 dark:text-white">{dep.totalWords.toLocaleString('fr-FR')}</p>
                                            </div>
                                            <div className="bg-white dark:bg-gray-800 rounded p-2 text-center">
                                                <p className="text-xs text-gray-500">Jours</p>
                                                <p className="font-bold text-gray-900 dark:text-white">{dep.avgDays}</p>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Activité récente */}
                    {activeTab === 'activity' && (
                        <div className="space-y-4">
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                <i className="fas fa-history text-purple-600"></i>
                                Activité récente (20 dernières actions)
                            </h3>
                            {recentActivity.length === 0 ? (
                                <div className="text-center py-12 text-gray-500">
                                    <i className="fas fa-inbox text-5xl mb-4"></i>
                                    <p>Aucune activité enregistrée</p>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {recentActivity.map((activity, _idx) => (
                                        <div key={activity.id} className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 border border-gray-200 dark:border-gray-700 flex items-start gap-3">
                                            <div className="w-8 h-8 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center text-purple-600 dark:text-purple-400 flex-shrink-0">
                                                <i className="fas fa-bolt"></i>
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center justify-between gap-2 mb-1">
                                                    <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                                                        {activity.user_name}
                                                    </p>
                                                    <span className="text-xs text-gray-500 flex-shrink-0">
                                                        {new Date(activity.created_at).toLocaleString('fr-FR')}
                                                    </span>
                                                </div>
                                                <p className="text-sm text-gray-700 dark:text-gray-300">
                                                    <span className="font-medium">{activity.action_type}</span> sur{' '}
                                                    <span className="font-medium text-purple-600 dark:text-purple-400">{activity.book_title}</span>
                                                </p>
                                                {activity.new_status && (
                                                    <span className="inline-block mt-1 px-2 py-0.5 bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-200 rounded text-xs">
                                                        → {activity.new_status}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Contributeurs */}
                    {activeTab === 'contributors' && (
                        <div className="space-y-4">
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                <i className="fas fa-users text-purple-600"></i>
                                Top contributeurs
                            </h3>
                            {topContributors.length === 0 ? (
                                <div className="text-center py-12 text-gray-500">
                                    <i className="fas fa-user-slash text-5xl mb-4"></i>
                                    <p>Aucun contributeur enregistré</p>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {topContributors.map((contributor, idx) => (
                                        <div key={contributor.user_id} className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                                            <div className="flex items-center gap-4">
                                                <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-bold ${idx === 0 ? 'bg-yellow-500' : idx === 1 ? 'bg-gray-400' : idx === 2 ? 'bg-orange-600' : 'bg-purple-500'
                                                    }`}>
                                                    {idx + 1}
                                                </div>
                                                <div className="flex-1">
                                                    <h4 className="font-bold text-gray-900 dark:text-white">{contributor.user_name}</h4>
                                                    <div className="flex gap-2 mt-1 flex-wrap">
                                                        {contributor.departments.map(d => (
                                                            <span key={d} className="px-2 py-0.5 bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-200 rounded text-xs">
                                                                {d}
                                                            </span>
                                                        ))}
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-sm text-gray-500">{contributor.books_count} livres</p>
                                                    <p className="text-lg font-bold text-purple-600">{contributor.words_count.toLocaleString('fr-FR')} mots</p>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

// Composant KPI Card
function KPICard({ icon, label, value, color, large = false }: {
    icon: string;
    label: string;
    value: string | number;
    color: string;
    large?: boolean;
}) {
    const colorClasses: Record<string, string> = {
        purple: 'from-purple-500 to-purple-600',
        green: 'from-green-500 to-green-600',
        blue: 'from-blue-500 to-blue-600',
        gray: 'from-gray-500 to-gray-600',
        orange: 'from-orange-500 to-orange-600',
        red: 'from-red-500 to-red-600',
        indigo: 'from-indigo-500 to-indigo-600',
        cyan: 'from-cyan-500 to-cyan-600',
        amber: 'from-amber-500 to-amber-600'
    };

    return (
        <div className={`${large ? 'col-span-1' : ''} bg-gradient-to-br ${colorClasses[color] || colorClasses.purple} rounded-xl p-4 text-white shadow-lg`}>
            <div className="flex items-center justify-between mb-2">
                <i className={`fas ${icon} text-2xl opacity-80`}></i>
            </div>
            <p className={`font-bold ${large ? 'text-3xl' : 'text-2xl'} mb-1`}>{value}</p>
            <p className="text-xs opacity-90">{label}</p>
        </div>
    );
}
// src/components/Reports/Reports.tsx
import { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';

interface WeeklyActivity {
  day: string;
  count: number;
}

interface RecentActivityItem {
  id: string;
  user_name: string;
  action: string;
  document_title: string;
  created_at: string;
  icon: string;
  color: string;
}

interface DepartmentStat {
  department: string;
  label: string;
  icon: string;
  color: string;
  totalBooks: number;
  totalWords: number;
  avgDays: number;
}

interface TopContributor {
  user_id: string;
  user_name: string;
  books_count: number;
  words_count: number;
  departments: string[];
}

interface ReportsStats {
  totalDocuments: number;
  validatedDocuments: number;
  activeUsers: number;
  tagsUsed: number;
  weeklyActivity: WeeklyActivity[];
  recentActivity: RecentActivityItem[];
  totalBooks: number;
  published: number;
  inProgress: number;
  draft: number;
  returned: number;
  rejected: number;
  totalWords: number;
  avgWordsPerBook: number;
  avgDaysPerBook: number;
  departmentStats: DepartmentStat[];
  topContributors: TopContributor[];
}

const DEPARTMENTS_CONFIG = [
  { dept: 'D0', label: 'Registre', icon: 'fa-database', color: 'bg-purple-500' },
  { dept: 'D1', label: 'Analyse', icon: 'fa-search', color: 'bg-blue-500' },
  { dept: 'D2', label: 'Transcription', icon: 'fa-keyboard', color: 'bg-cyan-500' },
  { dept: 'D3', label: 'Nettoyage', icon: 'fa-broom', color: 'bg-indigo-500' },
  { dept: 'D4', label: 'Éditorialisation', icon: 'fa-book', color: 'bg-pink-500' },
  { dept: 'D5', label: 'Super Correction', icon: 'fa-pen-fancy', color: 'bg-emerald-500' },
  { dept: 'D6', label: 'Relecture 1', icon: 'fa-edit', color: 'bg-amber-500' },
  { dept: 'D7', label: 'Relecture 2', icon: 'fa-language', color: 'bg-violet-500' },
  { dept: 'D8', label: 'Publication', icon: 'fa-check-circle', color: 'bg-rose-500' },
];

interface ReportsProps {
  userDepartment?: string | null;
  userIsAdmin?: boolean;
}

// ✅ AJOUTER les props au composant
export default function Reports({ userDepartment, userIsAdmin }: ReportsProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'departments' | 'activity' | 'contributors'>('overview');
  const [stats, setStats] = useState<ReportsStats>({
    totalDocuments: 0,
    validatedDocuments: 0,
    activeUsers: 0,
    tagsUsed: 0,
    weeklyActivity: [],
    recentActivity: [],
    totalBooks: 0,
    published: 0,
    inProgress: 0,
    draft: 0,
    returned: 0,
    rejected: 0,
    totalWords: 0,
    avgWordsPerBook: 0,
    avgDaysPerBook: 0,
    departmentStats: [],
    topContributors: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadReportsData();
  }, [userDepartment, userIsAdmin]); // ✅ Recharger quand le département change

  const loadReportsData = async () => {
    try {
      // Charger les documents
      const { data: documents } = await supabase
        .from('documents')
        .select('*');

      // ✅ Charger les livres ZTF - filtrer par département si pas admin
      let booksQuery = supabase.from('ztf_books').select('*');
      
      if (!userIsAdmin && userDepartment) {
        booksQuery = booksQuery.eq('current_department', userDepartment);
      }
      
      const { data: books } = await booksQuery;

      // Charger l'activité récente
      const { data: activity } = await supabase
        .from('activity_log')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);

      // Charger les utilisateurs actifs
      const { data: users } = await supabase
        .from('activity_log')
        .select('user_id, user_name')
        .order('created_at', { ascending: false });

      const uniqueUsers = [...new Map(users?.map(u => [u.user_id, u]) || [])].values();

      // Calculer l'activité hebdomadaire
      const weeklyData = calculateWeeklyActivity(activity || []);

      // Compter les tags uniques
      const allTags = documents?.flatMap(d => d.tags || []) || [];
      const uniqueTags = [...new Set(allTags)];

      // Statistiques des livres
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

      // Calculer le temps moyen par livre
      const publishedBooks = books?.filter(b => b.ztf_status === 'PUBLISHED' && b.published_date && b.created_at) || [];
      let avgDaysPerBook = 0;
      if (publishedBooks.length > 0) {
        const totalDays = publishedBooks.reduce((sum, b) => {
          const days = (new Date(b.published_date).getTime() - new Date(b.created_at).getTime()) / (1000 * 60 * 60 * 24);
          return sum + days;
        }, 0);
        avgDaysPerBook = Math.round(totalDays / publishedBooks.length);
      }

      // ✅ Statistiques par département - filtrer si pas admin
      const deptStats: DepartmentStat[] = [];
      const departmentsToShow = userIsAdmin 
        ? DEPARTMENTS_CONFIG 
        : DEPARTMENTS_CONFIG.filter(d => d.dept === userDepartment);
      
      for (const dep of departmentsToShow) {
        const { data: deptContents } = await supabase
          .from('book_content')
          .select('book_id, word_count, updated_at')
          .eq('department', dep.dept);

        const uniqueBooks = new Set(deptContents?.map(c => c.book_id) || []);
        const deptWords = deptContents?.reduce((sum, c) => sum + (c.word_count || 0), 0) || 0;

        let avgDays = 0;
        if (deptContents && deptContents.length > 0) {
          const dates = deptContents.map(c => new Date(c.updated_at).getTime());
          const minDate = Math.min(...dates);
          const maxDate = Math.max(...dates);
          avgDays = Math.round((maxDate - minDate) / (1000 * 60 * 60 * 24));
        }

        deptStats.push({
          department: dep.dept,
          label: dep.label,
          icon: dep.icon,
          color: dep.color,
          totalBooks: uniqueBooks.size,
          totalWords: deptWords,
          avgDays
        });
      }

      // Top contributeurs
      const responsibleMap: Record<string, { books: string[] }> = {};
      books?.forEach(b => {
        if (b.responsible_id) {
          if (!responsibleMap[b.responsible_id]) {
            responsibleMap[b.responsible_id] = { books: [] };
          }
          responsibleMap[b.responsible_id].books.push(b.id);
        }
      });

      const contributors: TopContributor[] = [];
      for (const [userId, data] of Object.entries(responsibleMap)) {
        const { data: userContents } = await supabase
          .from('book_content')
          .select('word_count, department')
          .in('book_id', data.books);

        const userWords = userContents?.reduce((sum, c) => sum + (c.word_count || 0), 0) || 0;
        const departments = [...new Set(userContents?.map(c => c.department) || [])];

        contributors.push({
          user_id: userId,
          user_name: '',
          books_count: data.books.length,
          words_count: userWords,
          departments
        });
      }

      // Charger les noms des contributeurs
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

      setStats({
        totalDocuments: (documents?.length || 0) + totalBooks,
        validatedDocuments: documents?.filter(d => d.status === 'validated' || d.workflow_step >= 4).length || 0,
        activeUsers: Array.from(uniqueUsers).length,
        tagsUsed: uniqueTags.length,
        weeklyActivity: weeklyData,
        recentActivity: activity?.map(a => ({
          id: a.id,
          user_name: a.user_name || 'Utilisateur',
          action: a.action,
          document_title: a.document_title,
          created_at: a.created_at,
          icon: a.icon || 'fa-bolt',
          color: a.color || 'blue'
        })) || [],
        totalBooks,
        published,
        inProgress,
        draft,
        returned,
        rejected,
        totalWords,
        avgWordsPerBook,
        avgDaysPerBook,
        departmentStats: deptStats,
        topContributors: contributors.slice(0, 10)
      });
    } catch (error) {
      console.error('Erreur chargement rapports:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateWeeklyActivity = (activity: any[]): WeeklyActivity[] => {
    const days = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
    const today = new Date();
    const weekData: WeeklyActivity[] = [];

    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dayName = days[date.getDay()];
      const dateStr = date.toISOString().split('T')[0];

      const count = activity.filter(a =>
        a.created_at.startsWith(dateStr)
      ).length;

      weekData.push({ day: dayName, count });
    }

    return weekData;
  };

  const exportCSV = () => {
    const csvContent = [
      ['Rapport ZTF-GEST', new Date().toLocaleDateString('fr-FR')],
      [],
      ['KPIs Globaux'],
      ['Total livres', stats.totalBooks],
      ['Publiés', stats.published],
      ['En cours', stats.inProgress],
      ['Brouillons', stats.draft],
      ['Retournés', stats.returned],
      ['Rejetés', stats.rejected],
      ['Total mots', stats.totalWords],
      ['Mots moyens/livre', stats.avgWordsPerBook],
      ['Jours moyens/livre', stats.avgDaysPerBook],
      [],
      ['Statistiques par département'],
      ['Département', 'Livres', 'Mots', 'Jours moyens'],
      ...stats.departmentStats.map(d => [d.label, d.totalBooks, d.totalWords, d.avgDays]),
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

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-xl shadow-lg p-6 text-white">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <i className="fas fa-chart-line"></i>
              Rapports & Analytics
              {!userIsAdmin && userDepartment && (
                <span className="text-sm bg-white/20 px-3 py-1 rounded-full ml-4">
                  Département {userDepartment}
                </span>
              )}
            </h1>
            <p className="text-purple-100 mt-2">
              {userIsAdmin 
                ? 'Tableau de bord global du pipeline éditorial ZTF-GEST'
                : `Statistiques du département ${userDepartment}`
              }
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={loadReportsData}
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
          <nav className="flex gap-2 p-2">
            {[
              { id: 'overview', label: "Vue d'ensemble", icon: 'fa-tachometer-alt' },
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
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* KPIs principaux */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard
                  title="Documents créés"
                  value={stats.totalDocuments}
                  icon="fa-file"
                  color="blue"
                />
                <StatCard
                  title="Documents validés"
                  value={stats.validatedDocuments}
                  icon="fa-check-circle"
                  color="green"
                />
                <StatCard
                  title="Utilisateurs actifs"
                  value={stats.activeUsers}
                  icon="fa-users"
                  color="purple"
                />
                <StatCard
                  title="Tags utilisés"
                  value={stats.tagsUsed}
                  icon="fa-tags"
                  color="indigo"
                />
              </div>

              {/* KPIs livres */}
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                <KPICard icon="fa-book" label="Total livres" value={stats.totalBooks} color="purple" />
                <KPICard icon="fa-check-circle" label="Publiés" value={stats.published} color="green" />
                <KPICard icon="fa-spinner" label="En cours" value={stats.inProgress} color="blue" />
                <KPICard icon="fa-file-alt" label="Brouillons" value={stats.draft} color="gray" />
                <KPICard icon="fa-undo" label="Retournés" value={stats.returned} color="orange" />
                <KPICard icon="fa-times-circle" label="Rejetés" value={stats.rejected} color="red" />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <KPICard icon="fa-font" label="Total mots" value={stats.totalWords.toLocaleString('fr-FR')} color="indigo" large />
                <KPICard icon="fa-calculator" label="Mots/livre" value={stats.avgWordsPerBook} color="cyan" large />
                <KPICard icon="fa-clock" label="Jours/livre" value={stats.avgDaysPerBook} color="amber" large />
              </div>

              {/* Activité hebdomadaire */}
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-6">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
                  Activité hebdomadaire
                </h3>
                <div className="flex items-end justify-between h-48 gap-2">
                  {stats.weeklyActivity.map((day) => (
                    <div key={day.day} className="flex-1 flex flex-col items-center gap-2">
                      <div
                        className="w-full bg-blue-600 rounded-t-lg transition-all hover:bg-blue-700"
                        style={{
                          height: `${Math.max(10, (day.count / Math.max(...stats.weeklyActivity.map(d => d.count), 1)) * 100)}%`
                        }}
                        title={`${day.count} activités`}
                      ></div>
                      <span className="text-xs text-gray-500">{day.day}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Activité récente */}
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-6">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
                  Activité récente
                </h3>
                {stats.recentActivity.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">Aucune activité récente</p>
                ) : (
                  <div className="space-y-3">
                    {stats.recentActivity.slice(0, 10).map((activity) => (
                      <div
                        key={activity.id}
                        className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                      >
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 bg-${activity.color}-100 dark:bg-${activity.color}-900/30`}>
                          <i className={`fas ${activity.icon} text-${activity.color}-600`}></i>
                        </div>
                        <div className="flex-1">
                          <p className="text-sm text-gray-900 dark:text-white">
                            <span className="font-semibold">{activity.user_name}</span>{' '}
                            {activity.action}{' '}
                            {activity.document_title && (
                              <span className="font-semibold text-blue-600">{activity.document_title}</span>
                            )}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            {new Date(activity.created_at).toLocaleDateString('fr-FR', {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric'
                            })}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Départements */}
          {activeTab === 'departments' && (
            <div className="space-y-4">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <i className="fas fa-building text-purple-600"></i>
                {userIsAdmin ? 'Statistiques par département' : `Statistiques du département ${userDepartment}`}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {stats.departmentStats.map(dep => (
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

          {/* Activité */}
          {activeTab === 'activity' && (
            <div className="space-y-4">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <i className="fas fa-history text-purple-600"></i>
                Activité récente (20 dernières actions)
              </h3>
              {stats.recentActivity.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <i className="fas fa-inbox text-5xl mb-4"></i>
                  <p>Aucune activité enregistrée</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {stats.recentActivity.map((activity) => (
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
                          <span className="font-medium">{activity.action}</span>{' '}
                          {activity.document_title && (
                            <span className="font-medium text-purple-600 dark:text-purple-400">{activity.document_title}</span>
                          )}
                        </p>
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
              {stats.topContributors.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <i className="fas fa-user-slash text-5xl mb-4"></i>
                  <p>Aucun contributeur enregistré</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {stats.topContributors.map((contributor, idx) => (
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

function StatCard({ title, value, icon, color }: { title: string; value: number; icon: string; color: string }) {
  const colorClasses: Record<string, string> = {
    blue: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
    green: 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400',
    purple: 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400',
    indigo: 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400',
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-6">
      <div className="flex items-center gap-4">
        <div className={`w-12 h-12 rounded-full flex items-center justify-center ${colorClasses[color]}`}>
          <i className={`fas ${icon} text-xl`}></i>
        </div>
        <div>
          <p className="text-sm text-gray-500 dark:text-gray-400">{title}</p>
          <p className="text-3xl font-bold text-gray-900 dark:text-white">{value}</p>
        </div>
      </div>
    </div>
  );
}

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
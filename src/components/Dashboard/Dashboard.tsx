// src/components/Dashboard/Dashboard.tsx
import { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';

// ✅ Ajouter l'interface pour les props
interface DashboardProps {
  onViewAllActivity?: () => void;
}

interface DashboardStats {
  totalDocuments: number;
  validatedDocuments: number;
  pendingDocuments: number;
  projects: Project[];
  recentActivity: Activity[];
}

interface Project {
  id: string;
  title: string;
  document_count: number;
  progress: number;
  last_updated: string;
}

interface Activity {
  id: string;
  user_name: string;
  action: string;
  document_title: string;
  created_at: string;
  icon: string;
  color: string;
}

function StatCard({ title, value, icon, color }: { title: string; value: number; icon: string; color: string }) {
  const colorClasses: Record<string, string> = {
    blue: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
    green: 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400',
    yellow: 'bg-yellow-100 text-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-400',
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

function ProjectsList({ projects }: { projects: Project[] }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-6">
      <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Projets en cours</h3>
      {projects.length === 0 ? (
        <p className="text-gray-500 text-center py-8">Aucun projet</p>
      ) : (
        <div className="space-y-4">
          {projects.map(project => (
            <div key={project.id} className="border-b border-gray-200 dark:border-gray-700 pb-4 last:border-0">
              <div className="flex justify-between items-start mb-2">
                <h4 className="font-semibold text-gray-900 dark:text-white">{project.title}</h4>
                <span className="text-sm text-gray-500">{project.document_count} documents</span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mb-2">
                <div
                  className="bg-blue-600 h-2 rounded-full"
                  style={{ width: `${project.progress}%` }}
                ></div>
              </div>
              <div className="flex justify-between text-xs text-gray-500">
                <span>Dernière mise à jour: {new Date(project.last_updated).toLocaleDateString('fr-FR')}</span>
                <span className="font-semibold text-blue-600">{project.progress}%</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ✅ Utiliser la prop onViewAll au lieu de useNavigate
function RecentActivity({ activity, onViewAll }: { activity: Activity[]; onViewAll?: () => void }) {
  const getIconColor = (color: string) => {
    const colors: Record<string, string> = {
      blue: 'bg-blue-100 text-blue-600',
      green: 'bg-green-100 text-green-600',
      purple: 'bg-purple-100 text-purple-600',
      yellow: 'bg-yellow-100 text-yellow-600',
    };
    return colors[color] || colors.blue;
  };

  const getRelativeTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return 'Il y a quelques secondes';
    if (diffInSeconds < 3600) return `Il y a ${Math.floor(diffInSeconds / 60)} minutes`;
    if (diffInSeconds < 86400) return `Il y a ${Math.floor(diffInSeconds / 3600)} heures`;
    if (diffInSeconds < 604800) return `Il y a ${Math.floor(diffInSeconds / 86400)} jours`;
    return date.toLocaleDateString('fr-FR');
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-6">
      <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Activité récente</h3>
      {activity.length === 0 ? (
        <p className="text-gray-500 text-center py-8">Aucune activité</p>
      ) : (
        <div className="space-y-4">
          {activity.slice(0, 4).map(item => (
            <div key={item.id} className="flex items-start gap-3">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${getIconColor(item.color)}`}>
                <i className={`fas ${item.icon}`}></i>
              </div>
              <div className="flex-1">
                <p className="text-sm text-gray-900 dark:text-white">
                  <span className="font-semibold">{item.user_name}</span> {item.action}{' '}
                  {item.document_title && <span className="font-semibold">{item.document_title}</span>}
                </p>
                <p className="text-xs text-gray-500 mt-1">{getRelativeTime(item.created_at)}</p>
              </div>
            </div>
          ))}
          {onViewAll && (
            <button 
              onClick={onViewAll}
              className="w-full mt-4 px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-all"
            >
              Voir toute l'activité
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ✅ Composant principal avec props
export default function Dashboard({ onViewAllActivity }: DashboardProps) {
  const [stats, setStats] = useState<DashboardStats>({
    totalDocuments: 0,
    validatedDocuments: 0,
    pendingDocuments: 0,
    projects: [],
    recentActivity: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      const { data: books, error: booksError } = await supabase
        .from('ztf_books')
        .select('*');

      if (booksError) console.error('Erreur ztf_books:', booksError);

      const { data: activity, error: actError } = await supabase
        .from('activity_log')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);

      if (actError) console.error('Erreur activité:', actError);

      const totalBooks = books?.length || 0;
      const validatedBooks = books?.filter(b => b.ztf_status === 'PUBLISHED' || b.ztf_status === 'COMPLETED').length || 0;
      const pendingBooks = books?.filter(b => b.ztf_status === 'DRAFT' || b.ztf_status === 'IN_PROGRESS').length || 0;

      const projectsData: Project[] = books?.map(book => ({
        id: book.id,
        title: book.title,
        document_count: 1,
        progress: book.ztf_status === 'PUBLISHED' ? 100 : 
                  book.ztf_status === 'IN_PROGRESS' ? 50 : 0,
        last_updated: book.updated_at || book.created_at
      })) || [];

      setStats({
        totalDocuments: totalBooks,
        validatedDocuments: validatedBooks,
        pendingDocuments: pendingBooks,
        projects: projectsData,
        recentActivity: activity?.map(a => ({
          id: a.id,
          user_name: a.user_name || 'Utilisateur',
          action: a.action,
          document_title: a.document_title,
          created_at: a.created_at,
          icon: a.icon || 'fa-bolt',
          color: a.color || 'blue'
        })) || []
      });
    } catch (error) {
      console.error('Erreur chargement dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-12 text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
        <p className="mt-4 text-gray-500">Chargement...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard
          title="Documents totaux"
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
          title="En attente"
          value={stats.pendingDocuments}
          icon="fa-clock"
          color="yellow"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ProjectsList projects={stats.projects} />
        <RecentActivity 
          activity={stats.recentActivity} 
          onViewAll={onViewAllActivity}
        />
      </div>
    </div>
  );
}
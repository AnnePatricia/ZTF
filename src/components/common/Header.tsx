// src/components/common/Header.tsx
import { useState } from 'react';
import { ZtfUser } from '../../types/ztf';
import { ROLE_LABELS, DEPARTMENT_LABELS } from '../../types/ztf';
import { useNotifications } from '../../hooks/useNotifications';
import NotificationsPanel from '../Notifications/Notifications';

interface HeaderProps {
  onLogout: () => void;
  user: ZtfUser | null;
  isAdmin: boolean;
  isChef: boolean;
  department: string | null;
}

export default function Header({ onLogout, user, isAdmin, isChef, department }: HeaderProps) {
  // ✅ Les hooks doivent être à l'intérieur du composant
  const { unreadCount } = useNotifications();
  const [showNotifications, setShowNotifications] = useState(false);

  return (
    <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-bold text-purple-600">
              <i className="fas fa-book-open mr-2"></i>
              BCM Gest
            </h1>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              Gestion documentaire & workflow
            </span>
          </div>

          <div className="flex items-center gap-4">
            {/* Profil utilisateur avec rôle */}
            {user && (
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">
                    {user.full_name}
                  </p>
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <span className={`px-2 py-0.5 rounded-full ${isAdmin ? 'bg-purple-100 text-purple-800' :
                      isChef ? 'bg-blue-100 text-blue-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                      {ROLE_LABELS[user.role]}
                    </span>
                    {department && (
                      <span className="text-gray-400">
                        {DEPARTMENT_LABELS[department as keyof typeof DEPARTMENT_LABELS]}
                      </span>
                    )}
                  </div>
                </div>
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-white font-bold">
                  {user.full_name.charAt(0).toUpperCase()}
                </div>
              </div>
            )}

            {/* ✅ Un seul bouton de notifications */}
            <button
              onClick={() => setShowNotifications(true)}
              className="relative px-3 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
              title="Notifications"
            >
              <i className="fas fa-bell text-xl"></i>
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                  {unreadCount}
                </span>
              )}
            </button>

            {/* Bouton déconnexion */}
            <button
              onClick={onLogout}
              className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
              title="Déconnexion"
            >
              <i className="fas fa-sign-out-alt"></i>
            </button>
          </div>
        </div>
      </div>

      {/* ✅ Panel de notifications en dehors du header pour le positionnement */}
      <NotificationsPanel
        isOpen={showNotifications}
        onClose={() => setShowNotifications(false)}
      />
    </header>
  );
}
import React, { useState } from "react";
import { useAuth } from "../../hooks/useAuth";

interface UserMenuProps {
  onLogout?: () => void;
}

const UserMenu: React.FC<UserMenuProps> = ({ onLogout }) => {
  const { user } = useAuth();
  const [showDropdown, setShowDropdown] = useState(false);

  // ✅ Extraire les informations utilisateur
  const userName = user?.user_metadata?.full_name || user?.email?.split("@")[0];
  const userEmail = user?.email;

  // ✅ Extraire les initiales pour l'avatar
  const getInitials = (name: string | null) => {
    if (!name) return "U";
    const parts = name.split(" ");
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  const initials = getInitials(userName);

  return (
    <div className="relative">
      {/* ✅ Bouton Utilisateur */}
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className="flex items-center space-x-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg p-2 transition-all duration-200"
        title="Menu utilisateur"
      >
        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-purple-600 to-indigo-600 text-white flex items-center justify-center font-bold text-sm shadow-md">
          {initials}
        </div>
        <span className="hidden md:inline text-sm text-gray-700 dark:text-gray-200 font-medium">
          {userName || "Utilisateur"}
        </span>
        <i className={`fas fa-chevron-down text-xs text-gray-500 transition-transform duration-200 ${showDropdown ? 'rotate-180' : ''}`}></i>
      </button>

      {/* ✅ Menu Déroulant */}
      {showDropdown && (
        <>
          {/* Overlay pour fermer au clic extérieur */}
          <div
            className="fixed inset-0 z-10"
            onClick={() => setShowDropdown(false)}
          ></div>

          {/* Menu */}
          <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 z-20 animate-scale-in">
            {/* En-tête du menu */}
            <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
              <p className="text-sm font-bold text-gray-900 dark:text-white">
                {userName || "Utilisateur"}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-1">
                {userEmail}
              </p>
            </div>

            {/* Options du menu */}
            <div className="py-2">
              <button
                className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-3 transition-colors"
                onClick={() => {
                  setShowDropdown(false);
                  // TODO: Naviguer vers le profil
                }}
              >
                <i className="fas fa-user text-purple-600"></i>
                Mon profil
              </button>
              <button
                className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-3 transition-colors"
                onClick={() => {
                  setShowDropdown(false);
                  // TODO: Naviguer vers les paramètres
                }}
              >
                <i className="fas fa-cog text-purple-600"></i>
                Paramètres
              </button>
            </div>

            {/* Séparateur */}
            <div className="border-t border-gray-200 dark:border-gray-700"></div>

            {/* Bouton Déconnexion */}
            <div className="py-2">
              <button
                onClick={() => {
                  setShowDropdown(false);
                  onLogout?.();
                }}
                className="w-full px-4 py-2 text-left text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-3 transition-colors font-medium"
              >
                <i className="fas fa-sign-out-alt"></i>
                Se déconnecter
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default UserMenu;

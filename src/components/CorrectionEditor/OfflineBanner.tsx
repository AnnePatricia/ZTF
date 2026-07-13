// =====================================================
// COMPOSANT: OfflineBanner
// Description: Bannière d'avertissement de déconnexion
// =====================================================

import React from 'react';

interface OfflineBannerProps {
  pendingOps: number;
}

const OfflineBanner: React.FC<OfflineBannerProps> = ({ pendingOps }) => {
  return (
    <div className="bg-red-600 dark:bg-red-700 text-white px-4 py-2 flex items-center justify-between text-sm shadow-md z-50">
      <div className="flex items-center gap-3">
        <i className="fas fa-wifi text-xl animate-pulse"></i>
        <div>
          <span className="font-bold">🔴 Hors ligne</span>
          <span className="ml-2 opacity-90">
            {pendingOps > 0
              ? `${pendingOps} opération${pendingOps > 1 ? 's' : ''} en attente de synchronisation`
              : 'Mode local activé'}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-4">
        {pendingOps > 0 && (
          <div className="flex items-center gap-2 text-xs bg-red-500 dark:bg-red-600 px-3 py-1.5 rounded-lg">
            <i className="fas fa-clock"></i>
            <span>Sync auto à la reconnexion</span>
          </div>
        )}

        <button
          onClick={() => window.location.reload()}
          className="px-4 py-1.5 bg-white text-red-600 hover:bg-red-50 rounded-lg text-sm font-medium transition-colors"
        >
          <i className="fas fa-redo mr-1.5"></i>
          Réessayer
        </button>
      </div>
    </div>
  );
};

export default OfflineBanner;

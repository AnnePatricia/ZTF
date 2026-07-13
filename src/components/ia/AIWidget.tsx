// src/components/ia/AIWidget.tsx
import { useState, useEffect } from 'react';
import { useAIContext } from '../../context/AIContext';

export default function AIWidget() {
  const { isOpen, setIsOpen, suggestions, isEnabled } = useAIContext();
  const [unreadCount, setUnreadCount] = useState(0);
  const [showTooltip, setShowTooltip] = useState(false);

  // ✅ Compter les suggestions non lues
  useEffect(() => {
    if (!isOpen && suggestions.length > 0) {
      setUnreadCount(suggestions.length);
    } else {
      setUnreadCount(0);
    }
  }, [suggestions, isOpen]);

  // ✅ Tooltip au premier chargement
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowTooltip(true);
      setTimeout(() => setShowTooltip(false), 5000);
    }, 3000);
    return () => clearTimeout(timer);
  }, []);

  if (!isEnabled) return null;

  return (
    <>
      {/* ✅ Bouton flottant */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
        {/* Suggestions proactives */}
        {suggestions.length > 0 && !isOpen && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-3 max-w-xs border-l-4 border-purple-500 animate-slide-in">
            <div className="flex items-start gap-2">
              <i className="fas fa-lightbulb text-purple-500 mt-1"></i>
              <div className="flex-1">
                <p className="text-xs font-semibold text-gray-900 dark:text-white">
                  💡 Suggestion IA
                </p>
                <p className="text-xs text-gray-600 dark:text-gray-300 mt-1">
                  {suggestions[suggestions.length - 1].content}
                </p>
              </div>
              <button
                onClick={() => setIsOpen(true)}
                className="text-xs text-purple-600 hover:text-purple-800"
              >
                Voir
              </button>
            </div>
          </div>
        )}

        {/* Tooltip */}
        {showTooltip && !isOpen && (
          <div className="bg-gray-900 text-white text-xs px-3 py-2 rounded-lg shadow-lg animate-fade-in">
            Besoin d'aide ? Cliquez sur l'IA ! 🤖
            <div className="absolute -bottom-1 right-6 w-2 h-2 bg-gray-900 transform rotate-45"></div>
          </div>
        )}

        {/* ✅ Bouton principal */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={`relative w-14 h-14 rounded-full shadow-lg flex items-center justify-center transition-all duration-300 hover:scale-110 ${
            isOpen
              ? 'bg-gray-600 hover:bg-gray-700'
              : 'bg-gradient-to-br from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700'
          }`}
          title={isOpen ? 'Fermer l\'assistant IA' : 'Ouvrir l\'assistant IA'}
        >
          {isOpen ? (
            <i className="fas fa-times text-white text-xl"></i>
          ) : (
            <i className="fas fa-robot text-white text-xl"></i>
          )}

          {/* Badge notifications */}
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center animate-pulse">
              {unreadCount}
            </span>
          )}

          {/* Indicateur actif */}
          {!isOpen && (
            <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-400 rounded-full border-2 border-white"></span>
          )}
        </button>
      </div>
    </>
  );
}
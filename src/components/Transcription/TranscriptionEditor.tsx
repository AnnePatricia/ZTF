import React from 'react';

interface TranscriptionEditorProps {
  content: string;
  onChange: (content: string) => void;
  placeholder?: string;
}

const TranscriptionEditor: React.FC<TranscriptionEditorProps> = ({ 
  content, 
  onChange, 
  placeholder = "Commencez la transcription ici..."
}) => {
  return (
    <div className="h-full flex flex-col">
      {/* En-tête */}
      <div className="mb-4 pb-4 border-b border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
          Zone de transcription
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          <i className="fas fa-keyboard mr-1.5"></i>
          Raccourcis : Espace = pause/replay audio • Ctrl+S = sauvegarder
        </p>
      </div>

      {/* Zone de texte */}
      <textarea
        value={content}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="flex-1 p-4 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white resize-none font-sans text-base leading-relaxed"
        spellCheck={true}
      />

      {/* Statistiques */}
      <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
        <div className="text-sm text-gray-600 dark:text-gray-400">
          <span className="mr-4">
            <i className="fas fa-font mr-1.5"></i>
            {content.split(/\s+/).filter(word => word.length > 0).length} mots
          </span>
          <span>
            <i className="fas fa-text-height mr-1.5"></i>
            {content.length} caractères
          </span>
        </div>
      </div>
    </div>
  );
};

export default TranscriptionEditor;
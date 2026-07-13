// src/components/departments/D7/StyleGuide.tsx
import { TRANSLATION_PASSES, ZTF_BILINGUAL_GLOSSARY } from '../../../types/translation';

interface StyleGuideProps {
  onClose: () => void;
}

export default function StyleGuide({ onClose }: StyleGuideProps) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
          <div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <i className="fas fa-book text-purple-600"></i>
              Guide de Traduction D7
            </h3>
            <p className="text-sm text-gray-500 mt-1">Anglais → Français • Fidélité doctrinale ZTF</p>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700"><i className="fas fa-times text-xl"></i></button>
        </div>
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <section>
            <h4 className="text-lg font-bold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
              <i className="fas fa-language text-purple-600"></i> Principes de traduction
            </h4>
            <ul className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
              <li>• <strong>Fidélité doctrinale</strong> : préserver la profondeur théologique ZTF</li>
              <li>• <strong>Style ZTF</strong> : conserver le ton pastoral et prophétique</li>
              <li>• <strong>Terminologie cohérente</strong> : utiliser le glossaire ZTF bilingue</li>
              <li>• <strong>Versions bibliques correspondantes</strong> : NIV ↔ Bible du Semeur, KJV ↔ Louis Segond 1910</li>
              <li>• <strong>DeepL comme assistant</strong> : la décision finale reste toujours humaine</li>
            </ul>
          </section>
          <section>
            <h4 className="text-lg font-bold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
              <i className="fas fa-layer-group text-orange-600"></i> Les 7 passes obligatoires
            </h4>
            <div className="space-y-3">
              {TRANSLATION_PASSES.map(pass => (
                <div key={pass.id} className={`p-3 rounded-lg border ${pass.color} text-white`}>
                  <h5 className="font-semibold mb-1"><i className={`fas ${pass.icon} mr-2`}></i>Passe {pass.id} : {pass.name}</h5>
                  <p className="text-sm opacity-90">{pass.description}</p>
                </div>
              ))}
            </div>
          </section>
          <section>
            <h4 className="text-lg font-bold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
              <i className="fas fa-language text-purple-600"></i> Glossaire ZTF (extraits)
            </h4>
            <div className="grid grid-cols-2 gap-2 max-h-60 overflow-y-auto">
              {ZTF_BILINGUAL_GLOSSARY.slice(0, 20).map((term, i) => (
                <div key={i} className="p-2 bg-gray-50 dark:bg-gray-700 rounded-lg flex items-center gap-2">
                  <span className="text-blue-600 text-xs flex-1">{term.english}</span>
                  <i className="fas fa-arrow-right text-gray-400 text-xs"></i>
                  <span className="text-purple-600 text-xs flex-1">{term.french}</span>
                </div>
              ))}
            </div>
          </section>
          <section>
            <h4 className="text-lg font-bold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
              <i className="fas fa-check-double text-green-600"></i> Règles de validation
            </h4>
            <ul className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
              <li>• <strong>Révision croisée obligatoire</strong> : 2 traducteurs différents</li>
              <li>• <strong>Validation linguistique ET doctrinale</strong> avant livraison à D8</li>
              <li>• <strong>Signature du Chef D7</strong> requise avant livraison à D8</li>
              <li>• <strong>Renvoi à D6</strong> si problème stylistique majeur détecté</li>
            </ul>
          </section>
        </div>
        <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex justify-end">
          <button onClick={onClose} className="px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded-lg">Fermer</button>
        </div>
      </div>
    </div>
  );
}
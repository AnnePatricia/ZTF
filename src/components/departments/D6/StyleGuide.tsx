// src/components/departments/D6/StyleGuide.tsx
import { DOCTRINAL_KEYWORDS, CORRECTION_PASSES } from '../../../types/correction';

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
              <i className="fas fa-book text-teal-600"></i>
              Guide de Correction D6
            </h3>
            <p className="text-sm text-gray-500 mt-1">British English • Double validation • Terminologie ZTF</p>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700"><i className="fas fa-times text-xl"></i></button>
        </div>
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <section>
            <h4 className="text-lg font-bold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
              <i className="fas fa-flag text-blue-600"></i> British English obligatoire
            </h4>
            <ul className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
              <li>• <strong>Orthographe britannique</strong> : organisation, colour, honour, behaviour</li>
              <li>• <strong>Suffixes -ise/-yse</strong> : realise, analyse (pas -ize/-yze)</li>
              <li>• <strong>Consonnes doubles</strong> : travelled, cancelled, modelled</li>
              <li>• <strong>Terminaisons -re</strong> : centre, metre, theatre (pas -er)</li>
              <li>• <strong>Terminaisons -ence/-ance</strong> : defence, offence (pas -ense)</li>
            </ul>
          </section>
          <section>
            <h4 className="text-lg font-bold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
              <i className="fas fa-layer-group text-orange-600"></i> Les 3 passes obligatoires
            </h4>
            <div className="space-y-3">
              {CORRECTION_PASSES.map(pass => (
                <div key={pass.id} className={`p-3 rounded-lg border ${pass.color} text-white`}>
                  <h5 className="font-semibold mb-1"><i className={`fas ${pass.icon} mr-2`}></i>Passe {pass.id} : {pass.name}</h5>
                  <p className="text-sm opacity-90">{pass.description}</p>
                </div>
              ))}
            </div>
          </section>
          <section>
            <h4 className="text-lg font-bold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
              <i className="fas fa-key text-purple-600"></i> Mots-clés doctrinaux intouchables
            </h4>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {DOCTRINAL_KEYWORDS.map(word => (
                <span key={word} className="px-3 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-200 rounded-lg text-sm font-mono">{word}</span>
              ))}
            </div>
          </section>
          <section>
            <h4 className="text-lg font-bold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
              <i className="fas fa-check-double text-green-600"></i> Règles de validation
            </h4>
            <ul className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
              <li>• <strong>Double validation obligatoire</strong> : 2 correcteurs différents</li>
              <li>• <strong>Aucun manuscrit ne quitte D6</strong> avec une seule validation</li>
              <li>• <strong>Signature du Chef D6</strong> requise avant livraison à D7</li>
              <li>• <strong>Renvoi à D5</strong> si problème stylistique majeur détecté</li>
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
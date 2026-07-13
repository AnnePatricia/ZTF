// src/components/departments/D5/StyleGuide.tsx
interface StyleGuideProps {
  onClose: () => void;
}

export default function StyleGuide({ onClose }: StyleGuideProps) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        {/* En-tête */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
          <div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <i className="fas fa-book text-blue-600"></i>
              Guide de Style ZTF
            </h3>
            <p className="text-sm text-gray-500 mt-1">
              Référence pour la réécriture en anglais natif
            </p>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
            <i className="fas fa-times text-xl"></i>
          </button>
        </div>

        {/* Contenu */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Règles générales */}
          <section>
            <h4 className="text-lg font-bold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
              <i className="fas fa-globe text-blue-600"></i>
              Règles générales
            </h4>
            <ul className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
              <li>• <strong>Anglais natif uniquement</strong> — style fluide et naturel</li>
              <li>• <strong>British English</strong> obligatoire (organisation, colour, etc.)</li>
              <li>• <strong>Zéro addition doctrinale</strong> — ne rien ajouter qui n'est pas dans le texte original</li>
              <li>• <strong>Fidélité au message</strong> — préserver l'intention de l'auteur</li>
            </ul>
          </section>

          {/* Mots-clés doctrinaux */}
          <section>
            <h4 className="text-lg font-bold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
              <i className="fas fa-key text-purple-600"></i>
              Mots-clés doctrinaux intouchables
            </h4>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {['holiness', 'prayer', 'consecration', 'sanctification', 'righteousness', 'redemption', 'salvation', 'grace', 'faith', 'repentance', 'baptism', 'communion'].map(word => (
                <span key={word} className="px-3 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-200 rounded-lg text-sm font-mono">
                  {word}
                </span>
              ))}
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Ces termes ne doivent jamais être modifiés ou remplacés par des synonymes.
            </p>
          </section>

          {/* Style d'écriture */}
          <section>
            <h4 className="text-lg font-bold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
              <i className="fas fa-pen-fancy text-green-600"></i>
              Style d'écriture ZTF
            </h4>
            <ul className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
              <li>• <strong>Titres de chapitres</strong> : affirmatifs, directs, inspirants</li>
              <li>• <strong>Ton</strong> : pastoral, encourageant, autoritaire mais bienveillant</li>
              <li>• <strong>Structure</strong> : paragraphes courts, idées claires</li>
              <li>• <strong>Références bibliques</strong> : format standard (ex: John 3:16, Rom. 8:28)</li>
              <li>• <strong>Citations</strong> : guillemets anglais ("..."), attribution claire</li>
            </ul>
          </section>

          {/* Les 3 passes */}
          <section>
            <h4 className="text-lg font-bold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
              <i className="fas fa-layer-group text-orange-600"></i>
              Les 3 passes obligatoires
            </h4>
            <div className="space-y-3">
              <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                <h5 className="font-semibold text-blue-900 dark:text-blue-200 mb-1">
                  <i className="fas fa-water mr-2"></i>
                  Passe 1 : Fluidité
                </h5>
                <p className="text-sm text-blue-800 dark:text-blue-300">
                  Assurer que le texte coule naturellement en anglais. Éliminer les lourdeurs, les répétitions inutiles, les constructions maladroites.
                </p>
              </div>
              <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                <h5 className="font-semibold text-yellow-900 dark:text-yellow-200 mb-1">
                  <i className="fas fa-lightbulb mr-2"></i>
                  Passe 2 : Clarté
                </h5>
                <p className="text-sm text-yellow-800 dark:text-yellow-300">
                  Clarifier le message. S'assurer que chaque idée est compréhensible. Reformuler les passages ambigus sans changer le sens.
                </p>
              </div>
              <div className="p-3 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg">
                <h5 className="font-semibold text-purple-900 dark:text-purple-200 mb-1">
                  <i className="fas fa-palette mr-2"></i>
                  Passe 3 : Cohérence stylistique
                </h5>
                <p className="text-sm text-purple-800 dark:text-purple-300">
                  Harmoniser avec le style ZTF. Uniformiser le ton, le vocabulaire, la structure. Vérifier la cohérence globale du manuscrit.
                </p>
              </div>
            </div>
          </section>

          {/* Exemples */}
          <section>
            <h4 className="text-lg font-bold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
              <i className="fas fa-examples text-indigo-600"></i>
              Exemples de reformulation
            </h4>
            <div className="space-y-3">
              <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <p className="text-xs text-gray-500 mb-1">❌ À éviter :</p>
                <p className="text-sm text-red-700 dark:text-red-300">
                  "The prayer is very important for the Christian life."
                </p>
                <p className="text-xs text-gray-500 mt-2 mb-1">✅ Style ZTF :</p>
                <p className="text-sm text-green-700 dark:text-green-300">
                  "Prayer is the lifeblood of the Christian walk."
                </p>
              </div>
              <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <p className="text-xs text-gray-500 mb-1">❌ À éviter :</p>
                <p className="text-sm text-red-700 dark:text-red-300">
                  "We must pray every day without stopping."
                </p>
                <p className="text-xs text-gray-500 mt-2 mb-1">✅ Style ZTF :</p>
                <p className="text-sm text-green-700 dark:text-green-300">
                  "Unceasing prayer is the hallmark of a devoted believer."
                </p>
              </div>
            </div>
          </section>

          {/* Règles de validation */}
          <section>
            <h4 className="text-lg font-bold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
              <i className="fas fa-check-double text-green-600"></i>
              Règles de validation
            </h4>
            <ul className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
              <li>• <strong>Double validation obligatoire</strong> : 2 anglophones différents doivent valider</li>
              <li>• <strong>Aucune page ne quitte D5</strong> avec la validation d'un seul membre</li>
              <li>• <strong>Signature du Rédacteur en chef</strong> requise avant livraison à D6</li>
              <li>• <strong>Renvoi à D4</strong> si addition doctrinale détectée</li>
            </ul>
          </section>
        </div>

        {/* Pied de page */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 rounded-lg"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
}
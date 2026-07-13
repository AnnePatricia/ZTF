import React, { useState, useEffect, useCallback } from "react";
import { useDocuments } from "../../hooks/useDocuments";
import type { Document } from "../Documents/document";
import PDFViewer from './PDFViewer';
import AudioPlayer from './AudioPlayer';
import TranscriptionEditor from './TranscriptionEditor';

const Transcription: React.FC = () => {
  const { documents, loading, error, updateDocumentWithVersioning } = useDocuments();

  // États simples avec types explicites
  const [activeTab, setActiveTab] = useState<'launch' | 'review' | 'tagging'>('launch');
  const [selectedDoc, setSelectedDoc] = useState<Document | null>(null);
  const [content, setContent] = useState<string>(''); // ✅ Toujours string
  const [lastSave, setLastSave] = useState<Date | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>(''); // 🔑 État recherche

  // 🔑 Fonction utilitaire pour garantir que content est toujours une chaîne
  const ensureString = (value: any): string => {
    if (typeof value === 'string') return value;
    if (value === null || value === undefined) return '';
    return String(value);
  };

  // 🔑 NOUVEAU : Fonction de filtrage avec recherche ÉTENDUE
  const filterDocuments = () => {
    return documents.filter(doc => {
      // 1. Filtrer par onglet actif
      let matchesTab = false;
      if (activeTab === 'launch') {
        matchesTab = doc.status === 'imported' || doc.status === 'transcribing';
        // ✅ NOUVEAU (avec book_project, proofreading_1, proofreading_2)
      } else if (activeTab === 'review') {
        matchesTab = doc.status === 'transcribed' &&
          ensureString(doc.content).trim().length > 0;
      } else if (activeTab === 'tagging') {
        matchesTab = doc.status === 'book_project' || doc.status === 'proofreading_1';
      } else {
        matchesTab = doc.status === 'proofreading_2' || doc.status === 'edited';
      }
      if (!matchesTab) return false;

      // 2. Filtrer par recherche (si query non vide)
      if (!searchQuery.trim()) return true;

      const query = searchQuery.toLowerCase();

      // 🔑 RECHERCHE ÉTENDUE : Tous les champs du document

      // Recherche dans le titre
      if (ensureString(doc.title).toLowerCase().includes(query)) return true;

      // Recherche dans la source
      if (ensureString(doc.source).toLowerCase().includes(query)) return true;

      // Recherche dans le type
      if (ensureString(doc.type).toLowerCase().includes(query)) return true;

      // Recherche dans la personne assignée
      if (ensureString(doc.assigned_to).toLowerCase().includes(query)) return true;

      // Recherche dans les tags
      if (doc.tags?.some(tag => ensureString(tag).toLowerCase().includes(query))) return true;

      // Recherche dans le contenu (pour tous les onglets)
      if (ensureString(doc.content).toLowerCase().includes(query)) return true;

      // Recherche dans le statut
      if (ensureString(doc.status).toLowerCase().includes(query)) return true;

      // Recherche dans l'ID (utile pour recherche précise)
      if (ensureString(doc.id).toLowerCase().includes(query)) return true;

      // Recherche dans la progression
      if (doc.progress && ensureString(doc.progress).includes(query)) return true;

      // Recherche dans la date de création
      if (doc.created_at && ensureString(doc.created_at).includes(query)) return true;

      // Recherche dans la date de mise à jour
      if (doc.updated_at && ensureString(doc.updated_at).includes(query)) return true;

      return false;
    });
  };

  const filteredDocs = filterDocuments();

  // Charger contenu quand document sélectionné
  useEffect(() => {
    if (selectedDoc) {
      const safeContent = ensureString(selectedDoc.content);
      setContent(safeContent);

      // Restaurer brouillon si existe
      const draft = localStorage.getItem(`bcm_draft_${selectedDoc.id}`);
      if (draft) {
        try {
          const { content: savedContent } = JSON.parse(draft);
          if (savedContent && !safeContent.trim()) {
            setContent(ensureString(savedContent));
          }
        } catch (err) {
          console.warn('Brouillon invalide, ignoré:', err);
        }
      }
    } else {
      setContent('');
    }
  }, [selectedDoc]);

  // Sauvegarde auto
  useEffect(() => {
    if (selectedDoc && typeof content === 'string' && content.trim()) {
      const timer = setTimeout(() => {
        localStorage.setItem(`bcm_draft_${selectedDoc.id}`, JSON.stringify({
          content: content.trim(),
          timestamp: new Date().toISOString()
        }));
        setLastSave(new Date());
      }, 30000);
      return () => clearTimeout(timer);
    }
  }, [selectedDoc, content]);

  // Sauvegarder document
  const handleSave = useCallback(async () => {
    if (!selectedDoc || !content || !content.trim()) {
      alert('⚠️ Le contenu ne peut pas être vide');
      return;
    }

    try {
      // ✅ NOUVEAU
      let newStatus = selectedDoc.status;
      if (activeTab === 'launch' && content.trim()) newStatus = 'transcribed';
      if (activeTab === 'review') newStatus = 'book_project';
      if (activeTab === 'tagging') newStatus = 'proofreading_1';

      await updateDocumentWithVersioning(selectedDoc.id, {
        ...selectedDoc,
        content: content.trim(),
        status: newStatus,
        progress: activeTab === 'launch' ? 40 : activeTab === 'review' ? 70 : 100,
      });

      // Nettoyer brouillon
      localStorage.removeItem(`bcm_draft_${selectedDoc.id}`);

      alert(`✅ Document sauvegardé !\nNouveau statut: ${newStatus}`);
      setSelectedDoc(null);
      setContent('');
    } catch (err) {
      console.error('Erreur sauvegarde:', err);
      alert('❌ Erreur lors de la sauvegarde');
    }
  }, [selectedDoc, content, activeTab, updateDocumentWithVersioning]);

  // Raccourcis clavier
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSelectedDoc(null);
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        handleSave();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [handleSave]);

  if (loading) return <div className="text-center py-12">Chargement...</div>;
  if (error) return <div className="text-red-500 p-4">Erreur: {error}</div>;

  // Aucun document sélectionné = afficher liste
  if (!selectedDoc) {
    return (
      <div className="container mx-auto px-4 py-6">
        <h1 className="text-2xl font-bold mb-6 flex items-center">
          <i className="fas fa-microphone mr-3 text-blue-500"></i>
          Module de Transcription
        </h1>

        {/* Sous-onglets */}
        <div className="mb-6 border-b">
          <div className="flex space-x-4">
            {[
              { key: 'launch', label: 'Lancement', icon: 'fa-rocket', color: 'blue' },
              { key: 'review', label: 'Relecture', icon: 'fa-eye', color: 'green' },
              { key: 'tagging', label: 'Tagging', icon: 'fa-tags', color: 'purple' }
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => {
                  setActiveTab(tab.key as any);
                  setSearchQuery(''); // Réinitialiser la recherche au changement d'onglet
                }}
                className={`flex items-center gap-2 px-4 py-3 font-medium ${activeTab === tab.key
                  ? `text-${tab.color}-600 border-b-2 border-${tab.color}-600`
                  : 'text-gray-500 hover:text-gray-700'
                  }`}
              >
                <i className={`fas ${tab.icon}`}></i>
                {tab.label}
                <span className={`ml-2 px-2 py-0.5 rounded-full text-xs ${activeTab === tab.key ? `bg-${tab.color}-100 text-${tab.color}-800` : 'bg-gray-200'
                  }`}>
                  {tab.key === 'launch' ? filteredDocs.length :
                    tab.key === 'review' ? documents.filter(d => d.status === "transcribed" && ensureString(d.content).trim().length > 0).length :
                      tab.key === 'tagging' ? documents.filter(d => d.status === "book_project" || d.status === "proofreading_1").length :
                        documents.filter(d => d.status === "proofreading_2" || d.status === "edited").length}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* 🔑 BARRE DE RECHERCHE ÉTENDUE */}
        <div className="mb-6 max-w-3xl mx-auto">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
              <i className="fas fa-search text-gray-400"></i>
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={`Rechercher dans tous les champs (${activeTab === 'launch' ? 'documents à transcrire' : activeTab === 'review' ? 'transcriptions' : 'documents tagués'})...`}
              className="w-full px-4 py-2.5 pl-10 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white transition-all duration-200"
              aria-label="Rechercher des documents"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                aria-label="Effacer la recherche"
              >
                <i className="fas fa-times"></i>
              </button>
            )}
          </div>
          {searchQuery && filteredDocs.length > 0 && (
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              <i className="fas fa-filter mr-1.5"></i>
              {filteredDocs.length} résultat{filteredDocs.length > 1 ? 's' : ''} trouvé{filteredDocs.length > 1 ? 's' : ''}
              <span className="ml-2 text-xs text-gray-400">
                (Titre, source, type, assigné, tags, contenu, statut, ID, progression, dates)
              </span>
            </p>
          )}
          {searchQuery && filteredDocs.length === 0 && (
            <p className="mt-2 text-sm text-red-500 dark:text-red-400">
              <i className="fas fa-exclamation-triangle mr-1.5"></i>
              Aucun document trouvé pour "{searchQuery}"
              <span className="block mt-1 text-xs text-gray-500">
                Essayez avec un autre terme ou vérifiez l'orthographe
              </span>
            </p>
          )}
        </div>

        {/* Liste documents */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredDocs.length === 0 ? (
            <div className="col-span-full text-center py-12">
              <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                <i className={`fas ${activeTab === 'launch' ? 'fa-microphone-alt' :
                  activeTab === 'review' ? 'fa-eye' : 'fa-tags'
                  } text-3xl text-gray-400`}></i>
              </div>
              <h3 className="text-lg font-medium mb-2">
                {activeTab === 'launch' && 'Aucun document à transcrire'}
                {activeTab === 'review' && 'Aucun document à relire'}
                {activeTab === 'tagging' && 'Aucun document à taguer'}
              </h3>
              <p className="text-gray-500">
                {activeTab === 'launch' && 'Importez des documents dans l\'onglet Documents'}
                {activeTab === 'review' && 'Terminez des transcriptions pour voir les documents ici'}
                {activeTab === 'tagging' && 'Validez des relectures pour voir les documents ici'}
              </p>
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm flex items-center gap-1.5 mx-auto"
                >
                  <i className="fas fa-times mr-1"></i>
                  Effacer la recherche
                </button>
              )}
            </div>
          ) : (
            filteredDocs.map(doc => (
              <div
                key={doc.id}
                onClick={() => setSelectedDoc(doc)}
                className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:border-blue-500 hover:shadow-md cursor-pointer transition-all duration-200 bg-white dark:bg-gray-800"
              >
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-bold text-gray-900 dark:text-white truncate">{doc.title}</h3>
                  <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${doc.status === 'imported' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-200' :
                    doc.status === 'transcribing' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-200' :
                      doc.status === 'transcribed' ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-200' :
                        doc.status === 'book_project' ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/20 dark:text-indigo-200' :
                          doc.status === 'proofreading_1' ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/20 dark:text-amber-200' :
                            doc.status === 'proofreading_2' ? 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-200' :
                              'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-200'
                    }`}>
                    {doc.status === 'imported' ? 'À transcrire' :
                      doc.status === 'transcribing' ? 'En cours' :
                        doc.status === 'transcribed' ? 'À lancer' :
                          doc.status === 'book_project' ? 'Projet de Livre' :
                            doc.status === 'proofreading_1' ? 'Relecture 1' :
                              doc.status === 'proofreading_2' ? 'Relecture 2' : 'Édité'}
                  </span>
                </div>

                <div className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
                  <div className="flex items-center gap-1.5">
                    <i className="fas fa-file-alt text-gray-400"></i>
                    <span>{doc.type}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <i className="fas fa-database text-gray-400"></i>
                    <span>{doc.source}</span>
                  </div>
                  {doc.assigned_to && (
                    <div className="flex items-center gap-1.5">
                      <i className="fas fa-user text-gray-400"></i>
                      <span>{doc.assigned_to}</span>
                    </div>
                  )}
                  {doc.tags && doc.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {doc.tags.slice(0, 2).map((tag, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-0.5 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 text-[10px] rounded-full"
                        >
                          #{tag}
                        </span>
                      ))}
                      {doc.tags.length > 2 && (
                        <span className="text-[10px] text-gray-500">+{doc.tags.length - 2}</span>
                      )}
                    </div>
                  )}
                  {doc.content && (
                    <div className="text-blue-600 dark:text-blue-400 mt-1 flex items-center gap-1.5">
                      <i className="fas fa-font"></i>
                      <span>{ensureString(doc.content).split(/\s+/).filter(w => w.trim()).length} mots</span>
                    </div>
                  )}
                </div>

                <button
                  onClick={(e) => { e.stopPropagation(); setSelectedDoc(doc); }}
                  className={`mt-4 w-full px-3 py-1.5 rounded text-sm font-medium transition-colors ${activeTab === 'launch' ? 'bg-blue-600 hover:bg-blue-700 text-white' :
                    activeTab === 'review' ? 'bg-green-600 hover:bg-green-700 text-white' :
                      'bg-purple-600 hover:bg-purple-700 text-white'
                    }`}
                >
                  {activeTab === 'launch' && <><i className="fas fa-play mr-1.5"></i>Transcrire</>}
                  {activeTab === 'review' && <><i className="fas fa-eye mr-1.5"></i>Relire</>}
                  {activeTab === 'tagging' && <><i className="fas fa-tags mr-1.5"></i>Taguer</>}
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    );
  }

  // Document sélectionné = afficher interface édition
  return (
    <div className="container mx-auto px-4 py-6">
      {/* Header */}
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold flex items-center">
            <i className={`fas ${activeTab === 'launch' ? 'fa-microphone text-blue-500' :
              activeTab === 'review' ? 'fa-eye text-green-500' : 'fa-tags text-purple-500'
              } mr-3`}></i>
            {activeTab === 'launch' && 'Transcription'}
            {activeTab === 'review' && 'Relecture'}
            {activeTab === 'tagging' && 'Tagging'}
            : {selectedDoc.title}
          </h1>
          <p className="text-gray-500 dark:text-gray-400">
            {selectedDoc.source} • {selectedDoc.assigned_to}
          </p>
        </div>
        <button
          onClick={() => setSelectedDoc(null)}
          className="px-4 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 rounded flex items-center transition-colors"
        >
          <i className="fas fa-arrow-left mr-2"></i>Retour à la liste
        </button>
      </div>

      {/* Interface édition */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Panneau Média */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 h-[60vh] overflow-auto">
          <h2 className="font-bold mb-4 flex items-center text-gray-900 dark:text-white">
            <i className={`fas ${selectedDoc.file_url?.match(/\.(mp3|wav|ogg|aac|m4a)$/) ? 'fa-headphones text-blue-500' :
              selectedDoc.file_url?.endsWith('.pdf') ? 'fa-file-pdf text-red-500' : 'fa-image text-green-500'
              } mr-2`}></i>
            {selectedDoc.file_url?.match(/\.(mp3|wav|ogg|aac|m4a)$/) ? 'Lecteur Audio' :
              selectedDoc.file_url?.endsWith('.pdf') ? 'Visualiseur PDF' : 'Image'}
          </h2>

          {selectedDoc.file_url?.match(/\.(mp3|wav|ogg|aac|m4a)$/) ? (
            <AudioPlayer audioUrl={selectedDoc.file_url} />
          ) : selectedDoc.file_url?.endsWith('.pdf') ? (
            <PDFViewer fileUrl={selectedDoc.file_url} />
          ) : selectedDoc.file_url ? (
            <img src={selectedDoc.file_url} alt="Document" className="max-w-full rounded-lg shadow-md" />
          ) : (
            <div className="text-center text-gray-500 dark:text-gray-400 py-8">
              <i className="fas fa-exclamation-triangle text-4xl mb-2"></i>
              <p>Aucun fichier attaché</p>
            </div>
          )}
        </div>

        {/* Panneau Éditeur */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 h-[60vh] flex flex-col">
          <h2 className="font-bold mb-4 text-gray-900 dark:text-white">Zone de saisie</h2>

          <TranscriptionEditor
            content={content}
            onChange={setContent}
            placeholder={
              activeTab === 'launch' ? "Commencez la transcription..." :
                activeTab === 'review' ? "Relisez et corrigez..." :
                  "Ajoutez des tags et métadonnées..."
            }
          />

          {/* Barre d'actions */}
          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3">
            <button
              onClick={() => setSelectedDoc(null)}
              className="px-4 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 rounded font-medium transition-colors"
            >
              Annuler
            </button>
            <button
              onClick={handleSave}
              className={`px-4 py-2 rounded font-medium flex items-center transition-colors ${activeTab === 'launch' ? 'bg-green-600 hover:bg-green-700 text-white' :
                activeTab === 'review' ? 'bg-yellow-500 hover:bg-yellow-600 text-white' :
                  'bg-purple-600 hover:bg-purple-700 text-white'
                }`}
            >
              <i className={`fas ${activeTab === 'launch' ? 'fa-save' :
                activeTab === 'review' ? 'fa-check' : 'fa-tags'
                } mr-2`}></i>
              {activeTab === 'launch' && 'Sauvegarder et passer à la relecture'}
              {activeTab === 'review' && 'Valider la relecture'}
              {activeTab === 'tagging' && 'Finaliser le tagging'}
            </button>
          </div>
        </div>
      </div>

      {/* Barre d'état */}
      <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 border-t py-2 px-6 shadow-lg z-40">
        <div className="container mx-auto flex flex-col md:flex-row md:justify-between md:items-center text-sm gap-3">
          <div className="flex flex-wrap gap-4 text-gray-600 dark:text-gray-400">
            <span>
              <i className="fas fa-font mr-1.5"></i>
              {typeof content === 'string' ? content.split(/\s+/).filter(w => w.trim()).length : 0} mots
            </span>
            <span>
              <i className="fas fa-text-height mr-1.5"></i>
              {typeof content === 'string' ? content.length : 0} caractères
            </span>
          </div>
          <div className="text-gray-500 dark:text-gray-400 flex items-center">
            <i className={`fas fa-save mr-1.5 ${lastSave ? 'text-green-500 animate-pulse' : 'text-gray-400'}`}></i>
            {lastSave ? (
              <>Dernière sauvegarde: {new Date(lastSave).toLocaleTimeString('fr-FR')}</>
            ) : (
              'Brouillon non sauvegardé'
            )}
          </div>
          <div className="hidden md:flex items-center gap-3 text-gray-400">
            <span className="flex items-center gap-1">
              <kbd className="px-2 py-0.5 bg-gray-200 dark:bg-gray-700 rounded text-[10px] font-mono">Ctrl+S</kbd>
              <span className="text-[10px]">Sauvegarder</span>
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-2 py-0.5 bg-gray-200 dark:bg-gray-700 rounded text-[10px] font-mono">Echap</kbd>
              <span className="text-[10px]">Fermer</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Transcription;
// src/components/departments/D8/PublicationEditor.tsx
import { useState, useEffect, useRef } from 'react';
import { supabase } from '../../../supabaseClient';  // ✅ AJOUTÉ - critique pour éviter les erreurs 400
import { usePublication } from '../../../hooks/usePublication';
import {
  FORMAT_TYPE_CONFIG,
  PLATFORM_CONFIG
} from '../../../types/publication';
import type {
  PublicationTask,
  PublicationFormat,
  PublicationPlatform,
  FormatType,
  PlatformName
} from '../../../types/publication';

interface PublicationEditorProps {
  task: PublicationTask;
  onBack: () => void;
}

export default function PublicationEditor({ task, onBack }: PublicationEditorProps) {
  const {
    updateMetadata,
    uploadCover,
    generateFormat,
    addPlatform,
    publishToPlatform,
    registerPublication
  } = usePublication();

  const [formats, setFormats] = useState<PublicationFormat[]>([]);
  const [platforms, setPlatforms] = useState<PublicationPlatform[]>([]);
  const [title, setTitle] = useState(task.title || '');
  const [subtitle, setSubtitle] = useState(task.subtitle || '');
  const [author, setAuthor] = useState(task.author || '');
  const [publisher, setPublisher] = useState(task.publisher || '');
  const [language, setLanguage] = useState(task.language || 'EN');
  const [isbn, setIsbn] = useState(task.isbn || '');
  const [publicationDate, setPublicationDate] = useState(task.publication_date || '');
  const [editionNumber, setEditionNumber] = useState(task.edition_number || 1);
  const [notes, setNotes] = useState(task.notes || '');
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  // ❌ SUPPRIMÉ : publishing, setPublishing (inutilisés)
  const [registering, setRegistering] = useState(false);
  const [content, setContent] = useState('');

  const coverInputRef = useRef<HTMLInputElement>(null);
  // ❌ SUPPRIMÉ : fileInputRef (inutilisé)

  useEffect(() => {
    loadFormats();
    loadPlatforms();
    loadContent();
  }, [task.id]);

  const loadFormats = async () => {
    const { data } = await supabase
      .from('publication_formats')
      .select('*')
      .eq('task_id', task.id)
      .order('created_at', { ascending: true });
    setFormats(data || []);
  };

  const loadPlatforms = async () => {
    const { data } = await supabase
      .from('publication_platforms')
      .select('*')
      .eq('task_id', task.id)
      .order('created_at', { ascending: true });
    setPlatforms(data || []);
  };

  const loadContent = async () => {
    if (task.proofreading_v2_task_id) {
      const { data } = await supabase
        .from('proofreading_v2_tasks')
        .select('content')
        .eq('id', task.proofreading_v2_task_id)
        .single();
      setContent(data?.content || '');
    }
  };

  const handleSaveMetadata = async () => {
    if (!title.trim()) {
      alert('❌ Le titre est obligatoire');
      return;
    }

    setSaving(true);
    const success = await updateMetadata(task.id, {
      title,
      subtitle: subtitle || undefined,
      author,
      publisher,
      language,
      isbn: isbn || undefined,
      publication_date: publicationDate || undefined,
      edition_number: editionNumber,
      notes: notes || undefined
    });

    if (success) {
      alert('✅ Métadonnées sauvegardées');
    }
    setSaving(false);
  };

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('❌ Seules les images sont acceptées');
      return;
    }

    setSaving(true);
    const success = await uploadCover(task.id, file);
    if (success) {
      alert('✅ Couverture uploadée');
    }
    setSaving(false);
  };

  const handleGenerateFormat = async (formatType: FormatType) => {
    if (!content) {
      alert('❌ Aucun contenu à convertir');
      return;
    }

    setGenerating(true);
    const format = await generateFormat(task.id, formatType, content);

    if (format) {
      alert(`✅ Format ${formatType.toUpperCase()} généré !`);
      await loadFormats();
    }
    setGenerating(false);
  };

  const handleAddPlatform = async (platformName: PlatformName) => {
    const url = platformName === 'custom' ? prompt('URL de la plateforme :') : undefined;
    const success = await addPlatform(task.id, platformName, url || undefined);
    if (success) {
      alert(`✅ Plateforme ${PLATFORM_CONFIG[platformName].label} ajoutée`);
      await loadPlatforms();
    }
  };

  const handlePublishToPlatform = async (platform: PublicationPlatform) => {
    const publicationId = prompt('ID de publication sur la plateforme :');
    const externalUrl = prompt('URL externe de publication :');
    const success = await publishToPlatform(
      platform.id,
      publicationId || undefined,
      externalUrl || undefined
    );
    if (success) {
      alert('✅ Publication enregistrée');
      await loadPlatforms();
    }
  };

  const handleRegister = async () => {
    if (formats.length === 0) {
      alert('❌ Générez au moins un format avant l\'enregistrement');
      return;
    }

    if (!confirm('Enregistrer définitivement cette publication dans le registre ZTF ?')) return;

    setRegistering(true);
    const registry = await registerPublication(task.id, notes || undefined);

    if (registry) {
      alert(`✅ Publication enregistrée !\n\n📋 Numéro de registre : ${registry.registry_number}\n📅 Date : ${new Date(registry.registered_at).toLocaleDateString('fr-FR')}`);
      onBack();
    }
    setRegistering(false);
  };

  return (
    <div className="space-y-4">
      {/* En-tête */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-4">
            <button
              onClick={onBack}
              className="px-3 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 rounded-lg flex items-center gap-2"
            >
              <i className="fas fa-arrow-left"></i>
              Retour
            </button>
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                {task.book?.title}
              </h2>
              <p className="text-sm text-gray-500">
                {task.book?.ztf_id} • Publication • Édition {task.edition_number}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {saving && <span className="text-sm text-gray-500"><i className="fas fa-spinner fa-spin"></i></span>}
          </div>
        </div>
      </div>

      {/* Métadonnées */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-6">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <i className="fas fa-tags text-blue-600"></i>
          Métadonnées
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Titre *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Sous-titre</label>
            <input
              type="text"
              value={subtitle}
              onChange={(e) => setSubtitle(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Auteur *</label>
            <input
              type="text"
              value={author}
              onChange={(e) => setAuthor(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Éditeur</label>
            <input
              type="text"
              value={publisher}
              onChange={(e) => setPublisher(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Langue</label>
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
            >
              <option value="EN">English</option>
              <option value="FR">Français</option>
              <option value="ES">Español</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">ISBN</label>
            <input
              type="text"
              value={isbn}
              onChange={(e) => setIsbn(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
              placeholder="978-..."
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Date de publication</label>
            <input
              type="date"
              value={publicationDate}
              onChange={(e) => setPublicationDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Numéro d'édition</label>
            <input
              type="number"
              value={editionNumber}
              onChange={(e) => setEditionNumber(parseInt(e.target.value))}
              min="1"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
            />
          </div>
        </div>
        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Notes</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
            rows={3}
          />
        </div>
        <div className="mt-4 flex justify-end">
          <button
            onClick={handleSaveMetadata}
            disabled={saving}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg flex items-center gap-2"
          >
            <i className="fas fa-save"></i>
            Sauvegarder les métadonnées
          </button>
        </div>
      </div>

      {/* Couverture */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-6">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <i className="fas fa-image text-indigo-600"></i>
          Couverture
        </h3>
        <input
          ref={coverInputRef}
          type="file"
          accept="image/*"
          onChange={handleCoverUpload}
          className="hidden"
        />
        {task.cover_image_url ? (
          <div className="flex items-center gap-4">
            <img 
              src={task.cover_image_url} 
              alt="Couverture" 
              className="max-w-xs rounded-lg shadow-lg border-2 border-gray-200 dark:border-gray-700"
            />
            <button
              onClick={() => coverInputRef.current?.click()}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg"
            >
              <i className="fas fa-upload mr-2"></i>
              Remplacer
            </button>
          </div>
        ) : (
          <button
            onClick={() => coverInputRef.current?.click()}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg"
          >
            <i className="fas fa-upload mr-2"></i>
            Uploader la couverture
          </button>
        )}
      </div>

      {/* Formats */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-6">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <i className="fas fa-file-export text-purple-600"></i>
          Formats de publication
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          {(Object.entries(FORMAT_TYPE_CONFIG) as [FormatType, typeof FORMAT_TYPE_CONFIG[FormatType]][]).map(([type, config]) => (
            <button
              key={type}
              onClick={() => handleGenerateFormat(type)}
              disabled={generating || !content}
              className={`p-4 rounded-lg border-2 transition-all ${
                formats.some(f => f.format_type === type)
                  ? 'bg-green-100 dark:bg-green-900/30 border-green-300 dark:border-green-700'
                  : 'bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 hover:border-purple-500'
              } disabled:opacity-50`}
            >
              <i className={`fas ${config.icon} text-3xl ${config.color} mb-2 block`}></i>
              <span className="font-semibold">{config.label}</span>
              {formats.some(f => f.format_type === type) && (
                <i className="fas fa-check-circle text-green-600 ml-2"></i>
              )}
            </button>
          ))}
        </div>
        {formats.length > 0 && (
          <div className="space-y-2">
            {formats.map(format => (
              <div key={format.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div className="flex items-center gap-3">
                  <i className={`fas ${FORMAT_TYPE_CONFIG[format.format_type].icon} ${FORMAT_TYPE_CONFIG[format.format_type].color}`}></i>
                  <div>
                    <p className="text-sm font-semibold">{format.file_name}</p>
                    <p className="text-xs text-gray-500">{(format.file_size / 1024).toFixed(2)} KB</p>
                  </div>
                </div>
                <a
                  href={format.file_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded text-sm"
                >
                  <i className="fas fa-download mr-1"></i>
                  Télécharger
                </a>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Plateformes */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-6">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <i className="fas fa-globe text-blue-600"></i>
          Plateformes de publication
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
          {(Object.entries(PLATFORM_CONFIG) as [PlatformName, typeof PLATFORM_CONFIG[PlatformName]][]).map(([name, config]) => (
            <button
              key={name}
              onClick={() => handleAddPlatform(name)}
              className={`p-3 rounded-lg border-2 transition-all ${
                platforms.some(p => p.platform_name === name)
                  ? 'bg-blue-100 dark:bg-blue-900/30 border-blue-300 dark:border-blue-700'
                  : 'bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 hover:border-blue-500'
              }`}
            >
              <i className={`fab ${config.icon} text-2xl mb-1 block`}></i>
              <span className="text-sm font-semibold">{config.label}</span>
              {platforms.some(p => p.platform_name === name) && (
                <i className="fas fa-check-circle text-blue-600 ml-2"></i>
              )}
            </button>
          ))}
        </div>
        {platforms.length > 0 && (
          <div className="space-y-2">
            {platforms.map(platform => (
              <div key={platform.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div className="flex items-center gap-3">
                  <i className={`fab ${PLATFORM_CONFIG[platform.platform_name].icon} text-xl`}></i>
                  <div>
                    <p className="text-sm font-semibold">{PLATFORM_CONFIG[platform.platform_name].label}</p>
                    <p className="text-xs text-gray-500">
                      Statut : {platform.publication_status === 'published' ? '✅ Publié' : '⏳ En attente'}
                    </p>
                  </div>
                </div>
                {platform.publication_status !== 'published' && (
                  <button
                    onClick={() => handlePublishToPlatform(platform)}
                    className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm"
                  >
                    <i className="fas fa-rocket mr-1"></i>
                    Publier
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Actions finales */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-6">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <i className="fas fa-check-circle text-emerald-600"></i>
          Finalisation
        </h3>
        <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-lg p-4 mb-4">
          <p className="text-sm text-emerald-800 dark:text-emerald-200">
            <i className="fas fa-info-circle mr-2"></i>
            L'enregistrement final ajoutera cette publication au registre ZTF avec un numéro unique.
            Cette action est irréversible.
          </p>
        </div>
        <div className="flex justify-end">
          <button
            onClick={handleRegister}
            disabled={registering || formats.length === 0}
            className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-400 text-white rounded-lg font-semibold flex items-center gap-2"
          >
            <i className="fas fa-registered"></i>
            {registering ? 'Enregistrement...' : 'Enregistrer dans le registre ZTF'}
          </button>
        </div>
      </div>
    </div>
  );
}
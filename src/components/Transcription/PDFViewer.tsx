import React, { useState, useEffect, useRef } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

// 🔑 WORKER PDF.JS LOCAL
pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js';

interface PDFViewerProps {
  fileUrl: string;
}

const PDFViewer: React.FC<PDFViewerProps> = ({ fileUrl }) => {
  const [useIframe, setUseIframe] = useState(false);
  const [numPages, setNumPages] = useState<number | null>(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [scale, setScale] = useState(1.0);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Gestion des erreurs PDF.js
  const onDocumentError = (err: any) => {
    console.error('❌ Erreur PDF.js:', err);
    
    let message = 'Impossible de charger avec PDF.js';
    
    if (err.name === 'InvalidPDFException') {
      message = 'Fichier PDF corrompu ou invalide';
    } else if (err.status === 403) {
      message = 'Bucket Supabase non public';
    } else if (err.status === 404) {
      message = 'PDF introuvable';
    }
    
    setError(message);
    setUseIframe(true);
    setLoading(false);
  };

  const onDocumentSuccess = () => {
    setLoading(false);
    setError(null);
  };

  const goToPrevPage = () => {
    setPageNumber(prev => Math.max(prev - 1, 1));
  };

  const goToNextPage = () => {
    setPageNumber(prev => Math.min(prev + 1, numPages || 1));
  };

  const zoomIn = () => {
    setScale(prev => Math.min(prev + 0.2, 3.0));
  };

  const zoomOut = () => {
    setScale(prev => Math.max(prev - 0.2, 0.5));
  };

  const resetZoom = () => {
    setScale(1.0);
  };

  // Fallback vers iframe si PDF.js échoue
  if (useIframe) {
    return (
      <div className="h-full flex flex-col bg-gray-50 dark:bg-gray-800">
        {/* Barre d'outils */}
        <div className="flex items-center justify-between p-3 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-700/50">
          <div className="flex items-center gap-2">
            <i className="fas fa-exclamation-triangle text-yellow-500"></i>
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Mode compatible (iframe)
            </span>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={() => window.open(fileUrl, '_blank')}
              className="px-3 py-1.5 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-md flex items-center gap-1.5"
            >
              <i className="fas fa-external-link-alt"></i>
              <span>Ouvrir</span>
            </button>
            
            <button
              onClick={() => {
                setUseIframe(false);
                setLoading(true);
                setError(null);
              }}
              className="px-3 py-1.5 text-sm bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-md"
            >
              <i className="fas fa-redo mr-1"></i>
              Réessayer PDF.js
            </button>
          </div>
        </div>
        
        {/* Zone iframe */}
        <div className="flex-1 overflow-auto p-4 bg-white dark:bg-gray-800">
          <div className="w-full h-full min-h-[500px] border border-gray-300 dark:border-gray-600 rounded-lg overflow-hidden">
            <iframe
              src={fileUrl}
              title="PDF Viewer (Fallback)"
              className="w-full h-full border-0"
              sandbox="allow-same-origin allow-scripts allow-forms"
              onError={() => setError('❌ Impossible d\'afficher le PDF')}
            />
          </div>
        </div>
        
        <div className="py-2 px-4 text-center text-xs text-gray-600 dark:text-gray-400 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50">
          ℹ️ Utilisation du mode compatible. Pour une meilleure expérience, configurez le bucket Supabase en public.
        </div>
      </div>
    );
  }

  // Mode PDF.js (principal)
  return (
    <div className="h-full flex flex-col bg-gray-50 dark:bg-gray-800">
      {/* Barre d'outils */}
      <div className="flex items-center justify-between p-3 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-700/50">
        <div className="flex items-center gap-3">
          <button
            onClick={goToPrevPage}
            disabled={pageNumber <= 1 || loading}
            className={`p-1.5 rounded-md transition-colors ${
              pageNumber <= 1 || loading
                ? 'text-gray-400 cursor-not-allowed'
                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600'
            }`}
            title="Page précédente (←)"
          >
            <i className="fas fa-chevron-left"></i>
          </button>
          
          <div className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
            <span>Page</span>
            <input
              type="number"
              value={pageNumber}
              onChange={(e) => {
                const page = parseInt(e.target.value);
                if (!isNaN(page) && page >= 1 && page <= (numPages || 1)) {
                  setPageNumber(page);
                }
              }}
              min="1"
              max={numPages || 1}
              disabled={loading}
              className="w-12 text-center px-1.5 py-0.5 border border-gray-300 dark:border-gray-600 rounded text-gray-900 dark:text-white disabled:bg-gray-100 disabled:dark:bg-gray-700 disabled:cursor-not-allowed"
            />
            <span className="text-gray-500 dark:text-gray-400">/</span>
            <span>{numPages || '?'}</span>
          </div>
          
          <button
            onClick={goToNextPage}
            disabled={pageNumber >= (numPages || 1) || loading}
            className={`p-1.5 rounded-md transition-colors ${
              pageNumber >= (numPages || 1) || loading
                ? 'text-gray-400 cursor-not-allowed'
                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600'
            }`}
            title="Page suivante (→)"
          >
            <i className="fas fa-chevron-right"></i>
          </button>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={zoomOut}
            disabled={loading}
            className="p-1.5 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title="Zoom arrière (-)"
          >
            <i className="fas fa-search-minus"></i>
          </button>
          
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300 min-w-[45px] text-center">
            {Math.round(scale * 100)}%
          </span>
          
          <button
            onClick={zoomIn}
            disabled={loading}
            className="p-1.5 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title="Zoom avant (+)"
          >
            <i className="fas fa-search-plus"></i>
          </button>
          
          <button
            onClick={resetZoom}
            disabled={loading || scale === 1.0}
            className="p-1.5 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title="Zoom 100% (0)"
          >
            <i className="fas fa-expand"></i>
          </button>
        </div>
        
        <div className="flex items-center gap-2">
          {error && (
            <span className="text-sm text-red-600 dark:text-red-400 flex items-center gap-1">
              <i className="fas fa-exclamation-triangle"></i>
              {error}
            </span>
          )}
          
          <button
            onClick={() => window.open(fileUrl, '_blank')}
            className="px-3 py-1.5 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-md flex items-center gap-1.5 transition-colors"
            title="Ouvrir dans un nouvel onglet"
          >
            <i className="fas fa-external-link-alt"></i>
            <span className="hidden sm:inline">Ouvrir</span>
          </button>
        </div>
      </div>
      
      {/* Zone de visualisation PDF.js */}
      <div className="flex-1 overflow-auto bg-white dark:bg-gray-800 flex items-center justify-center p-4 relative">
        {loading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm z-10">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-3"></div>
            <p className="text-gray-600 dark:text-gray-400">Chargement du PDF...</p>
          </div>
        )}
        
        {error && !loading && (
          <div className="absolute inset-0 flex items-center justify-center p-6 z-10">
            <div className="max-w-md bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 p-4 rounded-lg text-center">
              <i className="fas fa-exclamation-triangle text-3xl mb-2"></i>
              <p className="font-medium mb-2">Erreur de chargement</p>
              <p className="text-sm mb-3">{error}</p>
              <button
                onClick={() => {
                  setLoading(true);
                  setError(null);
                }}
                className="mt-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md text-sm"
              >
                Réessayer
              </button>
            </div>
          </div>
        )}
        
        <Document
          file={fileUrl}
          onLoadSuccess={onDocumentSuccess}
          onLoadError={onDocumentError}
          loading=""
          error=""
          className="max-w-full"
        >
          <Page
            pageNumber={pageNumber}
            scale={scale}
            renderTextLayer={true}
            renderAnnotationLayer={true}
            className="shadow-xl rounded-lg"
          />
        </Document>
      </div>
      
      {/* Indicateur en bas */}
      <div className="py-2 px-4 text-center text-xs text-gray-600 dark:text-gray-400 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50">
        {loading && 'Chargement...'}
        {!loading && error && '❌ Erreur détectée'}
        {!loading && !error && numPages && `✅ PDF chargé • ${numPages} page${numPages > 1 ? 's' : ''} • Zoom : ${Math.round(scale * 100)}%`}
        {!loading && !error && !numPages && '📄 Prêt à charger'}
      </div>
    </div>
  );
};

export default PDFViewer;
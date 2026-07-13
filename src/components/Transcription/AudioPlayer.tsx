import React, { useState, useRef, useEffect } from 'react';

interface AudioPlayerProps {
  audioUrl: string;
  onTimeUpdate?: (currentTime: number, duration: number) => void;
  onEnded?: () => void;
}

const AudioPlayer: React.FC<AudioPlayerProps> = ({ 
  audioUrl, 
  onTimeUpdate,
  onEnded 
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1.0);
  const [playbackRate, setPlaybackRate] = useState(1.0);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
      setDuration(audio.duration);
      onTimeUpdate?.(audio.currentTime, audio.duration);
    };

    const handleEnded = () => {
      setIsPlaying(false);
      onEnded?.();
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('loadedmetadata', () => setDuration(audio.duration));

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [onTimeUpdate, onEnded]);

  // Fermer le menu contextuel au click ailleurs
  useEffect(() => {
    const handleClick = () => setContextMenu(null);
    window.addEventListener('click', handleClick);
    return () => window.removeEventListener('click', handleClick);
  }, []);

  const togglePlay = () => {
    if (!audioRef.current) return;
    
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play().catch(err => console.error('Erreur lecture:', err));
    }
    setIsPlaying(!isPlaying);
  };

  const replay5Seconds = () => {
    if (!audioRef.current) return;
    audioRef.current.currentTime = Math.max(0, audioRef.current.currentTime - 5);
  };

  const forward5Seconds = () => {
    if (!audioRef.current) return;
    audioRef.current.currentTime = Math.min(
      duration,
      audioRef.current.currentTime + 5
    );
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
    if (audioRef.current) {
      audioRef.current.volume = newVolume;
    }
  };

  const handleRateChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newRate = parseFloat(e.target.value);
    setPlaybackRate(newRate);
    if (audioRef.current) {
      audioRef.current.playbackRate = newRate;
    }
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Gestion du click droit
  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY });
  };

  return (
    <div 
      className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 h-full flex flex-col"
      onContextMenu={handleContextMenu}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <button
            onClick={replay5Seconds}
            className="p-2 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-800 transition-colors"
            title="Reculer de 5 secondes"
          >
            <i className="fas fa-undo mr-1"></i>-5s
          </button>

          <button
            onClick={togglePlay}
            className="w-12 h-12 bg-blue-600 hover:bg-blue-700 text-white rounded-full flex items-center justify-center transition-colors shadow-lg"
            title={isPlaying ? "Pause (Espace)" : "Lecture (Espace)"}
          >
            {isPlaying ? (
              <i className="fas fa-pause text-xl"></i>
            ) : (
              <i className="fas fa-play text-xl"></i>
            )}
          </button>

          <button
            onClick={forward5Seconds}
            className="p-2 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-800 transition-colors"
            title="Avancer de 5 secondes"
          >
            <i className="fas fa-redo mr-1"></i>+5s
          </button>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600 dark:text-gray-400">Vitesse:</span>
            <select
              value={playbackRate}
              onChange={handleRateChange}
              className="bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded px-2 py-1 text-sm text-gray-900 dark:text-white"
            >
              <option value={0.5}>0.5x</option>
              <option value={0.75}>0.75x</option>
              <option value={1.0}>1.0x</option>
              <option value={1.25}>1.25x</option>
              <option value={1.5}>1.5x</option>
              <option value={2.0}>2.0x</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <i className="fas fa-volume-down text-gray-400"></i>
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={volume}
              onChange={handleVolumeChange}
              className="w-24"
            />
            <i className="fas fa-volume-up text-gray-400"></i>
          </div>
        </div>
      </div>

      {/* Barre de progression */}
      <div className="mb-3 mt-auto">
        <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400 mb-1">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>
        <div 
          className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full cursor-pointer"
          onClick={(e) => {
            if (!audioRef.current || duration === 0) return;
            const rect = e.currentTarget.getBoundingClientRect();
            const clickPosition = e.clientX - rect.left;
            const percentage = clickPosition / rect.width;
            audioRef.current.currentTime = percentage * duration;
          }}
        >
          <div 
            className="h-full bg-blue-600 rounded-full transition-all duration-100"
            style={{ width: `${(currentTime / duration) * 100 || 0}%` }}
          ></div>
        </div>
      </div>

      {/* Lien de téléchargement */}
      <div className="text-center mt-2">
        <a
          href={audioUrl}
          download
          className="inline-flex items-center text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
        >
          <i className="fas fa-download mr-1.5"></i>
          Télécharger le fichier audio
        </a>
      </div>

      {/* Élément audio caché */}
      <audio
        ref={audioRef}
        src={audioUrl}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        className="hidden"
      />
      
      {/* Menu contextuel */}
      {contextMenu && (
        <div 
          className="fixed bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg py-1 z-50 animate-fade-in"
          style={{ 
            left: `${Math.min(contextMenu.x, window.innerWidth - 250)}px`, 
            top: `${Math.min(contextMenu.y, window.innerHeight - 200)}px` 
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={() => {
              if (audioRef.current) {
                audioRef.current.currentTime = Math.max(0, audioRef.current.currentTime - 10);
              }
              setContextMenu(null);
            }}
            className="w-full px-4 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
          >
            <i className="fas fa-backward"></i>
            Reculer 10 secondes
          </button>
          <button
            onClick={() => {
              if (audioRef.current) {
                audioRef.current.currentTime = Math.max(0, audioRef.current.currentTime - 30);
              }
              setContextMenu(null);
            }}
            className="w-full px-4 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
          >
            <i className="fas fa-step-backward"></i>
            Reculer 30 secondes
          </button>
          <div className="border-t border-gray-200 dark:border-gray-700 my-1"></div>
          <button
            onClick={() => {
              togglePlay();
              setContextMenu(null);
            }}
            className="w-full px-4 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
          >
            <i className={`fas ${isPlaying ? 'fa-pause' : 'fa-play'}`}></i>
            {isPlaying ? 'Pause' : 'Lecture'}
          </button>
          <div className="border-t border-gray-200 dark:border-gray-700 my-1"></div>
          <button
            onClick={() => {
              const newRate = playbackRate === 1.0 ? 1.5 : 1.0;
              setPlaybackRate(newRate);
              if (audioRef.current) audioRef.current.playbackRate = newRate;
              setContextMenu(null);
            }}
            className="w-full px-4 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
          >
            <i className="fas fa-tachometer-alt"></i>
            {playbackRate === 1.0 ? 'Vitesse 1.5x' : 'Vitesse normale'}
          </button>
        </div>
      )}
    </div>
  );
};

export default AudioPlayer;
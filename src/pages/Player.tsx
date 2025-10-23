import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

interface MediaFile {
  id: string;
  name: string;
  url: string;
  type: string;
  duration: number;
}

interface PlaylistItem {
  mediaId: string;
  duration: number;
}

interface Playlist {
  id: string;
  name: string;
  items: PlaylistItem[];
}

interface OfflineData {
  playlist: Playlist;
  mediaFiles: MediaFile[];
  lastUpdate: number;
}

const Player = () => {
  const { playerKey } = useParams();
  const [playlist, setPlaylist] = useState<Playlist | null>(null);
  const [mediaFiles, setMediaFiles] = useState<MediaFile[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isOffline, setIsOffline] = useState(false);
  const [lastOnlineTime, setLastOnlineTime] = useState<number>(Date.now());

  useEffect(() => {
    if (!playerKey) {
      setError("Código do player inválido");
      return;
    }

    // Verificar se há dados offline salvos
    loadOfflineData();
    
    fetchPlaylist();
    updateLastSeen();

    // Atualiza last_seen a cada 60 segundos
    const lastSeenInterval = setInterval(updateLastSeen, 60000);

    // Verifica por atualizações na playlist a cada 60 segundos
    const playlistInterval = setInterval(fetchPlaylist, 60000);

    // Verifica status de conexão a cada 30 segundos
    const connectionInterval = setInterval(checkConnection, 30000);

    return () => {
      clearInterval(lastSeenInterval);
      clearInterval(playlistInterval);
      clearInterval(connectionInterval);
    };
  }, [playerKey]);

  const loadOfflineData = () => {
    try {
      const offlineDataStr = localStorage.getItem(`player_${playerKey}_offline`);
      if (offlineDataStr) {
        const offlineData: OfflineData = JSON.parse(offlineDataStr);
        // Usar dados offline se foram salvos nas últimas 24 horas
        if (Date.now() - offlineData.lastUpdate < 24 * 60 * 60 * 1000) {
          setPlaylist(offlineData.playlist);
          setMediaFiles(offlineData.mediaFiles);
        }
      }
    } catch (error) {
      console.error("Error loading offline data:", error);
    }
  };

  const saveOfflineData = (playlist: Playlist, mediaFiles: MediaFile[]) => {
    try {
      const offlineData: OfflineData = {
        playlist,
        mediaFiles,
        lastUpdate: Date.now()
      };
      localStorage.setItem(`player_${playerKey}_offline`, JSON.stringify(offlineData));
    } catch (error) {
      console.error("Error saving offline data:", error);
    }
  };

  const checkConnection = async () => {
    try {
      const response = await fetch('/favicon.ico', { 
        method: 'HEAD',
        cache: 'no-cache'
      });
      
      if (response.ok) {
        setIsOffline(false);
        setLastOnlineTime(Date.now());
      } else {
        throw new Error('Connection failed');
      }
    } catch (error) {
      const offlineTime = Date.now() - lastOnlineTime;
      if (offlineTime > 30 * 60 * 1000) { // 30 minutos
        setIsOffline(true);
      }
    }
  };

  useEffect(() => {
    if (!playlist || playlist.items.length === 0) return;

    const currentItem = playlist.items[currentIndex];
    const duration = currentItem.duration * 1000;

    const timer = setTimeout(() => {
      setCurrentIndex((prev) => (prev + 1) % playlist.items.length);
    }, duration);

    return () => clearTimeout(timer);
  }, [currentIndex, playlist]);

  const updateLastSeen = async () => {
    if (!playerKey) return;

    try {
      const { error } = await supabase
        .from("screens")
        .update({ last_seen: new Date().toISOString() })
        .eq("player_key", playerKey);

      if (error) throw error;
    } catch (error) {
      console.error("Error updating last_seen:", error);
    }
  };

  const fetchPlaylist = async () => {
    if (!playerKey) return;

    try {
      // Buscar a tela pelo player_key
      const { data: screenData, error: screenError } = await supabase
        .from("screens")
        .select("assigned_playlist")
        .eq("player_key", playerKey)
        .single();

      if (screenError) throw screenError;

      if (!screenData.assigned_playlist) {
        setError("Nenhuma playlist atribuída a esta tela");
        setPlaylist(null);
        return;
      }

      // Buscar a playlist
      const { data: playlistData, error: playlistError } = await supabase
        .from("playlists")
        .select("*")
        .eq("id", screenData.assigned_playlist)
        .single();

      if (playlistError) throw playlistError;

      // Buscar as mídias
      const items = playlistData.items as unknown as PlaylistItem[];
      const mediaIds = items.map((item) => item.mediaId);
      const { data: mediaData, error: mediaError } = await supabase
        .from("media")
        .select("*")
        .in("id", mediaIds);

      if (mediaError) throw mediaError;

      const newPlaylist = { ...playlistData, items };
      const newMediaFiles = mediaData || [];

      setPlaylist(newPlaylist);
      setMediaFiles(newMediaFiles);
      setError(null);

      // Salvar dados offline para uso futuro
      saveOfflineData(newPlaylist, newMediaFiles);

    } catch (error) {
      console.error("Error fetching playlist:", error);
      
      // Se estiver offline há mais de 30 minutos, usar dados em cache
      const offlineTime = Date.now() - lastOnlineTime;
      if (offlineTime > 30 * 60 * 1000) {
        setIsOffline(true);
        if (!playlist) {
          setError("Sem conexão - usando dados salvos");
        }
      } else {
        setError("Erro ao carregar playlist");
      }
    }
  };

  const getCurrentMedia = () => {
    if (!playlist || playlist.items.length === 0) return null;
    const currentItem = playlist.items[currentIndex];
    return mediaFiles.find((m) => m.id === currentItem.mediaId);
  };

  const currentMedia = getCurrentMedia();

  if (error) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center text-white">
          <h1 className="text-4xl font-bold mb-4">⚠️</h1>
          <p className="text-xl">{error}</p>
          <p className="text-sm text-white/60 mt-4">Player Key: {playerKey}</p>
          {isOffline && (
            <div className="mt-6 p-4 bg-yellow-900/50 rounded-lg border border-yellow-600/50">
              <p className="text-yellow-200 text-sm">
                🔌 Modo Offline - Usando dados salvos
              </p>
              <p className="text-yellow-300/70 text-xs mt-1">
                O conteúdo será atualizado quando a conexão for restaurada
              </p>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (!playlist || !currentMedia) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center text-white">
          <div className="w-16 h-16 border-4 border-white/30 border-t-white rounded-full animate-spin mx-auto mb-4" />
          <p className="text-xl">Carregando...</p>
          {isOffline && (
            <p className="text-yellow-200 text-sm mt-2">
              🔌 Modo Offline
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="w-screen h-screen bg-black overflow-hidden relative">
      {/* Indicador de status offline */}
      {isOffline && (
        <div className="absolute top-4 right-4 z-50 bg-yellow-900/80 text-yellow-200 px-3 py-1 rounded-full text-sm">
          🔌 Offline
        </div>
      )}
      
      {currentMedia.type === "image" ? (
        <img
          key={currentMedia.id}
          src={currentMedia.url}
          alt={currentMedia.name}
          className="w-full h-full object-cover animate-in fade-in duration-1000"
        />
      ) : (
        <video
          key={currentMedia.id}
          src={currentMedia.url}
          className="w-full h-full object-cover"
          autoPlay
          muted
          loop
        />
      )}
    </div>
  );
};

export default Player;

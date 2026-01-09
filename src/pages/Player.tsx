import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api } from "@/services/api";
import { MediaCache } from "@/utils/mediaCache";
import { loggingService } from "@/services/loggingService";
import { WifiOff, Monitor } from "lucide-react";

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
  cachedUrls: { [mediaId: string]: string };
  lastUpdate: number;
}

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";

const Player = () => {
  const { playerKey } = useParams();
  const navigate = useNavigate();
  const [playlist, setPlaylist] = useState<Playlist | null>(null);
  const [mediaFiles, setMediaFiles] = useState<MediaFile[]>([]);
  const [cachedUrls, setCachedUrls] = useState<{ [mediaId: string]: string }>({});
  const [currentIndex, setCurrentIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isOffline, setIsOffline] = useState(false);
  const [isUnregistered, setIsUnregistered] = useState(false);
  const [lastOnlineTime, setLastOnlineTime] = useState<number>(Date.now());
  const [manualCode, setManualCode] = useState("");
  const [isManualInputOpen, setIsManualInputOpen] = useState(false);
  const [screenId, setScreenId] = useState<string | null>(null);

  const generatePlayerCode = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let result = '';
    for (let i = 0; i < 6; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  };

  useEffect(() => {
    if (!playerKey) {
      let storedKey = localStorage.getItem('player_device_key');
      if (!storedKey) {
        storedKey = generatePlayerCode();
        localStorage.setItem('player_device_key', storedKey);
      }
      navigate(`/player/${storedKey}`, { replace: true });
      return;
    }

    localStorage.setItem('player_device_key', playerKey);

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
  }, [playerKey, navigate]);

  const loadOfflineData = () => {
    try {
      const offlineDataStr = localStorage.getItem(`player_${playerKey}_offline`);
      if (offlineDataStr) {
        const offlineData: OfflineData = JSON.parse(offlineDataStr);
        // Usar dados offline se foram salvos nas últimas 24 horas
        if (Date.now() - offlineData.lastUpdate < 24 * 60 * 60 * 1000) {
          setPlaylist(offlineData.playlist);
          setMediaFiles(offlineData.mediaFiles);
          setCachedUrls(offlineData.cachedUrls || {});
        }
      }
    } catch (error) {
      console.error("Error loading offline data:", error);
    }
  };

  const saveOfflineData = (playlist: Playlist, mediaFiles: MediaFile[], cachedUrls: { [mediaId: string]: string }) => {
    try {
      const offlineData: OfflineData = {
        playlist,
        mediaFiles,
        cachedUrls,
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
      // Se já temos o ID da tela, usamos ele
      let currentScreenId = screenId;

      // Se não temos, tentamos buscar
      if (!currentScreenId) {
        const { data: screens } = await api.screens.list();
        const screen = (screens || []).find((s: any) => s.player_key === playerKey);
        if (screen) {
          currentScreenId = screen.id;
          setScreenId(screen.id);
        }
      }

      if (currentScreenId) {
        await api.screens.update(currentScreenId, { last_seen: new Date().toISOString() });
      }
    } catch (error) {
      console.error("Error updating last_seen:", error);
    }
  };

  const fetchPlaylist = async () => {
    if (!playerKey) return;

    try {
      // Buscar a tela pelo player_key
      const { data: screens, error: screenError } = await api.screens.list();
      
      if (screenError) throw screenError;

      const screenData = (screens || []).find((s: any) => s.player_key === playerKey);

      if (!screenData) {
        if (playerKey && playerKey.length <= 6) {
          console.log("Tela não encontrada para chave:", playerKey);
        }
        setIsUnregistered(true);
        setError(null);
        
        // Polling mais agressivo quando não registrado
        // Em um ambiente sem websockets, confiamos no intervalo de atualização
        return;
      }

      setScreenId(screenData.id);
      setIsUnregistered(false);

      if (!screenData.assigned_playlist) {
        setError("Nenhuma playlist atribuída a esta tela");
        setPlaylist(null);
        return;
      }

      // Buscar a playlist
      const { data: playlistData, error: playlistError } = await api.playlists.get(screenData.assigned_playlist);

      if (playlistError) throw playlistError;

      // Buscar as mídias
      const items = playlistData.items || [];
      const mediaIds = items.map((item: any) => item.mediaId);
      
      const { data: allMedia, error: mediaError } = await api.media.list();
      
      if (mediaError) throw mediaError;

      const mediaData = (allMedia || []).filter((m: any) => mediaIds.includes(m.id));

      const newPlaylist = { ...playlistData, items };
      const newMediaFiles = mediaData || [];

      setPlaylist(newPlaylist);
      setMediaFiles(newMediaFiles);
      setError(null);

      // Pré-carregar mídias no cache (apenas arquivos)
      const filesToCache = newMediaFiles.filter((m: any) => m.type !== 'external');
      await MediaCache.preloadPlaylistMedia(filesToCache);
      
      // Criar URLs em cache para uso offline
      const newCachedUrls: { [mediaId: string]: string } = {};
      for (const media of filesToCache) {
        const cachedUrl = await MediaCache.getCachedMediaUrl(media.url);
        if (cachedUrl) {
          newCachedUrls[media.id] = cachedUrl;
        }
      }
      setCachedUrls(newCachedUrls);

      // Salvar dados offline para uso futuro
      saveOfflineData(newPlaylist, newMediaFiles, newCachedUrls);

      // Log da atividade de carregamento de playlist
      await loggingService.logUserActivity(
        'load_playlist',
        'player',
        playerKey,
        { 
          playlist_id: newPlaylist.id,
          playlist_name: newPlaylist.name,
          media_count: newMediaFiles.length,
          is_offline: isOffline
        }
      );

    } catch (error) {
      console.error("Error fetching playlist:", error);
      
      // Log do erro de carregamento de playlist
      await loggingService.logError(
        error instanceof Error ? error : new Error('Erro desconhecido ao carregar playlist'),
        'load_playlist_error',
        { 
          player_key: playerKey,
          attempted_action: 'load_playlist',
          is_offline: isOffline
        },
        'high'
      );
      
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
    const media = mediaFiles.find((m) => m.id === currentItem.mediaId);
    
    if (media && isOffline && cachedUrls[media.id]) {
      // Usar URL em cache quando offline
      return { ...media, url: cachedUrls[media.id] };
    }
    
    return media;
  };

  const isExternalUrl = (url: string) => {
    return url.includes('youtube.com') || 
           url.includes('youtu.be') || 
           url.includes('vimeo.com');
  };

  const getEmbedUrl = (url: string) => {
    if (url.includes('youtube.com') || url.includes('youtu.be')) {
      const videoId = url.match(/(?:youtu\.be\/|youtube\.com(?:\/embed\/|\/v\/|\/watch\?v=|\/user\/\S+|\/ytscreeningroom\?v=))([\w-]{10,12})\b/)?.[1];
      if (videoId) {
        return `https://www.youtube.com/embed/${videoId}?autoplay=1&controls=0&mute=1&loop=1&playlist=${videoId}`;
      }
    }
    if (url.includes('vimeo.com')) {
      const videoId = url.match(/vimeo\.com\/(\d+)/)?.[1];
      if (videoId) {
        return `https://player.vimeo.com/video/${videoId}?autoplay=1&muted=1&loop=1&background=1`;
      }
    }
    return url;
  };

  const getProcessedUrl = (url: string) => {
    if (url.includes('drive.google.com')) {
      const fileId = url.match(/\/d\/(.+?)\//)?.[1] || url.match(/id=(.+?)(&|$)/)?.[1];
      if (fileId) {
        return `https://drive.google.com/uc?export=download&id=${fileId}`;
      }
    }
    return url;
  };

  const currentMedia = getCurrentMedia();

  const handleManualCodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualCode.trim()) {
      const code = manualCode.trim().toUpperCase();
      localStorage.setItem('player_device_key', code);
      setIsManualInputOpen(false);
      
      toast.success("Vinculando tela...");
      
      // Pequeno delay para feedback visual
      setTimeout(() => {
        window.location.href = `/player/${code}`;
      }, 500);
    }
  };

  if (isUnregistered) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4">
        <div className="text-center text-white max-w-md w-full">
          <div className="mb-8">
            <Monitor className="w-20 h-20 mx-auto text-blue-500 mb-4 animate-pulse" />
            <h1 className="text-3xl font-bold mb-2">Vincular Dispositivo</h1>
            <p className="text-gray-400">
              Esta tela ainda não está vinculada.
            </p>
            <p className="text-xs text-gray-600 mt-2">ID: {playerKey}</p>
          </div>
          
          <div className="flex flex-col items-center justify-center gap-6">
            <Dialog open={isManualInputOpen} onOpenChange={setIsManualInputOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="bg-white/10 border-white/20 hover:bg-white/20 text-white px-8 py-6 h-auto text-lg">
                  Inserir Código de Vinculação
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-zinc-900 border-zinc-800 text-white">
                <DialogHeader>
                  <DialogTitle>Vincular Tela</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleManualCodeSubmit} className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <p className="text-sm text-gray-400">
                      Digite o código definido no painel administrativo para esta tela.
                    </p>
                    <Input
                      value={manualCode}
                      onChange={(e) => setManualCode(e.target.value.toUpperCase())}
                      placeholder="EX: A1B2C3"
                      className="bg-zinc-800 border-zinc-700 text-white font-mono uppercase text-center text-lg tracking-widest"
                      maxLength={6}
                    />
                  </div>
                  <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700">
                    Vincular e Iniciar
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
            
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse" />
              <span>Aguardando configuração...</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

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
      ) : (currentMedia.type === "external" || isExternalUrl(currentMedia.url)) && !currentMedia.url.includes('drive.google.com') ? (
        <iframe
          key={currentMedia.id}
          src={getEmbedUrl(currentMedia.url)}
          className="w-full h-full border-0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      ) : (
        <video
          key={currentMedia.id}
          src={getProcessedUrl(currentMedia.url)}
          className="w-full h-full object-cover"
          autoPlay
          muted
          loop
          playsInline
        />
      )}
    </div>
  );
};

export default Player;

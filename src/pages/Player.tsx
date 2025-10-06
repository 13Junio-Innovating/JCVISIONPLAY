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

const Player = () => {
  const { playerKey } = useParams();
  const [playlist, setPlaylist] = useState<Playlist | null>(null);
  const [mediaFiles, setMediaFiles] = useState<MediaFile[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!playerKey) {
      setError("Código do player inválido");
      return;
    }

    fetchPlaylist();
    updateLastSeen();

    // Atualiza last_seen a cada 60 segundos
    const lastSeenInterval = setInterval(updateLastSeen, 60000);

    // Verifica por atualizações na playlist a cada 60 segundos
    const playlistInterval = setInterval(fetchPlaylist, 60000);

    return () => {
      clearInterval(lastSeenInterval);
      clearInterval(playlistInterval);
    };
  }, [playerKey]);

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

      setPlaylist({ ...playlistData, items });
      setMediaFiles(mediaData || []);
      setError(null);
    } catch (error: any) {
      console.error("Error fetching playlist:", error);
      setError("Erro ao carregar playlist");
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
        </div>
      </div>
    );
  }

  return (
    <div className="w-screen h-screen bg-black overflow-hidden">
      {currentMedia.type === "image" ? (
        <img
          key={currentMedia.id}
          src={currentMedia.url}
          alt={currentMedia.name}
          className="w-full h-full object-contain animate-in fade-in duration-1000"
        />
      ) : (
        <video
          key={currentMedia.id}
          src={currentMedia.url}
          className="w-full h-full object-contain"
          autoPlay
          muted
          loop
        />
      )}
    </div>
  );
};

export default Player;

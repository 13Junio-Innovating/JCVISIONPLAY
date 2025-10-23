import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, Trash2, PlaySquare, Eye, Clock, X, RefreshCw } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { loggingService } from "@/services/loggingService";

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
  created_at: string;
}

const Playlists = () => {
  const navigate = useNavigate();
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [mediaFiles, setMediaFiles] = useState<MediaFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [playlistName, setPlaylistName] = useState("");
  const [selectedMedia, setSelectedMedia] = useState<PlaylistItem[]>([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const [playlistsData, mediaData] = await Promise.all([
        supabase
          .from("playlists")
          .select("*")
          .eq("created_by", user.id)
          .order("created_at", { ascending: false }),
        supabase
          .from("media")
          .select("*")
          .eq("uploaded_by", user.id)
          .order("created_at", { ascending: false }),
      ]);

      if (playlistsData.error) throw playlistsData.error;
      if (mediaData.error) throw mediaData.error;

      const playlists = (playlistsData.data || []).map(p => ({
        ...p,
        items: p.items as unknown as PlaylistItem[]
      }));
      setPlaylists(playlists);
      setMediaFiles(mediaData.data || []);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Erro ao carregar dados");
    } finally {
      setLoading(false);
    }
  };

  const handleAddMedia = (media: MediaFile) => {
    if (selectedMedia.some((item) => item.mediaId === media.id)) {
      toast.error("Mídia já adicionada");
      return;
    }
    setSelectedMedia([...selectedMedia, { mediaId: media.id, duration: media.duration }]);
  };

  const handleRemoveMedia = (mediaId: string) => {
    setSelectedMedia(selectedMedia.filter((item) => item.mediaId !== mediaId));
  };

  const handleUpdateDuration = (mediaId: string, duration: number) => {
    setSelectedMedia(
      selectedMedia.map((item) =>
        item.mediaId === mediaId ? { ...item, duration } : item
      )
    );
  };

  const handleCreatePlaylist = async (e: React.FormEvent) => {
    e.preventDefault();

    if (selectedMedia.length === 0) {
      toast.error("Adicione pelo menos uma mídia");
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const { data, error } = await supabase.from("playlists").insert({
        name: playlistName,
        items: JSON.parse(JSON.stringify(selectedMedia)) as Json,
        created_by: user.id,
      }).select().single();

      if (error) throw error;

      // Log da atividade de criação de playlist
      await loggingService.logUserActivity(
        'create_playlist',
        'playlist',
        data.id,
        { 
          playlist_name: playlistName,
          media_count: selectedMedia.length,
          media_items: selectedMedia.map(item => item.mediaId).join(',')
        }
      );

      toast.success("Playlist criada com sucesso!");
      setDialogOpen(false);
      setPlaylistName("");
      setSelectedMedia([]);
      fetchData();
    } catch (error) {
      // Log do erro de criação de playlist
      await loggingService.logError(
        error instanceof Error ? error : new Error('Erro desconhecido ao criar playlist'),
        'create_playlist_error',
        { 
          playlist_name: playlistName,
          media_count: selectedMedia.length,
          attempted_action: 'create_playlist'
        },
        'medium'
      );
      
      console.error("Error creating playlist:", error);
      toast.error(error instanceof Error ? error.message : "Erro ao criar playlist");
    }
  };

  const handleDeletePlaylist = async (id: string) => {
    if (!confirm("Deseja realmente excluir esta playlist?")) return;

    try {
      // Buscar informações da playlist antes de excluir para o log
      const { data: playlistData } = await supabase
        .from("playlists")
        .select("name, items")
        .eq("id", id)
        .single();

      await supabase.from("playlists").delete().eq("id", id);

      // Log da atividade de exclusão de playlist
      await loggingService.logUserActivity(
        'delete_playlist',
        'playlist',
        id,
        { 
          playlist_name: playlistData?.name,
          media_count: Array.isArray(playlistData?.items) ? playlistData.items.length : 0
        }
      );

      toast.success("Playlist excluída com sucesso!");
      fetchData();
    } catch (error) {
      // Log do erro de exclusão de playlist
      await loggingService.logError(
        error instanceof Error ? error : new Error('Erro desconhecido ao excluir playlist'),
        'delete_playlist_error',
        { playlist_id: id, attempted_action: 'delete_playlist' },
        'medium'
      );
      
      console.error("Error deleting playlist:", error);
      toast.error("Erro ao excluir playlist");
    }
  };

  const handleCreateAllPlaylists = async () => {
    const playlistsToCreate = [
      {
        name: "Entretenimento Geral",
        description: "Conteúdo para áreas de espera e entretenimento"
      },
      {
        name: "Informações Operacionais", 
        description: "Instruções, mapas e informações importantes"
      },
      {
        name: "Cardápio Digital",
        description: "Pratos, bebidas e promoções da lanchonete"
      },
      {
        name: "Bem-vindo Hóspede",
        description: "Informações e serviços do hotel para quartos"
      }
    ];

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      // Primeiro, criar as mídias de exemplo
      const sampleMedias = [
        {
          name: "Entretenimento Geral",
          url: "/sample-images/entretenimento-geral.svg",
          type: "image",
          duration: 10,
          uploaded_by: user.id
        },
        {
          name: "Informações Operacionais",
          url: "/sample-images/informacoes-operacionais.svg", 
          type: "image",
          duration: 15,
          uploaded_by: user.id
        },
        {
          name: "Cardápio Digital",
          url: "/sample-images/cardapio-digital.svg",
          type: "image", 
          duration: 12,
          uploaded_by: user.id
        },
        {
          name: "Bem-vindo Hóspede",
          url: "/sample-images/bem-vindo-hospede.svg",
          type: "image",
          duration: 8,
          uploaded_by: user.id
        },
        {
          name: "Totem Vertical",
          url: "/sample-images/totem-vertical.svg",
          type: "image",
          duration: 10,
          uploaded_by: user.id
        }
      ];

      // Inserir as mídias
      const { data: mediaData, error: mediaError } = await supabase
        .from("media")
        .insert(sampleMedias)
        .select();

      if (mediaError) throw mediaError;

      // Criar as playlists com as mídias
      const playlistsData = playlistsToCreate.map((playlist, index) => {
        const mediaId = mediaData[index]?.id;
        const items = mediaId ? [{
          mediaId: mediaId,
          duration: sampleMedias[index].duration
        }] : [];

        return {
          name: playlist.name,
          items: JSON.parse(JSON.stringify(items)) as Json,
          created_by: user.id,
        };
      });

      const { error } = await supabase.from("playlists").insert(playlistsData);

      if (error) throw error;

      toast.success(`${playlistsToCreate.length} playlists criadas com mídias de exemplo!`);
      fetchData();
    } catch (error) {
      console.error("Error creating playlists:", error);
      toast.error(error instanceof Error ? error.message : "Erro ao criar playlists");
    }
  };

  const getMediaById = (id: string) => mediaFiles.find((m) => m.id === id);

  const getTotalDuration = (items: PlaylistItem[]) => {
    return items.reduce((total, item) => total + item.duration, 0);
  };

  const handleAutoUpdatePlaylists = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");
  
      // Buscar todas as mídias do usuário
      const { data: allMedia, error: mediaError } = await supabase
        .from("media")
        .select("*")
        .eq("uploaded_by", user.id);
  
      if (mediaError) throw mediaError;
  
      // Buscar todas as playlists existentes
      const { data: existingPlaylists, error: playlistError } = await supabase
        .from("playlists")
        .select("*")
        .eq("created_by", user.id);
  
      if (playlistError) throw playlistError;
  
      if (!allMedia || allMedia.length === 0) {
        toast.error("Nenhuma mídia encontrada para adicionar às playlists");
        return;
      }
  
      // Categorizar mídias por tipo/nome para diferentes playlists
      const categorizeMidiaForPlaylist = (media: MediaFile, playlistName: string) => {
        const mediaName = media.name.toLowerCase();
        
        switch (playlistName) {
          case "Entretenimento Geral":
            return mediaName.includes("entretenimento") || 
                   mediaName.includes("diversão") || 
                   mediaName.includes("lazer") ||
                   mediaName.includes("social") ||
                   media.type === "video";
          
          case "Informações Operacionais":
            return mediaName.includes("informação") || 
                   mediaName.includes("operacional") || 
                   mediaName.includes("instrução") ||
                   mediaName.includes("mapa") ||
                   mediaName.includes("aviso");
          
          case "Cardápio Digital":
            return mediaName.includes("cardápio") || 
                   mediaName.includes("menu") || 
                   mediaName.includes("comida") ||
                   mediaName.includes("bebida") ||
                   mediaName.includes("lanchonete");
          
          case "Bem-vindo Hóspede":
            return mediaName.includes("bem-vindo") || 
                   mediaName.includes("hospede") || 
                   mediaName.includes("quarto") ||
                   mediaName.includes("hotel") ||
                   mediaName.includes("serviço");
          
          case "Totem Vertical":
            return mediaName.includes("totem") || 
                   mediaName.includes("vertical") ||
                   false ||
                   false;
          
          default:
            return false;
        }
      };
  
      let updatedCount = 0;
  
      // Atualizar cada playlist com mídias relevantes
      for (const playlist of existingPlaylists) {
        const relevantMedia = allMedia.filter(media => 
          categorizeMidiaForPlaylist(media, playlist.name)
        );
  
        if (relevantMedia.length === 0) continue;
  
        // Obter itens atuais da playlist
        const currentItems = Array.isArray(playlist.items) ? playlist.items : [];
        const currentMediaIds = (currentItems as unknown as PlaylistItem[]).map((item) => item.mediaId);
  
        // Adicionar novas mídias que não estão na playlist
        const newItems = relevantMedia
          .filter(media => !currentMediaIds.includes(media.id))
          .map(media => ({
            mediaId: media.id,
            duration: media.duration || 10
          }));
  
        if (newItems.length > 0) {
          const updatedItems = [...currentItems, ...newItems];
  
          const { error: updateError } = await supabase
            .from("playlists")
            .update({ items: JSON.parse(JSON.stringify(updatedItems)) })
            .eq("id", playlist.id);
  
          if (updateError) throw updateError;
          updatedCount++;
        }
      }
  
      // Se não há playlists, adicionar todas as mídias a uma playlist geral
      if (existingPlaylists.length === 0) {
        const allMediaItems = allMedia.map(media => ({
          mediaId: media.id,
          duration: media.duration || 10
        }));
  
        const { error: createError } = await supabase
          .from("playlists")
          .insert({
            name: "Todas as Mídias",
            items: JSON.parse(JSON.stringify(allMediaItems)),
            created_by: user.id
          });
  
        if (createError) throw createError;
        updatedCount = 1;
      }
  
      if (updatedCount > 0) {
        toast.success(`${updatedCount} playlist(s) atualizada(s) com suas novas mídias!`);
        fetchData();
      } else {
        toast.info("Todas as mídias já estão nas playlists apropriadas");
      }
  
    } catch (error) {
      console.error("Error updating playlists:", error);
      toast.error(error instanceof Error ? error.message : "Erro ao atualizar playlists");
    }
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              Playlists
            </h1>
            <p className="text-muted-foreground">
              Crie sequências de conteúdo para suas telas
            </p>
          </div>

          <div className="flex gap-2">
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-gradient-to-r from-primary to-accent hover:opacity-90">
                  <Plus className="mr-2 h-4 w-4" />
                  Nova Playlist
                </Button>
              </DialogTrigger>
            <DialogContent className="bg-card/95 backdrop-blur-xl border-border/50 max-w-3xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Criar Playlist</DialogTitle>
                <DialogDescription>
                  Adicione mídias e configure a duração de cada uma
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCreatePlaylist} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="playlist-name">Nome da Playlist</Label>
                  <Input
                    id="playlist-name"
                    value={playlistName}
                    onChange={(e) => setPlaylistName(e.target.value)}
                    placeholder="Ex: Playlist Manhã"
                    required
                    className="bg-secondary/50"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Mídias Selecionadas ({selectedMedia.length})</Label>
                  {selectedMedia.length === 0 ? (
                    <div className="p-4 border border-dashed border-border rounded-lg text-center text-muted-foreground">
                      Nenhuma mídia selecionada
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {selectedMedia.map((item) => {
                        const media = getMediaById(item.mediaId);
                        if (!media) return null;
                        return (
                          <div
                            key={item.mediaId}
                            className="flex items-center gap-2 p-2 bg-secondary/50 rounded-lg"
                          >
                            <div className="w-16 h-16 bg-secondary rounded overflow-hidden shrink-0">
                              {media.type === "image" ? (
                                <img
                                  src={media.url}
                                  alt={media.name}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <video
                                  src={media.url}
                                  className="w-full h-full object-cover"
                                  muted
                                />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium truncate">{media.name}</p>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <Input
                                type="number"
                                value={item.duration}
                                onChange={(e) =>
                                  handleUpdateDuration(
                                    item.mediaId,
                                    parseInt(e.target.value) || 0
                                  )
                                }
                                min={1}
                                className="w-20 bg-background"
                              />
                              <span className="text-sm text-muted-foreground">s</span>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => handleRemoveMedia(item.mediaId)}
                                className="text-destructive hover:text-destructive hover:bg-destructive/10"
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>Adicionar Mídias</Label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-60 overflow-y-auto p-2 border border-border rounded-lg bg-secondary/20">
                    {mediaFiles.length === 0 ? (
                      <div className="col-span-full text-center py-4 text-muted-foreground">
                        Nenhuma mídia disponível
                      </div>
                    ) : (
                      mediaFiles.map((media) => (
                        <button
                          key={media.id}
                          type="button"
                          onClick={() => handleAddMedia(media)}
                          className="aspect-video relative rounded-lg overflow-hidden border-2 border-transparent hover:border-primary transition-all"
                          disabled={selectedMedia.some((item) => item.mediaId === media.id)}
                        >
                          {media.type === "image" ? (
                            <img
                              src={media.url}
                              alt={media.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <video
                              src={media.url}
                              className="w-full h-full object-cover"
                              muted
                            />
                          )}
                          <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                            <Plus className="w-6 h-6 text-white" />
                          </div>
                          {selectedMedia.some((item) => item.mediaId === media.id) && (
                            <div className="absolute inset-0 bg-primary/20 border-2 border-primary" />
                          )}
                        </button>
                      ))
                    )}
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full bg-gradient-to-r from-primary to-accent hover:opacity-90"
                  disabled={selectedMedia.length === 0}
                >
                  Criar Playlist
                </Button>
              </form>
            </DialogContent>
          </Dialog>
          </div>
        </div>

        {loading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[...Array(6)].map((_, i) => (
              <Card key={i} className="border-border/50 bg-card/50 backdrop-blur-xl">
                <CardContent className="p-6">
                  <div className="h-6 bg-secondary/50 animate-pulse rounded mb-4" />
                  <div className="h-4 bg-secondary/50 animate-pulse rounded" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : playlists.length === 0 ? (
          <Card className="border-border/50 bg-card/50 backdrop-blur-xl">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <PlaySquare className="h-16 w-16 text-muted-foreground mb-4" />
              <p className="text-lg font-semibold mb-2">Nenhuma playlist encontrada</p>
              <p className="text-muted-foreground text-center mb-4">
                Crie sua primeira playlist para organizar o conteúdo das telas
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {playlists.map((playlist) => (
              <Card
                key={playlist.id}
                className="border-border/50 bg-card/50 backdrop-blur-xl hover:shadow-glow transition-all"
              >
                <CardContent className="p-6">
                  <div className="flex items-start justify-between gap-2 mb-4">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-lg truncate">{playlist.name}</h3>
                      <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <PlaySquare className="h-3 w-3" />
                          {playlist.items.length} mídias
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {getTotalDuration(playlist.items)}s
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 border-border/50"
                      onClick={() => navigate(`/preview/${playlist.id}`)}
                    >
                      <Eye className="mr-2 h-4 w-4" />
                      Preview
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeletePlaylist(playlist.id)}
                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
};

export default Playlists;

import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, Trash2, Tv2, Circle, Copy, ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface Playlist {
  id: string;
  name: string;
}

interface Screen {
  id: string;
  name: string;
  player_key: string;
  assigned_playlist: string | null;
  last_seen: string | null;
  created_at: string;
}

const Screens = () => {
  const [screens, setScreens] = useState<Screen[]>([]);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [screenName, setScreenName] = useState("");

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000); // Atualiza a cada 30s
    return () => clearInterval(interval);
  }, []);

  const fetchData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const [screensData, playlistsData] = await Promise.all([
        supabase
          .from("screens")
          .select("*")
          .eq("created_by", user.id)
          .order("created_at", { ascending: false }),
        supabase
          .from("playlists")
          .select("id, name")
          .eq("created_by", user.id)
          .order("name"),
      ]);

      if (screensData.error) throw screensData.error;
      if (playlistsData.error) throw playlistsData.error;

      setScreens(screensData.data || []);
      setPlaylists(playlistsData.data || []);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Erro ao carregar dados");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateScreen = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const { error } = await supabase.from("screens").insert({
        name: screenName,
        created_by: user.id,
      });

      if (error) throw error;

      toast.success("Tela criada com sucesso!");
      setDialogOpen(false);
      setScreenName("");
      fetchData();
    } catch (error: any) {
      console.error("Error creating screen:", error);
      toast.error(error.message || "Erro ao criar tela");
    }
  };

  const handleUpdatePlaylist = async (screenId: string, playlistId: string | null) => {
    try {
      const { error } = await supabase
        .from("screens")
        .update({ assigned_playlist: playlistId })
        .eq("id", screenId);

      if (error) throw error;

      toast.success("Playlist atualizada!");
      fetchData();
    } catch (error) {
      console.error("Error updating playlist:", error);
      toast.error("Erro ao atualizar playlist");
    }
  };

  const handleDeleteScreen = async (id: string) => {
    if (!confirm("Deseja realmente excluir esta tela?")) return;

    try {
      await supabase.from("screens").delete().eq("id", id);
      toast.success("Tela excluída com sucesso!");
      fetchData();
    } catch (error) {
      console.error("Error deleting screen:", error);
      toast.error("Erro ao excluir tela");
    }
  };

  const copyPlayerKey = (key: string) => {
    navigator.clipboard.writeText(key);
    toast.success("Código copiado!");
  };

  const isOnline = (lastSeen: string | null) => {
    if (!lastSeen) return false;
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    return new Date(lastSeen) > fiveMinutesAgo;
  };

  const getPlaylistName = (playlistId: string | null) => {
    if (!playlistId) return "Nenhuma";
    const playlist = playlists.find((p) => p.id === playlistId);
    return playlist?.name || "Desconhecida";
  };

  const getPlayerUrl = (playerKey: string) => {
    return `${window.location.origin}/player/${playerKey}`;
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              Telas
            </h1>
            <p className="text-muted-foreground">
              Gerencie seus dispositivos e monitore o status
            </p>
          </div>

          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-to-r from-primary to-accent hover:opacity-90">
                <Plus className="mr-2 h-4 w-4" />
                Nova Tela
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-card/95 backdrop-blur-xl border-border/50">
              <DialogHeader>
                <DialogTitle>Criar Nova Tela</DialogTitle>
                <DialogDescription>
                  Cadastre um novo dispositivo para exibir conteúdo
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCreateScreen} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="screen-name">Nome da Tela</Label>
                  <Input
                    id="screen-name"
                    value={screenName}
                    onChange={(e) => setScreenName(e.target.value)}
                    placeholder="Ex: Recepção, Corredor A"
                    required
                    className="bg-secondary/50"
                  />
                </div>
                <Button
                  type="submit"
                  className="w-full bg-gradient-to-r from-primary to-accent hover:opacity-90"
                >
                  Criar Tela
                </Button>
              </form>
            </DialogContent>
          </Dialog>
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
        ) : screens.length === 0 ? (
          <Card className="border-border/50 bg-card/50 backdrop-blur-xl">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Tv2 className="h-16 w-16 text-muted-foreground mb-4" />
              <p className="text-lg font-semibold mb-2">Nenhuma tela cadastrada</p>
              <p className="text-muted-foreground text-center mb-4">
                Cadastre dispositivos para começar a exibir conteúdo
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {screens.map((screen) => (
              <Card
                key={screen.id}
                className="border-border/50 bg-card/50 backdrop-blur-xl hover:shadow-glow transition-all"
              >
                <CardContent className="p-6 space-y-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-semibold text-lg truncate">{screen.name}</h3>
                        <Badge
                          variant={isOnline(screen.last_seen) ? "default" : "secondary"}
                          className={
                            isOnline(screen.last_seen)
                              ? "bg-success text-white"
                              : "bg-secondary"
                          }
                        >
                          <Circle
                            className="h-2 w-2 mr-1"
                            fill="currentColor"
                          />
                          {isOnline(screen.last_seen) ? "Online" : "Offline"}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Playlist: {getPlaylistName(screen.assigned_playlist)}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeleteScreen(screen.id)}
                      className="text-destructive hover:text-destructive hover:bg-destructive/10 shrink-0"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">
                      Código do Player
                    </Label>
                    <div className="flex gap-2">
                      <Input
                        value={screen.player_key}
                        readOnly
                        className="bg-secondary/50 text-xs font-mono"
                      />
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => copyPlayerKey(screen.player_key)}
                        className="border-border/50 shrink-0"
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">
                      Atribuir Playlist
                    </Label>
                    <Select
                      value={screen.assigned_playlist || "none"}
                      onValueChange={(value) =>
                        handleUpdatePlaylist(
                          screen.id,
                          value === "none" ? null : value
                        )
                      }
                    >
                      <SelectTrigger className="bg-secondary/50 border-border/50">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-card/95 backdrop-blur-xl border-border/50">
                        <SelectItem value="none">Nenhuma</SelectItem>
                        {playlists.map((playlist) => (
                          <SelectItem key={playlist.id} value={playlist.id}>
                            {playlist.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full border-border/50"
                    onClick={() => window.open(getPlayerUrl(screen.player_key), "_blank")}
                  >
                    <ExternalLink className="mr-2 h-4 w-4" />
                    Abrir Player
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
};

export default Screens;

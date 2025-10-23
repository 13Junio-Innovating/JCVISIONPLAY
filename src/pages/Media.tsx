import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Upload, Trash2, Image as ImageIcon, Video, Clock, RotateCw } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { loggingService } from "@/services/loggingService";

interface MediaFile {
  id: string;
  name: string;
  url: string;
  type: string;
  duration: number;
  rotation?: number; // Tornando opcional já que pode não existir no banco
  uploaded_by: string; // Adicionando campo que vem do banco
  created_at: string;
}

const Media = () => {
  const [mediaFiles, setMediaFiles] = useState<MediaFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    fetchMedia();
  }, []);

  const fetchMedia = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("media")
        .select("*")
        .eq("uploaded_by", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setMediaFiles(data || []);
    } catch (error) {
      console.error("Error fetching media:", error);
      toast.error("Erro ao carregar mídias");
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setUploading(true);
    setUploadProgress(0);

    const formData = new FormData(e.currentTarget);
    const file = formData.get("file") as File;
    const name = formData.get("name") as string;
    const duration = parseInt(formData.get("duration") as string) || 10;
    const rotation = parseInt(formData.get("rotation") as string) || 0;

    if (!file) {
      toast.error("Selecione um arquivo");
      setUploading(false);
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const fileExt = file.name.split(".").pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;
      const fileType = file.type.startsWith("video") ? "video" : "image";

      // Simular progresso do upload
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => Math.min(prev + 10, 90));
      }, 200);

      const { error: uploadError } = await supabase.storage
        .from("media")
        .upload(fileName, file);

      clearInterval(progressInterval);
      setUploadProgress(100);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("media")
        .getPublicUrl(fileName);

      const { error: insertError } = await supabase.from("media").insert({
        name: name || file.name,
        url: publicUrl,
        type: fileType,
        duration,
        rotation,
        uploaded_by: user.id,
      });

      if (insertError) throw insertError;

      // Log da atividade de upload de mídia
      await loggingService.logUserActivity(
        'upload_media',
        'media',
        '', // ID será gerado pelo banco
        { 
          media_name: name || file.name,
          file_type: fileType,
          file_size: file.size,
          duration: duration,
          rotation: rotation
        }
      );

      toast.success("Mídia enviada com sucesso!");
      setDialogOpen(false);
      fetchMedia();
      (e.target as HTMLFormElement).reset();
    } catch (error) {
      // Log do erro de upload de mídia
      await loggingService.logError(
        error instanceof Error ? error : new Error('Erro desconhecido ao fazer upload'),
        'upload_media_error',
        { 
          media_name: name || file.name,
          file_type: file?.type,
          file_size: file?.size,
          attempted_action: 'upload_media'
        },
        'medium'
      );
      
      console.error("Error uploading:", error);
      toast.error(error instanceof Error ? error.message : "Erro ao enviar mídia");
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const handleDelete = async (id: string, url: string) => {
    if (!confirm("Deseja realmente excluir esta mídia?")) return;

    try {
      // Buscar informações da mídia antes de excluir para o log
      const { data: mediaData } = await supabase
        .from("media")
        .select("name, type, duration")
        .eq("id", id)
        .single();

      // Extract file path from URL
      const urlParts = url.split("/");
      const filePath = urlParts.slice(-2).join("/");

      await supabase.storage.from("media").remove([filePath]);
      await supabase.from("media").delete().eq("id", id);

      // Log da atividade de exclusão de mídia
      await loggingService.logUserActivity(
        'delete_media',
        'media',
        id,
        { 
          media_name: mediaData?.name,
          file_type: mediaData?.type,
          duration: mediaData?.duration
        }
      );

      toast.success("Mídia excluída com sucesso!");
      fetchMedia();
    } catch (error) {
      // Log do erro de exclusão de mídia
      await loggingService.logError(
        error instanceof Error ? error : new Error('Erro desconhecido ao excluir mídia'),
        'delete_media_error',
        { 
          media_id: id,
          attempted_action: 'delete_media'
        },
        'medium'
      );
      
      console.error("Error deleting:", error);
      toast.error("Erro ao excluir mídia");
    }
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              Mídias
            </h1>
            <p className="text-muted-foreground">
              Gerencie imagens e vídeos para suas telas
            </p>
          </div>

          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-to-r from-primary to-accent hover:opacity-90">
                <Upload className="mr-2 h-4 w-4" />
                Upload
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-card/95 backdrop-blur-xl border-border/50">
              <DialogHeader>
                <DialogTitle>Enviar Mídia</DialogTitle>
                <DialogDescription>
                  Faça upload de imagens ou vídeos
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleUpload} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="file">Arquivo</Label>
                  <Input
                    id="file"
                    name="file"
                    type="file"
                    accept="image/*,video/*"
                    required
                    className="bg-secondary/50"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="name">Nome (opcional)</Label>
                  <Input
                    id="name"
                    name="name"
                    type="text"
                    placeholder="Nome da mídia"
                    className="bg-secondary/50"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="duration">Duração de exibição (segundos)</Label>
                  <Input
                    id="duration"
                    name="duration"
                    type="number"
                    defaultValue={10}
                    min={1}
                    className="bg-secondary/50"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="rotation">Rotação da tela</Label>
                  <Select name="rotation" defaultValue="0">
                    <SelectTrigger className="bg-secondary/50">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">Normal (0°)</SelectItem>
                      <SelectItem value="90">90° (Horário)</SelectItem>
                      <SelectItem value="180">180° (Invertido)</SelectItem>
                      <SelectItem value="270">270° (Anti-horário)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {uploading && (
                  <div className="space-y-2">
                    <Progress value={uploadProgress} />
                    <p className="text-sm text-muted-foreground text-center">
                      Enviando... {uploadProgress}%
                    </p>
                  </div>
                )}
                <Button
                  type="submit"
                  className="w-full bg-gradient-to-r from-primary to-accent hover:opacity-90"
                  disabled={uploading}
                >
                  {uploading ? "Enviando..." : "Enviar"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {loading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[...Array(6)].map((_, i) => (
              <Card key={i} className="border-border/50 bg-card/50 backdrop-blur-xl">
                <div className="aspect-video bg-secondary/50 animate-pulse" />
                <CardContent className="p-4">
                  <div className="h-4 bg-secondary/50 animate-pulse rounded" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : mediaFiles.length === 0 ? (
          <Card className="border-border/50 bg-card/50 backdrop-blur-xl">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <ImageIcon className="h-16 w-16 text-muted-foreground mb-4" />
              <p className="text-lg font-semibold mb-2">Nenhuma mídia encontrada</p>
              <p className="text-muted-foreground text-center mb-4">
                Comece enviando imagens e vídeos para usar em suas playlists
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {mediaFiles.map((media) => (
              <Card
                key={media.id}
                className="border-border/50 bg-card/50 backdrop-blur-xl hover:shadow-glow transition-all group"
              >
                <div className="aspect-video bg-secondary/50 overflow-hidden rounded-t-xl relative">
                  {media.type === "image" ? (
                    <img
                      src={media.url}
                      alt={media.name}
                      className={`w-full h-full object-cover ${media.rotation ? `rotate-${media.rotation}` : ''}`}
                    />
                  ) : (
                    <video
                      src={media.url}
                      className={`w-full h-full object-cover ${media.rotation ? `rotate-${media.rotation}` : ''}`}
                      muted
                    />
                  )}
                  <div className="absolute top-2 right-2 px-2 py-1 rounded-lg bg-black/60 backdrop-blur-sm flex items-center gap-1">
                    {media.type === "image" ? (
                      <ImageIcon className="h-3 w-3" />
                    ) : (
                      <Video className="h-3 w-3" />
                    )}
                    <span className="text-xs">{media.type}</span>
                  </div>
                </div>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold truncate">{media.name}</h3>
                      <div className="flex items-center gap-3 mt-1">
                        <p className="text-sm text-muted-foreground flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {media.duration}s
                        </p>
                        {(media.rotation || 0) > 0 && (
                          <p className="text-sm text-muted-foreground flex items-center gap-1">
                            <RotateCw className="h-3 w-3" />
                            {media.rotation || 0}°
                          </p>
                        )}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(media.id, media.url)}
                      className="text-destructive hover:text-destructive hover:bg-destructive/10 shrink-0"
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

export default Media;

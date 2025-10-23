// Utilitário para cache local de mídias
export class MediaCache {
  private static readonly CACHE_NAME = 'display-forge-media-cache';
  private static readonly MAX_CACHE_SIZE = 500 * 1024 * 1024; // 500MB

  static async cacheMedia(url: string, mediaId: string): Promise<string> {
    try {
      const cache = await caches.open(this.CACHE_NAME);
      
      // Verificar se já está em cache
      const cachedResponse = await cache.match(url);
      if (cachedResponse) {
        return url; // Retorna URL original se já está em cache
      }

      // Baixar e cachear a mídia
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to fetch media: ${response.status}`);
      }

      // Verificar tamanho do cache antes de adicionar
      await this.manageCacheSize();
      
      // Adicionar ao cache
      await cache.put(url, response.clone());
      
      console.log(`Media cached: ${mediaId}`);
      return url;
    } catch (error) {
      console.error(`Error caching media ${mediaId}:`, error);
      return url; // Retorna URL original mesmo se falhar o cache
    }
  }

  static async getCachedMediaUrl(url: string): Promise<string | null> {
    try {
      const cache = await caches.open(this.CACHE_NAME);
      const cachedResponse = await cache.match(url);
      
      if (cachedResponse) {
        // Criar URL blob para uso offline
        const blob = await cachedResponse.blob();
        return URL.createObjectURL(blob);
      }
      
      return null;
    } catch (error) {
      console.error('Error getting cached media:', error);
      return null;
    }
  }

  static async preloadPlaylistMedia(mediaFiles: Array<{id: string, url: string}>): Promise<void> {
    const cachePromises = mediaFiles.map(media => 
      this.cacheMedia(media.url, media.id)
    );
    
    try {
      await Promise.allSettled(cachePromises);
      console.log(`Preloaded ${mediaFiles.length} media files`);
    } catch (error) {
      console.error('Error preloading media:', error);
    }
  }

  static async manageCacheSize(): Promise<void> {
    try {
      const cache = await caches.open(this.CACHE_NAME);
      const requests = await cache.keys();
      
      if (requests.length === 0) return;

      // Estimar tamanho do cache
      let totalSize = 0;
      const sizePromises = requests.map(async (request) => {
        const response = await cache.match(request);
        if (response) {
          const blob = await response.blob();
          return { request, size: blob.size };
        }
        return { request, size: 0 };
      });

      const sizes = await Promise.all(sizePromises);
      totalSize = sizes.reduce((sum, item) => sum + item.size, 0);

      // Se exceder o limite, remover itens mais antigos
      if (totalSize > this.MAX_CACHE_SIZE) {
        const itemsToRemove = Math.ceil(sizes.length * 0.3); // Remove 30% dos itens
        const sortedSizes = sizes.sort((a, b) => a.size - b.size); // Remove menores primeiro
        
        for (let i = 0; i < itemsToRemove && i < sortedSizes.length; i++) {
          await cache.delete(sortedSizes[i].request);
        }
        
        console.log(`Cache cleanup: removed ${itemsToRemove} items`);
      }
    } catch (error) {
      console.error('Error managing cache size:', error);
    }
  }

  static async clearCache(): Promise<void> {
    try {
      await caches.delete(this.CACHE_NAME);
      console.log('Media cache cleared');
    } catch (error) {
      console.error('Error clearing cache:', error);
    }
  }

  static async getCacheInfo(): Promise<{itemCount: number, estimatedSize: string}> {
    try {
      const cache = await caches.open(this.CACHE_NAME);
      const requests = await cache.keys();
      
      let totalSize = 0;
      for (const request of requests) {
        const response = await cache.match(request);
        if (response) {
          const blob = await response.blob();
          totalSize += blob.size;
        }
      }

      return {
        itemCount: requests.length,
        estimatedSize: this.formatBytes(totalSize)
      };
    } catch (error) {
      console.error('Error getting cache info:', error);
      return { itemCount: 0, estimatedSize: '0 B' };
    }
  }

  private static formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}
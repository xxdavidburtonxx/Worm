import * as FileSystem from "expo-file-system";
import { Platform } from "react-native";

const CACHE_FOLDER = `${FileSystem.cacheDirectory}avatars/`;
const MAX_CACHE_AGE = 7 * 24 * 60 * 60 * 1000; // 7 days
const MAX_CACHE_SIZE = 50 * 1024 * 1024; // 50MB

export const ImageCache = {
  async getLocalPath(url: string): Promise<string | null> {
    if (Platform.OS === "web") return url;

    const filename = url.split("/").pop();
    const localPath = `${CACHE_FOLDER}${filename}`;

    try {
      const info = await FileSystem.getInfoAsync(localPath);
      if (!info.exists) return null;

      // Check if cache is too old
      const stats = await FileSystem.getInfoAsync(localPath, { md5: false });
      const age = Date.now() - stats.modificationTime * 1000;
      if (age > MAX_CACHE_AGE) {
        await FileSystem.deleteAsync(localPath);
        return null;
      }

      return `file://${localPath}`;
    } catch (error) {
      console.error("Error checking cache:", error);
      return null;
    }
  },

  async cacheImage(url: string): Promise<string> {
    if (Platform.OS === "web") return url;

    const filename = url.split("/").pop();
    const localPath = `${CACHE_FOLDER}${filename}`;

    try {
      // Ensure cache directory exists
      const dirInfo = await FileSystem.getInfoAsync(CACHE_FOLDER);
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(CACHE_FOLDER);
      }

      // Download image
      await FileSystem.downloadAsync(url, localPath);

      // Manage cache size
      await this.manageCacheSize();

      return `file://${localPath}`;
    } catch (error) {
      console.error("Error caching image:", error);
      return url;
    }
  },

  async manageCacheSize(): Promise<void> {
    try {
      const contents = await FileSystem.readDirectoryAsync(CACHE_FOLDER);
      let totalSize = 0;
      const files = await Promise.all(
        contents.map(async (filename) => {
          const path = `${CACHE_FOLDER}${filename}`;
          const info = await FileSystem.getInfoAsync(path, { size: true });
          totalSize += info.size || 0;
          return {
            path,
            size: info.size || 0,
            modificationTime: info.modificationTime || 0,
          };
        }),
      );

      if (totalSize > MAX_CACHE_SIZE) {
        // Sort by modification time and delete oldest files
        const sortedFiles = files.sort(
          (a, b) => a.modificationTime - b.modificationTime,
        );
        let sizeToFree = totalSize - MAX_CACHE_SIZE;

        for (const file of sortedFiles) {
          if (sizeToFree <= 0) break;
          await FileSystem.deleteAsync(file.path);
          sizeToFree -= file.size;
        }
      }
    } catch (error) {
      console.error("Error managing cache:", error);
    }
  },

  async clearCache(): Promise<void> {
    try {
      await FileSystem.deleteAsync(CACHE_FOLDER, { idempotent: true });
    } catch (error) {
      console.error("Error clearing cache:", error);
    }
  },
};

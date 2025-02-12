import { decode } from 'base64-arraybuffer';
import * as FileSystem from 'expo-file-system';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import { useSupabase } from '@/hooks/useSupabase';

export const useStorage = () => {
  const { supabase } = useSupabase();

  const uploadAvatar = async (uri: string, userId: string) => {
    try {
      // Optimize image first
      const optimized = await manipulateAsync(
        uri,
        [{ resize: { width: 150, height: 150 } }],
        { format: SaveFormat.JPEG, compress: 0.7 }
      );

      // Convert to base64
      const base64 = await FileSystem.readAsStringAsync(optimized.uri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      // Upload to Supabase Storage
      const filePath = `${userId}/avatar.jpg`;
      const { error } = await supabase.storage
        .from('avatars')
        .upload(filePath, decode(base64), {
          contentType: 'image/jpeg',
          upsert: true
        });

      if (error) throw error;

      // Get public URL
      const { data } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      return data.publicUrl;
    } catch (error) {
      console.error('Error uploading avatar:', error);
      throw error;
    }
  };

  const uploadBookCover = async (uri: string, bookId: string) => {
    try {
      // Optimize image
      const optimized = await manipulateAsync(
        uri,
        [{ resize: { width: 300, height: 450 } }],
        { format: SaveFormat.JPEG, compress: 0.8 }
      );

      const base64 = await FileSystem.readAsStringAsync(optimized.uri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      const filePath = `${bookId}.jpg`;
      const { error } = await supabase.storage
        .from('book-covers')
        .upload(filePath, decode(base64), {
          contentType: 'image/jpeg',
          upsert: true
        });

      if (error) throw error;

      const { data } = supabase.storage
        .from('book-covers')
        .getPublicUrl(filePath);

      return data.publicUrl;
    } catch (error) {
      console.error('Error uploading book cover:', error);
      throw error;
    }
  };

  return {
    uploadAvatar,
    uploadBookCover
  };
}; 
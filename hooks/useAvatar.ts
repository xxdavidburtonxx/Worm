import * as FileSystem from "expo-file-system";
import * as ImageManipulator from "expo-image-manipulator";
import { useState, useCallback } from "react";
import { Alert } from "react-native";

import { useAuth } from "./useAuth";
import { useSupabase } from "./useSupabase";

import { ImageCache } from "@/utils/imageCache";

const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second

export function useAvatar() {
  const { supabase } = useSupabase();
  const { user } = useAuth();
  const [isUploading, setIsUploading] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  const sleep = (ms: number) =>
    new Promise((resolve) => setTimeout(resolve, ms));

  const uploadWithRetry = async (
    filePath: string,
    data: Uint8Array,
    attempt: number = 0,
  ): Promise<string | null> => {
    try {
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, data, {
          contentType: "image/jpeg",
          upsert: true,
        });

      if (uploadError) throw uploadError;

      const {
        data: { publicUrl },
      } = supabase.storage.from("avatars").getPublicUrl(filePath);

      return publicUrl;
    } catch (error) {
      if (attempt < MAX_RETRIES) {
        setRetryCount(attempt + 1);
        await sleep(RETRY_DELAY * Math.pow(2, attempt)); // Exponential backoff
        return await uploadWithRetry(filePath, data, attempt + 1);
      }
      throw error;
    }
  };

  const uploadAvatar = async (uri: string) => {
    if (!user) return null;

    setIsUploading(true);
    setRetryCount(0);

    try {
      // Compress image
      const manipResult = await ImageManipulator.manipulateAsync(
        uri,
        [{ resize: { width: 400 } }],
        { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG },
      );

      const base64 = await FileSystem.readAsStringAsync(manipResult.uri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      const filePath = `${user.id}/${Date.now()}.jpg`;
      const data = decode(base64);

      // Upload with retry
      const publicUrl = await uploadWithRetry(filePath, data);
      if (!publicUrl) throw new Error("Failed to get public URL");

      // Update profile
      const { error: updateError } = await supabase
        .from("profiles")
        .update({ avatar_url: publicUrl })
        .eq("id", user.id);

      if (updateError) throw updateError;

      // Cache the new avatar
      await ImageCache.cacheImage(publicUrl);

      return publicUrl;
    } catch (error) {
      console.error("Error uploading avatar:", error);
      Alert.alert(
        "Error",
        `Failed to upload avatar${retryCount > 0 ? ` after ${retryCount} retries` : ""}`,
      );
      return null;
    } finally {
      setIsUploading(false);
      setRetryCount(0);
    }
  };

  const deleteAvatar = async () => {
    if (!user) return;

    setIsUploading(true);
    try {
      // Get current avatar URL
      const { data: profile } = await supabase
        .from("profiles")
        .select("avatar_url")
        .eq("id", user.id)
        .single();

      if (profile?.avatar_url) {
        // Extract file path from URL
        const filePath = profile.avatar_url.split("/").slice(-2).join("/");

        // Delete from storage
        const { error: deleteError } = await supabase.storage
          .from("avatars")
          .remove([filePath]);

        if (deleteError) throw deleteError;
      }

      // Update profile
      const { error: updateError } = await supabase
        .from("profiles")
        .update({ avatar_url: null })
        .eq("id", user.id);

      if (updateError) throw updateError;

      return true;
    } catch (error) {
      console.error("Error deleting avatar:", error);
      Alert.alert("Error", "Failed to delete avatar");
      return false;
    } finally {
      setIsUploading(false);
    }
  };

  return {
    uploadAvatar,
    deleteAvatar,
    isUploading,
  };
}

// Helper function to decode base64
function decode(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

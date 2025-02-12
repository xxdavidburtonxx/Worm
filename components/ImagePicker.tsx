import React from 'react';
import { View, Pressable, Image, StyleSheet } from 'react-native';
import * as ExpoImagePicker from 'expo-image-picker';
import { Camera } from 'lucide-react-native';
import { decode } from 'base64-arraybuffer';
import { useSupabase } from '@/hooks/useSupabase';
import { useAuth } from '@/hooks/useAuth';
import { showToast } from './Toast';

interface ImagePickerProps {
  value?: string | null;
  onChange: (url: string) => void;
}

export function ImagePicker({ value, onChange }: ImagePickerProps) {
  const { supabase } = useSupabase();
  const { user } = useAuth();

  const pickImage = async () => {
    try {
      // Request permissions
      const permission = await ExpoImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        showToast.error({
          title: 'Permission needed',
          message: 'Please allow access to your photo library'
        });
        return;
      }

      // Pick the image
      const result = await ExpoImagePicker.launchImageLibraryAsync({
        mediaTypes: ExpoImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.5,
        base64: true,
      });

      if (!result.canceled && result.assets[0].base64) {
        // Upload to Supabase Storage
        const fileName = `avatar-${user?.id}-${Date.now()}.jpg`;
        const filePath = `avatars/${fileName}`;
        const base64FileData = result.assets[0].base64;

        // Upload image
        const { error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(filePath, decode(base64FileData), {
            contentType: 'image/jpeg',
            upsert: true,
          });

        if (uploadError) throw uploadError;

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
          .from('avatars')
          .getPublicUrl(filePath);

        // Update profile
        onChange(publicUrl);
      }
    } catch (error) {
      console.error('Error uploading image:', error);
      showToast.error({
        title: 'Upload failed',
        message: 'Could not upload image'
      });
    }
  };

  return (
    <Pressable onPress={pickImage} style={styles.container}>
      {value ? (
        <Image source={{ uri: value }} style={styles.image} />
      ) : (
        <View style={styles.placeholder}>
          <Camera size={24} color="#666" />
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    width: 100,
    height: 100,
    borderRadius: 50,
    overflow: 'hidden',
    backgroundColor: '#f1f1f1',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  placeholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
}); 
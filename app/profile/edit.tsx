import { useRouter } from 'expo-router';
import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { Button, TextInput, Avatar, Text } from 'react-native-paper';
import * as ImagePicker from 'expo-image-picker';
import { decode } from 'base64-arraybuffer';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useSupabase } from '@/hooks/useSupabase';
import { useAuth } from '@/hooks/useAuth';
import { showToast } from '@/components/Toast';
import AuthGuard from '@/components/AuthGuard';

// Custom theme colors
const colors = {
  warmBrown: '#A27C62',
  siennaBrown: '#9A634E',
  lightKhaki: '#F2EBD4',
  softBrown: 'rgba(162, 124, 98, 0.1)',
};

interface ProfileFormData {
  username: string;
  name: string;
  bio: string;
  avatar_url: string | null;
}

export default function EditProfileScreen() {
  const router = useRouter();
  const { supabase } = useSupabase();
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [usernameError, setUsernameError] = useState<string>('');
  const [originalUsername, setOriginalUsername] = useState<string>('');
  const [formData, setFormData] = useState<ProfileFormData>({
    username: '',
    name: '',
    bio: '',
    avatar_url: null,
  });

  useEffect(() => {
    if (user) {
      fetchProfile();
    }
  }, [user]);

  const fetchProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user?.id)
        .single();

      if (error) throw error;

      setFormData({
        username: data.username || '',
        name: data.name || '',
        bio: data.bio || '',
        avatar_url: data.avatar_url,
      });
      setOriginalUsername(data.username || '');
    } catch (error) {
      console.error('Error fetching profile:', error);
      showToast.error({
        title: 'Error',
        message: 'Failed to load profile data',
      });
    }
  };

  const checkUsernameAvailability = async (username: string) => {
    // If username hasn't changed, no need to check
    if (username === originalUsername) {
      setUsernameError('');
      return true;
    }

    try {
      // Check if username is valid format
      if (!/^[a-zA-Z0-9_]{3,20}$/.test(username)) {
        setUsernameError('Username must be 3-20 characters and can only contain letters, numbers, and underscores');
        return false;
      }

      const { data, error } = await supabase
        .from('profiles')
        .select('username')
        .eq('username', username)
        .neq('id', user?.id)
        .single();

      if (error && error.code === 'PGRST116') {
        // Error code PGRST116 means no rows returned, which is good
        setUsernameError('');
        return true;
      }

      if (data) {
        setUsernameError('Username is already taken');
        return false;
      }

      setUsernameError('');
      return true;
    } catch (error) {
      console.error('Error checking username:', error);
      setUsernameError('Error checking username availability');
      return false;
    }
  };

  const handleUsernameChange = async (text: string) => {
    setFormData(prev => ({ ...prev, username: text }));
    await checkUsernameAvailability(text);
  };

  const handleImagePick = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.5,
        base64: true,
      });

      if (!result.canceled && result.assets[0].base64) {
        const base64FileData = result.assets[0].base64;
        const filePath = `${user?.id}/avatar.jpg`;

        const { error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(filePath, decode(base64FileData), {
            contentType: 'image/jpeg',
            upsert: true,
          });

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('avatars')
          .getPublicUrl(filePath);

        setFormData(prev => ({ ...prev, avatar_url: publicUrl }));
      }
    } catch (error) {
      console.error('Error updating avatar:', error);
      showToast.error({
        title: 'Error',
        message: 'Failed to update profile picture',
      });
    }
  };

  const handleSubmit = async () => {
    if (!user) return;

    // Validate required fields
    if (!formData.username.trim()) {
      showToast.error({
        title: 'Error',
        message: 'Username is required'
      });
      return;
    }

    // Check username availability one last time before submitting
    const isUsernameAvailable = await checkUsernameAvailability(formData.username);
    if (!isUsernameAvailable) {
      showToast.error({
        title: 'Error',
        message: usernameError || 'Username is not available'
      });
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          username: formData.username.trim(),
          name: formData.name.trim(),
          bio: formData.bio.trim(),
          avatar_url: formData.avatar_url,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);

      if (error) throw error;

      showToast.success({
        title: 'Success',
        message: 'Profile updated successfully',
      });
      
      // Navigate back with a refresh parameter
      router.back({
        params: {
          refresh: Date.now()
        }
      });
    } catch (error) {
      console.error('Error updating profile:', error);
      showToast.error({
        title: 'Error',
        message: 'Failed to update profile',
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (!user) {
    return <AuthGuard message="Sign in to edit your profile" />;
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        <ScrollView style={styles.scrollView}>
          <View style={styles.content}>
            {/* Avatar Section */}
            <View style={styles.avatarSection}>
              <Avatar.Image
                size={100}
                source={{ uri: formData.avatar_url || 'https://via.placeholder.com/100' }}
                style={styles.avatar}
              />
              <Button
                mode="outlined"
                onPress={handleImagePick}
                style={styles.changePhotoButton}
                labelStyle={styles.buttonLabel}
              >
                Change Photo
              </Button>
            </View>

            {/* Form Fields */}
            <View style={styles.formSection}>
              <TextInput
                label="Username"
                value={formData.username}
                onChangeText={handleUsernameChange}
                style={styles.input}
                mode="outlined"
                outlineColor={colors.warmBrown}
                activeOutlineColor={colors.siennaBrown}
                error={!!usernameError}
              />
              {usernameError ? (
                <Text style={styles.errorText}>{usernameError}</Text>
              ) : null}

              <TextInput
                label="Display Name"
                value={formData.name}
                onChangeText={(text) => setFormData(prev => ({ ...prev, name: text }))}
                style={styles.input}
                mode="outlined"
                outlineColor={colors.warmBrown}
                activeOutlineColor={colors.siennaBrown}
              />

              <TextInput
                label="Bio"
                value={formData.bio}
                onChangeText={(text) => setFormData(prev => ({ ...prev, bio: text }))}
                style={styles.input}
                mode="outlined"
                outlineColor={colors.warmBrown}
                activeOutlineColor={colors.siennaBrown}
                multiline
                numberOfLines={4}
              />
            </View>

            {/* Submit Button */}
            <Button
              mode="contained"
              onPress={handleSubmit}
              loading={isLoading}
              disabled={isLoading || !!usernameError}
              style={styles.submitButton}
              contentStyle={styles.submitButtonContent}
            >
              Save Changes
            </Button>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 20,
  },
  avatarSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  avatar: {
    marginBottom: 16,
    backgroundColor: colors.warmBrown,
  },
  changePhotoButton: {
    borderColor: colors.siennaBrown,
  },
  buttonLabel: {
    color: colors.siennaBrown,
  },
  formSection: {
    gap: 16,
  },
  input: {
    backgroundColor: '#fff',
  },
  errorText: {
    color: '#B00020',
    fontSize: 12,
    marginTop: -12,
    marginLeft: 8,
  },
  submitButton: {
    marginTop: 24,
    backgroundColor: colors.siennaBrown,
  },
  submitButtonContent: {
    paddingVertical: 8,
  },
}); 
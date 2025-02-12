// This file should be deleted if it exists, as its functionality is now in add-books.tsx 

import { useState } from "react";
import { View, Text, StyleSheet, TextInput, Pressable, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { Camera } from 'lucide-react-native';
import { useSupabase } from "@/hooks/useSupabase";
import { useAuth } from "@/hooks/useAuth";
import { showToast } from "@/components/Toast";
import { CachedImage } from "@/components/CachedImage";
import debounce from 'lodash/debounce';
import { ROUTES } from "@/constants/routes";
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { SelectedBook } from "@/components/types";

export default function OnboardingScreen() {
  const router = useRouter();
  const { supabase } = useSupabase();
  const { user } = useAuth();
  const [username, setUsername] = useState("");
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingUsername, setIsCheckingUsername] = useState(false);
  const [isUsernameAvailable, setIsUsernameAvailable] = useState(false);

  const checkUsername = debounce(async (value: string) => {
    if (!value.trim()) {
      setIsUsernameAvailable(false);
      return;
    }

    setIsCheckingUsername(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('username')
        .eq('username', value.trim())
        .single();

      if (error && error.code === 'PGRST116') {
        // No match found - username is available
        setIsUsernameAvailable(true);
      } else {
        setIsUsernameAvailable(false);
      }
    } catch (error) {
      console.error('Error checking username:', error);
    } finally {
      setIsCheckingUsername(false);
    }
  }, 300);

  const handleComplete = async () => {
    if (!user || !username.trim() || !isUsernameAvailable) return;

    setIsLoading(true);
    try {
      let avatarUrl = null;

      // Upload avatar if selected
      if (avatarUri) {
        const file = avatarUri.split('/').pop();
        const filePath = `${user.id}/${file}`;
        
        // First try to remove any existing avatar
        const { error: removeError } = await supabase.storage
          .from('avatars')
          .remove([filePath]);
          
        if (removeError) {
          console.error('Error removing existing avatar:', removeError);
          // Continue anyway as it might not exist
        }

        // Now upload the new avatar
        const { error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(filePath, {
            uri: avatarUri,
            type: 'image/jpeg',
            name: file
          }, {
            upsert: true // Add this option to overwrite existing files
          });

        if (uploadError) {
          console.error('Avatar upload error:', uploadError);
          throw uploadError;
        }

        // Get the public URL
        const { data } = supabase.storage
          .from('avatars')
          .getPublicUrl(filePath);
          
        avatarUrl = data.publicUrl;
      }

      // Create profile with detailed error logging
      console.log('Attempting to create profile with:', {
        id: user.id,
        username: username.trim(),
        name: user.user_metadata.full_name,
        avatar_url: avatarUrl,
      });

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: user.id,
          username: username.trim(),
          name: user.user_metadata.full_name,
          avatar_url: avatarUrl,
        })
        .select()
        .single();

      if (profileError) {
        console.error('Profile Error Details:', {
          code: profileError.code,
          message: profileError.message,
          details: profileError.details,
          hint: profileError.hint
        });
        throw profileError;
      }

      console.log('Profile created successfully:', profile);

      // Get selected books from storage
      const storedBooks = await AsyncStorage.getItem('onboarding_books');
      if (storedBooks) {
        const selectedBooks: SelectedBook[] = JSON.parse(storedBooks);
        
        // Get all the book IDs in one query
        const { data: bookIds, error: bookError } = await supabase
          .from('books')
          .select('id, google_book_id')
          .in('google_book_id', selectedBooks.map(book => book.id));

        if (bookError) throw bookError;
        if (!bookIds) throw new Error('Could not find books');

        // Create a map of Google Book IDs to database IDs
        const bookIdMap = new Map(
          bookIds.map(book => [book.google_book_id, book.id])
        );

        // Create user_books entries using the numeric IDs
        for (const book of selectedBooks) {
          const dbBookId = bookIdMap.get(book.id);
          if (!dbBookId) {
            console.error('Could not find book ID for:', book.id);
            continue;
          }

          const { error: userBookError } = await supabase
            .from('user_books')
            .insert({
              user_id: user.id,
              book_id: dbBookId,
              status: 'WANT_TO_READ',
              rating: null,
              user_sentiment: null,
              tied_with_books: null,
              tied_book_ids: null
            });

          if (userBookError) {
            console.error('Error adding book to shelf:', {
              book,
              error: userBookError
            });
            throw userBookError;
          }
        }

        await AsyncStorage.removeItem('onboarding_books');
      }

      showToast.success({
        title: "Profile Created",
        message: "Welcome to Worm!"
      });

      router.replace(ROUTES.TABS);
    } catch (error) {
      console.error('Full error object:', error);
      showToast.error({
        title: "Error",
        message: "Failed to create profile"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 1,
      });

      if (!result.canceled) {
        // Compress image before upload
        const compressed = await ImageManipulator.manipulateAsync(
          result.assets[0].uri,
          [{ resize: { width: 400, height: 400 } }],
          { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG }
        );

        setAvatarUri(compressed.uri);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      showToast.error({
        title: "Error",
        message: "Failed to select image"
      });
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Complete your profile</Text>
        <Text style={styles.subtitle}>Add a photo and choose a username</Text>

        <View style={styles.avatarSection}>
          <Pressable onPress={pickImage}>
            {avatarUri ? (
              <CachedImage
                uri={avatarUri}
                style={styles.avatar}
              />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Camera size={32} color="#666" />
              </View>
            )}
          </Pressable>
        </View>

        <View style={styles.inputContainer}>
          <TextInput
            style={[
              styles.input,
              !isUsernameAvailable && username.trim() && styles.inputError
            ]}
            placeholder="Choose a username"
            value={username}
            onChangeText={(text) => {
              setUsername(text);
              checkUsername(text);
            }}
            autoCapitalize="none"
            autoCorrect={false}
          />
          {isCheckingUsername && (
            <ActivityIndicator size="small" style={styles.inputIcon} />
          )}
          {!isCheckingUsername && username.trim() && (
            <Text style={[
              styles.usernameStatus,
              isUsernameAvailable ? styles.available : styles.unavailable
            ]}>
              {isUsernameAvailable ? 'Available' : 'Not available'}
            </Text>
          )}
        </View>
      </View>

      <View style={styles.footer}>
        <Pressable
          style={[
            styles.button,
            (!isUsernameAvailable || !username.trim()) && styles.buttonDisabled
          ]}
          onPress={handleComplete}
          disabled={!isUsernameAvailable || !username.trim() || isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Complete Profile</Text>
          )}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 24,
    justifyContent: 'space-between',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 32,
  },
  avatarSection: {
    alignItems: 'center',
    marginBottom: 32,
  },
  avatarContainer: {
    width: 120,
    height: 120,
    marginRight: 16,
  },
  avatar: {
    width: '100%',
    height: '100%',
    borderRadius: 60,
  },
  avatarPlaceholder: {
    width: '100%',
    height: '100%',
    borderRadius: 60,
    backgroundColor: '#f1f1f1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoButtons: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 16,
  },
  photoButton: {
    backgroundColor: '#f1f1f1',
    padding: 12,
    borderRadius: 8,
  },
  photoButtonText: {
    color: '#007AFF',
    fontSize: 14,
    fontWeight: '600',
  },
  inputContainer: {
    width: '100%',
    position: 'relative',
  },
  input: {
    backgroundColor: '#f1f1f1',
    padding: 16,
    borderRadius: 8,
    fontSize: 16,
    width: '100%',
  },
  inputIcon: {
    position: 'absolute',
    right: 16,
    top: 16,
  },
  inputError: {
    borderColor: '#ff3b30',
    borderWidth: 1,
  },
  usernameStatus: {
    position: 'absolute',
    right: 16,
    top: 16,
    fontSize: 14,
    fontWeight: '600',
  },
  available: {
    color: '#34c759',
  },
  unavailable: {
    color: '#ff3b30',
  },
  footer: {
    width: '100%',
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
}); 
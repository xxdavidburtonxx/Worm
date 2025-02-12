import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import { ChevronLeft } from "lucide-react-native";
import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActionSheetIOS,
  Alert,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from 'react-native-safe-area-context';

import { CachedImage } from "@/components/CachedImage";
import type { Profile } from "@/components/types";
import { useAuth } from "@/hooks/useAuth";
import { useAvatar } from "@/hooks/useAvatar";
import { useSupabase } from "@/hooks/useSupabase";

export default function EditProfileScreen() {
  const router = useRouter();
  const { supabase } = useSupabase();
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const { uploadAvatar, deleteAvatar, isUploading } = useAvatar();

  React.useEffect(() => {
    if (user) {
      fetchProfile();
    }
  }, [user]);

  const fetchProfile = async () => {
    try {
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user?.id)
        .single();

      if (data) setProfile(data);
    } catch (error) {
      console.error("Error fetching profile:", error);
    }
  };

  const handleImagePicker = () => {
    ActionSheetIOS.showActionSheetWithOptions(
      {
        options: [
          "Cancel",
          "Choose from Library",
          "Take Photo",
          "Delete Photo",
        ],
        destructiveButtonIndex: 3,
        cancelButtonIndex: 0,
      },
      async (buttonIndex) => {
        if (buttonIndex === 1) {
          const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [1, 1],
            quality: 1,
          });

          if (!result.canceled) {
            const url = await uploadAvatar(result.assets[0].uri);
            if (url) {
              setProfile((prev) =>
                prev ? { ...prev, avatar_url: url } : null,
              );
            }
          }
        } else if (buttonIndex === 2) {
          const { status } = await ImagePicker.requestCameraPermissionsAsync();
          if (status === "granted") {
            const result = await ImagePicker.launchCameraAsync({
              allowsEditing: true,
              aspect: [1, 1],
              quality: 1,
            });

            if (!result.canceled) {
              const url = await uploadAvatar(result.assets[0].uri);
              if (url) {
                setProfile((prev) =>
                  prev ? { ...prev, avatar_url: url } : null,
                );
              }
            }
          }
        } else if (buttonIndex === 3) {
          const success = await deleteAvatar();
          if (success) {
            setProfile((prev) => prev ? { ...prev, avatar_url: null } as Profile : null);
          }
        }
      },
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()}>
          <ChevronLeft size={24} color="#000" />
        </Pressable>
        <Text style={styles.title}>Edit Profile</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.profileSection}>
        <CachedImage
          uri={profile?.avatar_url || "https://via.placeholder.com/100"}
          style={styles.avatar}
        />
        <Pressable onPress={handleImagePicker} disabled={isUploading}>
          <Text
            style={[
              styles.editPhotoText,
              isUploading && styles.editPhotoTextDisabled,
            ]}
          >
            {isUploading ? "Uploading..." : "Edit profile photo"}
          </Text>
        </Pressable>
        {isUploading && (
          <View style={styles.uploadingOverlay}>
            <ActivityIndicator size="large" color="#007AFF" />
          </View>
        )}
      </View>

      <Pressable
        style={styles.menuItem}
        onPress={() => router.push("/profile/edit/name")}
      >
        <Text style={styles.menuLabel}>Name</Text>
        <View style={styles.menuValue}>
          <Text style={styles.menuValueText}>{profile?.name}</Text>
          <ChevronLeft
            size={20}
            color="#666"
            style={{ transform: [{ rotate: "180deg" }] }}
          />
        </View>
      </Pressable>

      <Pressable
        style={styles.menuItem}
        onPress={() => router.push("/profile/edit/username")}
      >
        <Text style={styles.menuLabel}>Username</Text>
        <View style={styles.menuValue}>
          <Text style={styles.menuValueText}>@{profile?.username}</Text>
          <ChevronLeft
            size={20}
            color="#666"
            style={{ transform: [{ rotate: "180deg" }] }}
          />
        </View>
      </Pressable>

      <Pressable
        style={styles.menuItem}
        onPress={() => router.push("/profile/edit/bio")}
      >
        <Text style={styles.menuLabel}>Bio</Text>
        <View style={styles.menuValue}>
          <Text style={styles.menuValueText}>
            {profile?.bio || "Add a bio"}
          </Text>
          <ChevronLeft
            size={20}
            color="#666"
            style={{ transform: [{ rotate: "180deg" }] }}
          />
        </View>
      </Pressable>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f1f1",
  },
  title: {
    fontSize: 18,
    fontWeight: "600",
  },
  profileSection: {
    alignItems: "center",
    padding: 24,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f1f1",
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 16,
  },
  editPhotoText: {
    fontSize: 16,
    color: "#007AFF",
    fontWeight: "500",
  },
  menuItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f1f1",
  },
  menuLabel: {
    fontSize: 16,
  },
  menuValue: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  menuValueText: {
    fontSize: 16,
    color: "#666",
  },
  uploadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(255,255,255,0.8)",
    justifyContent: "center",
    alignItems: "center",
  },
  editPhotoTextDisabled: {
    opacity: 0.5,
  },
});

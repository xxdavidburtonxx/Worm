import { useLocalSearchParams, useRouter } from "expo-router";
import { Share2, Menu } from "lucide-react-native";
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  ScrollView,
  Pressable,
  Share,
  ActivityIndicator,
} from "react-native";

import { BookshelfPreview } from "@/components/BookshelfPreview";
import { CachedImage } from "@/components/CachedImage";
import { FollowButton } from "@/components/FollowButton";
import { PersonalFeed } from "@/components/PersonalFeed";
import ProfileMenu from "@/components/ProfileMenu";
import { UserStats } from "@/components/UserStats";
import type { Profile, UserBook } from "@/components/types";
import { useAuth } from "@/hooks/useAuth";
import { useSupabase } from "@/hooks/useSupabase";
import { showToast } from "@/components/Toast";
import AuthGuard from "@/components/AuthGuard";
import { EditProfileButton } from "@/components/EditProfileButton";
import { ShareProfileButton } from "@/components/ShareProfileButton";

export default function ProfileScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { supabase } = useSupabase();
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [readBooks, setReadBooks] = useState<UserBook[]>([]);
  const [wantToReadBooks, setWantToReadBooks] = useState<UserBook[]>([]);
  const [stats, setStats] = useState({
    followers: 0,
    booksRead: 0,
  });
  const [isMenuVisible, setIsMenuVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const isOwnProfile = user?.id === id;

  const fetchProfile = async () => {
    if (!id) return;
    setIsLoading(true);
    
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      setProfile(data);
    } catch (error) {
      console.error('Error fetching profile:', error);
      showToast.error({
        title: "Error",
        message: "Could not load profile"
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, [id]);

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Check out ${profile?.name}'s profile on Worm!\nhttps://yourapp.com/profile/${id}`,
      });
    } catch (error) {
      console.error("Error sharing profile:", error);
    }
  };

  if (!user) {
    return <AuthGuard message="Sign in to view profiles" />;
  }

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (!profile) {
    return (
      <View style={styles.container}>
        <Text>User not found</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <CachedImage
          uri={
            user?.user_metadata.avatar_url || "https://via.placeholder.com/100"
          }
          style={styles.avatar}
        />
        {!isOwnProfile && (
          <FollowButton
            userId={id as string}
            onFollowChange={() => {
              // Optionally refresh the profile stats
              // This will update the followers count
              fetchProfile();
            }}
          />
        )}
        <UserStats userId={id as string} />
      </View>

      <BookshelfPreview
        userId={id as string}
        status="READ"
        title="Books Read"
      />

      <BookshelfPreview
        userId={id as string}
        status="WANT_TO_READ"
        title="Want to Read"
      />

      <PersonalFeed userId={id as string} isOwnProfile={isOwnProfile} />

      {isOwnProfile ? (
        <View style={styles.profileActions}>
          <EditProfileButton />
          <ShareProfileButton 
            userId={id as string} 
            username={profile.username || profile.name}
          />
        </View>
      ) : (
        <View>
          <FollowButton userId={id as string} />
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  header: {
    alignItems: "center",
    paddingTop: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f1f1",
    gap: 16,
  },
  headerCenter: {
    flex: 1,
    alignItems: "center",
  },
  headerRight: {
    flexDirection: "row",
    gap: 16,
  },
  name: {
    fontSize: 20,
    fontWeight: "600",
  },
  iconButton: {
    padding: 8,
  },
  profileInfo: {
    alignItems: "center",
    padding: 24,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 16,
  },
  username: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 4,
  },
  memberSince: {
    fontSize: 14,
    color: "#666",
    marginBottom: 16,
  },
  profileButtons: {
    flexDirection: "row",
    gap: 12,
  },
  profileButton: {
    paddingHorizontal: 24,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#ddd",
  },
  profileButtonText: {
    fontSize: 14,
    fontWeight: "500",
  },
  stats: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingVertical: 16,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: "#f1f1f1",
  },
  stat: {
    alignItems: "center",
  },
  statNumber: {
    fontSize: 20,
    fontWeight: "600",
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 14,
    color: "#666",
  },
  bookshelves: {
    padding: 16,
  },
  bookshelvesTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 16,
  },
  bookshelf: {
    marginBottom: 24,
  },
  bookshelfTitle: {
    fontSize: 16,
    fontWeight: "500",
    marginBottom: 12,
  },
  bookPreview: {
    flexDirection: "row",
    height: 150,
    backgroundColor: "#f8f8f8",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
  },
  bookCover: {
    width: 80,
    height: 120,
    borderRadius: 8,
  },
  recentActivity: {
    fontSize: 18,
    fontWeight: "600",
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileActions: {
    flexDirection: "row",
    gap: 12,
    padding: 16,
  },
});

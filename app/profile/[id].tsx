import { MaterialCommunityIcons } from '@expo/vector-icons';
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
import { Avatar, Button, IconButton, Surface } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';

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

// Custom theme colors with slight adjustments for better aesthetics
const colors = {
  desertSand: '#DF5B39F',
  warmBrown: '#A27C62',
  lightKhaki: '#F2EBD4',
  siennaBrown: '#9A634E',
  goldenSand: '#EAD0B3',
  softBrown: 'rgba(162, 124, 98, 0.1)',
};

interface ProfileData {
  username: string;
  avatar_url: string | null;
  created_at: string;
  bio: string | null;
  followers_count: number;
  following_count: number;
  books_read: number;
}

export default function UserProfileScreen() {
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
    ranking: 0
  });
  const [isMenuVisible, setIsMenuVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [memberSince, setMemberSince] = useState<string>('');

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
      setAvatarUrl(data.avatar_url);
      setMemberSince(new Date(data.created_at).toLocaleDateString('en-US', {
        month: 'long',
        year: 'numeric'
      }));
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

  const handleProfilePress = () => {
    if (!isOwnProfile) {
      router.push('/(tabs)');
    }
  };

  if (!user) {
    return <AuthGuard message="Sign in to view profiles" />;
  }

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.container, styles.loadingContainer]} edges={['top']}>
        <ActivityIndicator size="large" />
      </SafeAreaView>
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
        <Text style={[styles.name, styles.headerTitle]}>Worm</Text>
        <View style={styles.headerButtons}>
          <IconButton 
            icon="share" 
            size={24} 
            containerColor={colors.softBrown}
            iconColor={colors.siennaBrown}
            onPress={handleShare}
          />
        </View>
      </View>

      <View style={styles.avatarContainer}>
        <Pressable onPress={handleProfilePress}>
          <Avatar.Image 
            size={90} 
            source={{ uri: avatarUrl || 'https://via.placeholder.com/90' }}
            style={styles.avatar}
          />
        </Pressable>
        <Text style={styles.username}>@{profile.username || profile.name}</Text>
        <Text style={styles.memberSince}>Member since {memberSince}</Text>
        <Text style={styles.bio}>{profile.bio}</Text>
        
        {!isOwnProfile && (
          <View style={styles.buttonContainer}>
            <FollowButton 
              userId={id as string}
              onFollowChange={() => {
                // Optionally refresh the profile stats
                // This will update the followers count
                fetchProfile();
              }}
            />
          </View>
        )}
      </View>

      <View style={styles.statsContainer}>
        <View style={styles.stat}>
          <Text style={styles.statNumber}>{stats.followers}</Text>
          <Text style={styles.statLabel}>Followers</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statNumber}>{stats.booksRead}</Text>
          <Text style={styles.statLabel}>Books Read</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statNumber}>{stats.ranking}</Text>
          <Text style={styles.statLabel}>Worm Ranking</Text>
        </View>
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
      ) : ( null
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.lightKhaki,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 60,
  },
  headerButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  name: {
    fontWeight: '700',
    color: colors.siennaBrown,
  },
  avatarContainer: {
    alignItems: 'center',
    padding: 20,
  },
  avatar: {
    backgroundColor: colors.warmBrown,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  username: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 12,
    color: colors.siennaBrown,
  },
  memberSince: {
    fontSize: 13,
    color: colors.warmBrown,
    marginTop: 4,
    opacity: 0.8,
  },
  bio: {
    fontSize: 15,
    color: colors.warmBrown,
    marginTop: 8,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  buttonContainer: {
    marginTop: 20,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 20,
    marginHorizontal: 16,
    backgroundColor: '#fff',
    borderRadius: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  stat: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 22,
    fontWeight: 'bold',
    color: colors.siennaBrown,
  },
  statLabel: {
    color: colors.warmBrown,
    fontSize: 13,
    marginTop: 4,
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
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileActions: {
    flexDirection: "row",
    gap: 12,
    padding: 16,
  },
  headerTitle: {
    fontSize: 24,
  },
});

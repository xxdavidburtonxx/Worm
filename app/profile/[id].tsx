import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Tabs } from "expo-router";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Book, BookOpen, Search, User, ArrowLeft } from "lucide-react-native";
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Share,
  ActivityIndicator,
} from "react-native";
import { Avatar, IconButton, Surface } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BookshelfPreview } from "@/components/BookshelfPreview";
import { FollowButton } from "@/components/FollowButton";
import { PersonalFeed } from "@/components/PersonalFeed";
import type { Profile } from "@/components/types";
import { useAuth } from "@/hooks/useAuth";
import { useSupabase } from "@/hooks/useSupabase";
import { showToast } from "@/components/Toast";
import AuthGuard from "@/components/AuthGuard";
import MenuModal from '@/components/MenuModal';

// Custom theme colors with slight adjustments for better aesthetics
const colors = {
  desertSand: '#DF5B39F',
  warmBrown: '#A27C62',
  lightKhaki: '#F2EBD4',
  siennaBrown: '#9A634E',
  goldenSand: '#EAD0B3',
  softBrown: 'rgba(162, 124, 98, 0.1)',
};

function TabLayout() {
  const router = useRouter();
  
  return (
    <Tabs 
      screenOptions={{ 
        headerShown: false,
        tabBarStyle: {
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          elevation: 0,
          backgroundColor: '#fff',
          borderTopColor: '#f1f1f1',
          height: 60,
          paddingBottom: 8,
        }
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Feed",
          tabBarIcon: ({ color }) => <BookOpen size={24} color={color} />,
          href: "/(tabs)",
        }}
      />
      <Tabs.Screen
        name="bookshelf"
        options={{
          title: "Bookshelf",
          tabBarIcon: ({ color }) => <Book size={24} color={color} />,
          href: "/(tabs)/bookshelf",
        }}
      />
      <Tabs.Screen
        name="search"
        options={{
          title: "Search",
          tabBarIcon: ({ color }) => <Search size={24} color={color} />,
          href: "/(tabs)/search",
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color }) => <User size={24} color={color} />,
          href: "/(tabs)/profile",
        }}
      />
    </Tabs>
  );
}

export default function WrappedUserProfileScreen() {
  return (
    <View style={{ flex: 1 }}>
      <UserProfileScreen />
      <TabLayout />
    </View>
  );
}

function UserProfileScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { supabase } = useSupabase();
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [memberSince, setMemberSince] = useState<string>('');
  const [menuVisible, setMenuVisible] = useState(false);
  const [favoriteBook, setFavoriteBook] = useState('-');
  const [stats, setStats] = useState({
    followers: 0,
    booksRead: 0,
    ranking: '-' as number | string,
    booksToRead: 0
  });
  const [userGoal, setUserGoal] = useState<number | null>(null);
  const [goalProgress, setGoalProgress] = useState(0);

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

      // Fetch stats
      await fetchStats();
      await fetchFavoriteBook();
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

  const fetchStats = async () => {
    try {
      // Get followers count
      const { count: followersCount } = await supabase
        .from('friendships')
        .select('count', { count: 'exact' })
        .eq('friend_id', id);

      // Get books read count
      const { count: booksReadCount } = await supabase
        .from('user_books')
        .select('count', { count: 'exact' })
        .eq('user_id', id)
        .eq('status', 'READ');

      const { count: booksToReadCount } = await supabase
        .from('user_books')
        .select('count', { count: 'exact' })
        .eq('user_id', id)
        .eq('status', 'WANT_TO_READ');

      // Get all users' book counts to calculate ranking
      const { data: userBookCounts } = await supabase
        .from('user_books')
        .select('user_id')
        .eq('status', 'READ');

      // Calculate ranking
      const bookCountMap = (userBookCounts || []).reduce((acc: Record<string, number>, item: any) => {
        acc[item.user_id] = (acc[item.user_id] || 0) + 1;
        return acc;
      }, {});

      const rankings = Object.entries(bookCountMap)
        .map(([userId, count]) => ({ userId, count }))
        .sort((a, b) => b.count - a.count);

      const userRanking = rankings.findIndex(r => r.userId === id) + 1;

      setStats({
        followers: followersCount || 0,
        booksRead: booksReadCount || 0,
        ranking: booksReadCount ? userRanking : '-',
        booksToRead: booksToReadCount || 0
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const fetchFavoriteBook = async () => {
    try {
      interface BookData {
        book: {
          title: string;
        };
      }

      const { data } = await supabase
        .from('user_books')
        .select(`
          rating,
          book:books (
            title
          )
        `)
        .eq('user_id', id)
        .eq('status', 'READ')
        .order('rating', { ascending: false })
        .limit(1)
        .single<BookData>();

      if (data?.book?.title) {
        setFavoriteBook(data.book.title);
      }
    } catch (error) {
      console.error('Error fetching favorite book:', error);
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
        <View style={styles.headerLeft}>
          <IconButton
            icon="arrow-left"
            size={24}
            onPress={() => router.back()}
            style={styles.backButton}
            iconColor={colors.siennaBrown}
          />
          <Text style={[styles.name, styles.headerTitle]}>Worm</Text>
        </View>
        <View style={styles.headerButtons}>
          <IconButton 
            icon="share" 
            size={24} 
            containerColor={colors.softBrown}
            iconColor={colors.siennaBrown}
            onPress={handleShare}
          />
          <IconButton 
            icon="menu" 
            size={24}
            containerColor={colors.softBrown}
            iconColor={colors.siennaBrown}
            onPress={() => setMenuVisible(true)}
          />
        </View>
      </View>

      <View style={styles.avatarContainer}>
        <Avatar.Image 
          size={90} 
          source={{ uri: avatarUrl || 'https://via.placeholder.com/90' }}
          style={styles.avatar}
        />
        <Text style={styles.username}>@{profile.username || profile.name}</Text>
        <Text style={styles.memberSince}>Member since {memberSince}</Text>
        {profile.bio && <Text style={styles.bio}>{profile.bio}</Text>}
        
        {!isOwnProfile && (
          <View style={styles.buttonContainer}>
            <FollowButton 
              userId={id as string}
              onFollowChange={fetchStats}
            />
          </View>
        )}
      </View>

      <View style={styles.statsContainer}>
        <Pressable 
          style={styles.stat}
          onPress={() => router.push({
            pathname: '/followers/[id]',
            params: { id: id as string }
          })}
        >
          <Text style={styles.statNumber}>{stats.followers}</Text>
          <Text style={[styles.statLabel, styles.clickableLabel]}>Followers</Text>
        </Pressable>
        <View style={styles.stat}>
          <Text style={styles.statNumber}>{stats.booksRead}</Text>
          <Text style={styles.statLabel}>Books Read</Text>
        </View>
        <Pressable 
          style={styles.stat}
          onPress={() => router.push('/rankings')}
        >
          <Text style={styles.statNumber}>{stats.ranking}</Text>
          <Text style={[styles.statLabel, styles.clickableLabel]}>Worm Ranking</Text>
        </Pressable>
      </View>

      <View style={styles.listContainer}>
        <Pressable onPress={() => router.push({
          pathname: '/bookshelf/[id]',
          params: { id: id as string, section: 'READ' }
        })}>
          <Surface style={styles.listItem}>
            <View style={styles.listIconContainer}>
              <MaterialCommunityIcons name="check-circle" size={24} color={colors.siennaBrown} />
            </View>
            <Text style={styles.listText}>Read</Text>
            <Text style={styles.listNumber}>{stats.booksRead}</Text>
            <IconButton icon="chevron-right" size={24} iconColor={colors.warmBrown} />
          </Surface>
        </Pressable>
        
        <Pressable onPress={() => router.push({
          pathname: '/bookshelf/[id]',
          params: { id: id as string, section: 'WANT_TO_READ' }
        })}>
          <Surface style={styles.listItem}>
            <View style={styles.listIconContainer}>
              <MaterialCommunityIcons name="bookmark" size={24} color={colors.siennaBrown} />
            </View>
            <Text style={styles.listText}>Want to Read</Text>
            <Text style={styles.listNumber}>{stats.booksToRead}</Text>
            <IconButton icon="chevron-right" size={24} iconColor={colors.warmBrown} />
          </Surface>
        </Pressable>

      </View>

      <View style={styles.cardsContainer}>
        <Pressable 
          onPress={() => {
            if (favoriteBook !== '-') {
              router.push({
                pathname: '/bookshelf',
                params: { userId: id, section: 'READ' }
              });
            }
          }}
          style={styles.cardWrapper}
        >
          <Surface style={styles.infoCard}>
            <View style={styles.cardIconContainer}>
              <MaterialCommunityIcons name="trophy" size={24} color={colors.siennaBrown} />
            </View>
            <Text style={styles.cardTitle}>Favorite Book</Text>
            <Text style={styles.cardValue}>{favoriteBook}</Text>
          </Surface>
        </Pressable>
      </View>

      <PersonalFeed userId={id as string} isOwnProfile={isOwnProfile} />

      <MenuModal 
        visible={menuVisible}
        onClose={() => setMenuVisible(false)}
      />
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
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    marginRight: 8,
    backgroundColor: colors.softBrown,
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
  listContainer: {
    gap: 12,
    margin: 16,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  listIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.softBrown,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  listText: {
    flex: 1,
    fontSize: 16,
    color: colors.siennaBrown,
    fontWeight: '500',
  },
  listNumber: {
    marginRight: 8,
    color: colors.siennaBrown,
    fontSize: 16,
    fontWeight: '600',
  },
  cardsContainer: {
    flexDirection: 'row',
    gap: 12,
    padding: 16,
    flexWrap: 'wrap',
  },
  cardWrapper: {
    minWidth: '40%',
    flexGrow: 1,
    flexShrink: 1,
  },
  infoCard: {
    padding: 16,
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  cardIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.softBrown,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  cardTitle: {
    color: colors.warmBrown,
    fontSize: 14,
    textAlign: 'center',
  },
  cardValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.siennaBrown,
    marginTop: 4,
    textAlign: 'center',
    flexWrap: 'wrap',
  },
  goalCard: {
    minWidth: '45%',
    flexGrow: 1,
    flexShrink: 1,
    padding: 16,
    alignItems: 'center',
  },
  goalStatText: {
    fontSize: 13,
    color: colors.warmBrown,
    marginTop: 4,
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  clickableLabel: {
    textDecorationLine: 'underline',
  },
  headerTitle: {
    fontSize: 24,
  },
});

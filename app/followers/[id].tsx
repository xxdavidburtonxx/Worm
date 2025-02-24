import { useRouter, useLocalSearchParams } from 'expo-router';
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  ActivityIndicator,
  TextInput,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Search } from 'lucide-react-native';
import { IconButton } from 'react-native-paper';

import { useAuth } from '@/hooks/useAuth';
import { useSupabase } from '@/hooks/useSupabase';
import { FollowButton } from '@/components/FollowButton';
import type { Profile } from '@/components/types';
import { showToast } from '@/components/Toast';
import AuthGuard from '@/components/AuthGuard';

// Custom theme colors
const colors = {
  desertSand: '#DF5B39F',
  warmBrown: '#A27C62',
  lightKhaki: '#F2EBD4',
  siennaBrown: '#9A634E',
  goldenSand: '#EAD0B3',
  softBrown: 'rgba(162, 124, 98, 0.1)',
};

function FollowersScreen() {
  const { id: profileId } = useLocalSearchParams();
  const router = useRouter();
  const { supabase } = useSupabase();
  const { user } = useAuth();

  // Add debug logging for initial mount
  console.log('FollowersScreen initialized:', {
    profileId,
    currentUserId: user?.id,
    timestamp: new Date().toISOString()
  });

  const [followers, setFollowers] = useState<Profile[]>([]);
  const [filteredFollowers, setFilteredFollowers] = useState<Profile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [profileUsername, setProfileUsername] = useState<string>('');

  useEffect(() => {
    if (!profileId) {
      console.log('No profileId available:', {
        params: useLocalSearchParams(),
        timestamp: new Date().toISOString()
      });
      return;
    }
    
    console.log('Loading followers for profile:', {
      profileId,
      currentUserId: user?.id,
      isOwnProfile: profileId === user?.id,
      timestamp: new Date().toISOString()
    });
    
    fetchProfile();
    fetchFollowers();
  }, [profileId, user]);

  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredFollowers(followers);
    } else {
      const filtered = followers.filter(follower => 
        follower.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        follower.name?.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredFollowers(filtered);
    }
  }, [searchQuery, followers]);

  const fetchProfile = async () => {
    if (!profileId) return;
    
    try {
      console.log('Fetching profile data:', {
        profileId,
        timestamp: new Date().toISOString()
      });

      const { data, error } = await supabase
        .from('profiles')
        .select('username')
        .eq('id', profileId)
        .single();

      if (error) throw error;
      
      console.log('Profile data received:', {
        profileId,
        username: data.username,
        timestamp: new Date().toISOString()
      });
      
      setProfileUsername(data.username);
    } catch (error) {
      console.error('Error fetching profile:', error);
    }
  };

  const fetchFollowers = async () => {
    if (!profileId) return;

    try {
      console.log('Fetching followers - Query details:', {
        profileId,
        queryType: 'friendships',
        filterField: 'friend_id',
        timestamp: new Date().toISOString()
      });

      const { data: friendships, error: friendshipsError } = await supabase
        .from('friendships')
        .select(`
          user_id,
          user:profiles!friendships_user_id_fkey (
            id,
            username,
            name,
            avatar_url
          )
        `)
        .eq('friend_id', profileId);

      if (friendshipsError) throw friendshipsError;

      console.log('Raw friendships data:', {
        friendships,
        count: friendships?.length || 0,
        firstUserId: friendships?.[0]?.user_id,
        timestamp: new Date().toISOString()
      });

      const followersData = (friendships || []).map(friendship => {
        const user = friendship.user as any;
        return {
          id: user.id,
          username: user.username,
          name: user.name,
          avatar_url: user.avatar_url
        };
      });

      console.log('Processed followers data:', {
        followersCount: followersData.length,
        sampleFollower: followersData[0],
        timestamp: new Date().toISOString()
      });

      setFollowers(followersData);
      setFilteredFollowers(followersData);
    } catch (error) {
      console.error('Error in fetchFollowers:', error);
      showToast.error({
        title: "Error",
        message: "Failed to load followers"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleUserPress = (userId: string) => {
    router.push(`/profile/${userId}`);
  };

  const renderFollowerItem = ({ item }: { item: Profile }) => (
    <Pressable
      style={styles.followerItem}
      onPress={() => handleUserPress(item.id)}
    >
      <Image
        source={{
          uri: item.avatar_url || 'https://via.placeholder.com/40',
        }}
        style={styles.avatar}
      />
      <View style={styles.followerInfo}>
        <Text style={styles.followerName}>{item.name}</Text>
        <Text style={styles.followerUsername}>@{item.username}</Text>
      </View>
      {user?.id !== item.id && <FollowButton userId={item.id} />}
    </Pressable>
  );

  if (!user) {
    return <AuthGuard message="Sign in to view followers" />;
  }

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator size="large" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <IconButton
          icon="arrow-left"
          size={24}
          onPress={() => router.back()}
          style={styles.backButton}
        />
        <Text style={styles.headerTitle}>
          {profileUsername ? `${profileUsername}'s Followers` : 'Followers'}
        </Text>
      </View>

      <View style={styles.searchContainer}>
        <Search size={20} color={colors.warmBrown} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search followers..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholderTextColor={colors.warmBrown}
        />
      </View>

      {filteredFollowers.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>
            {searchQuery.trim() !== '' 
              ? 'No followers found matching your search'
              : `${profileUsername} has no followers yet`}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredFollowers}
          renderItem={renderFollowerItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
        />
      )}
    </SafeAreaView>
  );
}

export default FollowersScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.lightKhaki,
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 12,
    paddingHorizontal: 16,
    backgroundColor: colors.lightKhaki,
  },
  backButton: {
    margin: 0,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.siennaBrown,
    marginLeft: 8,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    margin: 16,
    paddingHorizontal: 16,
    borderRadius: 25,
    height: 50,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: colors.siennaBrown,
  },
  listContainer: {
    padding: 16,
    paddingTop: 8,
  },
  followerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  followerInfo: {
    flex: 1,
    marginLeft: 12,
  },
  followerName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.siennaBrown,
  },
  followerUsername: {
    fontSize: 14,
    color: colors.warmBrown,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyText: {
    fontSize: 16,
    color: colors.warmBrown,
    textAlign: 'center',
  },
}); 
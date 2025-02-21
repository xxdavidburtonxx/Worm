import React, { useState, useEffect } from 'react';
import { View, StyleSheet, FlatList, ActivityIndicator } from 'react-native';
import { Text, Avatar, Surface } from 'react-native-paper';
import { useRouter } from 'expo-router';

import { useSupabase } from '@/hooks/useSupabase';
import { useAuth } from '@/hooks/useAuth';
import { showToast } from '@/components/Toast';

interface RankingItem {
  user_id: string;
  username: string;
  avatar_url: string | null;
  books_read: number;
  rank: number;
}

interface UserProfile {
  id: string;
  username: string;
  avatar_url: string | null;
}

export default function RankingsScreen() {
  const { supabase } = useSupabase();
  const { user } = useAuth();
  const router = useRouter();
  const [rankings, setRankings] = useState<RankingItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchRankings();
  }, []);

  const fetchRankings = async () => {
    try {
      // Get all read books with user IDs
      const { data: userBooks, error: booksError } = await supabase
        .from('user_books')
        .select('user_id')
        .eq('status', 'READ');

      if (booksError) throw booksError;

      if (userBooks && userBooks.length > 0) {
        // Calculate book counts per user
        const bookCountMap = userBooks.reduce((acc: Record<string, number>, item: any) => {
          acc[item.user_id] = (acc[item.user_id] || 0) + 1;
          return acc;
        }, {});

        // Get unique user IDs
        const userIds = Object.keys(bookCountMap);

        // Fetch user profiles
        const { data: profiles, error: profilesError } = await supabase
          .from('profiles')
          .select('id, username, avatar_url')
          .in('id', userIds);

        if (profilesError) throw profilesError;

        // Combine data and create rankings
        const rankingsData = Object.entries(bookCountMap)
          .map(([userId, count], index) => {
            const profile = profiles?.find(p => p.id === userId);
            return {
              user_id: userId,
              username: profile?.username || 'Unknown User',
              avatar_url: profile?.avatar_url,
              books_read: count,
              rank: index + 1
            };
          })
          .sort((a, b) => b.books_read - a.books_read)
          .map((item, index) => ({ ...item, rank: index + 1 }));

        setRankings(rankingsData);
      }
    } catch (error) {
      console.error('Error fetching rankings:', error);
      showToast.error({
        title: 'Error',
        message: 'Failed to load rankings'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const renderItem = ({ item }: { item: RankingItem }) => (
    <Surface style={styles.rankingItem}>
      <Text style={styles.rank}>#{item.rank}</Text>
      <Avatar.Image 
        size={40} 
        source={{ uri: item.avatar_url || 'https://via.placeholder.com/40' }}
        style={styles.avatar}
      />
      <View style={styles.userInfo}>
        <Text style={styles.username}>{item.username}</Text>
        <Text style={styles.booksRead}>{item.books_read} books read</Text>
      </View>
    </Surface>
  );

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={rankings}
        renderItem={renderItem}
        keyExtractor={item => item.user_id}
        contentContainerStyle={styles.listContent}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    padding: 16,
  },
  rankingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    marginBottom: 8,
    borderRadius: 8,
    elevation: 2,
  },
  rank: {
    fontSize: 18,
    fontWeight: 'bold',
    marginRight: 16,
    minWidth: 40,
  },
  avatar: {
    marginRight: 16,
  },
  userInfo: {
    flex: 1,
  },
  username: {
    fontSize: 16,
    fontWeight: '600',
  },
  booksRead: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
}); 
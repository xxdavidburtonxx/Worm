import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { IconButton, SegmentedButtons, Surface } from 'react-native-paper';

import { useAuth } from '@/hooks/useAuth';
import { useSupabase } from '@/hooks/useSupabase';
import AuthGuard from '@/components/AuthGuard';
import type { Book } from '@/components/types';

// Custom theme colors
const colors = {
  desertSand: '#DF5B39F',
  warmBrown: '#A27C62',
  lightKhaki: '#F2EBD4',
  siennaBrown: '#9A634E',
  goldenSand: '#EAD0B3',
  softBrown: 'rgba(162, 124, 98, 0.1)',
};

export default function UserBookshelfScreen() {
  const { id: userId, section: initialSection } = useLocalSearchParams();
  const router = useRouter();
  const { supabase } = useSupabase();
  const { user } = useAuth();
  const [books, setBooks] = useState<Book[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [section, setSection] = useState<'READ' | 'WANT_TO_READ'>(
    (initialSection as 'READ' | 'WANT_TO_READ') || 'READ'
  );
  const [username, setUsername] = useState('');

  useEffect(() => {
    fetchUsername();
    fetchBooks();
  }, [userId, section]);

  const fetchUsername = async () => {
    if (!userId) return;
    
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('username')
        .eq('id', userId)
        .single();

      if (error) throw error;
      setUsername(data.username);
    } catch (error) {
      console.error('Error fetching username:', error);
    }
  };

  const fetchBooks = async () => {
    if (!userId) return;
    
    try {
      const { data, error } = await supabase
        .from('user_books')
        .select('*, book:books(*)')
        .eq('user_id', userId)
        .eq('status', section);

      if (error) throw error;
      setBooks(data.map(item => item.book));
    } catch (error) {
      console.error('Error fetching books:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (!user) {
    return <AuthGuard message="Sign in to view bookshelves" />;
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
          {username}'s Bookshelf
        </Text>
      </View>

      <SegmentedButtons
        value={section}
        onValueChange={value => setSection(value as 'READ' | 'WANT_TO_READ')}
        buttons={[
          { value: 'READ', label: 'Read' },
          { value: 'WANT_TO_READ', label: 'Want to Read' },
        ]}
        style={styles.segmentedButtons}
      />

      <FlatList
        data={books}
        renderItem={({ item }) => (
          <Pressable 
            onPress={() => router.push(`/book/${item.id}`)}
            style={styles.bookItem}
          >
            <Surface style={styles.bookSurface}>
              <Text style={styles.bookTitle}>{item.title}</Text>
              <Text style={styles.bookAuthor}>{item.author}</Text>
            </Surface>
          </Pressable>
        )}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.listContainer}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>
              {section === 'READ' 
                ? `${username} hasn't read any books yet`
                : `${username} hasn't added any books to read`}
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

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
  segmentedButtons: {
    margin: 16,
  },
  listContainer: {
    padding: 16,
    paddingTop: 8,
  },
  bookItem: {
    marginBottom: 12,
  },
  bookSurface: {
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  bookTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.siennaBrown,
  },
  bookAuthor: {
    fontSize: 14,
    color: colors.warmBrown,
    marginTop: 4,
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
import React, { useState } from "react";
import { View, Text, TextInput, StyleSheet, Pressable, FlatList, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { Search, Plus, Check } from "lucide-react-native";
import { useSupabase } from "@/hooks/useSupabase";
import { useAuth } from "@/hooks/useAuth";
import { showToast } from "@/components/Toast";
import { CachedImage } from "@/components/CachedImage";
import type { GoogleBook } from "@/components/types";
import debounce from 'lodash/debounce';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ROUTES } from "@/constants/routes";

interface SelectedBook {
  id: string;
  title: string;
  author: string;
  cover_url: string;
  category?: string;
  publisher?: string;
  published_date?: string;
  description?: string;
}

export default function AddBooksScreen() {
  const router = useRouter();
  const { supabase } = useSupabase();
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<GoogleBook[]>([]);
  const [selectedBooks, setSelectedBooks] = useState<SelectedBook[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSearching, setIsSearching] = useState(false);

  const handleSearch = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const response = await fetch(
        `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}&key=${process.env.EXPO_PUBLIC_GOOGLE_BOOKS_API_KEY}`
      );
      const data = await response.json();
      setSearchResults(data.items || []);
    } catch (error) {
      console.error("Error searching books:", error);
    } finally {
      setIsSearching(false);
    }
  };

  // Create debounced search function
  const debouncedSearch = debounce(handleSearch, 300);

  const handleSelectBook = (book: GoogleBook) => {
    const newBook = {
      id: book.id,
      title: book.volumeInfo.title,
      author: book.volumeInfo.authors?.[0] || 'Unknown Author',
      cover_url: book.volumeInfo.imageLinks?.thumbnail || '',
      category: book.volumeInfo.categories?.[0],
      publisher: book.volumeInfo.publisher,
      published_date: book.volumeInfo.publishedDate,
      description: book.volumeInfo.description,
    };

    setSelectedBooks(prev => [...prev, newBook]);
  };

  const handleContinue = async () => {
    if (selectedBooks.length === 0) {
      showToast.error({
        title: "No Books Selected",
        message: "Please select at least one book"
      });
      return;
    }

    setIsLoading(true);
    try {
      // First check which books already exist
      const { data: existingBooks } = await supabase
        .from('books')
        .select('google_book_id')
        .in('google_book_id', selectedBooks.map(book => book.id));

      // Filter out books that already exist
      const existingBookIds = new Set(existingBooks?.map(book => book.google_book_id) || []);
      const newBooks = selectedBooks.filter(book => !existingBookIds.has(book.id));

      // Only insert books that don't exist yet
      if (newBooks.length > 0) {
        const { error: booksError } = await supabase
          .from('books')
          .insert(
            newBooks.map(book => ({
              google_book_id: book.id,
              title: book.title,
              author: book.author,
              cover_url: book.cover_url,
              category: book.category,
              publisher: book.publisher,
              published_date: book.published_date,
              description: book.description
            }))
          );

        if (booksError) throw booksError;
      }

      // Store ALL selected books for onboarding (both new and existing)
      await AsyncStorage.setItem('onboarding_books', JSON.stringify(selectedBooks));
      
      router.push(ROUTES.ONBOARDING);
    } catch (error) {
      console.error('Error saving books:', error);
      showToast.error({
        title: "Error",
        message: "Failed to save books"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSkip = () => {
    // Skip book selection and go to find friends
    router.push('/auth/find-friends');
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Add books you want to read</Text>
          <Text style={styles.subtitle}>Find books you're interested in</Text>
        </View>
        <Pressable style={styles.skipButton} onPress={handleSkip}>
          <Text style={styles.skipButtonText}>Skip</Text>
        </Pressable>
      </View>

      <View style={styles.searchContainer}>
        <Search size={20} color="#666" />
        <TextInput
          style={styles.searchInput}
          placeholder="Search books..."
          value={searchQuery}
          onChangeText={(text) => {
            setSearchQuery(text);
            debouncedSearch(text);
          }}
        />
      </View>

      <FlatList
        data={searchResults}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <Pressable 
            style={styles.bookItem}
            onPress={() => handleSelectBook(item)}
          >
            <CachedImage
              uri={item.volumeInfo.imageLinks?.thumbnail}
              style={styles.bookCover}
            />
            <View style={styles.bookInfo}>
              <Text style={styles.bookTitle} numberOfLines={2}>
                {item.volumeInfo.title}
              </Text>
              <Text style={styles.bookAuthor} numberOfLines={1}>
                {item.volumeInfo.authors?.[0]}
              </Text>
            </View>
            <View style={[
              styles.selectIndicator,
              selectedBooks.some(book => book.id === item.id) && styles.selected
            ]}>
              {selectedBooks.some(book => book.id === item.id) ? (
                <Check size={20} color="#fff" />
              ) : (
                <Plus size={20} color="#007AFF" />
              )}
            </View>
          </Pressable>
        )}
        contentContainerStyle={styles.list}
      />

      <View style={styles.footer}>
        <Pressable 
          style={[
            styles.button,
            (selectedBooks.length < 3 || isLoading) && styles.buttonDisabled
          ]}
          onPress={handleContinue}
          disabled={selectedBooks.length < 3 || isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>
              Continue ({selectedBooks.length}/3)
            </Text>
          )}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 24,
    paddingTop: 48,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f1f1',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 16,
  },
  list: {
    padding: 16,
    gap: 16,
  },
  bookItem: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  bookCover: {
    width: 60,
    height: 90,
    borderRadius: 6,
  },
  bookInfo: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'center',
  },
  bookTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  bookAuthor: {
    fontSize: 14,
    color: '#666',
  },
  selectIndicator: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f1f1f1',
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    marginLeft: 12,
  },
  selected: {
    backgroundColor: '#007AFF',
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#f1f1f1',
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
  skipButton: {
    padding: 12,
  },
  skipButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#007AFF',
  },
}); 
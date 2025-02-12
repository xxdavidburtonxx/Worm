import { useRouter } from "expo-router";
import { ChevronRight, AlertCircle } from "lucide-react-native";
import React from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Animated,
} from "react-native";

import { CachedImage } from "@/components/CachedImage";
import type { UserBook } from "@/components/types";
import { useSupabase } from "@/hooks/useSupabase";

interface BookshelfPreviewProps {
  userId: string;
  status: "READ" | "WANT_TO_READ";
  title: string;
}

export function BookshelfPreview({
  userId,
  status,
  title,
}: BookshelfPreviewProps) {
  const router = useRouter();
  const { supabase } = useSupabase();
  const [books, setBooks] = React.useState<UserBook[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  // Animation values
  const fadeAnim = React.useRef(new Animated.Value(0)).current;
  const slideAnim = React.useRef(new Animated.Value(20)).current;
  const scaleAnim = React.useRef(new Animated.Value(0.95)).current;

  const fetchBooks = async () => {
    try {
      setError(null);
      const { data, error: fetchError } = await supabase
        .from("user_books")
        .select(
          `
          *,
          book:books (
            id,
            title,
            author,
            cover_url
          )
        `,
        )
        .eq("user_id", userId)
        .eq("status", status)
        .order("created_at", { ascending: false })
        .limit(3);

      if (fetchError) throw fetchError;
      if (data) setBooks(data);
    } catch (error) {
      console.error("Error fetching books:", error);
      setError("Failed to load books");
    } finally {
      setIsLoading(false);
      // Start animations after data is loaded
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 50,
          friction: 7,
          useNativeDriver: true,
        }),
      ]).start();
    }
  };

  React.useEffect(() => {
    fetchBooks();
  }, [userId, status]);

  if (isLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>{title}</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color="#007AFF" />
          <Text style={styles.loadingText}>Loading books...</Text>
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>{title}</Text>
        </View>
        <View style={styles.errorContainer}>
          <AlertCircle size={24} color="#FF3B30" />
          <Text style={styles.errorText}>{error}</Text>
          <Pressable
            style={styles.retryButton}
            onPress={() => {
              setIsLoading(true);
              fetchBooks();
            }}
          >
            <Text style={styles.retryText}>Retry</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  if (books.length === 0) return null;

  return (
    <Animated.View
      style={[
        styles.container,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }, { scale: scaleAnim }],
        },
      ]}
    >
      <Pressable
        style={styles.pressable}
        onPress={() => router.push(`/bookshelf?status=${status}`)}
        android_ripple={{ color: "rgba(0, 0, 0, 0.1)" }}
      >
        <View style={styles.header}>
          <Text style={styles.title}>{title}</Text>
          <ChevronRight size={20} color="#666" />
        </View>

        <View style={styles.booksContainer}>
          {books.map((book, index) => (
            <Animated.View
              key={book.id}
              style={[
                styles.bookCover,
                index > 0 && { marginLeft: -20 },
                { zIndex: books.length - index },
                {
                  transform: [
                    {
                      scale: fadeAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0.8, 1],
                      }),
                    },
                  ],
                },
              ]}
            >
              <CachedImage
                uri={book.book.cover_url}
                style={styles.coverImage}
              />
            </Animated.View>
          ))}
          <View style={styles.countContainer}>
            <Text style={styles.countText}>
              {books.length === 3 ? "+ More" : ""}
            </Text>
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#f1f1f1",
  },
  pressable: {
    padding: 16,
  },
  loadingContainer: {
    padding: 32,
    alignItems: "center",
    gap: 8,
  },
  loadingText: {
    fontSize: 14,
    color: "#666",
  },
  errorContainer: {
    padding: 32,
    alignItems: "center",
    gap: 8,
  },
  errorText: {
    fontSize: 14,
    color: "#FF3B30",
    textAlign: "center",
  },
  retryButton: {
    marginTop: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: "#007AFF",
    borderRadius: 8,
  },
  retryText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: "600",
  },
  booksContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  bookCover: {
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  coverImage: {
    width: 80,
    height: 120,
    borderRadius: 4,
  },
  countContainer: {
    marginLeft: 16,
  },
  countText: {
    fontSize: 14,
    color: "#666",
  },
});

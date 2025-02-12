// External packages
import { useRouter } from "expo-router";
import { Star, Search, Grid, List, ChevronDown } from "lucide-react-native";
import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  ActivityIndicator,
  RefreshControl,
  TextInput,
  Animated,
  LayoutAnimation,
  Platform,
  UIManager,
} from "react-native";

// Local imports
import { CachedImage } from "@/components/CachedImage";
import type { UserBook } from "@/components/types";
import { useAuth } from "@/hooks/useAuth";
import { useSupabase } from "@/hooks/useSupabase";
import AuthGuard from "@/components/AuthGuard";

// Types

type BookshelfSection = "READ" | "WANT_TO_READ";

interface BookWithCategory {
  book: {
    category: string;
  };
}

// Enable LayoutAnimation for Android
if (
  Platform.OS === "android" &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export default function BookshelfScreen() {
  const router = useRouter();
  const { supabase } = useSupabase();
  const { user } = useAuth();

  if (!user) {
    return <AuthGuard message="Sign in to view your bookshelf" />;
  }

  const [activeSection, setActiveSection] = useState<BookshelfSection>("READ");
  const [books, setBooks] = useState<UserBook[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<
    "recent" | "title" | "author" | "rating"
  >("recent");
  const [isGridView, setIsGridView] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [showCategoryFilter, setShowCategoryFilter] = useState(false);
  const [categories, setCategories] = useState<string[]>([]);

  // Add animation values
  const filterHeight = React.useRef(new Animated.Value(0)).current;
  const filterOpacity = React.useRef(new Animated.Value(0)).current;
  const viewTransition = React.useRef(new Animated.Value(0)).current;

  const fetchCategories = async () => {
    try {
      const { data } = await supabase
        .from("user_books")
        .select("category")
        .eq("user_id", user?.id)
        .eq("status", activeSection);

      if (data) {
        const uniqueCategories = Array.from(
          new Set(data.map(item => item.category))
        ).filter(Boolean);
        setCategories(uniqueCategories);
      }
    } catch (error) {
      console.error("Error fetching categories:", error);
    }
  };

  const fetchBooks = async () => {
    if (!user) return;

    try {
      let query = supabase
        .from("user_books")
        .select(
          `
          *,
          book:books (
            id,
            title,
            author,
            cover_url,
            category
          )
        `,
        )
        .eq("user_id", user.id)
        .eq("status", activeSection);

      if (searchQuery) {
        query = query.or(
          `book.title.ilike.%${searchQuery}%,book.author.ilike.%${searchQuery}%`,
        );
      }

      if (selectedCategory) {
        query = query.eq("book.category", selectedCategory);
      }

      switch (sortBy) {
        case "title":
          query = query.order("book(title)");
          break;
        case "author":
          query = query.order("book(author)");
          break;
        case "rating":
          query =
            activeSection === "READ"
              ? query.order("rating", { ascending: false })
              : query.order("created_at", { ascending: false });
          break;
        default:
          query = query.order("created_at", { ascending: false });
      }

      const { data, error } = await query;

      if (error) throw error;
      if (data) setBooks(data);
    } catch (error) {
      console.error("Error fetching books:", error);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  React.useEffect(() => {
    fetchBooks();
  }, [activeSection, searchQuery, sortBy, selectedCategory]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    fetchBooks();
  }, [activeSection, searchQuery, sortBy]);

  // Update toggle functions with animations
  const toggleViewMode = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setIsGridView(!isGridView);
  };

  const toggleCategoryFilter = (show: boolean) => {
    setShowCategoryFilter(show);
    Animated.parallel([
      Animated.timing(filterHeight, {
        toValue: show ? 1 : 0,
        duration: 300,
        useNativeDriver: false,
      }),
      Animated.timing(filterOpacity, {
        toValue: show ? 1 : 0,
        duration: 300,
        useNativeDriver: false,
      }),
    ]).start();
  };

  const renderBook = ({ item, index }: { item: UserBook; index: number }) => {
    const animatedStyle = {
      opacity: viewTransition.interpolate({
        inputRange: [0, 1],
        outputRange: [1, 0],
      }),
      transform: [
        {
          scale: viewTransition.interpolate({
            inputRange: [0, 1],
            outputRange: [1, 0.9],
          }),
        },
      ],
    };

    return (
      <Animated.View
        style={[
          styles.bookCard,
          isGridView && styles.gridBookCard,
          animatedStyle,
          {
            // Add staggered animation delay
            animationDelay: `${index * 50}ms`,
          },
        ]}
      >
        <Pressable onPress={() => router.push(`/book/${item.book_id}`)}>
          <CachedImage
            uri={item.book.cover_url}
            style={[styles.bookCover, isGridView && styles.gridBookCover]}
          />
          {!isGridView && (
            <View style={styles.bookInfo}>
              <Text style={styles.bookTitle} numberOfLines={2}>
                {item.book.title}
              </Text>
              <Text style={styles.bookAuthor} numberOfLines={1}>
                {item.book.author}
              </Text>
              {activeSection === "READ" && (
                <View style={styles.ratingContainer}>
                  <Star
                    size={16}
                    color="#007AFF"
                    fill={item.rating ? "#007AFF" : "none"}
                  />
                  <Text style={styles.ratingText}>
                    {item.rating?.toFixed(1) || "-"}
                  </Text>
                </View>
              )}
            </View>
          )}
        </Pressable>
      </Animated.View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.searchBar}>
          <Search size={20} color="#666" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search your books..."
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
        <Pressable
          style={styles.filterButton}
          onPress={() => toggleCategoryFilter(true)}
        >
          <ChevronDown size={20} color="#666" />
        </Pressable>
        <Pressable style={styles.viewToggle} onPress={toggleViewMode}>
          {isGridView ? <List size={24} /> : <Grid size={24} />}
        </Pressable>
      </View>

      <Animated.View
        style={[
          styles.categoryFilter,
          {
            maxHeight: filterHeight.interpolate({
              inputRange: [0, 1],
              outputRange: [0, 300], // Adjust based on content
            }),
            opacity: filterOpacity,
            transform: [
              {
                translateY: filterHeight.interpolate({
                  inputRange: [0, 1],
                  outputRange: [-20, 0],
                }),
              },
            ],
          },
        ]}
        pointerEvents={showCategoryFilter ? "auto" : "none"}
      >
        <Pressable
          style={[
            styles.categoryItem,
            !selectedCategory && styles.selectedCategory,
          ]}
          onPress={() => {
            setSelectedCategory(null);
            toggleCategoryFilter(false);
          }}
        >
          <Text style={styles.categoryText}>All Categories</Text>
        </Pressable>
        {categories.map((category) => (
          <Pressable
            key={category}
            style={[
              styles.categoryItem,
              selectedCategory === category && styles.selectedCategory,
            ]}
            onPress={() => {
              setSelectedCategory(category);
              toggleCategoryFilter(false);
            }}
          >
            <Text style={styles.categoryText}>{category}</Text>
          </Pressable>
        ))}
      </Animated.View>

      <View style={styles.tabBar}>
        <Pressable
          style={[styles.tab, activeSection === "READ" && styles.activeTab]}
          onPress={() => setActiveSection("READ")}
        >
          <Text
            style={[
              styles.tabText,
              activeSection === "READ" && styles.activeTabText,
            ]}
          >
            Read
          </Text>
        </Pressable>
        <Pressable
          style={[
            styles.tab,
            activeSection === "WANT_TO_READ" && styles.activeTab,
          ]}
          onPress={() => setActiveSection("WANT_TO_READ")}
        >
          <Text
            style={[
              styles.tabText,
              activeSection === "WANT_TO_READ" && styles.activeTabText,
            ]}
          >
            Want to Read
          </Text>
        </Pressable>
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator
            size="large"
            color="#007AFF"
            testID="loading-indicator"
          />
        </View>
      ) : (
        <FlatList
          data={books}
          renderItem={renderBook}
          keyExtractor={(item) => `${item.id}`}
          numColumns={isGridView ? 2 : 1}
          key={isGridView ? "grid" : "list"}
          contentContainerStyle={[
            styles.listContent,
            isGridView && styles.gridContent,
          ]}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor="#007AFF"
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>
                {activeSection === "READ"
                  ? "You haven't rated any books yet"
                  : "You haven't added any books to your reading list"}
              </Text>
            </View>
          }
          onLayout={() => {
            // Animate items when view mode changes
            Animated.sequence([
              Animated.timing(viewTransition, {
                toValue: 1,
                duration: 150,
                useNativeDriver: true,
              }),
              Animated.timing(viewTransition, {
                toValue: 0,
                duration: 150,
                useNativeDriver: true,
              }),
            ]).start();
          }}
          testID="book-list"
        />
      )}
    </View>
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
    padding: 16,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  searchInput: {
    flex: 1,
    padding: 8,
  },
  viewToggle: {
    padding: 8,
  },
  tabBar: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#f1f1f1",
  },
  tab: {
    flex: 1,
    paddingVertical: 16,
    alignItems: "center",
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: "#007AFF",
  },
  tabText: {
    fontSize: 16,
    color: "#666",
  },
  activeTabText: {
    color: "#007AFF",
    fontWeight: "600",
  },
  listContent: {
    padding: 16,
    gap: 16,
  },
  bookCard: {
    flexDirection: "row",
    backgroundColor: "#f8f8f8",
    borderRadius: 12,
    padding: 12,
    gap: 16,
    transform: [{ scale: 1 }], // Add this for smooth animations
  },
  bookCover: {
    width: 80,
    height: 120,
    borderRadius: 8,
  },
  bookInfo: {
    flex: 1,
    justifyContent: "center",
    gap: 8,
  },
  bookTitle: {
    fontSize: 16,
    fontWeight: "600",
  },
  bookAuthor: {
    fontSize: 14,
    color: "#666",
  },
  ratingContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  ratingText: {
    fontSize: 14,
    color: "#007AFF",
    fontWeight: "500",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyContainer: {
    padding: 32,
    alignItems: "center",
  },
  emptyText: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
  },
  filterButton: {
    padding: 8,
    marginRight: 8,
  },
  categoryFilter: {
    position: "absolute",
    top: 60,
    right: 16,
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 8,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    zIndex: 1000,
    overflow: "hidden", // Add this for smooth height animation
  },
  categoryItem: {
    padding: 12,
    borderRadius: 8,
  },
  selectedCategory: {
    backgroundColor: "#f1f1f1",
  },
  categoryText: {
    fontSize: 14,
    color: "#333",
  },
  gridContent: {
    padding: 8,
  },
  gridBookCard: {
    flex: 1,
    margin: 8,
    backgroundColor: "transparent",
    padding: 0,
    transform: [{ scale: 1 }], // Add this for smooth animations
  },
  gridBookCover: {
    width: "100%",
    aspectRatio: 2 / 3,
    borderRadius: 8,
  },
});

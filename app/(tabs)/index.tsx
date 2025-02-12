// External packages
import { useRouter } from "expo-router";
import { Search } from "lucide-react-native";
import React, { useState, useCallback, useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  Pressable,
  ActivityIndicator,
  RefreshControl,
  Animated,
  SafeAreaView,
  ScrollView,
} from "react-native";
import type { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js';

// Local imports
import { FeedCard } from "@/components/FeedCard";
import { NoFriends } from "@/components/NoFriends";
import type { FeedItem } from "@/components/types";
import { useAuth } from "@/hooks/useAuth";
import { useSupabase } from "@/hooks/useSupabase";

// Types

interface Like {
  user_id: string;
  user_book_id: number;
}

interface Comment {
  user_book_id: number;
  count: number;
}

interface LikePayload {
  new?: Like;
  old?: Like;
  eventType: 'INSERT' | 'DELETE';
}

interface CommentPayload {
  new?: Comment;
  old?: Comment;
  eventType: 'INSERT' | 'DELETE';
}

const ITEMS_PER_PAGE = 10;

export default function FeedScreen() {
  const router = useRouter();
  const { supabase } = useSupabase();
  const { user } = useAuth();
  const [items, setItems] = useState<FeedItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [hasFriends, setHasFriends] = useState<boolean | null>(null);
  const lastCreatedAt = useRef<string | null>(null);
  const [friendIds, setFriendIds] = useState<string[]>([]);

  // Add subscription refs
  const likesSubscription = useRef<RealtimeChannel>();
  const commentsSubscription = useRef<RealtimeChannel>();

  // Add state for subscription status
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [subscriptionError, setSubscriptionError] = useState<string | null>(
    null,
  );

  // Add animation values for realtime updates
  const updateAnim = useRef(new Animated.Value(1)).current;

  const checkFriends = async () => {
    const { count } = await supabase
      .from("friendships")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user?.id);

    setHasFriends(count !== null && count > 0);
  };

  const getFriendIds = async () => {
    if (!user) return;

    const { data } = await supabase
      .from("friendships")
      .select("friend_id")
      .eq("user_id", user.id);

    if (data) {
      setFriendIds(data.map((f) => f.friend_id));
    }
  };

  const fetchFeed = async (loadMore = false) => {
    if (!user) return;

    try {
      let query = supabase
        .from("user_books")
        .select(
          `
          *,
          user:profiles!user_books_user_id_fkey(name, avatar_url),
          book:books!user_books_book_id_fkey(title, author, cover_url, category),
          likes:likes(user_id),
          comments:comments(count)
        `,
        )
        .in("user_id", [user.id, ...friendIds])
        .order("created_at", { ascending: false })
        .limit(ITEMS_PER_PAGE);

      if (loadMore && lastCreatedAt.current) {
        query = query.lt("created_at", lastCreatedAt.current);
      }

      const { data, error } = await query;

      if (error) throw error;

      if (data) {
        const formattedData: FeedItem[] = data.map((item) => ({
          ...item,
          likes_count: item.likes.length,
          comments_count: item.comments[0].count,
          has_liked: item.likes.some((like: Like) => like.user_id === user.id),
          has_added: false, // Will be set in the next step
        }));

        // Check which books user has already added
        const bookIds = formattedData.map((item) => item.book_id);
        const { data: userBooks } = await supabase
          .from("user_books")
          .select("book_id")
          .eq("user_id", user.id)
          .in("book_id", bookIds);

        const userBookIds = new Set(userBooks?.map((ub) => ub.book_id));
        formattedData.forEach((item) => {
          item.has_added = userBookIds.has(item.book_id);
        });

        if (loadMore) {
          setItems((prev) => [...prev, ...formattedData]);
        } else {
          setItems(formattedData);
        }

        lastCreatedAt.current = data[data.length - 1]?.created_at || null;
        setHasMore(data.length === ITEMS_PER_PAGE);
      }
    } catch (error) {
      console.error("Error fetching feed:", error);
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
      setRefreshing(false);
    }
  };

  const setupSubscriptions = () => {
    try {
      // Subscribe to likes
      likesSubscription.current = supabase
        .channel('likes-changes')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',  // Listen specifically to INSERT
            schema: 'public',
            table: 'likes',
          },
          (payload) => {
            const userBookId = payload.new?.user_book_id;
            if (!userBookId) return;

            setItems((prevItems) =>
              prevItems.map((item) => {
                if (item.id === userBookId) {
                  return {
                    ...item,
                    likes_count: item.likes_count + 1,
                    has_liked: payload.new.user_id === user?.id ? true : item.has_liked,
                  };
                }
                return item;
              }),
            );
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'DELETE',  // Listen specifically to DELETE
            schema: 'public',
            table: 'likes',
          },
          (payload) => {
            const userBookId = payload.old?.user_book_id;
            if (!userBookId) return;

            setItems((prevItems) =>
              prevItems.map((item) => {
                if (item.id === userBookId) {
                  return {
                    ...item,
                    likes_count: item.likes_count - 1,
                    has_liked: payload.old.user_id === user?.id ? false : item.has_liked,
                  };
                }
                return item;
              }),
            );
          }
        )
        .subscribe();

      // Subscribe to comments
      commentsSubscription.current = supabase
        .channel('comments-changes')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'comments',
          },
          (payload) => {
            const userBookId = payload.new?.user_book_id;
            if (!userBookId) return;

            setItems((prevItems) =>
              prevItems.map((item) => {
                if (item.id === userBookId) {
                  return {
                    ...item,
                    comments_count: item.comments_count + 1,
                  };
                }
                return item;
              }),
            );
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'DELETE',
            schema: 'public',
            table: 'comments',
          },
          (payload) => {
            const userBookId = payload.old?.user_book_id;
            if (!userBookId) return;

            setItems((prevItems) =>
              prevItems.map((item) => {
                if (item.id === userBookId) {
                  return {
                    ...item,
                    comments_count: Math.max(0, item.comments_count - 1),
                  };
                }
                return item;
              }),
            );
          }
        )
        .subscribe();

    } catch (error) {
      console.error("Error setting up subscriptions:", error);
      setSubscriptionError("Failed to set up realtime updates");
    }
  };

  // Clean up subscriptions
  useEffect(() => {
    setupSubscriptions();

    return () => {
      likesSubscription.current?.unsubscribe();
      commentsSubscription.current?.unsubscribe();
    };
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchFeed();
    setRefreshing(false);
  };

  const handleLoadMore = () => {
    if (!isLoadingMore && hasMore) {
      setIsLoadingMore(true);
      fetchFeed(true);
    }
  };

  React.useEffect(() => {
    checkFriends();
    getFriendIds();
    fetchFeed();
  }, []);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (hasFriends === false) {
    return <NoFriends />;
  }

  // Add error UI
  if (subscriptionError) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>{subscriptionError}</Text>
        <Pressable
          style={styles.retryButton}
          onPress={() => {
            setSubscriptionError(null);
            setupSubscriptions();
          }}
        >
          <Text style={styles.retryButtonText}>Retry</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.content}>
        <Pressable
          style={styles.searchBar}
          onPress={() => router.push("/search")}
        >
          <Search size={20} color="#666" />
          <Text style={styles.searchText}>Search for books or members</Text>
        </Pressable>

        {items.length === 0 ? (
          <NoFriends />
        ) : (
          <ScrollView
            style={styles.scrollView}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
            }
          >
            <FlatList
              testID="feed-list"
              data={items}
              keyExtractor={(item) => `${item.id}`}
              renderItem={({ item }) => (
                <Animated.View style={{ transform: [{ scale: updateAnim }] }}>
                  <FeedCard
                    key={item.id}
                    item={item}
                    onRefresh={handleRefresh}
                  />
                </Animated.View>
              )}
              onEndReached={handleLoadMore}
              onEndReachedThreshold={0.5}
              ListFooterComponent={
                isLoadingMore ? (
                  <ActivityIndicator style={styles.loadingMore} />
                ) : null
              }
            />
          </ScrollView>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  content: {
    flex: 1,
    paddingTop: 8,
  },
  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    margin: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#f1f1f1",
    borderRadius: 8,
    gap: 8,
  },
  searchText: {
    color: "#666",
    fontSize: 16,
  },
  loadingMore: {
    padding: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  errorText: {
    fontSize: 16,
    color: "#FF3B30",
    textAlign: "center",
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: "#007AFF",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});

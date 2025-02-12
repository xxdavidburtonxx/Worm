import { BookOpen } from "lucide-react-native";
import React, { useState, useCallback, useRef } from "react";
import {
  View,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  Text,
  RefreshControl,
} from "react-native";

import { FeedCard } from "@/components/FeedCard";
import type { FeedItem } from "@/components/types";
import { useAuth } from "@/hooks/useAuth";
import { useSupabase } from "@/hooks/useSupabase";

interface PersonalFeedProps {
  userId: string;
  isOwnProfile: boolean;
}

const ITEMS_PER_PAGE = 10;

export function PersonalFeed({ userId, isOwnProfile }: PersonalFeedProps) {
  const { supabase } = useSupabase();
  const { user } = useAuth();
  const [items, setItems] = useState<FeedItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const lastCreatedAt = useRef<string | null>(null);

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
        .eq("user_id", userId)
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
          has_liked: item.likes.some((like) => like.user_id === user.id),
          has_added:
            user.id === userId ||
            item.likes.some((like) => like.user_id === user.id),
        }));

        if (loadMore) {
          setItems((prev) => [...prev, ...formattedData]);
        } else {
          setItems(formattedData);
        }

        lastCreatedAt.current = data[data.length - 1]?.created_at || null;
        setHasMore(data.length === ITEMS_PER_PAGE);
      }
    } catch (error) {
      console.error("Error fetching personal feed:", error);
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    lastCreatedAt.current = null;
    fetchFeed();
  }, [userId]);

  const handleLoadMore = () => {
    if (!isLoadingMore && hasMore) {
      setIsLoadingMore(true);
      fetchFeed(true);
    }
  };

  React.useEffect(() => {
    fetchFeed();
  }, [userId]);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  if (items.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <BookOpen size={48} color="#666" />
        <Text style={styles.emptyTitle}>
          {isOwnProfile
            ? "You haven't rated any books yet"
            : "No books rated yet"}
        </Text>
        <Text style={styles.emptyText}>
          {isOwnProfile
            ? "Start rating books to see them appear here"
            : "This user hasn't rated any books yet"}
        </Text>
      </View>
    );
  }

  return (
    <FlatList
      data={items}
      keyExtractor={(item) => `${item.id}`}
      renderItem={({ item }) => (
        <FeedCard item={item} onRefresh={handleRefresh} />
      )}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={handleRefresh}
          tintColor="#007AFF"
        />
      }
      onEndReached={handleLoadMore}
      onEndReachedThreshold={0.5}
      ListFooterComponent={
        isLoadingMore ? (
          <ActivityIndicator style={styles.loadingMore} color="#666" />
        ) : null
      }
    />
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyContainer: {
    padding: 32,
    alignItems: "center",
    backgroundColor: "#fff",
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginTop: 16,
    marginBottom: 8,
    textAlign: "center",
  },
  emptyText: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
  },
  loadingMore: {
    padding: 16,
  },
});

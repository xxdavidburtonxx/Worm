import { useRouter } from "expo-router";
import {
  Heart,
  MessageCircle,
  Plus,
  Bookmark,
  Check,
  BookOpen,
  Star,
} from "lucide-react-native";
import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Alert,
  ActivityIndicator,
} from "react-native";
import { showToast } from "@/components/Toast";

import BookRatingModal from "@/components/BookRatingModal";
import { CachedImage } from "@/components/CachedImage";
import type { FeedItem } from "@/components/types";
import { useAuth } from "@/hooks/useAuth";
import { useSupabase } from "@/hooks/useSupabase";

interface FeedCardProps {
  item: FeedItem;
  onRefresh: () => void;
}

export function FeedCard({ item, onRefresh }: FeedCardProps) {
  const router = useRouter();
  const { supabase } = useSupabase();
  const { user } = useAuth();
  const [isLiking, setIsLiking] = useState(false);
  const [hasLiked, setHasLiked] = useState(item.has_liked);
  const [likesCount, setLikesCount] = useState(item.likes_count);
  const [isRatingModalVisible, setIsRatingModalVisible] = useState(false);
  const [isBookmarking, setIsBookmarking] = useState(false);
  const [hasBookmarked, setHasBookmarked] = useState(item.has_added);
  const [isLoading, setIsLoading] = useState(false);

  const handleLike = async () => {
    if (!user || isLiking) return;

    setIsLiking(true);
    try {
      if (hasLiked) {
        const { error } = await supabase
          .from("likes")
          .delete()
          .eq("user_id", user.id)
          .eq("activity_id", item.id);

        if (error) throw error;
        setLikesCount((prev) => prev - 1);
        setHasLiked(false);
      } else {
        const { error } = await supabase.from("likes").insert({
          user_id: user.id,
          activity_id: item.id,
        });

        if (error) throw error;
        setLikesCount((prev) => prev + 1);
        setHasLiked(true);
      }
    } catch (error) {
      console.error("Error toggling like:", error);
      showToast.error({
        title: "Error",
        message: "Failed to like post"
      });
    } finally {
      setIsLiking(false);
    }
  };

  const handleBookmark = async () => {
    if (!user || isBookmarking || hasBookmarked) return;

    setIsBookmarking(true);
    try {
      const { error } = await supabase.from("user_books").insert({
        user_id: user.id,
        book_id: item.book_id,
        status: "WANT_TO_READ",
        category: item.book.category,
      });

      if (error) throw error;
      setHasBookmarked(true);
      showToast.success({
        title: "Added to Bookshelf",
        message: "Book added to Want to Read"
      });
    } catch (error) {
      console.error("Error bookmarking:", error);
      showToast.error({
        title: "Error",
        message: "Failed to add book"
      });
    } finally {
      setIsBookmarking(false);
    }
  };

  const handleRate = async (rating: number) => {
    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('user_books')
        .upsert({
          user_id: user?.id,
          book_id: item.book.id,
          rating,
          status: 'READ'
        });

      if (error) throw error;

      showToast.success({
        title: 'Rating Added',
        message: 'Your rating has been saved'
      });
    } catch (error) {
      console.error('Error rating book:', error);
      showToast.error({
        title: 'Error',
        message: 'Failed to rate book'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const navigateToComments = () => {
    router.push({
      pathname: "/feed/comments/[id]",
      params: { id: item.id }
    });
  };

  const getStatusText = (status: FeedItem["status"]) => {
    switch (status) {
      case "READ":
        return "finished reading";
      case "WANT_TO_READ":
        return "wants to read";
      case "READING":
        return "is reading";
      default:
        return "added";
    }
  };

  return (
    <View testID="feed-card" style={styles.container}>
      <View style={styles.header}>
        <View style={styles.userInfo}>
          <CachedImage
            uri={item.user.avatar_url || "https://via.placeholder.com/40"}
            style={styles.avatar}
          />
          <View>
            <Text style={styles.name}>{item.user.name}</Text>
            <Text style={styles.action}>
              {getStatusText(item.status)}{" "}
              <Text style={styles.bookTitle}>{item.book.title}</Text>
            </Text>
          </View>
        </View>
      </View>

      {item.review && (
        <Text style={styles.review} numberOfLines={3}>
          {item.review}
        </Text>
      )}

      <View style={styles.footer}>
        <View style={styles.actions}>
          <Pressable
            testID="like-button"
            onPress={handleLike}
            style={styles.actionButton}
            disabled={isLiking}
          >
            <Heart
              size={24}
              color={hasLiked ? "#FF3B30" : "#666"}
              fill={hasLiked ? "#FF3B30" : "none"}
            />
            {likesCount > 0 && (
              <Text style={styles.actionCount}>{likesCount}</Text>
            )}
          </Pressable>

          <Pressable
            testID="comment-button"
            onPress={navigateToComments}
            style={styles.actionButton}
          >
            <MessageCircle size={24} color="#666" />
            {item.comments_count > 0 && (
              <Text style={styles.actionCount}>{item.comments_count}</Text>
            )}
          </Pressable>
        </View>

        <View style={styles.actions}>
          {!hasBookmarked && user?.id !== item.user_id && (
            <>
              <Pressable
                testID="rate-button"
                onPress={() => setIsRatingModalVisible(true)}
                style={styles.actionButton}
              >
                <Star size={24} color="#666" />
              </Pressable>

              <Pressable
                testID="bookmark-button"
                onPress={handleBookmark}
                style={styles.actionButton}
                disabled={isBookmarking}
              >
                <BookOpen size={24} color="#666" />
              </Pressable>
            </>
          )}
          {(hasBookmarked || user?.id === item.user_id) && (
            <Check size={24} color="#34C759" />
          )}
        </View>
      </View>

      <BookRatingModal
        testID="rating-modal"
        book={{
          id: item.book_id.toString(),
          volumeInfo: {
            title: item.book.title,
            authors: [item.book.author],
            imageLinks: {
              thumbnail: item.book.cover_url,
            },
            categories: [item.book.category],
          },
        }}
        isVisible={isRatingModalVisible}
        onClose={() => setIsRatingModalVisible(false)}
        source="feed"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#f1f1f1",
    padding: 16,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  userInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  name: {
    fontSize: 16,
    fontWeight: "600",
  },
  action: {
    fontSize: 14,
    color: "#666",
  },
  bookTitle: {
    fontWeight: "500",
  },
  review: {
    fontSize: 16,
    lineHeight: 22,
    marginBottom: 16,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  actions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  actionCount: {
    fontSize: 14,
    color: "#666",
  },
});

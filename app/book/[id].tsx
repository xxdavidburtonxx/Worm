import { formatDistanceToNow } from "date-fns";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  FlatList,
  Pressable,
} from "react-native";

import { CachedImage } from "@/components/CachedImage";
import type { Book, UserBook } from "@/components/types";
import { useAuth } from "@/hooks/useAuth";
import { useSupabase } from "@/hooks/useSupabase";

export default function BookScreen() {
  const { id } = useLocalSearchParams();
  const { supabase } = useSupabase();
  const { user } = useAuth();
  const [book, setBook] = useState<Book | null>(null);
  const [userRating, setUserRating] = useState<UserBook | null>(null);
  const [communityRating, setCommunityRating] = useState<number | null>(null);
  const [reviews, setReviews] = useState<UserBook[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    fetchBookDetails();
  }, [id]);

  const fetchBookDetails = async () => {
    if (!user) return;

    try {
      // Fetch book details with stats
      const { data: bookData } = await supabase
        .from("books")
        .select(
          `
          *,
          book_stats!inner(
            avg_rating,
            rating_category,
            total_ratings,
            total_reviews
          )
        `,
        )
        .eq("id", id)
        .single();

      if (bookData) {
        setBook(bookData);
        setCommunityRating(bookData.book_stats.avg_rating);
      }

      // Fetch user's rating
      const { data: userRatingData } = await supabase
        .from("user_books")
        .select("*")
        .eq("book_id", id)
        .eq("user_id", user.id)
        .single();

      if (userRatingData) setUserRating(userRatingData);

      // Fetch all reviews
      const { data: reviewsData } = await supabase
        .from("user_books")
        .select(
          `
          *,
          user:profiles!user_books_user_id_fkey(name, avatar_url)
        `,
        )
        .eq("book_id", id)
        .not("review", "is", null)
        .order("created_at", { ascending: false });

      if (reviewsData) {
        // Put user's review first if it exists
        const userReview = reviewsData.find((r) => r.user_id === user.id);
        const otherReviews = reviewsData.filter((r) => r.user_id !== user.id);
        setReviews(userReview ? [userReview, ...otherReviews] : otherReviews);
      }
    } catch (error) {
      console.error("Error fetching book details:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const getRatingColor = (rating: number) => {
    if (rating >= 4) return "#34C759"; // LOVED - Green
    if (rating >= 3) return "#FFCC00"; // LIKED - Yellow
    return "#FF3B30"; // HATED - Red
  };

  const getRatingCategory = (rating: number | null) => {
    if (rating === null) return "";
    if (rating >= 4) return "LOVED";
    if (rating >= 3) return "LIKED";
    return "HATED";
  };

  if (isLoading || !book) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator
          testID="loading-indicator"
          size="large"
          color="#007AFF"
        />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <CachedImage
          testID="book-cover"
          uri={book.cover_url}
          style={styles.coverImage}
          defaultSource={{ uri: "https://via.placeholder.com/200x300" }}
        />
        <View style={styles.bookInfo}>
          <Text style={styles.title}>{book.title}</Text>
          <Text style={styles.author}>{book.author}</Text>
        </View>
      </View>

      <View style={styles.ratingsContainer}>
        <View style={styles.ratingBox}>
          <Text style={styles.ratingLabel}>Your Rating</Text>
          <Text style={styles.ratingValue}>
            {userRating?.rating?.toFixed(1) || "-"}
          </Text>
        </View>
        <View style={styles.ratingBox}>
          <Text style={styles.ratingLabel}>Community Rating</Text>
          {communityRating ? (
            <Text
              testID="community-rating"
              style={[
                styles.ratingValue,
                { color: getRatingColor(communityRating) },
              ]}
            >
              {communityRating.toFixed(1)}
            </Text>
          ) : (
            <Text style={styles.ratingValue}>-</Text>
          )}
        </View>
      </View>

      <Text testID="rating-category" style={styles.ratingCategory}>
        {getRatingCategory(communityRating)}
      </Text>

      <Text style={styles.reviewsTitle}>Reviews</Text>
      {reviews.map((review, index) => (
        <View
          testID="review-card"
          key={review.id}
          style={[
            styles.reviewCard,
            review.user_id === user?.id && styles.userReviewCard,
          ]}
        >
          <Pressable
            testID="reviewer-profile"
            onPress={() => router.push(`/profile/${review.user_id}`)}
          >
            <View style={styles.reviewHeader}>
              <CachedImage
                uri={review.user.avatar_url}
                style={styles.reviewerAvatar}
              />
              <View>
                <Text style={styles.reviewerName}>
                  {review.user.name}
                  {review.user_id === user?.id && " (You)"}
                </Text>
                <Text style={styles.reviewRating}>
                  Rating: {review.rating?.toFixed(1)}
                </Text>
              </View>
            </View>
          </Pressable>
          <Text testID="review-date" style={styles.reviewText}>
            {formatDistanceToNow(new Date(review.created_at), {
              addSuffix: true,
            })}
          </Text>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  header: {
    padding: 16,
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#f1f1f1",
  },
  coverImage: {
    width: 160,
    height: 240,
    borderRadius: 8,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  bookInfo: {
    alignItems: "center",
    gap: 4,
  },
  title: {
    fontSize: 24,
    fontWeight: "600",
    textAlign: "center",
  },
  author: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
  },
  ratingsContainer: {
    flexDirection: "row",
    padding: 16,
    gap: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f1f1",
  },
  ratingBox: {
    flex: 1,
    backgroundColor: "#f8f8f8",
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  ratingLabel: {
    fontSize: 14,
    color: "#666",
    marginBottom: 8,
  },
  ratingValue: {
    fontSize: 24,
    fontWeight: "700",
  },
  reviewsTitle: {
    fontSize: 20,
    fontWeight: "600",
    padding: 16,
    backgroundColor: "#fff",
  },
  reviewCard: {
    padding: 16,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#f1f1f1",
  },
  userReviewCard: {
    backgroundColor: "#F0F8FF", // Light blue background for user's review
  },
  reviewHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    gap: 12,
  },
  reviewerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  reviewerName: {
    fontSize: 16,
    fontWeight: "600",
  },
  reviewRating: {
    fontSize: 14,
    color: "#666",
  },
  reviewText: {
    fontSize: 16,
    lineHeight: 24,
  },
  ratingCategory: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
  },
});

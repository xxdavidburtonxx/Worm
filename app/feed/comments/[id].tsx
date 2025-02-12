import { formatDistanceToNow } from "date-fns";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ChevronLeft, Send } from "lucide-react-native";
import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  FlatList,
  ActivityIndicator,
  Animated,
  LayoutAnimation,
} from "react-native";

import { CachedImage } from "@/components/CachedImage";
import type { Comment, FeedItem } from "@/components/types";
import { useAuth } from "@/hooks/useAuth";
import { useSupabase } from "@/hooks/useSupabase";
import { CommentItem } from '@/components/CommentItem';
import { showToast } from '@/components/Toast';

export default function CommentsScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { supabase } = useSupabase();
  const { user } = useAuth();
  const [feedItem, setFeedItem] = useState<FeedItem | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const flatListRef = useRef<FlatList>(null);
  const slideAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const commentsSubscription = useRef<ReturnType<typeof supabase.channel>>();
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [subscriptionError, setSubscriptionError] = useState<string | null>(
    null,
  );
  const commentAnimations = useRef<{ [key: string]: Animated.Value }>(
    {},
  ).current;

  const fetchFeedItem = async () => {
    try {
      const { data } = await supabase
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
        .eq("id", id)
        .single();

      if (data) {
        setFeedItem({
          ...data,
          likes_count: data.likes.length,
          comments_count: data.comments[0].count,
          has_liked: data.likes.some((like: any) => like.user_id === user?.id),
          has_added: false, // Not needed for comments view
        });
      }
    } catch (error) {
      console.error("Error fetching feed item:", error);
    }
  };

  const fetchComments = async () => {
    try {
      const { data } = await supabase
        .from("comments")
        .select(
          `
          *,
          user:profiles!comments_user_id_fkey(name, avatar_url)
        `,
        )
        .eq("user_book_id", id)
        .order("created_at", { ascending: true });

      if (data) setComments(data);
    } catch (error) {
      console.error("Error fetching comments:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const setupSubscription = () => {
    try {
      commentsSubscription.current = supabase
        .channel("comments-changes")
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "comments",
            filter: `user_book_id=eq.${id}`,
          },
          (payload) => {
            if (payload.new.user_id !== user?.id) {
              commentAnimations[payload.new.id] = new Animated.Value(0);

              setComments((prev) => [...prev, payload.new]);

              Animated.spring(commentAnimations[payload.new.id], {
                toValue: 1,
                useNativeDriver: true,
                tension: 50,
                friction: 7,
              }).start();

              setTimeout(() => {
                flatListRef.current?.scrollToEnd({ animated: true });
              }, 100);
            }
          },
        )
        .subscribe((status) => {
          if (status === "SUBSCRIBED") {
            setIsSubscribed(true);
          } else {
            setSubscriptionError("Failed to subscribe to comments");
          }
        });
    } catch (error) {
      console.error("Error setting up comment subscription:", error);
      setSubscriptionError("Failed to set up realtime updates");
    }
  };

  useEffect(() => {
    fetchFeedItem();
    fetchComments();
    setupSubscription();

    return () => {
      commentsSubscription.current?.unsubscribe();
    };
  }, [id]);

  useEffect(() => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);

    Animated.parallel([
      Animated.spring(slideAnim, {
        toValue: 1,
        useNativeDriver: true,
        tension: 50,
        friction: 8,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const animateSendButton = () => {
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 0.9,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const handleSendComment = async () => {
    if (!user || !newComment.trim() || isSending) return;

    animateSendButton();
    setIsSending(true);

    try {
      const { data, error } = await supabase
        .from("comments")
        .insert({
          user_id: user.id,
          user_book_id: id,
          comment: newComment.trim(),
        })
        .select(
          `
          *,
          user:profiles!comments_user_id_fkey(name, avatar_url)
        `,
        )
        .single();

      if (error) throw error;

      if (data) {
        LayoutAnimation.configureNext(
          LayoutAnimation.create(
            200,
            LayoutAnimation.Types.easeInEaseOut,
            LayoutAnimation.Properties.opacity,
          ),
        );

        setComments((prev) => [...prev, data]);
        setNewComment("");

        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: true });
        }, 100);
      }
    } catch (error) {
      console.error("Error sending comment:", error);
    } finally {
      setIsSending(false);
    }
  };

  // Subscribe to comment changes
  useEffect(() => {
    if (!id || isSubscribed) return;

    const channel = supabase
      .channel(`comments-${id}`)
      .on(
        'postgres_changes',
        {
          event: '*', // Listen for all events (INSERT, UPDATE, DELETE)
          schema: 'public',
          table: 'comments',
          filter: `user_book_id=eq.${id}`
        },
        async (payload) => {
          console.log('Received realtime comment:', payload);
          
          // Handle different event types
          switch (payload.eventType) {
            case 'INSERT': {
              const newComment = payload.new as Comment;
              // Fetch user data for the new comment
              const { data: userData } = await supabase
                .from('profiles')
                .select('name, avatar_url')
                .eq('id', newComment.user_id)
                .single();

              if (userData) {
                const commentWithUser = {
                  ...newComment,
                  user: userData
                };
                
                // Animate new comment
                commentAnimations[newComment.id] = new Animated.Value(0);
                LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                
                setComments(prev => [...prev, commentWithUser]);
                
                // Animate the new comment sliding in
                Animated.spring(commentAnimations[newComment.id], {
                  toValue: 1,
                  useNativeDriver: true,
                }).start();
                
                // Scroll to the new comment
                setTimeout(() => {
                  flatListRef.current?.scrollToEnd({ animated: true });
                }, 100);
              }
              break;
            }
            case 'DELETE': {
              const deletedComment = payload.old as Comment;
              LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
              setComments(prev => prev.filter(c => c.id !== deletedComment.id));
              break;
            }
            case 'UPDATE': {
              const updatedComment = payload.new as Comment;
              setComments(prev =>
                prev.map(c =>
                  c.id === updatedComment.id ? { ...c, ...updatedComment } : c
                )
              );
              break;
            }
          }
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          setIsSubscribed(true);
        } else if (status === 'CHANNEL_ERROR') {
          setSubscriptionError('Failed to subscribe to comments');
        }
      });

    commentsSubscription.current = channel;

    return () => {
      channel.unsubscribe();
      setIsSubscribed(false);
    };
  }, [id]);

  // Render comment with animation
  const renderComment = ({ item: comment }: { item: Comment }) => {
    const animation = commentAnimations[comment.id] || new Animated.Value(1);
    
    return (
      <Animated.View
        style={{
          opacity: animation,
          transform: [
            {
              translateY: animation.interpolate({
                inputRange: [0, 1],
                outputRange: [50, 0],
              }),
            },
          ],
        }}
      >
        <CommentItem comment={comment} />
      </Animated.View>
    );
  };

  // Send comment with optimistic update
  const handleSendCommentOptimistic = async () => {
    if (!newComment.trim() || !user) return;

    const commentText = newComment.trim();
    setNewComment('');
    setIsSending(true);

    // Optimistic update
    const optimisticComment = {
      id: Date.now().toString(),
      text: commentText,
      user_book_id: id as string,
      user_id: user.id,
      created_at: new Date().toISOString(),
      user: {
        name: user.user_metadata.full_name,
        avatar_url: user.user_metadata.avatar_url,
      },
    };

    setComments(prev => [...prev, optimisticComment]);
    flatListRef.current?.scrollToEnd({ animated: true });

    try {
      const { error } = await supabase
        .from('comments')
        .insert({
          text: commentText,
          user_book_id: id,
          user_id: user.id,
        });

      if (error) throw error;
    } catch (error) {
      console.error('Error sending comment:', error);
      // Remove optimistic comment if failed
      setComments(prev => prev.filter(c => c.id !== optimisticComment.id));
      showToast.error({
        title: 'Error',
        message: 'Failed to send comment'
      });
    } finally {
      setIsSending(false);
    }
  };

  if (isLoading || !feedItem) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <Animated.View
      style={[
        styles.container,
        {
          opacity: fadeAnim,
          transform: [
            {
              translateY: slideAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [300, 0],
              }),
            },
          ],
        },
      ]}
    >
      <KeyboardAvoidingView
        style={styles.innerContainer}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 88 : 0}
      >
        <View style={styles.header}>
          <Pressable onPress={() => router.back()}>
            <ChevronLeft size={24} color="#000" />
          </Pressable>
          <Text style={styles.headerTitle}>Comments</Text>
          <View style={{ width: 24 }} />
        </View>

        <FlatList
          ref={flatListRef}
          data={comments}
          keyExtractor={(item) => item.id.toString()}
          ListHeaderComponent={() => (
            <Animated.View style={[styles.feedItem, { opacity: fadeAnim }]}>
              <View style={styles.userInfo}>
                <CachedImage
                  uri={
                    feedItem.user.avatar_url || "https://via.placeholder.com/40"
                  }
                  style={styles.avatar}
                />
                <View>
                  <Text style={styles.name}>{feedItem.user.name}</Text>
                  <Text style={styles.bookTitle}>{feedItem.book.title}</Text>
                </View>
              </View>
              {feedItem.review && (
                <Text style={styles.review}>{feedItem.review}</Text>
              )}
            </Animated.View>
          )}
          renderItem={renderComment}
          ListEmptyComponent={() => (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>Be the first to comment!</Text>
            </View>
          )}
          contentContainerStyle={styles.listContent}
          onContentSizeChange={() => {
            if (comments.length > 0) {
              flatListRef.current?.scrollToEnd({ animated: false });
            }
          }}
        />

        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="Add a comment..."
            value={newComment}
            onChangeText={setNewComment}
            multiline
            maxLength={500}
          />
          <Pressable
            onPress={handleSendCommentOptimistic}
            disabled={!newComment.trim() || isSending}
            style={[styles.sendButton, !newComment.trim() && styles.sendButtonDisabled]}
          >
            {isSending ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Send size={20} color="#fff" />
            )}
          </Pressable>
        </View>

        {!isSubscribed && (
          <View style={styles.subscriptionStatus}>
            <ActivityIndicator size="small" color="#666" />
            <Text style={styles.subscriptionText}>
              Connecting to realtime updates...
            </Text>
          </View>
        )}

        {subscriptionError && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{subscriptionError}</Text>
            <Pressable
              style={styles.retryButton}
              onPress={() => {
                setSubscriptionError(null);
                setupSubscription();
              }}
            >
              <Text style={styles.retryButtonText}>Retry</Text>
            </Pressable>
          </View>
        )}
      </KeyboardAvoidingView>
    </Animated.View>
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
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f1f1",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
  },
  listContent: {
    flexGrow: 1,
  },
  feedItem: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f1f1",
  },
  userInfo: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
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
  bookTitle: {
    fontSize: 14,
    color: "#666",
  },
  review: {
    fontSize: 16,
    lineHeight: 22,
  },
  commentContainer: {
    flexDirection: "row",
    padding: 16,
    gap: 12,
  },
  commentAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  commentContent: {
    flex: 1,
  },
  commentName: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 4,
  },
  commentText: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 4,
  },
  commentTime: {
    fontSize: 12,
    color: "#666",
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
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: "#f1f1f1",
    gap: 12,
  },
  input: {
    flex: 1,
    backgroundColor: "#f1f1f1",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    maxHeight: 100,
    fontSize: 16,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#007AFF",
    alignItems: "center",
    justifyContent: "center",
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
  innerContainer: {
    flex: 1,
    backgroundColor: "#fff",
  },
  sendButtonContainer: {
    // This wrapper is needed for the scale animation
  },
  subscriptionStatus: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 8,
    backgroundColor: "#f8f8f8",
    gap: 8,
  },
  subscriptionText: {
    fontSize: 14,
    color: "#666",
  },
  errorContainer: {
    padding: 16,
    backgroundColor: "#FFF5F5",
    alignItems: "center",
  },
  errorText: {
    fontSize: 14,
    color: "#FF3B30",
    marginBottom: 8,
  },
  retryButton: {
    backgroundColor: "#007AFF",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  retryButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
});

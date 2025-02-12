import React, { useState, useEffect } from "react";
import { Pressable, Text, StyleSheet, ActivityIndicator, Modal, View } from "react-native";

import { useAuth } from "@/hooks/useAuth";
import { useSupabase } from "@/hooks/useSupabase";
import AuthGuard from "@/components/AuthGuard";

interface FollowButtonProps {
  userId: string;
  onFollowChange?: () => void;
}

export function FollowButton({ userId, onFollowChange }: FollowButtonProps) {
  const { supabase } = useSupabase();
  const { user } = useAuth();
  const [isFollowing, setIsFollowing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);

  useEffect(() => {
    checkFollowStatus();
  }, [userId]);

  const checkFollowStatus = async () => {
    if (!user) return;

    try {
      const { count } = await supabase
        .from("friendships")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("friend_id", userId);

      setIsFollowing(count !== null && count > 0);
    } catch (error) {
      console.error("Error checking follow status:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePress = async () => {
    if (!user || isProcessing) return;

    setIsProcessing(true);
    try {
      if (isFollowing) {
        // Unfollow
        const { error } = await supabase
          .from("friendships")
          .delete()
          .eq("user_id", user.id)
          .eq("friend_id", userId);

        if (error) throw error;
      } else {
        // Follow
        const { error } = await supabase.from("friendships").insert({
          user_id: user.id,
          friend_id: userId,
        });

        if (error) throw error;
      }

      setIsFollowing(!isFollowing);
      onFollowChange?.();
    } catch (error) {
      console.error("Error toggling follow:", error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFollow = async () => {
    if (!user) {
      setShowAuthModal(true);
      return;
    }
    handlePress();
  };

  if (isLoading) {
    return (
      <Pressable style={styles.button}>
        <ActivityIndicator size="small" color="#fff" />
      </Pressable>
    );
  }

  return (
    <>
      <Pressable
        style={[styles.button, isFollowing && styles.followingButton]}
        onPress={handleFollow}
        disabled={isProcessing}
      >
        {isProcessing ? (
          <ActivityIndicator
            size="small"
            color={isFollowing ? "#007AFF" : "#fff"}
          />
        ) : (
          <Text style={[styles.buttonText, isFollowing && styles.followingText]}>
            {isFollowing ? "Following" : "Follow"}
          </Text>
        )}
      </Pressable>

      <Modal
        visible={showAuthModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowAuthModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <AuthGuard message="Sign in to follow other readers" />
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: "#007AFF",
    paddingHorizontal: 24,
    paddingVertical: 8,
    borderRadius: 20,
    minWidth: 100,
    alignItems: "center",
    justifyContent: "center",
  },
  followingButton: {
    backgroundColor: "#f1f1f1",
    borderWidth: 1,
    borderColor: "#ddd",
  },
  buttonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  followingText: {
    color: "#000",
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    width: '90%',
    maxWidth: 400,
    padding: 24,
  },
});

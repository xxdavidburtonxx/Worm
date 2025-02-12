import { Share2 } from "lucide-react-native";
import React from "react";
import { Pressable, Text, Share, StyleSheet } from "react-native";

import { showToast } from "@/components/Toast";

interface Props {
  userId: string;
  username: string;
}

export function ShareProfileButton({ userId, username }: Props) {
  const handleShare = async () => {
    try {
      const result = await Share.share({
        message: `Check out ${username}'s profile on Worm!\n\nhttps://worm.app/profile/${userId}`,
        // You can also specify a title and URL when supported
        title: `${username}'s Worm Profile`,
        url: `https://worm.app/profile/${userId}`,
      });

      if (result.action === Share.sharedAction) {
        showToast.success({
          title: "Shared!",
          message: "Profile link copied to clipboard"
        });
      }
    } catch (error) {
      console.error("Error sharing profile:", error);
      showToast.error({
        title: "Error",
        message: "Could not share profile"
      });
    }
  };

  return (
    <Pressable 
      style={styles.button}
      onPress={handleShare}
    >
      <Share2 size={16} color="#666" />
      <Text style={styles.text}>Share Profile</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 12,
    borderRadius: 8,
    backgroundColor: "#f1f1f1",
  },
  text: {
    fontSize: 14,
    fontWeight: "500",
    color: "#666",
  },
}); 
import { useRouter } from "expo-router";
import { Pencil } from "lucide-react-native";
import React from "react";
import { Pressable, Text, StyleSheet } from "react-native";

export function EditProfileButton() {
  const router = useRouter();

  return (
    <Pressable 
      style={styles.button}
      onPress={() => router.push("/profile/edit")}
    >
      <Pencil size={16} color="#666" />
      <Text style={styles.text}>Edit Profile</Text>
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
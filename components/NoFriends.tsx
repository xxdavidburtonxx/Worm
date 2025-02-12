import { useRouter } from "expo-router";
import { UserPlus } from "lucide-react-native";
import React from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";

export function NoFriends() {
  const router = useRouter();

  const handleFindFriends = () => {
    // Navigate to search tab with friends filter active
    router.push({
      pathname: "/(tabs)/search",
      params: { filter: "friends" }
    });
  };

  return (
    <View style={styles.container}>
      <View style={styles.iconContainer}>
        <UserPlus size={48} color="#666" />
      </View>

      <Text style={styles.title}>No Friends Yet</Text>
      <Text style={styles.subtitle}>
        Add friends to see what books they're reading and discover new recommendations
      </Text>

      <Pressable style={styles.button} onPress={handleFindFriends}>
        <Text style={styles.buttonText}>Find Friends</Text>
      </Pressable>

      <Text style={styles.suggestion}>
        You can find friends by searching their name or username
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#F2F8FF",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: "600",
    marginBottom: 12,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    marginBottom: 32,
    lineHeight: 22,
  },
  button: {
    backgroundColor: "#007AFF",
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 20,
    marginBottom: 16,
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  suggestion: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
  },
});

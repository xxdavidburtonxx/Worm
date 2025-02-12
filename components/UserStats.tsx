import { BookOpen, Users } from "lucide-react-native";
import React from "react";
import { View, Text, StyleSheet, ActivityIndicator } from "react-native";

import { useSupabase } from "@/hooks/useSupabase";

interface UserStatsProps {
  userId: string;
}

export function UserStats({ userId }: UserStatsProps) {
  const { supabase } = useSupabase();
  const [stats, setStats] = React.useState<{
    booksRead: number;
    followers: number;
  } | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);

  const fetchStats = async () => {
    try {
      // Get books read count
      const { count: booksRead } = await supabase
        .from("user_books")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("status", "READ");

      // Get followers count
      const { count: followers } = await supabase
        .from("friendships")
        .select("*", { count: "exact", head: true })
        .eq("friend_id", userId);

      setStats({
        booksRead: booksRead || 0,
        followers: followers || 0,
      });
    } catch (error) {
      console.error("Error fetching user stats:", error);
    } finally {
      setIsLoading(false);
    }
  };

  React.useEffect(() => {
    fetchStats();
  }, [userId]);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" color="#666" />
      </View>
    );
  }

  if (!stats) return null;

  return (
    <View style={styles.container}>
      <View style={styles.statItem}>
        <Text style={styles.statNumber}>{stats.booksRead}</Text>
        <Text style={styles.statLabel}>Books Read</Text>
      </View>

      <View style={styles.statItem}>
        <Text style={styles.statNumber}>{stats.followers}</Text>
        <Text style={styles.statLabel}>Followers</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 32,
    paddingVertical: 16,
    backgroundColor: "#fff",
  },
  loadingContainer: {
    padding: 16,
    alignItems: "center",
  },
  statItem: {
    alignItems: "center",
  },
  statNumber: {
    fontSize: 20,
    fontWeight: "600",
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 14,
    color: "#666",
  },
});

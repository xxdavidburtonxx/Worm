import { useRouter } from "expo-router";
import { X, UserPlus, LogOut } from "lucide-react-native";
import React from "react";
import { View, Text, StyleSheet, Pressable, Animated } from "react-native";

import { useAuth } from "@/hooks/useAuth";

interface Props {
  isVisible: boolean;
  onClose: () => void;
}

export default function ProfileMenu({ isVisible, onClose }: Props) {
  const router = useRouter();
  const { signOut } = useAuth();
  const slideAnim = React.useRef(new Animated.Value(400)).current;

  React.useEffect(() => {
    Animated.spring(slideAnim, {
      toValue: isVisible ? 0 : 400,
      useNativeDriver: true,
    }).start();
  }, [isVisible]);

  const handleLogout = async () => {
    await signOut();
    router.replace("/auth/login");
  };

  return (
    <>
      {isVisible && (
        <Pressable style={styles.overlay} onPress={onClose}>
          <View style={styles.overlayContent} />
        </Pressable>
      )}
      <Animated.View
        style={[styles.menu, { transform: [{ translateX: slideAnim }] }]}
      >
        <View style={styles.header}>
          <Text style={styles.title}>Menu</Text>
          <Pressable onPress={onClose}>
            <X size={24} color="#000" />
          </Pressable>
        </View>

        <Pressable
          style={styles.menuItem}
          onPress={() => {
            onClose();
            router.push("/search/invite");
          }}
        >
          <UserPlus size={20} color="#000" />
          <Text style={styles.menuItemText}>Invite Friends</Text>
        </Pressable>

        <Pressable style={styles.menuItem} onPress={handleLogout}>
          <LogOut size={20} color="#000" />
          <Text style={styles.menuItemText}>Log Out</Text>
        </Pressable>
      </Animated.View>
    </>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  overlayContent: {
    flex: 1,
  },
  menu: {
    position: "absolute",
    right: 0,
    top: 0,
    bottom: 0,
    width: 300,
    backgroundColor: "#fff",
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: -2, height: 0 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
  },
  title: {
    fontSize: 20,
    fontWeight: "600",
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    gap: 12,
  },
  menuItemText: {
    fontSize: 16,
  },
});

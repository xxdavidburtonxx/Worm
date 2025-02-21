import { useRouter } from "expo-router";
import { X, UserPlus, LogOut, Settings, Target } from "lucide-react-native";
import React from "react";
import { View, Text, StyleSheet, Pressable, Animated } from "react-native";
import { useAuth } from "@/hooks/useAuth";
import { showToast } from "@/components/Toast";

interface Props {
  isVisible: boolean;
  onClose: () => void;
}

export default function ProfileMenu({ isVisible, onClose }: Props) {
  const router = useRouter();
  const { signOut } = useAuth();

  const handleEditProfile = () => {
    onClose();
    router.push('/profile/edit');
  };

  const handleCreateGoals = () => {
    onClose();
    // TODO: Implement goals page navigation
    showToast.info({
      title: "Coming Soon",
      message: "Goals feature is under development"
    });
  };

  const handleLogout = async () => {
    try {
      await signOut();
      onClose();
    } catch (error) {
      console.error('Error signing out:', error);
      showToast.error({
        title: "Error",
        message: "Failed to sign out"
      });
    }
  };

  return (
    <Animated.View 
      style={[
        styles.container,
        {
          transform: [
            {
              translateX: isVisible ? 0 : 300,
            },
          ],
        },
      ]}
    >
      <View style={styles.header}>
        <Text style={styles.title}>Menu</Text>
        <Pressable onPress={onClose} style={styles.closeButton}>
          <X size={24} color="#000" />
        </Pressable>
      </View>

      <View style={styles.content}>
        <Pressable style={styles.menuItem} onPress={handleEditProfile}>
          <Settings size={20} color="#000" />
          <Text style={styles.menuItemText}>Edit Profile</Text>
        </Pressable>

        <Pressable style={styles.menuItem} onPress={handleCreateGoals}>
          <Target size={20} color="#000" />
          <Text style={styles.menuItemText}>Create Goals</Text>
        </Pressable>

        <Pressable style={[styles.menuItem, styles.logoutItem]} onPress={handleLogout}>
          <LogOut size={20} color="#FF3B30" />
          <Text style={[styles.menuItemText, styles.logoutText]}>Log Out</Text>
        </Pressable>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    width: 300,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: {
      width: -2,
      height: 0,
    },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f1f1',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
  },
  closeButton: {
    padding: 4,
  },
  content: {
    padding: 16,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 12,
  },
  menuItemText: {
    fontSize: 16,
  },
  logoutItem: {
    marginTop: 24,
  },
  logoutText: {
    color: '#FF3B30',
  },
});

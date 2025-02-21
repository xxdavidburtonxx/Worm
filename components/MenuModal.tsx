import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import type { RelativePathString } from 'expo-router';
import React from 'react';
import { Animated, Modal, Pressable, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { IconButton, Text } from 'react-native-paper';
import { useAuth } from '@/hooks/useAuth';
import { showToast } from '@/components/Toast';

// Reuse the colors from the main component
const colors = {
  desertSand: '#DF5B39F',
  warmBrown: '#A27C62',
  lightKhaki: '#F2EBD4',
  siennaBrown: '#9A634E',
  goldenSand: '#EAD0B3',
  softBrown: 'rgba(162, 124, 98, 0.1)',
};

interface MenuModalProps {
  visible: boolean;
  onClose: () => void;
}

interface MenuItemProps {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  text: string;
  onPress: () => void;
}

const MENU_ROUTES = {
  IMPORT: '/import' as RelativePathString,
  FAQ: '/faq' as RelativePathString,
  PRIVACY: '/privacy' as RelativePathString,
  SETTINGS: '/settings' as RelativePathString,
  AUTH: '/auth' as RelativePathString,
} as const;

const MenuItem = ({ icon, text, onPress }: MenuItemProps) => (
  <Pressable style={styles.menuItem} onPress={onPress}>
    <View style={styles.menuIconContainer}>
      <MaterialCommunityIcons name={icon} size={24} color={colors.warmBrown} />
    </View>
    <Text style={styles.menuText}>{text}</Text>
  </Pressable>
);

export default function MenuModal({ visible, onClose }: MenuModalProps) {
  const slideAnim = React.useRef(new Animated.Value(-400)).current;
  const router = useRouter();
  const { signOut } = useAuth();

  React.useEffect(() => {
    if (visible) {
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 65,
        friction: 11,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: -400,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  }, [visible, slideAnim]);

  const handleLogout = async () => {
    try {
      onClose();
      await signOut();
      
      setTimeout(() => {
        router.replace(MENU_ROUTES.AUTH);
      }, 100);
    } catch (error) {
      console.error('Error logging out:', error);
      showToast.error({
        title: "Error",
        message: "Failed to log out"
      });
    }
  };

  const handleNavigation = (route: RelativePathString) => {
    onClose();
    router.push(route);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <Animated.View 
          style={[
            styles.menuContainer,
            { transform: [{ translateX: slideAnim }] },
          ]}
        >
          <View style={styles.header}>
            <Text style={styles.headerText}>Menu</Text>
            <IconButton
              icon="close"
              size={24}
              onPress={onClose}
              style={styles.closeButton}
              iconColor={colors.siennaBrown}
            />
          </View>

          <ScrollView 
            style={styles.menuContent} 
            contentContainerStyle={{ paddingBottom: 50 }}
            showsVerticalScrollIndicator={false}
          >
            <MenuItem 
              icon="cloud-upload" 
              text="Import Existing List" 
              onPress={() => handleNavigation(MENU_ROUTES.IMPORT)}
            />
            <MenuItem 
              icon="help-circle" 
              text="FAQ" 
              onPress={() => handleNavigation(MENU_ROUTES.FAQ)}
            />
            <MenuItem 
              icon="shield" 
              text="Privacy Policy" 
              onPress={() => handleNavigation(MENU_ROUTES.PRIVACY)}
            />
            <MenuItem 
              icon="cog" 
              text="Settings" 
              onPress={() => handleNavigation(MENU_ROUTES.SETTINGS)}
            />
            <MenuItem 
              icon="logout" 
              text="Log Out" 
              onPress={handleLogout}
            />
          </ScrollView>
        </Animated.View>
        
        <TouchableOpacity 
          style={styles.dismissArea} 
          onPress={onClose}
          activeOpacity={1}
        />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  menuContainer: {
    width: '85%',
    backgroundColor: '#fff',
    height: '100%',
    paddingTop: 50,
  },
  dismissArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.lightKhaki,
  },
  headerText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.siennaBrown,
  },
  closeButton: {
    backgroundColor: colors.softBrown,
  },
  menuContent: {
    flex: 1,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.lightKhaki,
  },
  menuIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.softBrown,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  menuText: {
    fontSize: 16,
    color: colors.siennaBrown,
    flex: 1,
  },
}); 
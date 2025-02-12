import React, { useState } from 'react';
import { View, Modal } from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import AuthGuard from '@/components/AuthGuard';
import styles from '@/styles/styles';

interface Props {
  item: any;
}

export function FeedItem({ item }: Props) {
  const { user } = useAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);

  const handleLike = () => {
    if (!user) {
      setShowAuthModal(true);
      return;
    }
    // Existing like logic...
  };

  const handleComment = () => {
    if (!user) {
      setShowAuthModal(true);
      return;
    }
    // Existing comment logic...
  };

  return (
    <>
      {/* Existing feed item UI */}
      
      <Modal
        visible={showAuthModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowAuthModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <AuthGuard message="Sign in to interact with posts" />
          </View>
        </View>
      </Modal>
    </>
  );
} 
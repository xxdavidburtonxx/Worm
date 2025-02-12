import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { GoogleSigninButton, statusCodes } from '@react-native-google-signin/google-signin';
import { showToast } from "@/components/Toast";
import { useAuth } from '@/hooks/useAuth';

export default function AuthScreen() {
  const router = useRouter();
  const auth = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  const handleGoogleSignIn = async () => {
    try {
      setIsLoading(true);
      await auth.signInWithGoogle();
    } catch (error: any) {
      if (error.code === statusCodes.SIGN_IN_CANCELLED) {
        // User cancelled
      } else {
        showToast.error({
          title: "Sign In Error",
          message: error.message || "Could not sign in with Google"
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Welcome to Worm</Text>
      <Text style={styles.subtitle}>Sign in to rate books and share your thoughts</Text>
      
      <View style={styles.buttonContainer}>
        <GoogleSigninButton
          size={GoogleSigninButton.Size.Wide}
          color={GoogleSigninButton.Color.Dark}
          onPress={handleGoogleSignIn}
          disabled={isLoading}
          style={styles.googleButton}
        />
        
        <Pressable style={styles.skipButton} onPress={auth.skipAuth}>
          <Text style={styles.skipButtonText}>Skip signing up for now</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 48,
  },
  googleButton: {
    width: 240,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  skipButton: {
    padding: 12,
    backgroundColor: '#666',
    borderRadius: 8,
  },
  skipButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
}); 
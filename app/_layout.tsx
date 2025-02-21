import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import { useFonts } from "expo-font";
import { Stack, useRouter, useSegments } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import React, { useEffect } from "react";
import { View, Pressable } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import Toast, { toastConfig } from "@/components/Toast";
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { ArrowLeft } from 'lucide-react-native';

// External packages
import "react-native-reanimated";

// Local imports
import { useAuth, AuthProvider } from "@/hooks/useAuth";
import { useColorScheme } from "@/hooks/useColorScheme";

// Constants
const PROTECTED_SEGMENTS = ["(tabs)", "book", "profile", "rankings", "goal", "followers"];

// Add these types
import type { RelativePathString } from "expo-router";

// Add route type
const AUTH_ROUTE = "/auth" as RelativePathString;

// Auth guard component
function AuthGuard() {
  const segments = useSegments();
  const router = useRouter();
  const { user, isLoading } = useAuth();

  useEffect(() => {
    console.log('Available routes:', {
      segments,
      protectedSegments: PROTECTED_SEGMENTS,
      currentSegment: segments[0],
      fullPath: segments.join('/'),
      isProtected: PROTECTED_SEGMENTS.includes(segments[0])
    });

    if (isLoading) {
      console.log('Auth is still loading, waiting...');
      return;
    }

    const inProtectedRoute = PROTECTED_SEGMENTS.some(
      (segment) => segments[0] === segment,
    );

    console.log('Route protection check:', {
      inProtectedRoute,
      segments,
      isAuthenticated: !!user,
      protectedSegments: PROTECTED_SEGMENTS,
      matchedSegment: segments[0],
      fullPath: segments.join('/'),
      isFollowersRoute: segments[0] === 'followers'
    });

    if (!user && inProtectedRoute) {
      console.log('Unauthorized access, redirecting to auth');
      router.replace(AUTH_ROUTE);
    } else if (user && !inProtectedRoute) {
      console.log('Authenticated user in public route, redirecting to tabs');
      router.replace("/(tabs)");
    }
  }, [user, segments, isLoading]);

  // Don't render anything during the initial loading
  if (isLoading) {
    return null;
  }

  return <Stack />;
}

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [loaded] = useFonts({
    SpaceMono: require("../assets/fonts/SpaceMono-Regular.ttf"),
  });

  // Configure Google Sign-In once at app startup
  useEffect(() => {
    GoogleSignin.configure({
      webClientId: '781569259169-ao9gntvu1rlc1dmr9e8hnsm7horq8gtk.apps.googleusercontent.com',
    });
  }, []);

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  return (
    <AuthProvider>
      <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
        <GestureHandlerRootView style={{ flex: 1 }}>
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="auth" />
            <Stack.Screen 
              name="auth/add-books" 
              options={{
                presentation: 'modal',
                headerShown: true,
                title: 'Add Books'
              }} 
            />
            <Stack.Screen 
              name="auth/find-friends" 
              options={{
                presentation: 'modal',
                headerShown: true,
                title: 'Find Friends'
              }} 
            />
            <Stack.Screen 
              name="feed/comments/[id]" 
              options={{
                presentation: 'modal',
                title: 'Comments',
                headerShown: true,
              }} 
            />
            <Stack.Screen 
              name="rankings" 
              options={{
                presentation: 'card',
                headerShown: true,
                title: 'Worm Rankings',
              }} 
            />
            <Stack.Screen 
              name="goal" 
              options={{
                presentation: 'card',
                headerShown: false,
                animation: 'slide_from_right',
              }} 
            />
            <Stack.Screen 
              name="followers" 
              options={{
                presentation: 'card',
                headerShown: true,
                title: 'Followers',
              }} 
            />
            <Stack.Screen 
              name="profile/[id]" 
              options={{
                presentation: 'card',
                headerShown: true,
                title: 'Profile',
                animation: 'slide_from_right',
                headerBackTitle: 'Back',
              }} 
            />
            <Stack.Screen 
              name="profile/edit" 
              options={{
                presentation: 'modal',
                headerShown: true,
                title: 'Edit Profile',
              }} 
            />
          </Stack>
          <Toast config={toastConfig} />
        </GestureHandlerRootView>
      </ThemeProvider>
    </AuthProvider>
  );
}

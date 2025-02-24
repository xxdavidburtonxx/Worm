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
    console.log('AuthGuard effect triggered:', {
      timestamp: new Date().toISOString(),
      isLoading,
      hasUser: !!user,
      segments,
      currentPath: segments.join('/'),
      currentSegment: segments[0],
      isProtectedRoute: PROTECTED_SEGMENTS.includes(segments[0])
    });

    if (isLoading) {
      console.log('Auth is still loading, waiting...');
      return;
    }

    const inProtectedRoute = PROTECTED_SEGMENTS.some(
      (segment) => segments[0] === segment,
    );

    console.log('Route protection decision:', {
      timestamp: new Date().toISOString(),
      inProtectedRoute,
      hasUser: !!user,
      currentPath: segments.join('/'),
      action: !user && inProtectedRoute ? 'redirecting to auth' : 
              user && !inProtectedRoute ? 'redirecting to tabs' : 'no redirect needed'
    });

    if (!user && inProtectedRoute) {
      console.log('Redirecting to auth:', {
        timestamp: new Date().toISOString(),
        from: segments.join('/'),
        to: AUTH_ROUTE
      });
      router.replace(AUTH_ROUTE);
    } else if (user && !inProtectedRoute) {
      console.log('Redirecting to tabs:', {
        timestamp: new Date().toISOString(),
        from: segments.join('/'),
        to: '/(tabs)'
      });
      router.replace("/(tabs)");
    }
  }, [user, segments, isLoading]);

  // Don't render anything during the initial loading
  if (isLoading) {
    console.log('AuthGuard is loading:', {
      timestamp: new Date().toISOString(),
      segments: segments.join('/')
    });
    return null;
  }

  console.log('AuthGuard rendering Stack:', {
    timestamp: new Date().toISOString(),
    hasUser: !!user,
    currentPath: segments.join('/')
  });
  return <Stack />;
}

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

function RootLayout() {
  const colorScheme = useColorScheme();
  const [loaded] = useFonts({
    SpaceMono: require("../assets/fonts/SpaceMono-Regular.ttf"),
  });

  console.log('RootLayout initialization:', {
    timestamp: new Date().toISOString(),
    fontsLoaded: loaded,
    colorScheme
  });

  useEffect(() => {
    console.log('RootLayout effect:', {
      timestamp: new Date().toISOString(),
      fontsLoaded: loaded,
      action: loaded ? 'hiding splash screen' : 'waiting for fonts'
    });

    if (loaded) {
      SplashScreen.hideAsync().catch(error => {
        console.error('Error hiding splash screen:', {
          timestamp: new Date().toISOString(),
          error
        });
      });
    }
  }, [loaded]);

  if (!loaded) {
    console.log('RootLayout waiting for fonts:', {
      timestamp: new Date().toISOString()
    });
    return null;
  }

  console.log('RootLayout rendering:', {
    timestamp: new Date().toISOString(),
    colorScheme
  });

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
              name="followers/[id]" 
              options={{
                presentation: 'card',
                headerShown: false,
                animation: 'slide_from_right',
              }} 
            />
            <Stack.Screen 
              name="followers/index" 
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
                headerShown: false,
                animation: 'slide_from_right',
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
            <Stack.Screen 
              name="bookshelf/[id]" 
              options={{
                presentation: 'card',
                headerShown: false,
                animation: 'slide_from_right',
              }} 
            />
          </Stack>
          <Toast config={toastConfig} />
        </GestureHandlerRootView>
      </ThemeProvider>
    </AuthProvider>
  );
}

export default RootLayout;

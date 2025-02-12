import { Stack } from "expo-router";

export default function AuthLayout() {
  return (
    <Stack>
      <Stack.Screen 
        name="index" 
        options={{ 
          title: "Sign In",
          headerShown: false 
        }} 
      />
      <Stack.Screen 
        name="onboarding" 
        options={{ 
          title: "Welcome",
          headerShown: false 
        }} 
      />
      <Stack.Screen 
        name="add-books" 
        options={{ 
          title: "Add Books",
          headerShown: false 
        }} 
      />
      <Stack.Screen 
        name="find-friends" 
        options={{ 
          title: "Find Friends",
          headerShown: false 
        }} 
      />
    </Stack>
  );
} 
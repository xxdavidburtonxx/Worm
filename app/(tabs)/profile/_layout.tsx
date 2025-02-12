// Layout for all profile routes
import { Stack } from "expo-router";

export default function ProfileLayout() {
  return (
    <Stack>
      <Stack.Screen 
        name="[id]" 
        options={{ 
          headerShown: false 
        }} 
      />
      <Stack.Screen
        name="edit"
        options={{
          presentation: "modal",
          title: "Edit Profile"
        }}
      />
      {/* Other profile-related modals */}
    </Stack>
  );
} 
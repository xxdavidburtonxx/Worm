import { Stack } from "expo-router";

export default function EditProfileLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="name" />
      <Stack.Screen name="username" />
      <Stack.Screen name="bio" />
    </Stack>
  );
}

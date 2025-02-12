import { Stack } from "expo-router";

export default function SearchLayout() {
  return (
    <Stack>
      <Stack.Screen
        name="index"
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="review"
        options={{
          presentation: "modal",
          title: "Write Review",
        }}
      />
    </Stack>
  );
}

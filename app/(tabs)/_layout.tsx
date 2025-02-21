// External packages
import { Tabs } from "expo-router";
import { Book, BookOpen, Search, User } from "lucide-react-native";
import React from "react";

// Add type for tab icon props
type TabIconProps = {
  color: string;
};

export default function TabLayout() {
  return (
    <Tabs screenOptions={{ headerShown: false }}>
      <Tabs.Screen
        name="index"
        options={{
          title: "Feed",
          tabBarIcon: ({ color }) => <BookOpen size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="bookshelf"
        options={{
          title: "Bookshelf",
          tabBarIcon: ({ color }) => <Book size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="search"
        options={{
          title: "Search",
          tabBarIcon: ({ color }) => <Search size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color }) => <User size={24} color={color} />,
          href: "/(tabs)/profile"
        }}
      />
    </Tabs>
  );
}

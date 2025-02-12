import { render, fireEvent, waitFor } from "@testing-library/react-native";
import { useRouter } from "expo-router";
import React from "react";
import Toast from "react-native-toast-message";

import SearchScreen from "@/app/(tabs)/search";
import { useAuth } from "@/hooks/useAuth";
import { useSupabase } from "@/hooks/useSupabase";

// Mock the hooks
jest.mock("expo-router", () => ({
  useRouter: jest.fn(),
}));

jest.mock("@/hooks/useSupabase", () => ({
  useSupabase: jest.fn(),
}));

jest.mock("@/hooks/useAuth", () => ({
  useAuth: jest.fn(),
}));

jest.mock("react-native-toast-message", () => ({
  show: jest.fn(),
}));

// Mock data
const mockUser = {
  id: "123",
  user_metadata: { name: "Test User" },
};

const mockProfiles = [
  {
    id: "456",
    name: "John Doe",
    username: "johndoe",
    avatar_url: "https://example.com/avatar1.jpg",
  },
  {
    id: "789",
    name: "Jane Smith",
    username: "janesmith",
    avatar_url: "https://example.com/avatar2.jpg",
  },
];

describe("Friend Management", () => {
  beforeEach(() => {
    const mockRouter = {
      push: jest.fn(),
    };
    (useRouter as jest.Mock).mockReturnValue(mockRouter);
    (useAuth as jest.Mock).mockReturnValue({ user: mockUser });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test("searches for users correctly", async () => {
    const mockSupabase = {
      from: jest.fn(() => ({
        select: jest.fn(() => ({
          or: jest.fn(() => Promise.resolve({ data: mockProfiles })),
        })),
      })),
    };
    (useSupabase as jest.Mock).mockReturnValue({ supabase: mockSupabase });

    const { getByPlaceholderText, getAllByTestId } = render(<SearchScreen />);

    // Switch to friends tab
    const friendsTab = getByTestId("friends-tab");
    fireEvent.press(friendsTab);

    const searchInput = getByPlaceholderText("Search name or handle");
    fireEvent.changeText(searchInput, "john");

    await waitFor(() => {
      const searchResults = getAllByTestId("friend-item");
      expect(searchResults).toHaveLength(mockProfiles.length);
      expect(mockSupabase.from).toHaveBeenCalledWith("profiles");
      expect(mockSupabase.from().select().or).toHaveBeenCalledWith(
        "username.ilike.john%,name.ilike.john%",
      );
    });
  });

  test("follows a user successfully", async () => {
    const mockSupabase = {
      from: jest.fn(() => ({
        select: jest.fn(() => ({
          or: jest.fn(() => Promise.resolve({ data: mockProfiles })),
        })),
        insert: jest.fn(() => Promise.resolve({ error: null })),
      })),
    };
    (useSupabase as jest.Mock).mockReturnValue({ supabase: mockSupabase });

    const { getAllByTestId } = render(<SearchScreen />);

    await waitFor(() => {
      const followButtons = getAllByTestId("follow-button");
      fireEvent.press(followButtons[0]);

      expect(mockSupabase.from).toHaveBeenCalledWith("friendships");
      expect(mockSupabase.from().insert).toHaveBeenCalledWith({
        user_id: mockUser.id,
        friend_id: mockProfiles[0].id,
      });
    });
  });

  test("unfollows a user successfully", async () => {
    const mockSupabase = {
      from: jest.fn(() => ({
        select: jest.fn(() => ({
          or: jest.fn(() => Promise.resolve({ data: mockProfiles })),
        })),
        delete: jest.fn(() => Promise.resolve({ error: null })),
      })),
    };
    (useSupabase as jest.Mock).mockReturnValue({ supabase: mockSupabase });

    const { getAllByTestId } = render(<SearchScreen />);

    await waitFor(() => {
      const unfollowButtons = getAllByTestId("unfollow-button");
      fireEvent.press(unfollowButtons[0]);

      expect(mockSupabase.from).toHaveBeenCalledWith("friendships");
      expect(mockSupabase.from().delete)
        .toHaveBeenCalledWith()
        .eq("user_id", mockUser.id)
        .eq("friend_id", mockProfiles[0].id);
    });
  });

  test("handles follow error", async () => {
    const mockSupabase = {
      from: jest.fn(() => ({
        insert: jest.fn(() =>
          Promise.resolve({ error: new Error("Failed to follow") }),
        ),
      })),
    };
    (useSupabase as jest.Mock).mockReturnValue({ supabase: mockSupabase });

    const { getAllByTestId } = render(<SearchScreen />);

    await waitFor(() => {
      const followButtons = getAllByTestId("follow-button");
      fireEvent.press(followButtons[0]);

      expect(Toast.show).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "error",
          text1: "Failed to follow user",
        }),
      );
    });
  });

  test("saves recent search when viewing profile", async () => {
    const mockSupabase = {
      from: jest.fn(() => ({
        insert: jest.fn(() => Promise.resolve({ error: null })),
      })),
    };
    (useSupabase as jest.Mock).mockReturnValue({ supabase: mockSupabase });

    const { getAllByTestId } = render(<SearchScreen />);

    await waitFor(() => {
      const profileButtons = getAllByTestId("profile-button");
      fireEvent.press(profileButtons[0]);

      expect(mockSupabase.from).toHaveBeenCalledWith("recent_searches");
      expect(mockSupabase.from().insert).toHaveBeenCalledWith({
        user_id: mockUser.id,
        searched_profile_id: mockProfiles[0].id,
      });
      expect(useRouter().push).toHaveBeenCalledWith(
        `/profile/${mockProfiles[0].id}`,
      );
    });
  });
});

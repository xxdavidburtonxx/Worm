import { render, waitFor } from "@testing-library/react-native";
import { useLocalSearchParams } from "expo-router";
import React from "react";

import ProfileScreen from "@/app/(tabs)/profile/[id]";
import { useAuth } from "@/hooks/useAuth";
import { useSupabase } from "@/hooks/useSupabase";

jest.mock("expo-router", () => ({
  useLocalSearchParams: jest.fn(),
}));

jest.mock("@/hooks/useSupabase", () => ({
  useSupabase: jest.fn(),
}));

jest.mock("@/hooks/useAuth", () => ({
  useAuth: jest.fn(),
}));

const mockProfile = {
  id: "456",
  name: "John Doe",
  username: "johndoe",
  avatar_url: "https://example.com/avatar.jpg",
  bio: "Book lover",
};

const mockBooks = [
  {
    id: 1,
    book_id: "1",
    rating: 4,
    review: "Great book!",
    status: "READ",
    created_at: new Date().toISOString(),
    book: {
      title: "Test Book 1",
      author: "Author 1",
      cover_url: "https://example.com/cover1.jpg",
    },
  },
];

describe("ProfileScreen", () => {
  beforeEach(() => {
    (useLocalSearchParams as jest.Mock).mockReturnValue({ id: "456" });
    (useAuth as jest.Mock).mockReturnValue({ user: { id: "123" } });
  });

  test("renders profile information correctly", async () => {
    const mockSupabase = {
      from: jest.fn(() => ({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            single: jest.fn().mockResolvedValue({ data: mockProfile }),
          })),
        })),
      })),
    };
    (useSupabase as jest.Mock).mockReturnValue({ supabase: mockSupabase });

    const { getByText, getByTestId } = render(<ProfileScreen />);

    await waitFor(() => {
      expect(getByText(mockProfile.name)).toBeTruthy();
      expect(getByText(`@${mockProfile.username}`)).toBeTruthy();
      expect(getByText(mockProfile.bio)).toBeTruthy();
      expect(getByTestId("profile-avatar")).toBeTruthy();
    });
  });

  test("displays user books correctly", async () => {
    const mockSupabase = {
      from: jest.fn(() => ({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            order: jest.fn().mockResolvedValue({ data: mockBooks }),
          })),
        })),
      })),
    };
    (useSupabase as jest.Mock).mockReturnValue({ supabase: mockSupabase });

    const { getAllByTestId } = render(<ProfileScreen />);

    await waitFor(() => {
      const bookItems = getAllByTestId("book-item");
      expect(bookItems).toHaveLength(mockBooks.length);
    });
  });

  test("shows follow status correctly", async () => {
    const mockSupabase = {
      from: jest.fn(() => ({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            single: jest.fn().mockResolvedValue({ data: { exists: true } }),
          })),
        })),
      })),
    };
    (useSupabase as jest.Mock).mockReturnValue({ supabase: mockSupabase });

    const { getByText } = render(<ProfileScreen />);

    await waitFor(() => {
      expect(getByText("Following")).toBeTruthy();
    });
  });

  test("displays reading stats correctly", async () => {
    const mockStats = {
      books_read: 42,
      avg_rating: 4.2,
      favorite_genre: "Fiction",
    };

    const mockSupabase = {
      from: jest.fn(() => ({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            single: jest.fn().mockResolvedValue({ data: mockStats }),
          })),
        })),
      })),
    };
    (useSupabase as jest.Mock).mockReturnValue({ supabase: mockSupabase });

    const { getByText } = render(<ProfileScreen />);

    await waitFor(() => {
      expect(getByText("42")).toBeTruthy();
      expect(getByText("4.2★")).toBeTruthy();
      expect(getByText("Fiction")).toBeTruthy();
    });
  });

  test("handles loading state", () => {
    const { getByTestId } = render(<ProfileScreen />);
    expect(getByTestId("loading-indicator")).toBeTruthy();
  });

  test("handles error state", async () => {
    const mockSupabase = {
      from: jest.fn(() => ({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            single: jest.fn().mockRejectedValue(new Error("Failed to fetch")),
          })),
        })),
      })),
    };
    (useSupabase as jest.Mock).mockReturnValue({ supabase: mockSupabase });

    const { getByText } = render(<ProfileScreen />);

    await waitFor(() => {
      expect(getByText("Failed to load profile")).toBeTruthy();
    });
  });
});

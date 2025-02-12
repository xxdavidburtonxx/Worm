import { render, fireEvent, waitFor } from "@testing-library/react-native";
import { useRouter } from "expo-router";
import React from "react";
import Toast from "react-native-toast-message";

import { FeedCard } from "@/components/FeedCard";
import { useAuth } from "@/hooks/useAuth";
import { useSupabase } from "@/hooks/useSupabase";
import { FeedItem } from "@/components/types";

// Mock the hooks and dependencies
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
  user_metadata: {
    name: "Test User",
  },
};

const mockFeedItem: FeedItem = {
  id: 1,
  user_id: "123",
  book_id: 1,
  status: "READ" as const,
  rating: 4,
  review: "Great book!",
  created_at: new Date().toISOString(),
  user: {
    name: "Test User",
    avatar_url: "https://example.com/avatar.jpg",
  },
  book: {
    title: "Test Book",
    author: "Test Author",
    cover_url: "https://example.com/cover.jpg",
    category: "Fiction",
  },
  likes_count: 5,
  comments_count: 2,
  has_liked: false,
  has_added: false,
};

describe("FeedCard", () => {
  const mockRefresh = jest.fn();

  beforeEach(() => {
    const mockRouter = {
      push: jest.fn(),
    };
    (useRouter as jest.Mock).mockReturnValue(mockRouter);

    const mockSupabase = {
      from: jest.fn(() => ({
        insert: jest.fn().mockResolvedValue({ error: null }),
        delete: jest.fn().mockResolvedValue({ error: null }),
      })),
    };
    (useSupabase as jest.Mock).mockReturnValue({ supabase: mockSupabase });

    (useAuth as jest.Mock).mockReturnValue({ user: mockUser });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test("renders feed item correctly", () => {
    const { getByText, getByTestId } = render(
      <FeedCard item={mockFeedItem} onRefresh={mockRefresh} />,
    );

    expect(getByText(mockFeedItem.book.title)).toBeTruthy();
    expect(getByText(mockFeedItem.book.author)).toBeTruthy();
    expect(getByText(mockFeedItem.user.name)).toBeTruthy();
    expect(getByTestId("feed-card")).toBeTruthy();
  });

  test("handles like interaction", async () => {
    const { getByTestId } = render(
      <FeedCard item={mockFeedItem} onRefresh={mockRefresh} />,
    );

    const likeButton = getByTestId("like-button");
    fireEvent.press(likeButton);

    await waitFor(() => {
      expect(useSupabase().supabase.from).toHaveBeenCalledWith("likes");
    });
  });

  test("handles unlike interaction", async () => {
    const likedItem = { ...mockFeedItem, has_liked: true };
    const { getByTestId } = render(
      <FeedCard item={likedItem} onRefresh={mockRefresh} />,
    );

    const likeButton = getByTestId("like-button");
    fireEvent.press(likeButton);

    await waitFor(() => {
      expect(useSupabase().supabase.from).toHaveBeenCalledWith("likes");
    });
  });

  test("navigates to comments screen", () => {
    const { getByTestId } = render(
      <FeedCard item={mockFeedItem} onRefresh={mockRefresh} />,
    );

    const commentButton = getByTestId("comment-button");
    fireEvent.press(commentButton);

    expect(useRouter().push).toHaveBeenCalledWith(
      `/feed/comments/${mockFeedItem.id}`,
    );
  });

  test("handles bookmark interaction", async () => {
    const { getByTestId } = render(
      <FeedCard item={mockFeedItem} onRefresh={mockRefresh} />,
    );

    const bookmarkButton = getByTestId("bookmark-button");
    fireEvent.press(bookmarkButton);

    await waitFor(() => {
      expect(useSupabase().supabase.from).toHaveBeenCalledWith("user_books");
      expect(Toast.show).toHaveBeenCalled();
    });
  });

  test("shows rating modal", async () => {
    const { getByTestId, queryByTestId } = render(
      <FeedCard item={mockFeedItem} onRefresh={mockRefresh} />,
    );

    expect(queryByTestId("rating-modal")).toBeNull();

    const rateButton = getByTestId("rate-button");
    fireEvent.press(rateButton);

    await waitFor(() => {
      expect(queryByTestId("rating-modal")).toBeTruthy();
    });
  });

  test("displays correct like count", () => {
    const { getByText } = render(
      <FeedCard item={mockFeedItem} onRefresh={mockRefresh} />,
    );

    expect(getByText(`${mockFeedItem.likes_count}`)).toBeTruthy();
  });

  test("displays correct comment count", () => {
    const { getByText } = render(
      <FeedCard item={mockFeedItem} onRefresh={mockRefresh} />,
    );

    expect(getByText(`${mockFeedItem.comments_count}`)).toBeTruthy();
  });

  test("handles error in like interaction", async () => {
    const mockSupabase = {
      from: jest.fn(() => ({
        insert: jest
          .fn()
          .mockResolvedValue({ error: new Error("Failed to like") }),
      })),
    };
    (useSupabase as jest.Mock).mockReturnValue({ supabase: mockSupabase });

    const { getByTestId } = render(
      <FeedCard item={mockFeedItem} onRefresh={mockRefresh} />,
    );

    const likeButton = getByTestId("like-button");
    fireEvent.press(likeButton);

    await waitFor(() => {
      expect(Toast.show).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "error",
        }),
      );
    });
  });

  test("handles user profile navigation", () => {
    const { getByTestId } = render(
      <FeedCard item={mockFeedItem} onRefresh={mockRefresh} />,
    );

    const profileButton = getByTestId("profile-button");
    fireEvent.press(profileButton);

    expect(useRouter().push).toHaveBeenCalledWith(
      `/profile/${mockFeedItem.user_id}`,
    );
  });

  test("handles book navigation", () => {
    const { getByTestId } = render(
      <FeedCard item={mockFeedItem} onRefresh={mockRefresh} />,
    );

    const bookButton = getByTestId("book-button");
    fireEvent.press(bookButton);

    expect(useRouter().push).toHaveBeenCalledWith(
      `/book/${mockFeedItem.book_id}`,
    );
  });
});

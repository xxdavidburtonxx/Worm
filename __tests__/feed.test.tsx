import { render, fireEvent, waitFor, act } from "@testing-library/react-native";
import { useRouter } from "expo-router";
import React from "react";

import FeedScreen from "@/app/(tabs)";
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

// Mock data
const mockUser = {
  id: "123",
  user_metadata: {
    name: "Test User",
  },
};

const mockFeedItems = [
  {
    id: 1,
    user_id: "123",
    book_id: "1",
    status: "READ",
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
  },
];

describe("FeedScreen", () => {
  // Setup mocks before each test
  beforeEach(() => {
    const mockRouter = {
      push: jest.fn(),
    };
    (useRouter as jest.Mock).mockReturnValue(mockRouter);

    const mockSupabase = {
      from: jest.fn(() => ({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            order: jest.fn(() => ({
              limit: jest.fn().mockResolvedValue({ data: mockFeedItems }),
            })),
          })),
        })),
      })),
    };
    (useSupabase as jest.Mock).mockReturnValue({ supabase: mockSupabase });

    (useAuth as jest.Mock).mockReturnValue({ user: mockUser });
  });

  // Clear mocks after each test
  afterEach(() => {
    jest.clearAllMocks();
  });

  test("renders search bar", () => {
    const { getByPlaceholderText } = render(<FeedScreen />);
    expect(getByPlaceholderText("Search for books or members")).toBeTruthy();
  });

  test("renders feed items", async () => {
    const { getByText, getAllByTestId } = render(<FeedScreen />);

    await waitFor(() => {
      expect(getByText("Test Book")).toBeTruthy();
      expect(getByText("Test Author")).toBeTruthy();
      const feedCards = getAllByTestId("feed-card");
      expect(feedCards).toHaveLength(mockFeedItems.length);
    });
  });

  test("handles empty feed state", async () => {
    const mockSupabase = {
      from: jest.fn(() => ({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            order: jest.fn(() => ({
              limit: jest.fn().mockResolvedValue({ data: [] }),
            })),
          })),
        })),
      })),
    };
    (useSupabase as jest.Mock).mockReturnValue({ supabase: mockSupabase });

    const { getByText } = render(<FeedScreen />);

    await waitFor(() => {
      expect(getByText(/Add friends to see their activity/)).toBeTruthy();
    });
  });

  test("handles like interaction", async () => {
    const mockSupabase = {
      from: jest.fn(() => ({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            order: jest.fn(() => ({
              limit: jest.fn().mockResolvedValue({ data: mockFeedItems }),
            })),
          })),
        })),
        insert: jest.fn().mockResolvedValue({ error: null }),
        delete: jest.fn().mockResolvedValue({ error: null }),
      })),
    };
    (useSupabase as jest.Mock).mockReturnValue({ supabase: mockSupabase });

    const { getAllByTestId } = render(<FeedScreen />);

    await waitFor(() => {
      const likeButtons = getAllByTestId("like-button");
      fireEvent.press(likeButtons[0]);
    });

    expect(mockSupabase.from).toHaveBeenCalledWith("likes");
  });

  test("handles comment navigation", async () => {
    const mockRouter = {
      push: jest.fn(),
    };
    (useRouter as jest.Mock).mockReturnValue(mockRouter);

    const { getAllByTestId } = render(<FeedScreen />);

    await waitFor(() => {
      const commentButtons = getAllByTestId("comment-button");
      fireEvent.press(commentButtons[0]);
    });

    expect(mockRouter.push).toHaveBeenCalledWith(
      `/feed/comments/${mockFeedItems[0].id}`,
    );
  });

  test("handles pull to refresh", async () => {
    const { getByTestId } = render(<FeedScreen />);

    await waitFor(() => {
      const flatList = getByTestId("feed-list");
      fireEvent.scroll(flatList, {
        nativeEvent: {
          contentOffset: { y: -100 },
          contentSize: { height: 500, width: 100 },
          layoutMeasurement: { height: 100, width: 100 },
        },
      });
    });

    // Verify that the feed was refreshed
    expect(useSupabase().supabase.from).toHaveBeenCalledTimes(2);
  });

  test("handles infinite scroll", async () => {
    const { getByTestId } = render(<FeedScreen />);

    await waitFor(() => {
      const flatList = getByTestId("feed-list");
      fireEvent.scroll(flatList, {
        nativeEvent: {
          contentOffset: { y: 500 },
          contentSize: { height: 500, width: 100 },
          layoutMeasurement: { height: 100, width: 100 },
        },
      });
    });

    // Verify that more items were loaded
    expect(useSupabase().supabase.from).toHaveBeenCalledTimes(2);
  });
});

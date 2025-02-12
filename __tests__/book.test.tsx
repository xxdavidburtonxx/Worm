import { render, fireEvent, waitFor } from "@testing-library/react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import React from "react";

import BookScreen from "@/app/book/[id]";
import { useAuth } from "@/hooks/useAuth";
import { useSupabase } from "@/hooks/useSupabase";

// Mock the hooks
jest.mock("expo-router", () => ({
  useRouter: jest.fn(),
  useLocalSearchParams: jest.fn(),
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

const mockBook = {
  id: "1",
  title: "Test Book",
  author: "Test Author",
  cover_url: "https://example.com/cover.jpg",
  category: "Fiction",
  description: "A great book about testing",
  published_date: "2024",
};

const mockUserRating = {
  id: 1,
  user_id: "123",
  book_id: "1",
  rating: 4,
  review: "My test review",
  status: "READ",
};

const mockReviews = [
  {
    id: 1,
    user_id: "123",
    book_id: "1",
    rating: 4,
    review: "My test review",
    user: {
      name: "Test User",
      avatar_url: "https://example.com/avatar.jpg",
    },
  },
  {
    id: 2,
    user_id: "456",
    book_id: "1",
    rating: 5,
    review: "Another review",
    user: {
      name: "Other User",
      avatar_url: "https://example.com/avatar2.jpg",
    },
  },
];

describe("BookScreen", () => {
  beforeEach(() => {
    (useLocalSearchParams as jest.Mock).mockReturnValue({ id: "1" });
    (useRouter as jest.Mock).mockReturnValue({ push: jest.fn() });
    (useAuth as jest.Mock).mockReturnValue({ user: mockUser });

    const mockSupabase = {
      from: jest.fn(() => ({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            single: jest.fn().mockResolvedValue({ data: mockBook }),
          })),
          order: jest.fn().mockResolvedValue({ data: mockReviews }),
        })),
      })),
      rpc: jest.fn(() => ({
        single: jest.fn().mockResolvedValue({ data: 4.5 }),
      })),
    };
    (useSupabase as jest.Mock).mockReturnValue({ supabase: mockSupabase });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test("renders book details correctly", async () => {
    const { getByText, getByTestId } = render(<BookScreen />);

    await waitFor(() => {
      expect(getByText(mockBook.title)).toBeTruthy();
      expect(getByText(mockBook.author)).toBeTruthy();
      expect(getByTestId("book-cover")).toBeTruthy();
    });
  });

  test("displays user rating correctly", async () => {
    const { getByText } = render(<BookScreen />);

    await waitFor(() => {
      expect(getByText("Your Rating")).toBeTruthy();
      expect(getByText("4.0")).toBeTruthy();
    });
  });

  test("displays community rating with correct color", async () => {
    const { getByText, getByTestId } = render(<BookScreen />);

    await waitFor(() => {
      const rating = getByTestId("community-rating");
      expect(rating).toBeTruthy();
      expect(rating).toHaveStyle({ color: "#34C759" }); // Green for high rating
      expect(getByText("4.5")).toBeTruthy();
    });
  });

  test("displays reviews in correct order", async () => {
    const { getAllByTestId } = render(<BookScreen />);

    await waitFor(() => {
      const reviews = getAllByTestId("review-card");
      expect(reviews).toHaveLength(mockReviews.length);
      // User's review should be first
      expect(reviews[0]).toHaveStyle({ backgroundColor: "#F0F8FF" });
    });
  });

  test("handles no reviews state", async () => {
    const mockSupabaseEmpty = {
      from: jest.fn(() => ({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            single: jest.fn().mockResolvedValue({ data: mockBook }),
          })),
          order: jest.fn().mockResolvedValue({ data: [] }),
        })),
      })),
      rpc: jest.fn(() => ({
        single: jest.fn().mockResolvedValue({ data: null }),
      })),
    };
    (useSupabase as jest.Mock).mockReturnValue({ supabase: mockSupabaseEmpty });

    const { getByText } = render(<BookScreen />);

    await waitFor(() => {
      expect(getByText("No reviews yet")).toBeTruthy();
    });
  });

  test("handles loading state", () => {
    const { getByTestId } = render(<BookScreen />);
    expect(getByTestId("loading-indicator")).toBeTruthy();
  });

  test("handles error state", async () => {
    const mockSupabaseError = {
      from: jest.fn(() => ({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            single: jest.fn().mockRejectedValue(new Error("Failed to fetch")),
          })),
        })),
      })),
    };
    (useSupabase as jest.Mock).mockReturnValue({ supabase: mockSupabaseError });

    const { getByText } = render(<BookScreen />);

    await waitFor(() => {
      expect(getByText("Failed to load book details")).toBeTruthy();
    });
  });

  test("displays correct rating category indicator", async () => {
    const { getByTestId } = render(<BookScreen />);

    await waitFor(() => {
      const ratingIndicator = getByTestId("rating-category");
      expect(ratingIndicator).toHaveTextContent("LOVED");
      expect(ratingIndicator).toHaveStyle({ color: "#34C759" });
    });
  });

  test("handles image loading error", async () => {
    const { getByTestId } = render(<BookScreen />);

    const coverImage = getByTestId("book-cover");
    fireEvent(coverImage, "error");

    await waitFor(() => {
      expect(coverImage.props.source.uri).toBe(
        "https://via.placeholder.com/200x300",
      );
    });
  });

  test("displays review dates correctly", async () => {
    const { getAllByTestId } = render(<BookScreen />);

    await waitFor(() => {
      const reviewDates = getAllByTestId("review-date");
      expect(reviewDates[0]).toBeTruthy();
      // Test the date formatting
      expect(reviewDates[0]).toHaveTextContent(/ago$/);
    });
  });

  test("handles user interaction with reviews", async () => {
    const { getAllByTestId } = render(<BookScreen />);

    await waitFor(() => {
      const reviewerProfiles = getAllByTestId("reviewer-profile");
      fireEvent.press(reviewerProfiles[1]); // Press the second review (not user's)
      expect(useRouter().push).toHaveBeenCalledWith("/profile/456");
    });
  });
});

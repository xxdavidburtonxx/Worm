import { render, fireEvent, waitFor } from "@testing-library/react-native";
import React from "react";
import Toast from "react-native-toast-message";

import BookRatingModal from "@/components/BookRatingModal";
import { useAuth } from "@/hooks/useAuth";
import { useSupabase } from "@/hooks/useSupabase";

// Mock the hooks
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

const mockBook = {
  id: "1",
  volumeInfo: {
    title: "Test Book",
    authors: ["Test Author"],
    imageLinks: { thumbnail: "https://example.com/cover.jpg" },
    categories: ["Fiction"],
  },
};

const mockComparisonBooks = [
  {
    id: "2",
    rating: 5,
    title: "High Rated Book",
    author: "Author 1",
    cover_url: "https://example.com/cover2.jpg",
  },
  {
    id: "3",
    rating: 2,
    title: "Low Rated Book",
    author: "Author 2",
    cover_url: "https://example.com/cover3.jpg",
  },
];

describe("BookRatingModal", () => {
  beforeEach(() => {
    const mockSupabase = {
      from: jest.fn(() => ({
        select: jest.fn().mockReturnThis(),
        insert: jest.fn().mockReturnThis(),
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: null }),
      })),
    };
    (useSupabase as jest.Mock).mockReturnValue({ supabase: mockSupabase });
    (useAuth as jest.Mock).mockReturnValue({ user: mockUser });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test("renders comparison books correctly", async () => {
    const mockProps = {
      book: mockBook,
      isVisible: true,
      onClose: () => {},
      source: "search" as const,
    };

    const { getByTestId, getByText } = render(<BookRatingModal {...mockProps} />);

    await waitFor(() => {
      expect(getByTestId("left-book-cover")).toBeTruthy();
      expect(getByTestId("right-book-cover")).toBeTruthy();
      expect(getByText(mockComparisonBooks[0].title)).toBeTruthy();
      expect(getByText(mockComparisonBooks[1].title)).toBeTruthy();
    });
  });

  test('handles "Loved It" rating', async () => {
    const mockProps = {
      book: mockBook,
      isVisible: true,
      onClose: () => {},
      source: "search" as const,
    };

    const { getByTestId } = render(<BookRatingModal {...mockProps} />);

    await waitFor(() => {
      const leftButton = getByTestId("left-book-button");
      fireEvent.press(leftButton);
    });

    expect(useSupabase().supabase.from).toHaveBeenCalledWith("user_books");
    expect(Toast.show).toHaveBeenCalledWith(
      expect.objectContaining({
        text1: "Rating saved!",
        text2: expect.stringContaining("LOVED"),
      }),
    );
  });

  test('handles "Hated It" rating', async () => {
    const mockProps = {
      book: mockBook,
      isVisible: true,
      onClose: () => {},
      source: "search" as const,
    };

    const { getByTestId } = render(<BookRatingModal {...mockProps} />);

    await waitFor(() => {
      const rightButton = getByTestId("right-book-button");
      fireEvent.press(rightButton);
    });

    expect(useSupabase().supabase.from).toHaveBeenCalledWith("user_books");
    expect(Toast.show).toHaveBeenCalledWith(
      expect.objectContaining({
        text1: "Rating saved!",
        text2: expect.stringContaining("HATED"),
      }),
    );
  });

  test('handles "Too Tough" choice', async () => {
    const mockProps = {
      book: mockBook,
      isVisible: true,
      onClose: () => {},
      source: "search" as const,
    };

    const { getByTestId } = render(<BookRatingModal {...mockProps} />);

    await waitFor(() => {
      const tooToughButton = getByTestId("too-tough-button");
      fireEvent.press(tooToughButton);
    });

    // Should calculate middle rating between comparison books
    const expectedRating =
      (mockComparisonBooks[0].rating + mockComparisonBooks[1].rating) / 2;
    expect(useSupabase().supabase.from).toHaveBeenCalledWith("user_books");
    expect(useSupabase().supabase.from().insert).toHaveBeenCalledWith(
      expect.objectContaining({
        rating: expectedRating,
      }),
    );
  });

  test("handles undo action", async () => {
    const mockProps = {
      book: mockBook,
      isVisible: true,
      onClose: () => {},
      source: "search" as const,
    };

    const { getByTestId } = render(<BookRatingModal {...mockProps} />);

    await waitFor(() => {
      const leftButton = getByTestId("left-book-button");
      fireEvent.press(leftButton);
    });

    const undoButton = getByTestId("undo-button");
    fireEvent.press(undoButton);

    // Should show new comparison books
    expect(useSupabase().supabase.from().select).toHaveBeenCalledTimes(2);
  });

  test("calculates correct rating for middle choice", async () => {
    const mockProps = {
      book: mockBook,
      isVisible: true,
      onClose: () => {},
      source: "search" as const,
    };

    const { getByTestId } = render(<BookRatingModal {...mockProps} />);

    await waitFor(() => {
      const tooToughButton = getByTestId("too-tough-button");
      fireEvent.press(tooToughButton);
    });

    const expectedRating = 3.5; // (5 + 2) / 2
    expect(useSupabase().supabase.from().insert).toHaveBeenCalledWith(
      expect.objectContaining({
        rating: expectedRating,
      }),
    );
  });

  test("updates existing rating", async () => {
    const mockExistingRating = {
      id: 1,
      rating: 3,
      user_id: "123",
      book_id: "1",
    };

    const mockSupabase = {
      from: jest.fn(() => ({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            single: jest.fn().mockResolvedValue({ data: mockExistingRating }),
          })),
        })),
        update: jest.fn().mockResolvedValue({ error: null }),
      })),
    };
    (useSupabase as jest.Mock).mockReturnValue({ supabase: mockSupabase });

    const mockProps = {
      book: mockBook,
      isVisible: true,
      onClose: () => {},
      source: "search" as const,
    };

    const { getByTestId } = render(<BookRatingModal {...mockProps} />);

    await waitFor(() => {
      const leftButton = getByTestId("left-book-button");
      fireEvent.press(leftButton);
    });

    expect(useSupabase().supabase.from().update).toHaveBeenCalled();
  });

  test("handles loading state for comparison books", () => {
    const mockProps = {
      book: mockBook,
      isVisible: true,
      onClose: () => {},
      source: "search" as const,
    };

    const { getByTestId } = render(<BookRatingModal {...mockProps} />);

    expect(getByTestId("loading-indicator")).toBeTruthy();
  });

  test("displays correct sentiment colors", async () => {
    const mockProps = {
      book: mockBook,
      isVisible: true,
      onClose: () => {},
      source: "search" as const,
    };

    const { getByTestId } = render(<BookRatingModal {...mockProps} />);

    await waitFor(() => {
      const leftButton = getByTestId("left-book-button");
      fireEvent.press(leftButton);

      const sentiment = getByTestId("rating-sentiment");
      expect(sentiment).toHaveStyle({ color: "#34C759" }); // Green for LOVED
    });
  });

  test("handles error in rating submission", async () => {
    const mockSupabase = {
      from: jest.fn(() => ({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            order: jest.fn().mockResolvedValue({ data: mockComparisonBooks }),
          })),
        })),
        insert: jest.fn().mockRejectedValue(new Error("Failed to save rating")),
      })),
    };
    (useSupabase as jest.Mock).mockReturnValue({ supabase: mockSupabase });

    const mockProps = {
      book: mockBook,
      isVisible: true,
      onClose: () => {},
      source: "search" as const,
    };

    const { getByTestId } = render(<BookRatingModal {...mockProps} />);

    await waitFor(() => {
      const leftButton = getByTestId("left-book-button");
      fireEvent.press(leftButton);
    });

    expect(Toast.show).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "error",
        text1: "Failed to save rating",
      }),
    );
  });
});

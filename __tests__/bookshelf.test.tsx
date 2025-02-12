import { render, fireEvent, waitFor } from "@testing-library/react-native";
import { useRouter } from "expo-router";
import React from "react";

import BookshelfScreen from "@/app/(tabs)/bookshelf";
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

const mockBooks = [
  {
    id: 1,
    user_id: "123",
    book_id: "1",
    status: "READ",
    rating: 4,
    created_at: new Date().toISOString(),
    book: {
      id: "1",
      title: "Test Book 1",
      author: "Author 1",
      cover_url: "https://example.com/cover1.jpg",
      category: "Fiction",
    },
  },
  {
    id: 2,
    user_id: "123",
    book_id: "2",
    status: "WANT_TO_READ",
    created_at: new Date().toISOString(),
    book: {
      id: "2",
      title: "Test Book 2",
      author: "Author 2",
      cover_url: "https://example.com/cover2.jpg",
      category: "Non-Fiction",
    },
  },
];

describe("BookshelfScreen", () => {
  beforeEach(() => {
    const mockRouter = {
      push: jest.fn(),
    };
    (useRouter as jest.Mock).mockReturnValue(mockRouter);

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

    (useAuth as jest.Mock).mockReturnValue({ user: mockUser });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test("renders tab buttons", () => {
    const { getByText } = render(<BookshelfScreen />);
    expect(getByText("Read")).toBeTruthy();
    expect(getByText("Want to Read")).toBeTruthy();
  });

  test("switches between tabs", async () => {
    const { getByText } = render(<BookshelfScreen />);

    const wantToReadTab = getByText("Want to Read");
    fireEvent.press(wantToReadTab);

    await waitFor(() => {
      expect(useSupabase().supabase.from).toHaveBeenCalledWith("user_books");
      expect(useSupabase().supabase.from().select().eq).toHaveBeenCalledWith(
        "status",
        "WANT_TO_READ",
      );
    });
  });

  test("toggles between grid and list view", () => {
    const { getByTestId } = render(<BookshelfScreen />);

    const viewToggle = getByTestId("view-toggle");
    fireEvent.press(viewToggle);

    const bookList = getByTestId("book-list");
    expect(bookList.props.numColumns).toBe(2);
  });

  test("filters books by search query", async () => {
    const { getByPlaceholderText } = render(<BookshelfScreen />);

    const searchInput = getByPlaceholderText("Search your books...");
    fireEvent.changeText(searchInput, "Test Book 1");

    await waitFor(() => {
      expect(useSupabase().supabase.from).toHaveBeenCalled();
    });
  });

  test("filters books by category", async () => {
    const { getByTestId, getByText } = render(<BookshelfScreen />);

    const filterButton = getByTestId("category-filter");
    fireEvent.press(filterButton);

    const fictionCategory = getByText("Fiction");
    fireEvent.press(fictionCategory);

    await waitFor(() => {
      expect(useSupabase().supabase.from).toHaveBeenCalled();
    });
  });

  test("navigates to book details", () => {
    const { getAllByTestId } = render(<BookshelfScreen />);

    const bookCards = getAllByTestId("book-card");
    fireEvent.press(bookCards[0]);

    expect(useRouter().push).toHaveBeenCalledWith("/book/1");
  });

  test("displays ratings for read books", async () => {
    const { getByText } = render(<BookshelfScreen />);

    await waitFor(() => {
      expect(getByText("4.0")).toBeTruthy();
    });
  });

  test("handles empty state", async () => {
    const mockSupabase = {
      from: jest.fn(() => ({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            order: jest.fn().mockResolvedValue({ data: [] }),
          })),
        })),
      })),
    };
    (useSupabase as jest.Mock).mockReturnValue({ supabase: mockSupabase });

    const { getByText } = render(<BookshelfScreen />);

    await waitFor(() => {
      expect(getByText("You haven't rated any books yet")).toBeTruthy();
    });
  });

  test("handles loading state", async () => {
    const { getByTestId } = render(<BookshelfScreen />);
    expect(getByTestId("loading-indicator")).toBeTruthy();
  });

  test("handles pull to refresh", async () => {
    const { getByTestId } = render(<BookshelfScreen />);

    const bookList = getByTestId("book-list");
    fireEvent.scroll(bookList, {
      nativeEvent: {
        contentOffset: { y: -100 },
        contentSize: { height: 500, width: 100 },
        layoutMeasurement: { height: 100, width: 100 },
      },
    });

    await waitFor(() => {
      expect(useSupabase().supabase.from).toHaveBeenCalledTimes(2);
    });
  });

  test("sorts books correctly", async () => {
    const { getByTestId, getByText } = render(<BookshelfScreen />);

    const sortButton = getByTestId("sort-button");
    fireEvent.press(sortButton);

    const titleSort = getByText("Title (A-Z)");
    fireEvent.press(titleSort);

    await waitFor(() => {
      expect(useSupabase().supabase.from).toHaveBeenCalled();
    });
  });

  test("handles error state", async () => {
    const mockSupabase = {
      from: jest.fn(() => ({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            order: jest.fn().mockRejectedValue(new Error("Failed to fetch")),
          })),
        })),
      })),
    };
    (useSupabase as jest.Mock).mockReturnValue({ supabase: mockSupabase });

    const { getByText } = render(<BookshelfScreen />);

    await waitFor(() => {
      expect(getByText("Failed to load books")).toBeTruthy();
    });
  });
});

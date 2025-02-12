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
  user_metadata: {
    name: "Test User",
  },
};

const mockSearchResults = [
  {
    id: "book1",
    volumeInfo: {
      title: "Test Book 1",
      authors: ["Author 1"],
      imageLinks: {
        thumbnail: "https://example.com/cover1.jpg",
      },
      categories: ["Fiction"],
    },
  },
  {
    id: "book2",
    volumeInfo: {
      title: "Test Book 2",
      authors: ["Author 2"],
      imageLinks: {
        thumbnail: "https://example.com/cover2.jpg",
      },
      categories: ["Non-Fiction"],
    },
  },
];

describe("SearchScreen", () => {
  beforeEach(() => {
    const mockRouter = {
      push: jest.fn(),
    };
    (useRouter as jest.Mock).mockReturnValue(mockRouter);

    const mockSupabase = {
      from: jest.fn(() => ({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            single: jest.fn().mockResolvedValue({ data: null }),
          })),
          insert: jest.fn().mockResolvedValue({ error: null }),
        })),
      })),
    };
    (useSupabase as jest.Mock).mockReturnValue({ supabase: mockSupabase });

    (useAuth as jest.Mock).mockReturnValue({ user: mockUser });

    // Mock fetch for Google Books API
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ items: mockSearchResults }),
      }),
    ) as jest.Mock;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test("renders search input", () => {
    const { getByPlaceholderText } = render(<SearchScreen />);
    expect(getByPlaceholderText("Search for books...")).toBeTruthy();
  });

  test("performs search on input change", async () => {
    const { getByPlaceholderText } = render(<SearchScreen />);

    const searchInput = getByPlaceholderText("Search for books...");
    fireEvent.changeText(searchInput, "test book");

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("test%20book"),
      );
    });
  });

  test("displays search results", async () => {
    const { getByPlaceholderText, getAllByTestId } = render(<SearchScreen />);

    const searchInput = getByPlaceholderText("Search for books...");
    fireEvent.changeText(searchInput, "test");

    await waitFor(() => {
      const bookCards = getAllByTestId("book-card");
      expect(bookCards).toHaveLength(mockSearchResults.length);
    });
  });

  test("handles rating button press", async () => {
    const { getAllByTestId } = render(<SearchScreen />);

    await waitFor(() => {
      const rateButtons = getAllByTestId("rate-button");
      fireEvent.press(rateButtons[0]);
      expect(getAllByTestId("rating-modal")[0]).toBeTruthy();
    });
  });

  test("handles bookmark button press", async () => {
    const { getAllByTestId } = render(<SearchScreen />);

    await waitFor(() => {
      const bookmarkButtons = getAllByTestId("bookmark-button");
      fireEvent.press(bookmarkButtons[0]);

      expect(useSupabase().supabase.from).toHaveBeenCalledWith("user_books");
      expect(Toast.show).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "success",
          text1: "Added to your bookshelf!",
        }),
      );
    });
  });

  test("handles empty search results", async () => {
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ items: [] }),
      }),
    ) as jest.Mock;

    const { getByPlaceholderText, getByText } = render(<SearchScreen />);

    const searchInput = getByPlaceholderText("Search for books...");
    fireEvent.changeText(searchInput, "nonexistent book");

    await waitFor(() => {
      expect(getByText("No books found")).toBeTruthy();
    });
  });

  test("handles API error", async () => {
    global.fetch = jest.fn(() =>
      Promise.reject(new Error("API Error")),
    ) as jest.Mock;

    const { getByPlaceholderText, getByText } = render(<SearchScreen />);

    const searchInput = getByPlaceholderText("Search for books...");
    fireEvent.changeText(searchInput, "test");

    await waitFor(() => {
      expect(getByText("Failed to fetch books")).toBeTruthy();
    });
  });

  test("debounces search requests", async () => {
    const { getByPlaceholderText } = render(<SearchScreen />);

    const searchInput = getByPlaceholderText("Search for books...");
    fireEvent.changeText(searchInput, "t");
    fireEvent.changeText(searchInput, "te");
    fireEvent.changeText(searchInput, "tes");
    fireEvent.changeText(searchInput, "test");

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });
  });

  test("navigates to book details", async () => {
    const { getAllByTestId } = render(<SearchScreen />);

    await waitFor(() => {
      const bookCards = getAllByTestId("book-card");
      fireEvent.press(bookCards[0]);
      expect(useRouter().push).toHaveBeenCalledWith("/book/book1");
    });
  });

  test("shows loading state during search", async () => {
    const { getByPlaceholderText, getByTestId } = render(<SearchScreen />);

    const searchInput = getByPlaceholderText("Search for books...");
    fireEvent.changeText(searchInput, "test");

    expect(getByTestId("loading-indicator")).toBeTruthy();
  });

  test("handles already added books", async () => {
    const mockSupabase = {
      from: jest.fn(() => ({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            single: jest.fn().mockResolvedValue({ data: { id: 1 } }),
          })),
        })),
      })),
    };
    (useSupabase as jest.Mock).mockReturnValue({ supabase: mockSupabase });

    const { getAllByTestId } = render(<SearchScreen />);

    await waitFor(() => {
      const bookCards = getAllByTestId("book-card");
      expect(bookCards[0]).toContainElement(getByTestId("check-icon"));
    });
  });
});

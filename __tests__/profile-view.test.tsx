import { render, fireEvent, waitFor } from "@testing-library/react-native";
import * as Clipboard from "expo-clipboard";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as Sharing from "expo-sharing";
import React from "react";

import ProfileScreen from "@/app/(tabs)/profile/[id]";
import { useAuth } from "@/hooks/useAuth";
import { useSupabase } from "@/hooks/useSupabase";

// Add mocks
jest.mock("expo-sharing", () => ({
  isAvailableAsync: jest.fn(),
  shareAsync: jest.fn(),
}));

jest.mock("expo-clipboard", () => ({
  setStringAsync: jest.fn(),
}));

// Extend mock data
const mockProfile = {
  id: "456",
  name: "John Doe",
  username: "johndoe",
  avatar_url: "https://example.com/avatar.jpg",
  bio: "Book lover",
  followers_count: 42,
  following_count: 123,
};

const mockBooks = {
  READ: [
    {
      id: 1,
      book_id: "1",
      rating: 4,
      status: "READ",
      created_at: new Date().toISOString(),
      book: {
        title: "Read Book 1",
        author: "Author 1",
        cover_url: "https://example.com/cover1.jpg",
      },
    },
  ],
  WANT_TO_READ: [
    {
      id: 2,
      book_id: "2",
      status: "WANT_TO_READ",
      created_at: new Date().toISOString(),
      book: {
        title: "Want to Read Book 1",
        author: "Author 2",
        cover_url: "https://example.com/cover2.jpg",
      },
    },
  ],
};

const mockActivity = [
  {
    id: 1,
    type: "RATING",
    book: {
      title: "Activity Book 1",
      author: "Author 3",
      cover_url: "https://example.com/cover3.jpg",
    },
    rating: 5,
    created_at: new Date().toISOString(),
  },
];

describe("Profile View", () => {
  beforeEach(() => {
    const mockSupabase = {
      from: jest.fn(() => ({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            single: jest.fn().mockResolvedValue({ data: mockProfile }),
            order: jest.fn().mockResolvedValue({ data: mockBooks.READ }),
          })),
        })),
      })),
    };
    (useSupabase as jest.Mock).mockReturnValue({ supabase: mockSupabase });
  });

  test("displays correct follower and following counts", async () => {
    const { getByText } = render(<ProfileScreen />);

    await waitFor(() => {
      expect(getByText("42")).toBeTruthy(); // Followers
      expect(getByText("123")).toBeTruthy(); // Following
    });
  });

  test("switches between Read and Want to Read shelves", async () => {
    const mockSupabase = {
      from: jest.fn(() => ({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            order: jest
              .fn()
              .mockResolvedValueOnce({ data: mockBooks.READ })
              .mockResolvedValueOnce({ data: mockBooks.WANT_TO_READ }),
          })),
        })),
      })),
    };
    (useSupabase as jest.Mock).mockReturnValue({ supabase: mockSupabase });

    const { getByText, getAllByTestId } = render(<ProfileScreen />);

    // Check Read shelf
    await waitFor(() => {
      const bookItems = getAllByTestId("book-item");
      expect(bookItems).toHaveLength(mockBooks.READ.length);
      expect(getByText("Read Book 1")).toBeTruthy();
    });

    // Switch to Want to Read
    const wantToReadTab = getByText("Want to Read");
    fireEvent.press(wantToReadTab);

    await waitFor(() => {
      const bookItems = getAllByTestId("book-item");
      expect(bookItems).toHaveLength(mockBooks.WANT_TO_READ.length);
      expect(getByText("Want to Read Book 1")).toBeTruthy();
    });
  });

  test("displays user activity feed correctly", async () => {
    const mockSupabase = {
      from: jest.fn(() => ({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            order: jest.fn().mockResolvedValue({ data: mockActivity }),
          })),
        })),
      })),
    };
    (useSupabase as jest.Mock).mockReturnValue({ supabase: mockSupabase });

    const { getAllByTestId } = render(<ProfileScreen />);

    await waitFor(() => {
      const activityItems = getAllByTestId("activity-item");
      expect(activityItems).toHaveLength(mockActivity.length);
    });
  });

  test("shares profile via link", async () => {
    const { getByTestId } = render(<ProfileScreen />);

    const shareButton = getByTestId("share-profile-button");
    fireEvent.press(shareButton);

    await waitFor(() => {
      expect(Clipboard.setStringAsync).toHaveBeenCalledWith(
        expect.stringContaining(mockProfile.username),
      );
    });
  });

  test("shares app with friends", async () => {
    (Sharing.isAvailableAsync as jest.Mock).mockResolvedValue(true);

    const { getByTestId } = render(<ProfileScreen />);

    const shareAppButton = getByTestId("share-app-button");
    fireEvent.press(shareAppButton);

    await waitFor(() => {
      expect(Sharing.shareAsync).toHaveBeenCalled();
    });
  });

  test("navigates to followers list", async () => {
    const mockRouter = {
      push: jest.fn(),
    };
    (useRouter as jest.Mock).mockReturnValue(mockRouter);

    const { getByTestId } = render(<ProfileScreen />);

    const followersButton = getByTestId("followers-button");
    fireEvent.press(followersButton);

    expect(mockRouter.push).toHaveBeenCalledWith(
      `/profile/${mockProfile.id}/followers`,
    );
  });

  test("navigates to following list", async () => {
    const mockRouter = {
      push: jest.fn(),
    };
    (useRouter as jest.Mock).mockReturnValue(mockRouter);

    const { getByTestId } = render(<ProfileScreen />);

    const followingButton = getByTestId("following-button");
    fireEvent.press(followingButton);

    expect(mockRouter.push).toHaveBeenCalledWith(
      `/profile/${mockProfile.id}/following`,
    );
  });
});

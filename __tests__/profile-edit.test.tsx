import { render, fireEvent, waitFor } from "@testing-library/react-native";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import React from "react";
import Toast from "react-native-toast-message";

import ProfileEditScreen from "@/app/(tabs)/profile/edit";
import { useAuth } from "@/hooks/useAuth";
import { useSupabase } from "@/hooks/useSupabase";

// Add mocks
jest.mock("expo-image-picker", () => ({
  launchImageLibraryAsync: jest.fn(),
  MediaTypeOptions: {
    Images: "Images",
  },
}));

describe("Profile Edit", () => {
  const mockUser = {
    id: "123",
    name: "Original Name",
    username: "original_username",
    bio: "Original bio",
    avatar_url: "https://example.com/original-avatar.jpg",
  };

  beforeEach(() => {
    (useAuth as jest.Mock).mockReturnValue({ user: mockUser });
  });

  test("changes profile picture", async () => {
    const mockImage = {
      uri: "file://new-image.jpg",
      type: "image",
      width: 500,
      height: 500,
    };

    (ImagePicker.launchImageLibraryAsync as jest.Mock).mockResolvedValue({
      canceled: false,
      assets: [mockImage],
    });

    const mockSupabase = {
      storage: {
        from: jest.fn(() => ({
          upload: jest
            .fn()
            .mockResolvedValue({ data: { path: "new-avatar.jpg" } }),
          getPublicUrl: jest.fn(() => ({
            data: { publicUrl: "https://example.com/new-avatar.jpg" },
          })),
        })),
      },
      from: jest.fn(() => ({
        update: jest.fn().mockResolvedValue({ error: null }),
      })),
    };
    (useSupabase as jest.Mock).mockReturnValue({ supabase: mockSupabase });

    const { getByTestId } = render(<ProfileEditScreen />);

    const avatarButton = getByTestId("change-avatar-button");
    fireEvent.press(avatarButton);

    await waitFor(() => {
      expect(mockSupabase.storage.from).toHaveBeenCalledWith("avatars");
      expect(mockSupabase.from).toHaveBeenCalledWith("profiles");
      expect(Toast.show).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "success",
          text1: "Profile picture updated!",
        }),
      );
    });
  });

  test("updates username", async () => {
    const mockSupabase = {
      from: jest.fn(() => ({
        update: jest.fn().mockResolvedValue({ error: null }),
      })),
    };
    (useSupabase as jest.Mock).mockReturnValue({ supabase: mockSupabase });

    const { getByTestId } = render(<ProfileEditScreen />);

    const usernameInput = getByTestId("username-input");
    fireEvent.changeText(usernameInput, "new_username");

    const saveButton = getByTestId("save-button");
    fireEvent.press(saveButton);

    await waitFor(() => {
      expect(mockSupabase.from).toHaveBeenCalledWith("profiles");
      expect(mockSupabase.from().update).toHaveBeenCalledWith(
        expect.objectContaining({
          username: "new_username",
        }),
      );
    });
  });

  test("updates name and bio", async () => {
    const mockSupabase = {
      from: jest.fn(() => ({
        update: jest.fn().mockResolvedValue({ error: null }),
      })),
    };
    (useSupabase as jest.Mock).mockReturnValue({ supabase: mockSupabase });

    const { getByTestId } = render(<ProfileEditScreen />);

    const nameInput = getByTestId("name-input");
    const bioInput = getByTestId("bio-input");

    fireEvent.changeText(nameInput, "New Name");
    fireEvent.changeText(bioInput, "New bio text");

    const saveButton = getByTestId("save-button");
    fireEvent.press(saveButton);

    await waitFor(() => {
      expect(mockSupabase.from().update).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "New Name",
          bio: "New bio text",
        }),
      );
    });
  });

  test("validates username format", async () => {
    const { getByTestId } = render(<ProfileEditScreen />);

    const usernameInput = getByTestId("username-input");
    fireEvent.changeText(usernameInput, "Invalid Username!");

    const saveButton = getByTestId("save-button");
    fireEvent.press(saveButton);

    await waitFor(() => {
      expect(Toast.show).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "error",
          text1: "Invalid username format",
        }),
      );
    });
  });

  test("checks username availability", async () => {
    const mockSupabase = {
      from: jest.fn(() => ({
        select: jest.fn(() => ({
          eq: jest.fn().mockResolvedValue({ data: [{ id: "456" }] }),
        })),
      })),
    };
    (useSupabase as jest.Mock).mockReturnValue({ supabase: mockSupabase });

    const { getByTestId } = render(<ProfileEditScreen />);

    const usernameInput = getByTestId("username-input");
    fireEvent.changeText(usernameInput, "taken_username");

    await waitFor(() => {
      expect(getByTestId("username-error")).toHaveTextContent(
        "Username already taken",
      );
    });
  });
});

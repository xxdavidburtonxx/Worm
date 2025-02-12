// External packages
import type { User } from "@supabase/supabase-js";

export interface Review {
  id: string;
  user: {
    name: string;
    avatar: string;
  };
  book: {
    title: string;
    cover: string;
    author: string;
  };
  rating: number;
  review: string;
  likes: number;
  comments: number;
  bookmarks: number;
}

export interface Book {
  id: string | number;
  title: string;
  author: string;
  cover_url: string;
}

export interface Friend {
  id: string;
  name: string;
  avatar: string;
  username: string;
}

export interface RouteParams {
  book: Book;
}

export interface GoogleBook {
  id: string;
  volumeInfo: {
    title: string;
    authors?: string[];
    description?: string;
    imageLinks?: {
      thumbnail?: string;
      smallThumbnail?: string;
    };
    publishedDate?: string;
    publisher?: string;
    categories?: string[];
    averageRating?: number;
    ratingsCount?: number;
  };
}

export interface Profile {
  id: string;
  username: string;
  name: string;
  bio?: string;
  avatar_url: string | null;
}

export interface RecentSearch {
  id: string;
  user_id: string;
  searched_profile_id: string;
  created_at: string;
  profile: Profile;
}

export type ShelfStatus = "READ" | "WANT_TO_READ" | "READING";

export interface UserBook {
  id: number;
  user_id: string;
  book_id: number;
  rating: number | null;
  status: "READ" | "WANT_TO_READ";
  user_sentiment: "loved" | "liked" | "hated" | null;
  review?: string | null;
  tied_with_books: number[] | null;
  tied_book_ids: string[] | null;
  book: {
    id: number;
    title: string;
    author: string;
    cover_url: string;
    volumeInfo?: {
      categories?: string[];
      imageLinks?: {
        thumbnail?: string;
      };
    };
  };
}

export interface FeedItem {
  id: number;
  user_id: string;
  book_id: number;
  status: ShelfStatus;
  rating: number | null;
  review: string | null;
  created_at: string;
  likes_count: number;
  comments_count: number;
  has_liked: boolean;
  has_added: boolean;
  user: {
    name: string;
    avatar_url: string | null;
  };
  book: {
    title: string;
    author: string;
    cover_url: string;
    category: string;
  };
}

export interface Comment {
  id: number;
  user_id: string;
  comment: string;
  created_at: string;
  user: {
    name: string;
    avatar_url: string | null;
  };
}

export interface FileInfo {
  exists: boolean;
  uri: string;
  isDirectory: boolean;
  modificationTime?: number;
  size?: number;
}

export interface Contact {
  id: string;
  name: string;
  phoneNumbers?: Array<{ number: string }>;
  emails?: Array<{ email: string }>;
}

export type SourceContext = "feed" | "search";

export interface SelectedBook {
  id: string;
  title: string | null;
  author: string | null;
  cover_url: string | null;
  category?: string | null;
  publisher?: string | null;
  published_date?: string | null;
  description?: string | null;
}

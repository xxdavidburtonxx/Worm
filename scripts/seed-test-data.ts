// External packages
import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
import { v4 as uuidv4 } from "uuid";

// Load environment variables
dotenv.config();

// Verify environment variables
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing required environment variables:");
  if (!supabaseUrl) console.error("- EXPO_PUBLIC_SUPABASE_URL");
  if (!supabaseKey) console.error("- EXPO_PUBLIC_SUPABASE_ANON_KEY");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Your test account (for easy login)
const YOUR_TEST_ID = uuidv4();

// Test users data
const TEST_USERS = [
  {
    id: YOUR_TEST_ID,
    email: "you@example.com", // You'll use this to login
    password: "testpass123", // You'll use this to login
    name: "You (Test Account)",
    username: "test_reader",
    avatar_url: "https://api.dicebear.com/7.x/avataaars/svg?seed=you",
    bio: "Testing out this awesome app! 📚",
  },
  {
    id: uuidv4(),
    email: "alice@example.com",
    password: "testpass123",
    name: "Alice Johnson",
    username: "alice_reads",
    avatar_url: "https://api.dicebear.com/7.x/avataaars/svg?seed=alice",
    bio: "Avid reader and coffee lover 📚☕",
  },
  {
    id: uuidv4(),
    email: "bob@example.com",
    password: "testpass123",
    name: "Bob Smith",
    username: "bob_bookworm",
    avatar_url: "https://api.dicebear.com/7.x/avataaars/svg?seed=bob",
    bio: "Fantasy and sci-fi enthusiast 🚀",
  },
  {
    id: uuidv4(),
    email: "carol@example.com",
    password: "testpass123",
    name: "Carol Martinez",
    username: "carol_stories",
    avatar_url: "https://api.dicebear.com/7.x/avataaars/svg?seed=carol",
    bio: "Romance and mystery lover 💕🔍",
  },
  {
    id: uuidv4(),
    email: "david@example.com",
    password: "testpass123",
    name: "David Wilson",
    username: "david_reads",
    avatar_url: "https://api.dicebear.com/7.x/avataaars/svg?seed=david",
    bio: "Non-fiction and history buff 📖🏛️",
  },
];

// Test books data with real books and cover images
const TEST_BOOKS = [
  {
    id: uuidv4(),
    google_book_id: "6QyrdlY1CP0C",
    title: "Project Hail Mary",
    author: "Andy Weir",
    cover_url:
      "https://books.google.com/books/content?id=6QyrdlY1CP0C&printsec=frontcover&img=1&zoom=1&edge=curl&source=gbs_api",
    category: "Science Fiction",
    is_test: true,
  },
  {
    id: uuidv4(),
    google_book_id: "EPbnxAEACAAJ",
    title: "Atomic Habits",
    author: "James Clear",
    cover_url:
      "https://books.google.com/books/content?id=EPbnxAEACAAJ&printsec=frontcover&img=1&zoom=1&source=gbs_api",
    category: "Self-Help",
    is_test: true,
  },
  {
    id: uuidv4(),
    google_book_id: "5QRZ4z6A1ysC",
    title: "The Midnight Library",
    author: "Matt Haig",
    cover_url:
      "https://books.google.com/books/content?id=5QRZ4z6A1ysC&printsec=frontcover&img=1&zoom=1&edge=curl&source=gbs_api",
    category: "Fiction",
    is_test: true,
  },
  // ... add 5 more books
];

// Your ratings (all loved)
const YOUR_RATINGS = TEST_BOOKS.slice(0, 4).map((book, index) => ({
  user_id: YOUR_TEST_ID,
  book_id: book.id,
  status: "READ",
  rating: 8 + index * 0.5, // Ratings between 8 and 9.5
  user_sentiment: "loved",
  review: `This was an amazing read! ${book.title} really captivated me from start to finish.`,
  is_test: true,
}));

// Other users' ratings
const generateUserRatings = (userId: string) => {
  return TEST_BOOKS.slice(0, 8).map((book, index) => ({
    user_id: userId,
    book_id: book.id,
    status: Math.random() > 0.3 ? "READ" : "WANT_TO_READ",
    rating: Math.random() > 0.3 ? 5 + Math.random() * 5 : null,
    user_sentiment:
      Math.random() > 0.3
        ? ["loved", "liked", "hated"][Math.floor(Math.random() * 3)]
        : null,
    review:
      Math.random() > 0.5 ? `Here are my thoughts on ${book.title}...` : null,
    is_test: true,
  }));
};

// Generate comments
const generateComments = () => {
  const comments = [];
  for (const book of TEST_BOOKS) {
    for (const user of TEST_USERS) {
      if (Math.random() > 0.7) {
        comments.push({
          id: uuidv4(),
          user_id: user.id,
          book_id: book.id,
          comment: `Great insights about ${book.title}! ${Math.random() > 0.5 ? "Looking forward to reading more." : "Thanks for sharing!"}`,
          created_at: new Date().toISOString(),
          is_test: true,
        });
      }
    }
  }
  return comments;
};

async function seedTestData() {
  try {
    console.log("Starting to seed test data...");

    // 1. Create test users
    for (const user of TEST_USERS) {
      console.log(`Creating user: ${user.name}`);
      const { error: authError } = await supabase.auth.signUp({
        email: user.email,
        password: user.password,
      });

      if (authError) throw authError;

      const { error: profileError } = await supabase.from("profiles").insert({
        id: user.id,
        name: user.name,
        username: user.username,
        avatar_url: user.avatar_url,
        bio: user.bio,
        is_test: true,
      });

      if (profileError) throw profileError;
    }

    // 2. Add books
    console.log("Adding books...");
    const { error: booksError } = await supabase
      .from("books")
      .insert(TEST_BOOKS);
    if (booksError) throw booksError;

    // 3. Create friendships (everyone follows everyone)
    console.log("Creating friendships...");
    const friendships = TEST_USERS.flatMap((user) =>
      TEST_USERS.filter((friend) => friend.id !== user.id).map((friend) => ({
        user_id: user.id,
        friend_id: friend.id,
        is_test: true,
      })),
    );
    const { error: friendshipsError } = await supabase
      .from("friendships")
      .insert(friendships);
    if (friendshipsError) throw friendshipsError;

    // 4. Add your ratings
    console.log("Adding your ratings...");
    const { error: yourRatingsError } = await supabase
      .from("user_books")
      .insert(YOUR_RATINGS);
    if (yourRatingsError) throw yourRatingsError;

    // 5. Add other users' ratings
    console.log("Adding other users' ratings...");
    for (const user of TEST_USERS.filter((u) => u.id !== YOUR_TEST_ID)) {
      const userRatings = generateUserRatings(user.id);
      const { error: ratingsError } = await supabase
        .from("user_books")
        .insert(userRatings);
      if (ratingsError) throw ratingsError;
    }

    // 6. Add comments
    console.log("Adding comments...");
    const comments = generateComments();
    const { error: commentsError } = await supabase
      .from("comments")
      .insert(comments);
    if (commentsError) throw commentsError;

    console.log("Test data seeded successfully!");
    console.log("\nYou can now log in with:");
    console.log("Email:", TEST_USERS[0].email);
    console.log("Password:", TEST_USERS[0].password);
  } catch (error) {
    console.error("Error seeding test data:", error);
  }
}

async function cleanupTestData() {
  try {
    console.log("Starting cleanup...");

    // Delete in reverse order of dependencies
    await supabase.from("comments").delete().eq("is_test", true);
    await supabase.from("likes").delete().eq("is_test", true);
    await supabase.from("user_books").delete().eq("is_test", true);
    await supabase.from("friendships").delete().eq("is_test", true);
    await supabase.from("books").delete().eq("is_test", true);

    // Delete test users
    for (const user of TEST_USERS) {
      await supabase.auth.admin.deleteUser(user.id);
      await supabase.from("profiles").delete().eq("id", user.id);
    }

    console.log("Test data cleaned up successfully!");
  } catch (error) {
    console.error("Error cleaning up test data:", error);
  }
}

// Export functions to be called from command line
export { seedTestData, cleanupTestData };

if (require.main === module) {
  const command = process.argv[2];
  if (command === "seed") {
    seedTestData();
  } else if (command === "cleanup") {
    cleanupTestData();
  } else {
    console.log('Please specify either "seed" or "cleanup"');
  }
}

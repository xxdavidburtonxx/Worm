// Move the current search.tsx content here
// This is the main search screen with the toggle and lists

// External packages
import { useRouter, useLocalSearchParams } from "expo-router";
import {
  Book as BookIcon,
  Users,
  Search as SearchIcon,
  BookOpen,
  Plus,
  Bookmark,
  Check,
} from "lucide-react-native";
import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  ScrollView,
  Pressable,
  Image,
  FlatList,
  ActivityIndicator,
} from "react-native";
import debounce from 'lodash/debounce';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Avatar } from 'react-native-paper';

// Local imports
import BookRatingModal from "@/components/BookRatingModal";
import { CachedImage } from "@/components/CachedImage";
import { showToast } from "@/components/Toast";
import type {
  Book,
  GoogleBook,
  Profile,
  RecentSearch,
} from "@/components/types";
import { useAuth } from "@/hooks/useAuth";
import { useSupabase } from "@/hooks/useSupabase";

// Types

type SearchMode = "books" | "friends";
type Filter = "fiction" | "nonfiction" | "self-help";

const FILTERS: Filter[] = ["fiction", "nonfiction", "self-help"];

// Add colors object
const colors = {
  warmBrown: '#A27C62',
  siennaBrown: '#9A634E',
  // ... add other colors as needed
};

export default function SearchScreen() {
  const { supabase } = useSupabase();
  const { user } = useAuth();
  const router = useRouter();
  const { filter } = useLocalSearchParams();
  const [activeTab, setActiveTab] = useState<"books" | "friends">("books");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFilter, setSelectedFilter] = useState<Filter | null>(null);
  const [searchResults, setSearchResults] = useState<GoogleBook[]>([]);
  const [recentBooks, setRecentBooks] = useState<GoogleBook[]>([]); // Will be populated from Supabase
  const [selectedBook, setSelectedBook] = useState<GoogleBook | null>(null);
  const [isRatingModalVisible, setIsRatingModalVisible] = useState(false);
  const [friendSearchResults, setFriendSearchResults] = useState<Profile[]>([]);
  const [recentSearches, setRecentSearches] = useState<RecentSearch[]>([]);
  const [suggestedFriends, setSuggestedFriends] = useState<Profile[]>([]);
  const [following, setFollowing] = useState<Set<string>>(new Set());
  const [hasAdded, setHasAdded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [followingMap, setFollowingMap] = useState<Record<string, boolean>>({});
  const [loadingFollows, setLoadingFollows] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (user) {
      fetchRecentSearches();
      fetchSuggestedFriends();
      fetchFollowing();
    }
  }, [user]);

  const fetchRecentSearches = async () => {
    try {
      const { data } = await supabase
        .from("recent_searches")
        .select(
          `
          *,
          profile:profiles!searched_profile_id (*)
        `,
        )
        .eq("user_id", user?.id)
        .order("created_at", { ascending: false })
        .limit(5);

      if (data) setRecentSearches(data);
    } catch (error) {
      console.error("Error fetching recent searches:", error);
    }
  };

  const fetchSuggestedFriends = async () => {
    try {
      // Get friends of friends
      const { data: friendships } = await supabase
        .from("friendships")
        .select("friend_id")
        .eq("user_id", user?.id);

      if (!friendships?.length) return;

      const friendIds = friendships.map((f) => f.friend_id);

      const { data: suggestions } = await supabase
        .from('profiles')  // Query profiles directly instead of friendships
        .select('id, username, name, avatar_url')
        .in('id', friendIds)
        .not('id', 'eq', user?.id)
        .limit(5);

      if (suggestions) {
        setSuggestedFriends(suggestions as Profile[]);  // Now the types match directly
      }
    } catch (error) {
      console.error("Error fetching suggested friends:", error);
    }
  };

  const fetchFollowing = async () => {
    try {
      const { data } = await supabase
        .from("friendships")
        .select("friend_id")
        .eq("user_id", user?.id);

      if (data) {
        setFollowing(new Set(data.map(f => f.friend_id)));
      }
    } catch (error) {
      console.error("Error fetching following:", error);
    }
  };

  const checkFollowingStatus = async (profiles: Profile[]) => {
    if (!user?.id) return;
    
    try {
      const { data: friendships } = await supabase
        .from('friendships')
        .select('friend_id')
        .eq('user_id', user.id)
        .in('friend_id', profiles.map(p => p.id));

      if (friendships) {
        const following = new Map();
        friendships.forEach(f => following.set(f.friend_id, true));
        setFollowingMap(Object.fromEntries(following));
      }
    } catch (error) {
      console.error('Error checking following status:', error);
    }
  };

  const fetchExistingFriendships = async () => {
    if (!user?.id) return;
    
    try {
      const { data: friendships } = await supabase
        .from('friendships')
        .select('friend_id')
        .eq('user_id', user.id);

      if (friendships) {
        const followingStatus = friendships.reduce((acc, friendship) => ({
          ...acc,
          [friendship.friend_id]: true
        }), {});
        setFollowingMap(followingStatus);
      }
    } catch (error) {
      console.error('Error fetching friendships:', error);
    }
  };

  const performSearch = useCallback(
    debounce(async (query: string) => {
      if (!query.trim()) {
        setSearchResults([]);
        setFriendSearchResults([]);
        return;
      }

      setIsLoading(true);
      try {
        if (activeTab === "books") {
          const response = await fetch(
            `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}&key=${process.env.EXPO_PUBLIC_GOOGLE_BOOKS_API_KEY}`
          );
          const data = await response.json();
          setSearchResults(data.items || []);
        } else {
          const { data: profiles, error } = await supabase
            .from("profiles")
            .select("*")
            .or(`name.ilike.%${query}%,username.ilike.%${query}%`)
            .neq("id", user?.id)
            .limit(20);

          if (error) throw error;
          setFriendSearchResults(profiles || []);
          
          // Check friendship status for search results
          if (profiles?.length) {
            const { data: friendships } = await supabase
              .from('friendships')
              .select('friend_id')
              .eq('user_id', user.id)
              .in('friend_id', profiles.map(p => p.id));

            const newFollowingMap = { ...followingMap };
            if (friendships) {
              friendships.forEach(f => {
                newFollowingMap[f.friend_id] = true;
              });
            }
            setFollowingMap(newFollowingMap);
          }
        }
      } catch (error) {
        console.error("Search error:", error);
        showToast.error({
          title: "Search Failed",
          message: "Please try again",
        });
      } finally {
        setIsLoading(false);
      }
    }, 300),
    [activeTab, user, followingMap]
  );

  useEffect(() => {
    if (user) {
      fetchExistingFriendships();
    }
  }, [user]);

  const addToWantToRead = async (googleBook: any) => {
    try {
      // First, ensure the book exists in our books table
      const { data: existingBook } = await supabase
        .from("books")
        .select("id")
        .eq("google_book_id", googleBook.id)
        .single();

      let bookId;

      if (!existingBook) {
        // Insert the book if it doesn't exist
        const { data: newBook, error: insertError } = await supabase
          .from("books")
          .insert({
            google_book_id: googleBook.id,
            title: googleBook.volumeInfo.title,
            author: googleBook.volumeInfo.authors?.[0],
            publisher: googleBook.volumeInfo.publisher,
            published_date: googleBook.volumeInfo.publishedDate,
            description: googleBook.volumeInfo.description,
            cover_url: googleBook.volumeInfo.imageLinks?.thumbnail,
          })
          .select("id")
          .single();

        if (insertError) throw insertError;
        bookId = newBook.id;
      } else {
        bookId = existingBook.id;
      }

      // Add to user_books
      await supabase.from("user_books").insert({
        user_id: user?.id,
        book_id: bookId,
        status: "WANT_TO_READ",
      });

      showToast.success({
        title: "Book added to your shelf!",
        message: (
          <Text>
            View in your{" "}
            <Text
              style={{ color: "#007AFF" }}
              onPress={() => router.push("/(tabs)/bookshelf")}
            >
              bookshelf
            </Text>
          </Text>
        ),
      });

      setHasAdded(true);
    } catch (error) {
      console.error("Error adding book:", error);
      showToast.error({
        title: "Failed to add book",
        message: "Please try again",
      });
    }
  };

  const openReviewModal = (book: GoogleBook) => {
    setSelectedBook(book);
    setIsRatingModalVisible(true);
  };

  const handleFollow = async (profileId: string) => {
    if (!user) return;

    // Set loading state for this specific profile
    setLoadingFollows(prev => ({ ...prev, [profileId]: true }));

    try {
      if (followingMap[profileId]) {
        // Unfollow
        const { error } = await supabase
          .from('friendships')
          .delete()
          .eq('user_id', user.id)
          .eq('friend_id', profileId);

        if (error) throw error;
        setFollowingMap(prev => ({ ...prev, [profileId]: false }));
      } else {
        // Follow
        const { error } = await supabase
          .from('friendships')
          .insert({
            user_id: user.id,
            friend_id: profileId
          });

        if (error) throw error;
        setFollowingMap(prev => ({ ...prev, [profileId]: true }));
      }
    } catch (error) {
      console.error('Error updating friendship:', error);
      showToast.error({
        title: "Error",
        message: "Failed to update following status"
      });
    } finally {
      // Clear loading state for this profile
      setLoadingFollows(prev => ({ ...prev, [profileId]: false }));
    }
  };

  const saveRecentSearch = async (profile: Profile) => {
    try {
      await supabase.from("recent_searches").insert({
        user_id: user?.id,
        searched_profile_id: profile.id,
      });
    } catch (error) {
      console.error("Error saving recent search:", error);
    }
  };

  const handleUserPress = (userId: string) => {
    router.push(`/profile/${userId}`);
  };

  const renderBookItem = ({ item }: { item: GoogleBook }) => {
    const book = item.volumeInfo;
    return (
      <View style={styles.bookItem}>
        <Image
          source={{
            uri:
              book.imageLinks?.thumbnail ||
              "https://via.placeholder.com/128x192?text=No+Cover",
          }}
          style={styles.bookCover}
        />
        <View style={styles.bookInfo}>
          <Text style={styles.bookTitle} numberOfLines={2}>
            {book.title}
          </Text>
          <Text style={styles.bookAuthor} numberOfLines={1}>
            {book.authors?.join(", ")}
          </Text>
          <View style={styles.ratingContainer}>
            <Text style={styles.rating}>4.5★</Text>{" "}
            {/* TODO: Get from Supabase */}
          </View>
        </View>
        <View style={styles.bookActions}>
          <Pressable
            style={styles.actionButton}
            onPress={() => openReviewModal(item)}
          >
            <BookOpen size={24} color="#666" />
          </Pressable>
          <Pressable
            style={styles.actionButton}
            onPress={() => addToWantToRead(item)}
          >
            <Plus size={24} color="#666" />
          </Pressable>
          {hasAdded && <Check size={24} color="#34C759" />}
        </View>
      </View>
    );
  };

  const renderFriendItem = ({ item }: { item: Profile }) => (
    <Pressable
      style={styles.friendItem}
      onPress={() => {
        saveRecentSearch(item);
        handleUserPress(item.id);
      }}
    >
      <Image
        source={{
          uri: item.avatar_url || "https://via.placeholder.com/40",
        }}
        style={styles.avatar}
      />
      <View style={styles.friendInfo}>
        <Text style={styles.friendName}>{item.name}</Text>
        <Text style={styles.friendUsername}>@{item.username}</Text>
      </View>
      <Pressable
        style={[
          styles.followButton,
          followingMap[item.id] && styles.followingButton,
          loadingFollows[item.id] && styles.followButtonDisabled
        ]}
        onPress={() => handleFollow(item.id)}
        disabled={loadingFollows[item.id]}
      >
        {loadingFollows[item.id] ? (
          <ActivityIndicator size="small" color="#fff" />
        ) : (
          <Text style={[
            styles.followButtonText,
            followingMap[item.id] && styles.followingButtonText
          ]}>
            {followingMap[item.id] ? 'Following' : 'Follow'}
          </Text>
        )}
      </Pressable>
    </Pressable>
  );

  useEffect(() => {
    if (filter === "friends") {
      setActiveTab("friends");
    }
  }, [filter]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.content}>
        {/* Toggle Buttons */}
        <View style={styles.toggleContainer}>
          <Pressable
            style={[
              styles.toggleButton,
              activeTab === "books" && styles.toggleActive,
            ]}
            onPress={() => setActiveTab("books")}
          >
            <BookIcon
              size={20}
              color={activeTab === "books" ? "#000" : "#666"}
            />
            <Text
              style={[
                styles.toggleText,
                activeTab === "books" && styles.toggleTextActive,
              ]}
            >
              Books
            </Text>
          </Pressable>
          <Pressable
            style={[
              styles.toggleButton,
              activeTab === "friends" && styles.toggleActive,
            ]}
            onPress={() => setActiveTab("friends")}
          >
            <Users size={20} color={activeTab === "friends" ? "#000" : "#666"} />
            <Text
              style={[
                styles.toggleText,
                activeTab === "friends" && styles.toggleTextActive,
              ]}
            >
              Friends
            </Text>
          </Pressable>
        </View>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <SearchIcon size={20} color="#666" />
          <TextInput
            style={styles.searchInput}
            placeholder={
              activeTab === "books"
                ? "Search for books"
                : "Search name or handle"
            }
            value={searchQuery}
            onChangeText={(text) => {
              setSearchQuery(text);
              performSearch(text);
            }}
          />
          {isLoading && <ActivityIndicator style={styles.loader} />}
        </View>

        {/* Filters */}
        {activeTab === "books" && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.filtersContainer}
          >
            {FILTERS.map((filter) => (
              <Pressable
                key={filter}
                style={[
                  styles.filterButton,
                  selectedFilter === filter && styles.filterButtonActive,
                ]}
                onPress={() =>
                  setSelectedFilter(filter === selectedFilter ? null : filter)
                }
              >
                <Text
                  style={[
                    styles.filterText,
                    selectedFilter === filter && styles.filterTextActive,
                  ]}
                >
                  {filter}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        )}

        {/* Results */}
        {activeTab === "books" ? (
          <FlatList
            data={searchQuery ? searchResults : recentBooks}
            renderItem={renderBookItem}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={
              <Text style={styles.emptyText}>
                {searchQuery ? "No results found" : "Recent books will appear here"}
              </Text>
            }
          />
        ) : (
          <ScrollView style={styles.friendsContainer}>
            {!searchQuery ? (
              <>
                {/* Invite Friends Section */}
                <View style={styles.inviteSection}>
                  <Text style={styles.sectionTitle}>Invite a friend</Text>
                  <Pressable
                    style={styles.inviteButton}
                    onPress={() => router.push("/search/invite")}
                  >
                    <Text style={styles.inviteButtonText}>Invite</Text>
                  </Pressable>
                </View>

                {/* Recent Searches */}
                {recentSearches.length > 0 && (
                  <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Recents</Text>
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      style={styles.recentsList}
                    >
                      {recentSearches.map((recent) => (
                        <Pressable
                          key={recent.id}
                          style={styles.recentItem}
                          onPress={() => router.push({
                            pathname: "/profile/[id]",
                            params: { id: recent.profile.id }
                          })}
                        >
                          <CachedImage
                            uri={recent.profile.avatar_url || "https://via.placeholder.com/60"}
                            style={styles.recentAvatar}
                          />
                          <Text style={styles.recentName}>{recent.profile.name}</Text>
                          <Text style={styles.recentUsername}>@{recent.profile.username}</Text>
                        </Pressable>
                      ))}
                    </ScrollView>
                  </View>
                )}

                {/* Suggested Friends */}
                {suggestedFriends.length > 0 && (
                  <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                      <Text style={styles.sectionTitle}>People you may know</Text>
                      <Pressable onPress={() => {/* TODO: Show all */}}>
                        <Text style={styles.seeAll}>See all</Text>
                      </Pressable>
                    </View>
                    {suggestedFriends.map((profile) => renderFriendItem({ item: profile }))}
                  </View>
                )}
              </>
            ) : (
              /* Search Results */
              <View style={styles.searchResults}>
                {friendSearchResults.map((profile) => (
                  <Pressable 
                    key={profile.id} 
                    style={styles.userItem}
                    onPress={() => handleUserPress(profile.id)}
                  >
                    <Avatar.Text 
                      size={40} 
                      label={profile.username?.substring(0, 2).toUpperCase() || 'U'} 
                      style={{ backgroundColor: colors.warmBrown }}
                    />
                    <View style={styles.userInfo}>
                      <Text style={styles.username}>{profile.username}</Text>
                      <Text style={styles.userBio}>{profile.bio || 'No bio yet'}</Text>
                    </View>
                  </Pressable>
                ))}
              </View>
            )}
          </ScrollView>
        )}

        {/* Rating Modal */}
        {selectedBook && (
          <BookRatingModal
            book={selectedBook}
            isVisible={isRatingModalVisible}
            onClose={() => {
              setIsRatingModalVisible(false);
              setSelectedBook(null);
            }}
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  content: {
    flex: 1,
  },
  toggleContainer: {
    flexDirection: "row",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f1f1",
  },
  toggleButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    gap: 8,
    borderRadius: 6,
  },
  toggleActive: {
    backgroundColor: "#fff",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  toggleText: {
    fontSize: 16,
    color: "#666",
  },
  toggleTextActive: {
    color: "#000",
    fontWeight: "600",
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f1f1f1",
    borderRadius: 8,
    paddingHorizontal: 12,
    marginBottom: 16,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 8,
    fontSize: 16,
  },
  filtersContainer: {
    flexDirection: "row",
    marginBottom: 16,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#f1f1f1",
    marginRight: 8,
  },
  filterButtonActive: {
    backgroundColor: "#007AFF",
  },
  filterText: {
    fontSize: 14,
    color: "#666",
    textTransform: "capitalize",
  },
  filterTextActive: {
    color: "#fff",
    fontWeight: "500",
  },
  listContent: {
    gap: 12,
  },
  bookItem: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  bookCover: {
    width: 80,
    height: 120,
    borderRadius: 6,
  },
  bookInfo: {
    flex: 1,
    marginLeft: 12,
    justifyContent: "space-between",
  },
  bookTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 4,
  },
  bookAuthor: {
    fontSize: 14,
    color: "#666",
  },
  ratingContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  rating: {
    fontSize: 14,
    fontWeight: "600",
    color: "#FFB800",
  },
  bookActions: {
    justifyContent: "space-around",
    paddingLeft: 12,
  },
  actionButton: {
    padding: 8,
  },
  emptyText: {
    textAlign: "center",
    color: "#666",
    marginTop: 24,
  },
  friendsContainer: {
    flex: 1,
  },
  inviteSection: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
  },
  inviteButton: {
    padding: 12,
    backgroundColor: "#007AFF",
    borderRadius: 8,
  },
  inviteButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
  },
  section: {
    padding: 16,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
  },
  seeAll: {
    fontSize: 14,
    color: "#007AFF",
  },
  recentsList: {
    gap: 12,
  },
  recentItem: {
    flexDirection: "row",
    alignItems: "center",
  },
  recentAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  recentName: {
    fontSize: 16,
    fontWeight: "600",
  },
  recentUsername: {
    fontSize: 14,
    color: "#666",
  },
  searchResults: {
    padding: 16,
  },
  friendItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#f1f1f1",
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  friendInfo: {
    flex: 1,
  },
  friendName: {
    fontSize: 16,
    fontWeight: "600",
  },
  friendUsername: {
    fontSize: 14,
    color: "#666",
  },
  followButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
    minWidth: 90,  // Added to maintain consistent width during loading
    alignItems: 'center',  // Center the loading indicator
  },
  followButtonDisabled: {
    opacity: 0.7,
  },
  followingButton: {
    backgroundColor: '#E5E5E5',
  },
  followButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  followingButtonText: {  // Add this style
    color: '#666',
  },
  loader: {
    marginLeft: 12,
  },
  userItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#f1f1f1",
  },
  userInfo: {
    flex: 1,
  },
  username: {
    fontSize: 16,
    fontWeight: "600",
  },
  userBio: {
    fontSize: 14,
    color: "#666",
  },
});

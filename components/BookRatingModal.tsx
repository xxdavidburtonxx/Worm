// External packages
import {
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
} from "lucide-react-native";
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  Modal,
  Animated,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";

// Local imports
import { CachedImage } from "@/components/CachedImage";
import { showToast } from "@/components/Toast";
import type { GoogleBook, UserBook } from "@/components/types";
import { useAuth } from "@/hooks/useAuth";
import { useSupabase } from "@/hooks/useSupabase";
import AuthGuard from "@/components/AuthGuard";

// Types

// Add SourceContext type
type SourceContext = "feed" | "search";

interface Props {
  book: GoogleBook;
  isVisible: boolean;
  onClose: () => void;
  source: SourceContext; // Add this prop
}

// Add sentiment type
type Sentiment = 'loved' | 'liked' | 'hated';

interface SentimentRange {
  min: number;
  max: number;
}

interface SentimentRanges {
  loved: SentimentRange;
  liked: SentimentRange;
  hated: SentimentRange;
}

// Update sentiment ranges to use floats with clear boundaries
const sentimentRanges: SentimentRanges = {
  loved: { min: 7.0, max: 10.0 },
  liked: { min: 5.0, max: 6.9 },
  hated: { min: 1.0, max: 4.9 }
};

// Add these type definitions at the top with other types
type ShelfStatus = "READ" | "WANT_TO_READ";

interface BookRating {
  bookId: string;
  rating: number;
}

export default function BookRatingModal({
  book,
  isVisible,
  onClose,
  source,
}: Props) {
  const { supabase } = useSupabase();
  const { user } = useAuth();
  const router = useRouter();
  const [sentiment, setSentiment] = useState<Sentiment | null>(null);
  const [orderedBookRatings, setOrderedBookRatings] = useState<UserBook[]>([]);
  const [currentComparisonBook, setCurrentComparisonBook] = useState<UserBook | null>(null);
  const [review, setReview] = useState("");
  const [showReview, setShowReview] = useState(false);
  const [comparisonHistory, setComparisonHistory] = useState<UserBook[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [fadeAnim] = useState(new Animated.Value(0));
  const [slideAnim] = useState(new Animated.Value(100));
  const [showComparison, setShowComparison] = useState(false);

  useEffect(() => {
    if (sentiment) {
      fetchRatedBooks();
    }
  }, [sentiment]);

  useEffect(() => {
    if (isVisible) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 0,
          tension: 50,
          friction: 7,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [isVisible]);

  const fetchRatedBooks = async () => {
    try {
      const { data } = await supabase
        .from("user_books")
        .select(
          `
          *,
          book:books (*)
        `,
        )
        .eq("user_id", user?.id)
        .eq("user_sentiment", sentiment)
        .order("rating", { ascending: false });

      if (data && data.length > 0) {
        setOrderedBookRatings(data);
        setCurrentComparisonBook(getRandomBook(data));
      } else {
        setShowReview(true);
      }
    } catch (error) {
      console.error("Error fetching rated books:", error);
    }
  };

  const getRandomBook = (books: any[]) => {
    return books[Math.floor(Math.random() * books.length)];
  };

  // Step 1: Get user sentiment and fetch comparison books
  const handleSentimentSelect = async (selected: Sentiment) => {
    setSentiment(selected);
    
    try {
      // Fetch books with same sentiment for comparison
      const { data: comparisonBooks } = await supabase
        .from('user_books')
        .select('*, book:books(*)')
        .eq('user_id', user?.id)
        .eq('user_sentiment', selected)
        .order('rating', { ascending: false });

      if (!comparisonBooks || comparisonBooks.length === 0) {
        // First book in this sentiment category
        const range = sentimentRanges[selected];
        const averageRating = (range.min + range.max) / 2;
        
        // Create book entry with average rating
        const bookId = await ensureBookExists(book);
        await supabase.from("user_books").insert({
          user_id: user?.id,
          book_id: bookId,
          rating: averageRating,
          status: "READ",
          user_sentiment: selected,
          tied_book_ids: []
        });
        
        setShowReview(true);
      } else {
        setOrderedBookRatings(comparisonBooks);
        setCurrentComparisonBook(getRandomBook(comparisonBooks));
        setShowComparison(true);
      }
    } catch (error) {
      console.error('Error fetching comparison books:', error);
      showToast.error({
        title: "Error",
        message: "Failed to load comparison books"
      });
    }
  };

  const fetchUserRatedBooks = async () => {
    // Fetch and sort user's rated books
    // Set orderedBookRatings
  };

  const handlePreferCurrent = async () => {
    if (!currentComparisonBook) return;

    // Add to comparison history for undo
    setComparisonHistory(prev => [...prev, currentComparisonBook]);

    // Find next book to compare with
    const currentIndex = orderedBookRatings.findIndex(b => b.id === currentComparisonBook.id);
    const nextIndex = currentIndex - 1; // Move up the list since current book was better

    if (nextIndex >= 0) {
      // Continue comparisons with next book
      setCurrentComparisonBook(orderedBookRatings[nextIndex]);
    } else {
      // Reached the top of the list
      setShowReview(true);
      calculateFinalRating('top');
    }
  };

  const handlePreferComparison = async () => {
    if (!currentComparisonBook) return;

    setComparisonHistory(prev => [...prev, currentComparisonBook]);

    // Find next book to compare with
    const currentIndex = orderedBookRatings.findIndex(b => b.id === currentComparisonBook.id);
    const nextIndex = currentIndex + 1; // Move down the list since comparison book was better

    if (nextIndex < orderedBookRatings.length) {
      // Continue comparisons with next book
      setCurrentComparisonBook(orderedBookRatings[nextIndex]);
    } else {
      // Reached the bottom of the list
      setShowReview(true);
      calculateFinalRating('bottom');
    }
  };

  const calculateFinalRating = (position: 'top' | 'bottom' | 'middle') => {
    const range = sentimentRanges[sentiment!];
    let rating: number;

    switch (position) {
      case 'top':
        // Best book in this sentiment category
        rating = range.max;
        break;
      case 'bottom':
        // Worst book in this sentiment category
        rating = range.min;
        break;
      case 'middle':
        // Somewhere in between - calculate based on position
        const index = comparisonHistory.length;
        const totalBooks = orderedBookRatings.length;
        const position = index / totalBooks;
        rating = range.min + (range.max - range.min) * position;
        break;
    }

    return rating;
  };

  const handleEquallyGood = async () => {
    if (!currentComparisonBook) return;
    await handleTooTough(); // This creates a tie between the books
  };

  const handleSkip = () => {
    const newBook = getRandomBook(
      orderedBookRatings.filter((b) => b.id !== currentComparisonBook?.id),
    );
    setCurrentComparisonBook(newBook);
  };

  const handleTooTough = async () => {
    if (!currentComparisonBook || !sentiment || !user) return;

    const tiedRating = calculateTiedRating();
    if (!tiedRating) return;

    try {
      const bookId = await ensureBookExists(book);
      
      // First create the new book entry
      const { error: insertError } = await supabase
        .from("user_books")
        .insert({
          user_id: user.id,
          book_id: bookId,
          rating: tiedRating,
          status: "READ",
          user_sentiment: sentiment,
          tied_book_ids: [currentComparisonBook.book_id]
        });

      if (insertError) throw insertError;

      // Update the comparison book to be tied with the new book
      const { error: tieError } = await supabase
        .from("user_books")
        .update({
          tied_book_ids: [...(currentComparisonBook.tied_book_ids || []), bookId]
        })
        .eq("book_id", currentComparisonBook.book_id)
        .eq("user_id", user.id);


      if (tieError) throw tieError;

      showToast.success({
        title: "Books tied",
        message: "These books will maintain the same rating"
      });

      setShowReview(true);
    } catch (error) {
      console.error("Error handling tied books:", error);
      showToast.error({
        title: "Error",
        message: "Failed to tie books. Please try again."
      });
    }
  };

  const handleSubmit = async () => {
    if (!sentiment || !user) return;

    setIsSubmitting(true);
    try {
      const bookId = await ensureBookExists(book);
      const finalRatings = calculateFinalRatings();

      // Group tied books together to ensure they get the same rating
      const tiedGroups = new Map<number, string[]>();
      orderedBookRatings.forEach(book => {
        if (book.tied_book_ids?.length > 0) {
          const rating = finalRatings.find(r => r.bookId === book.book_id)?.rating;
          if (rating) {
            const group = tiedGroups.get(rating) || [];
            tiedGroups.set(rating, [...group, book.book_id, ...book.tied_book_ids]);
          }
        }
      });

      // Update all books, ensuring tied books get the same rating
      await Promise.all(
        finalRatings.map(async (rating) => {
          const tiedGroup = Array.from(tiedGroups.values())
            .find(group => group.includes(rating.bookId));
          
          await supabase.from("user_books").upsert({
            user_id: user.id,
            book_id: rating.bookId,
            rating: rating.rating,
            status: "READ",
            user_sentiment: sentiment,
            review: rating.bookId === bookId ? review : undefined,
            tied_book_ids: tiedGroup || []
          });
        })
      );

      showToast.success({
        title: "Rating saved!",
        message: `You ${sentiment} this book!`
      });

      onClose();
    } catch (error) {
      console.error("Error submitting review:", error);
      setError("Failed to submit review. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const calculateFinalRatings = () => {
    if (!sentiment) return [];

    const sentimentRanges = {
      loved: { min: 7, max: 10 },
      liked: { min: 5, max: 7 },
      hated: { min: 1, max: 5 },
    };

    const range = sentimentRanges[sentiment];
    const totalBooks = orderedBookRatings.length + 1;
    const interval = (range.max - range.min) / (totalBooks - 1);

    return orderedBookRatings.map((book, index) => ({
      bookId: book.book_id,
      rating: Number((range.min + interval * index).toFixed(1)),
    }));
  };

  const calculateTiedBooks = () => {
    const tiedBooksMap = new Map<string, string[]>();

    if (orderedBookRatings.length <= 1) return tiedBooksMap;

    let currentTiedGroup: string[] = [];
    let previousRating: number | null = null;

    [...orderedBookRatings].forEach((book) => {
      if (previousRating === null) {
        previousRating = book.rating;
        currentTiedGroup = [book.book_id];
      } else if (book.rating === previousRating) {
        currentTiedGroup.push(book.book_id);
      } else {
        // Store tied group if more than one book
        if (currentTiedGroup.length > 1) {
          currentTiedGroup.forEach((bookId) => {
            tiedBooksMap.set(
              bookId,
              currentTiedGroup.filter((id) => id !== bookId),
            );
          });
        }
        currentTiedGroup = [book.book_id];
        previousRating = book.rating;
      }
    });

    return tiedBooksMap;
  };

  const calculateTiedRating = () => {
    if (!sentiment || !currentComparisonBook) return null;

    const range = sentimentRanges[sentiment];
    // For tied books, use the midpoint of their would-be ratings
    return (range.min + range.max) / 2;
  };

  const renderSentimentButton = (type: Sentiment, color: string) => {
    if (!type) return null;

    const labels = {
      loved: "I loved it!",
      liked: "I liked it",
      hated: "I didn't like it",
    };

    return (
      <Pressable
        style={[
          styles.sentimentButton,
          { backgroundColor: color },
          sentiment === type && styles.sentimentButtonSelected,
        ]}
        onPress={() => handleSentimentSelect(type)}
      >
        {sentiment === type && (
          <View style={styles.checkmark}>
            <Check size={24} color="#fff" />
          </View>
        )}
        <Text style={styles.sentimentText}>{labels[type]}</Text>
      </Pressable>
    );
  };

  const ensureBookExists = async (googleBook: GoogleBook): Promise<string> => {
    try {
      // Check if book exists
      const { data: existingBook } = await supabase
        .from("books")
        .select("id")
        .eq("google_book_id", googleBook.id)
        .single();

      if (existingBook) {
        return existingBook.id;
      }

      // If not exists, create it
      const { data: newBook, error } = await supabase
        .from("books")
        .insert({
          google_book_id: googleBook.id,
          title: googleBook.volumeInfo.title,
          author: googleBook.volumeInfo.authors?.[0] || "Unknown",
          publisher: googleBook.volumeInfo.publisher,
          published_date: googleBook.volumeInfo.publishedDate,
          description: googleBook.volumeInfo.description,
          cover_url: googleBook.volumeInfo.imageLinks?.thumbnail,
          category: googleBook.volumeInfo.categories?.[0] || "Uncategorized"
        })
        .select("id")
        .single();

      if (error) throw error;
      return newBook.id;
    } catch (error) {
      console.error("Error ensuring book exists:", error);
      throw error;
    }
  };

  // Move the auth check before the modal content
  if (!user) {
    return (
      <Modal
        visible={isVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={onClose}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <AuthGuard message="Sign in to rate books" />
          </View>
        </View>
      </Modal>
    );
  }

  // Initial sentiment selection view
  const renderSentimentSelection = () => (
    <View style={styles.sentimentContainer}>
      <Text style={styles.sectionTitle}>How was it?</Text>
      <View style={styles.sentimentOptions}>
        <Pressable 
          style={[styles.sentimentButton, sentiment === 'loved' && styles.selectedSentiment]}
          onPress={() => handleSentimentSelect('loved')}
        >
          <Text>I loved it!</Text>
        </Pressable>
        <Pressable 
          style={[styles.sentimentButton, sentiment === 'liked' && styles.selectedSentiment]}
          onPress={() => handleSentimentSelect('liked')}
        >
          <Text>I liked it</Text>
        </Pressable>
        <Pressable 
          style={[styles.sentimentButton, sentiment === 'hated' && styles.selectedSentiment]}
          onPress={() => handleSentimentSelect('hated')}
        >
          <Text>Not for me</Text>
        </Pressable>
      </View>
    </View>
  );

  // Comparison view asking which book they preferred
  const renderComparisonView = () => (
    <View style={styles.comparisonContainer}>
      <Text style={styles.sectionTitle}>Which did you prefer?</Text>
      <View style={styles.booksContainer}>
        {/* Left book (Google Books result) */}
        <Pressable onPress={handlePreferCurrent}>
          <CachedImage
            uri={book.volumeInfo.imageLinks?.thumbnail || ''}
            style={styles.bookCover}
          />
          <Text style={styles.bookTitle}>{book.volumeInfo.title}</Text>
        </Pressable>

        {/* Right book (from Supabase) */}
        {currentComparisonBook && (
          <Pressable onPress={handlePreferComparison}>
            <CachedImage
              uri={currentComparisonBook.book.cover_url}
              style={styles.bookCover}
            />
            <Text style={styles.bookTitle}>{currentComparisonBook.book.title}</Text>
          </Pressable>
        )}

        <View style={styles.comparisonActions}>
          <Pressable onPress={handleEquallyGood}>
            <Text>Equally good</Text>
          </Pressable>
          <Pressable onPress={handleSkip}>
            <Text>Skip</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );

  return (
    <Modal
      visible={isVisible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <Animated.View style={[styles.modalContainer, { opacity: fadeAnim }]}>
        <Animated.View
          style={[
            styles.modalContent,
            { transform: [{ translateY: slideAnim }] },
          ]}
        >
          {/* Add loading indicator */}
          {isLoading && (
            <View style={styles.loadingOverlay}>
              <ActivityIndicator
                size="large"
                color="#007AFF"
              />
              <Text style={styles.loadingText}>Processing...</Text>
            </View>
          )}

          {/* Add error display */}
          {error && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>{book.volumeInfo.title}</Text>
            <Text style={styles.category}>
              {book.volumeInfo.categories?.[0]}
            </Text>
          </View>

          {/* Updated Sentiment Selection */}
          {!sentiment && (
            renderSentimentSelection()
          )}

          {/* Book Comparison */}
          {!showComparison && sentiment && !showReview && orderedBookRatings.length > 0 && currentComparisonBook && (
            renderComparisonView()
          )}

          {/* Review Section */}
          {showReview && (
            <View style={styles.reviewContainer}>
              <Text style={styles.sectionTitle}>Leave a review</Text>
              <TextInput
                style={styles.reviewInput}
                multiline
                numberOfLines={4}
                placeholder="Share your thoughts about this book..."
                value={review}
                onChangeText={setReview}
              />
              <Pressable
                style={[
                  styles.submitButton,
                  isSubmitting && styles.submitButtonDisabled,
                ]}
                onPress={handleSubmit}
                disabled={isSubmitting}
              >
                <Text style={styles.submitButtonText}>
                  {isSubmitting ? "Submitting..." : "Submit Review"}
                </Text>
              </Pressable>
            </View>
          )}
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: "#fff",
    borderRadius: 16,
    width: "90%",
    maxWidth: 400,
    padding: 20,
  },
  header: {
    alignItems: "center",
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 4,
  },
  category: {
    fontSize: 16,
    color: "#666",
  },
  sentimentContainer: {
    alignItems: "center",
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "600",
    marginBottom: 16,
  },
  sentimentOptions: {
    flexDirection: "row",
    justifyContent: "space-around",
    width: "100%",
    gap: 12,
  },
  sentimentButton: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  },
  sentimentButtonSelected: {
    transform: [{ scale: 1.1 }],
  },
  checkmark: {
    position: "absolute",
    top: "50%",
    left: "50%",
    transform: [{ translateX: -12 }, { translateY: -12 }],
  },
  sentimentText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
    textAlign: "center",
    marginTop: 8,
  },
  comparisonContainer: {
    alignItems: "center",
    gap: 16,
  },
  comparisonBooks: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  bookChoice: {
    flex: 1,
    backgroundColor: "#f8f8f8",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    minHeight: 120,
    justifyContent: "center",
  },
  orText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#666",
  },
  actionButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    marginTop: 16,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    padding: 8,
  },
  actionText: {
    color: "#007AFF",
    fontSize: 16,
  },
  reviewContainer: {
    gap: 16,
  },
  reviewInput: {
    backgroundColor: "#f8f8f8",
    borderRadius: 8,
    padding: 12,
    minHeight: 120,
    textAlignVertical: "top",
    fontSize: 16,
  },
  submitButton: {
    backgroundColor: "#007AFF",
    borderRadius: 8,
    padding: 16,
    alignItems: "center",
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  loadingOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(255,255,255,0.9)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1000,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: "#666",
  },
  errorContainer: {
    backgroundColor: "#FFE5E5",
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  errorText: {
    color: "#D32F2F",
    fontSize: 14,
  },
  bookCover: {
    width: 100,
    height: 150,
    borderRadius: 8,
    marginBottom: 8,
  },
  authPromptContainer: {
    alignItems: 'center',
    padding: 24,
  },
  authTitle: {
    fontSize: 24,
    fontWeight: '600',
    marginBottom: 12,
    textAlign: 'center',
  },
  authDescription: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
  },
  signInButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  signInButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  container: {
    alignItems: 'center',
    padding: 24,
  },
  question: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 16,
  },
  sentimentButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  button: {
    backgroundColor: '#f8f8f8',
    padding: 12,
    borderRadius: 8,
  },
  selectedSentiment: {
    backgroundColor: '#007AFF',
    color: '#fff',
  },
  booksContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  comparisonActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginTop: 16,
  },
  bookTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 8,
  },
});

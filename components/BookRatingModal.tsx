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
  onSuccess?: () => void;
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
  loved: { min: 7.1, max: 10.0 },
  liked: { min: 5.1, max: 7.0 },
  hated: { min: 1.0, max: 5.0 }
};

// Add these type definitions at the top with other types
type ShelfStatus = "READ" | "WANT_TO_READ";

interface BookRating {
  bookId: string;
  rating: number;
}

interface UserBook {
  user_id: string;  // UUID
  book_id: number;  // bigint/int8
  status: 'READ' | 'WANT_TO_READ';
  rating: number | null;
  review: string | null;
  user_sentiment: 'loved' | 'liked' | 'hated' | null;
}

export default function BookRatingModal({
  book,
  isVisible,
  onClose,
  onSuccess,
}: Props) {
  const { supabase } = useSupabase();
  const { user } = useAuth();
  const router = useRouter();
  const [sentiment, setSentiment] = useState<'loved' | 'liked' | 'hated' | null>(null);
  const [orderedBookRatings, setOrderedBookRatings] = useState<UserBook[]>([]);
  const [currentComparisonBook, setCurrentComparisonBook] = useState<{
    id: number;
    title: string;
    author: string;
  } | null>(null);
  const [review, setReview] = useState("");
  const [showReview, setShowReview] = useState(false);
  const [comparisonHistory, setComparisonHistory] = useState<UserBook[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [fadeAnim] = useState(new Animated.Value(0));
  const [slideAnim] = useState(new Animated.Value(100));
  const [showComparison, setShowComparison] = useState(false);
  const [newBookData, setNewBookData] = useState<any>(null);
  const [availableComparisonBooks, setAvailableComparisonBooks] = useState<UserBook[]>([]);
  const [lowerBound, setLowerBound] = useState<number | null>(null);
  const [upperBound, setUpperBound] = useState<number | null>(null);
  const [comparedBooks, setComparedBooks] = useState<Set<number>>(new Set());
  const [remainingComparisons, setRemainingComparisons] = useState<UserBook[]>([]);

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

  useEffect(() => {
    const addBookToDatabase = async () => {
      if (!isVisible || !book) return;

      try {
        // Check if book already exists
        const { data: existingBook } = await supabase
          .from('books')
          .select('id')
          .eq('google_book_id', book.id);

        if (!existingBook || existingBook.length === 0) {
          // Book doesn't exist, add it
          const newBookData = {
            google_book_id: book.id,
            title: book.volumeInfo.title,
            author: book.volumeInfo.authors?.[0] || 'Unknown',
            publisher: book.volumeInfo.publisher,
            published_date: book.volumeInfo.publishedDate,
            description: book.volumeInfo.description,
            cover_url: book.volumeInfo.imageLinks?.thumbnail,
            category: book.volumeInfo.categories?.[0] || null,
          };

          const { error } = await supabase
            .from('books')
            .insert(newBookData);

          if (error) throw error;
        }
      } catch (error) {
        console.error('Error adding book to database:', error);
        showToast.error({
          title: 'Error',
          message: 'Failed to initialize book data'
        });
      }
    };

    addBookToDatabase();
  }, [isVisible, book]);

  const getRandomBook = (books: any[]) => {
    return books[Math.floor(Math.random() * books.length)];
  };

  // Handle sentiment selection
  const handleSentimentSelect = async (newSentiment: 'loved' | 'liked' | 'hated') => {
    setSentiment(newSentiment);
    setIsLoading(true);
    setComparedBooks(new Set());
    
    try {
      const { data: existingBooks, error } = await supabase
        .from('user_books')
        .select(`
          *,
          book:books (
            id,
            title,
            author
          )
        `)
        .eq('user_id', user.id)
        .eq('user_sentiment', newSentiment)
        .order('rating', { ascending: false });

      if (error) throw error;

      if (existingBooks && existingBooks.length > 0) {
        setOrderedBookRatings(existingBooks);
        setRemainingComparisons(existingBooks); // Initialize remaining comparisons
        
        // Start with a random book
        const randomIndex = Math.floor(Math.random() * existingBooks.length);
        const comparisonBook = existingBooks[randomIndex];
        
        setCurrentComparisonBook({
          id: comparisonBook.book.id,
          title: comparisonBook.book.title,
          author: comparisonBook.book.author
        });
        setShowComparison(true);
      } else {
        setShowReview(true);
      }
    } catch (error) {
      console.error('Error fetching comparison books:', error);
      setShowReview(true);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchUserRatedBooks = async () => {
    // Fetch and sort user's rated books
    // Set orderedBookRatings
  };

  const handlePreferComparison = async () => {
    if (!currentComparisonBook || !remainingComparisons.length) return;

    setComparedBooks(prev => new Set([...prev, currentComparisonBook.id]));

    // Find current comparison book's index in the FULL ordered list
    const currentIndex = orderedBookRatings.findIndex(
      b => b.book_id === currentComparisonBook.id
    );

    console.log('User preferred new book over existing:', {
      newBook: book.volumeInfo.title,
      existingBook: currentComparisonBook.title,
      existingBookCurrentIndex: currentIndex,
      existingBookRating: orderedBookRatings[currentIndex]?.rating,
      fullOrderedList: orderedBookRatings.map(b => ({
        id: b.book_id,
        rating: b.rating,
        title: b.book.title
      }))
    });

    // Get only the books rated higher than current comparison
    const higherRatedBooks = remainingComparisons.filter(b => 
      b.book_id !== currentComparisonBook.id && 
      b.rating > orderedBookRatings[currentIndex].rating
    );

    if (higherRatedBooks.length === 0) {
      // We preferred the new book over the existing book,
      // and there are no more higher rated books to compare against
      const finalPosition = currentIndex;
      console.log('Found final position:', {
        reason: 'New book preferred over existing, no higher rated books left',
        newBookGoesBeforeId: currentComparisonBook.id,
        finalPosition,
        currentIndex,
        existingBookTitle: currentComparisonBook.title
      });
      await updateAllBookRatings(finalPosition);
      setShowComparison(false);
      setShowReview(true);
      return;
    }

    // Update remaining comparisons and pick next book
    setRemainingComparisons(higherRatedBooks);
    
    if (higherRatedBooks.length > 0) {
      const randomIndex = Math.floor(Math.random() * higherRatedBooks.length);
      const nextComparisonBook = higherRatedBooks[randomIndex];
      
      console.log('Moving to next comparison:', {
        nextBook: nextComparisonBook.book.title,
        remainingOptions: higherRatedBooks.length
      });
      
      setCurrentComparisonBook({
        id: nextComparisonBook.book_id,
        title: nextComparisonBook.book.title,
        author: nextComparisonBook.book.author
      });
    }
  };

  const handlePreferCurrent = async () => {
    if (!currentComparisonBook || !remainingComparisons.length) return;

    setComparedBooks(prev => new Set([...prev, currentComparisonBook.id]));

    // Find current comparison book's index in the FULL ordered list
    const currentIndex = orderedBookRatings.findIndex(
      b => b.book_id === currentComparisonBook.id
    );

    console.log('User preferred existing book over new:', {
      existingBook: currentComparisonBook.title,
      newBook: book.volumeInfo.title,
      existingBookCurrentIndex: currentIndex,
      existingBookRating: orderedBookRatings[currentIndex]?.rating,
      fullOrderedList: orderedBookRatings.map(b => ({
        id: b.book_id,
        rating: b.rating,
        title: b.book.title
      }))
    });

    const lowerRatedBooks = remainingComparisons.slice(currentIndex + 1);

    if (lowerRatedBooks.length === 0) {
      // We preferred the existing book over the new book,
      // so it should go one position LOWER than the current book
      const finalPosition = currentIndex + 1;
      console.log('Found final position:', {
        reason: 'Existing book preferred over new, no lower rated books left',
        newBookGoesAfterId: currentComparisonBook.id,
        finalPosition,
        currentIndex,
        existingBookTitle: currentComparisonBook.title
      });
      await updateAllBookRatings(finalPosition);
      setShowComparison(false);
      setShowReview(true);
    } else {
      // Update remaining comparisons to only include lower rated books
      setRemainingComparisons(lowerRatedBooks);
      
      // Pick a random book from remaining lower-rated books
      const randomIndex = Math.floor(Math.random() * lowerRatedBooks.length);
      const nextComparisonBook = lowerRatedBooks[randomIndex];
      
      console.log('Moving to next comparison:', {
        nextBook: nextComparisonBook.book.title,
        remainingOptions: lowerRatedBooks.length
      });
      
      setCurrentComparisonBook({
        id: nextComparisonBook.book_id,
        title: nextComparisonBook.book.title,
        author: nextComparisonBook.book.author
      });
    }
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

  const calculateRatings = (sentiment: 'loved' | 'liked' | 'hated', orderedBooks: any[]): (number | null)[] => {
    const ranges = {
      loved: { min: 7.1, max: 10.0 },
      liked: { min: 5.1, max: 7.0 },
      hated: { min: 1.0, max: 5.0 }
    };

    const range = ranges[sentiment];
    const totalBooks = orderedBooks.length;
    
    if (totalBooks === 1) {
      // First book in category gets null rating
      return [null];
    }

    // Calculate interval between ratings
    const interval = (range.max - range.min) / (totalBooks - 1);
    
    // Return array of ratings, starting from highest to lowest
    // orderedBooks should be in descending order (best to worst)
    return orderedBooks.map((_, index) => {
      // Calculate rating: max - (interval * index)
      // This gives highest rating to first book, lowest to last
      const rating = Number((range.max - (interval * index)).toFixed(1));
      return rating;
    });
  };

  const handleSubmit = async () => {
    if (!user || !sentiment) return;

    setIsSubmitting(true);
    setError(null);

    try {
      // Get the book's ID from the database
      const { data: bookData } = await supabase
        .from('books')
        .select('id')
        .eq('google_book_id', book.id)
        .single();

      if (!bookData) throw new Error('Book not found');

      // First try to update the review for an existing book
      const { data: updateData, error: updateError } = await supabase
        .from('user_books')
        .update({
          review: review.trim() || null,
          updated_at: new Date().toISOString()
        })
        .eq('book_id', bookData.id)
        .eq('user_id', user.id)
        .select();

      // If update failed because book doesn't exist yet, insert new row
      if (updateError?.code === '23503' || !updateData || updateData.length === 0) {
        console.log('Book not found in user_books, inserting new row');
        
        const { error: insertError } = await supabase
          .from('user_books')
          .insert({
            user_id: user.id,
            book_id: bookData.id,
            rating: null, // First book in category gets null rating
            review: review.trim() || null,
            user_sentiment: sentiment,
            status: 'READ',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            tied_with_books: null,
            tied_book_ids: null
          });

        if (insertError) throw insertError;
      }

      showToast.success({
        title: 'Success',
        message: 'Your review has been saved'
      });

      onSuccess?.();
      onClose();
    } catch (error) {
      console.error('Error in submission process:', error);
      setError('Failed to save review');
      showToast.error({
        title: 'Error',
        message: 'Failed to save review'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const calculateTiedBooks = () => {
    const tiedBooksMap = new Map<string, string[]>();

    if (orderedBookRatings.length <= 1) return tiedBooksMap;

    let currentTiedGroup: string[] = [];
    let previousRating: number | null = null;

    [...orderedBookRatings].forEach((book) => {
      if (previousRating === null) {
        previousRating = book.rating;
        currentTiedGroup = [book.book_id.toString()];
      } else if (book.rating === previousRating) {
        currentTiedGroup.push(book.book_id.toString());
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
        currentTiedGroup = [book.book_id.toString()];
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

  // Add this function to update all book ratings
  const updateAllBookRatings = async (newBookPosition: number) => {
    try {
      // Get the book ID from the database first
      const { data: bookData } = await supabase
        .from('books')
        .select('id')
        .eq('google_book_id', book.id)
        .single();

      if (!bookData) {
        throw new Error('Book not found in database');
      }

      // Get all books in this sentiment category
      const { data: existingBooks } = await supabase
        .from('user_books')
        .select('*')
        .eq('user_id', user.id)
        .eq('user_sentiment', sentiment)
        .order('rating', { ascending: false });

      if (!existingBooks) {
        throw new Error('Failed to fetch existing books');
      }

      console.log('Current books in category:', existingBooks.map(b => ({
        id: b.book_id,
        rating: b.rating
      })));

      // Create new ordered list with the new book in the correct position
      // Note: newBookPosition represents where the new book should go in the rating order
      // If newBookPosition is 1, it should go between the first and second book
      const updatedOrderedBooks = [
        ...existingBooks.slice(0, newBookPosition),
        { book_id: bookData.id }, // New book
        ...existingBooks.slice(newBookPosition)
      ];

      console.log('New book order:', {
        position: newBookPosition,
        order: updatedOrderedBooks.map(b => b.book_id),
        explanation: `Inserting book ${bookData.id} at position ${newBookPosition}`
      });

      // Calculate new ratings for all books
      const newRatings = calculateRatings(sentiment!, updatedOrderedBooks);

      console.log('New ratings calculated:', newRatings.map((rating, index) => ({
        bookId: updatedOrderedBooks[index].book_id,
        rating
      })));

      // First insert the new book with its calculated rating
      const { error: insertError } = await supabase
        .from('user_books')
        .insert({
          user_id: user.id,
          book_id: bookData.id,
          rating: newRatings[newBookPosition], // Use newBookPosition to get correct rating
          user_sentiment: sentiment,
          status: 'READ',
          review: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          tied_with_books: null,
          tied_book_ids: null
        });

      if (insertError) throw insertError;

      // Then update all existing books with their new ratings
      await Promise.all(
        existingBooks.map((book, index) => {
          // If the book's position is after or at the insertion point,
          // its new rating is one position later in the newRatings array
          const newIndex = index >= newBookPosition ? index + 1 : index;
          return supabase
            .from('user_books')
            .update({
              rating: newRatings[newIndex],
              updated_at: new Date().toISOString()
            })
            .eq('book_id', book.book_id)
            .eq('user_id', user.id);
        })
      );

      console.log('Successfully updated all book ratings');
    } catch (error) {
      console.error('Error updating book ratings:', error);
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
      <Text style={styles.question}>Which book did you prefer?</Text>
      {isLoading ? (
        <ActivityIndicator size="large" color="#007AFF" />
      ) : (
        <View style={styles.booksContainer}>
          {/* Left Book Card */}
          <Pressable 
            style={({ pressed }) => [
              styles.bookCard,
              styles.clickableCard,
              pressed && styles.cardPressed
            ]}
            onPress={handlePreferCurrent}
          >
            <View style={styles.bookContent}>
              <Text style={styles.bookTitle} numberOfLines={2}>
                {currentComparisonBook?.title || 'Loading...'}
              </Text>
              <Text style={styles.bookAuthor} numberOfLines={1}>
                {currentComparisonBook?.author || ''}
              </Text>
            </View>
          </Pressable>

          {/* Right Book Card */}
          <Pressable 
            style={({ pressed }) => [
              styles.bookCard,
              styles.clickableCard,
              pressed && styles.cardPressed
            ]}
            onPress={handlePreferComparison}
          >
            <View style={styles.bookContent}>
              <Text style={styles.bookTitle} numberOfLines={2}>
                {book.volumeInfo.title}
              </Text>
              <Text style={styles.bookAuthor} numberOfLines={1}>
                {book.volumeInfo.authors?.[0]}
              </Text>
            </View>
          </Pressable>
        </View>
      )}

      <Pressable 
        style={styles.tooToughButton}
        onPress={handleTooTough}
      >
        <Text style={styles.tooToughText}>too tough</Text>
      </Pressable>
    </View>
  );

  // Add the review component render
  const renderReviewView = () => (
    <View style={styles.container}>
      <Text style={styles.question}>Add a review (optional)</Text>
      <TextInput
        style={styles.reviewInput}
        value={review}
        onChangeText={setReview}
        placeholder="Write your review..."
        multiline
      />
      <Pressable 
        style={[
          styles.submitButton,
          isSubmitting && styles.submitButtonDisabled
        ]}
        onPress={handleSubmit}
        disabled={isSubmitting}
      >
        {isSubmitting ? (
          <ActivityIndicator size="small" color="#FFFFFF" />
        ) : (
          <Text style={styles.submitButtonText}>Submit</Text>
        )}
      </Pressable>
    </View>
  );

  const renderContent = () => {
    if (!sentiment) {
      // Show sentiment selection first
      return (
        <View style={styles.container}>
          <Text style={styles.question}>What did you think?</Text>
          <View style={styles.sentimentButtons}>
            <Pressable
              style={[styles.button, sentiment === 'loved' && styles.selectedSentiment]}
              onPress={() => handleSentimentSelect('loved')}
            >
              <Text>I loved it</Text>
            </Pressable>
            <Pressable
              style={[styles.button, sentiment === 'liked' && styles.selectedSentiment]}
              onPress={() => handleSentimentSelect('liked')}
            >
              <Text>I liked it</Text>
            </Pressable>
            <Pressable
              style={[styles.button, sentiment === 'hated' && styles.selectedSentiment]}
              onPress={() => handleSentimentSelect('hated')}
            >
              <Text>Not for me</Text>
            </Pressable>
          </View>
        </View>
      );
    }

    if (showComparison) {
      return renderComparisonView();
    }

    if (showReview) {
      return renderReviewView();
    }

    return null;
  };

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

          {renderContent()}
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
    padding: 20,
    width: '100%',
    alignItems: 'center',
  },
  question: {
    fontSize: 24,
    fontWeight: '600',
    marginBottom: 20,
    textAlign: 'center',
  },
  booksContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 20,
    gap: 15,
  },
  bookCard: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    padding: 16,
    height: 120,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    margin: 8,
  },
  bookContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  bookTitle: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 4,
    maxWidth: '100%',
  },
  bookAuthor: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  tooToughButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    marginTop: 10,
  },
  tooToughText: {
    fontSize: 12,
    color: '#666',
    textTransform: 'lowercase',
  },
  vsText: {
    marginHorizontal: 10,
    fontSize: 16,
    fontWeight: '600',
  },
  comparisonActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  comparisonButton: {
    backgroundColor: '#007AFF',
    padding: 10,
    borderRadius: 8,
    flex: 1,
    marginHorizontal: 5,
    alignItems: 'center',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  reviewContainer: {
    gap: 16,
  },
  reviewInput: {
    width: '100%',
    minHeight: 100,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    marginVertical: 16,
    textAlignVertical: 'top',
  },
  submitButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
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
  tooToughContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tooToughButton: {
    backgroundColor: '#007AFF',
    padding: 10,
    borderRadius: 8,
  },
  tooToughText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  clickableCard: {
    backgroundColor: '#ffffff',
  },
  cardPressed: {
    backgroundColor: '#f0f0f0',
    transform: [{ scale: 0.98 }],
  },
});

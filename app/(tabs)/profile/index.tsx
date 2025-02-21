import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState, useEffect } from 'react';
import { ScrollView, StyleSheet, View, Share, ActivityIndicator, Pressable } from 'react-native';
import { Avatar, Button, IconButton, Surface, Text, ProgressBar } from 'react-native-paper';
import * as ImagePicker from 'expo-image-picker';
import { decode } from 'base64-arraybuffer';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';

import MenuModal from '@/components/MenuModal';
import { useSupabase } from '@/hooks/useSupabase';
import { useAuth } from '@/hooks/useAuth';
import { showToast } from '@/components/Toast';
import AuthGuard from '@/components/AuthGuard';

// Custom theme colors with slight adjustments for better aesthetics
const colors = {
  desertSand: '#DF5B39F',
  warmBrown: '#A27C62',
  lightKhaki: '#F2EBD4',
  siennaBrown: '#9A634E',
  goldenSand: '#EAD0B3',
  softBrown: 'rgba(162, 124, 98, 0.1)',
};

export default function ProfileScreen() {
  const [menuVisible, setMenuVisible] = useState(false);
  const router = useRouter();
  const { supabase } = useSupabase();
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [memberSince, setMemberSince] = useState<string>('');
  const [favoriteBook, setFavoriteBook] = useState('-');
  const [stats, setStats] = useState({
    followers: 0,
    booksRead: 0,
    ranking: '-' as number | string,
    booksToRead: 0
  });

  // Add state for user's goal
  const [userGoal, setUserGoal] = useState<number | null>(null);
  const [goalProgress, setGoalProgress] = useState(0);

  // Replace router.addListener with useFocusEffect
  useFocusEffect(
    React.useCallback(() => {
      if (user) {
        fetchProfile();
      }
    }, [user])
  );

  useEffect(() => {
    let isMounted = true;

    const loadData = async () => {
      if (!user || !isMounted) {
        if (isMounted) {
          setIsLoading(false);
        }
        return;
      }

      try {
        setIsLoading(true);
        
        const profilePromise = fetchProfile();
        const statsPromise = fetchStats();
        
        await Promise.all([
          profilePromise.catch(err => {
            console.error('Profile promise failed:', err);
            return null;
          }), 
          statsPromise.catch(err => {
            console.error('Stats promise failed:', err);
            return null;
          })
        ]);
        
        if (isMounted) {
          setIsLoading(false);
        }
      } catch (error) {
        console.error('Error in loadData:', error);
        if (isMounted) {
          setIsLoading(false);
        }
        showToast.error({
          title: "Error",
          message: "Failed to load profile data"
        });
      }
    };

    loadData();

    return () => {
      isMounted = false;
    };
  }, [user]);

  useEffect(() => {
    const fetchFavoriteBook = async () => {
      if (!user) return;
      
      type BookData = {
        rating: number;
        book: {
          title: string;
        };
      };

      const { data, error } = await supabase
        .from('user_books')
        .select(`
          rating,
          book:books (
            title
          )
        `)
        .eq('user_id', user.id)
        .eq('status', 'READ')
        .order('rating', { ascending: false })
        .limit(1)
        .single<BookData>();

      if (!error && data?.book?.title) {
        setFavoriteBook(data.book.title);
      }
    };
    fetchFavoriteBook();
  }, [user]);

  const fetchProfile = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) throw error;
      
      setAvatarUrl(data.avatar_url);
      setMemberSince(new Date(data.created_at).toLocaleDateString('en-US', {
        month: 'long',
        year: 'numeric'
      }));
    } catch (error) {
      console.error('Error in fetchProfile:', error);
      throw error;
    }
  };

  const fetchStats = async () => {
    if (!user) return;

    try {
      // Get followers count (people following this user)
      const { count: followersCount, error: followersError } = await supabase
        .from('friendships')
        .select('count', { count: 'exact' })
        .eq('friend_id', user.id);

      if (followersError) throw followersError;

      // Get books read count
      const { count: booksReadCount, error: booksError } = await supabase
        .from('user_books')
        .select('count', { count: 'exact' })
        .eq('user_id', user.id)
        .eq('status', 'READ');

      if (booksError) throw booksError;

      const { count: booksToReadCount, error: booksToReadError } = await supabase
        .from('user_books')
        .select('count', { count: 'exact' })
        .eq('user_id', user.id)
        .eq('status', 'WANT_TO_READ');

      // Get all users' book counts to calculate ranking
      const { data: userBookCounts, error: rankingsError } = await supabase
        .from('user_books')
        .select('user_id')
        .eq('status', 'READ');

      if (rankingsError) throw rankingsError;

      // Calculate ranking by counting books per user
      const bookCountMap = userBookCounts.reduce((acc: Record<string, number>, item: any) => {
        acc[item.user_id] = (acc[item.user_id] || 0) + 1;
        return acc;
      }, {});

      // Convert to array and sort by count
      const rankings = Object.entries(bookCountMap)
        .map(([userId, count]) => ({ userId, count }))
        .sort((a, b) => b.count - a.count);

      // Find user's position
      const userRanking = rankings.findIndex(r => r.userId === user.id) + 1;

      setStats({
        followers: followersCount || 0,
        booksRead: booksReadCount || 0,
        ranking: booksReadCount ? userRanking : '-',
        booksToRead: booksToReadCount || 0
      });
    } catch (error) {
      console.error('Error in fetchStats:', error);
      throw error;
    }
  };

  const handleAvatarPress = async () => {
    console.log('handleAvatarPress called');
    try {
      console.log('Launching image picker');
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.5,
        base64: true,
      });

      console.log('Image picker result:', { 
        cancelled: result.canceled,
        hasAssets: !!result.assets && result.assets.length > 0,
        hasBase64: !!result.assets?.[0]?.base64
      });

      if (!result.canceled && result.assets[0].base64) {
        console.log('Image selected, preparing upload');
        const base64FileData = result.assets[0].base64;
        const filePath = `${user?.id}/avatar.jpg`;

        console.log('Uploading to Supabase storage:', { filePath });
        const { error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(filePath, decode(base64FileData), {
            contentType: 'image/jpeg',
            upsert: true,
          });

        if (uploadError) {
          console.error('Upload error:', uploadError);
          throw uploadError;
        }

        console.log('Upload successful, getting public URL');
        const { data: { publicUrl } } = supabase.storage
          .from('avatars')
          .getPublicUrl(filePath);

        console.log('Updating profile with new avatar URL:', publicUrl);
        const { error: updateError } = await supabase
          .from('profiles')
          .update({ avatar_url: publicUrl })
          .eq('id', user?.id);

        if (updateError) {
          console.error('Profile update error:', updateError);
          throw updateError;
        }

        console.log('Profile updated successfully');
        setAvatarUrl(publicUrl);
        showToast.success({
          title: "Success",
          message: "Profile picture updated"
        });
      }
    } catch (error) {
      console.error('Error in handleAvatarPress:', error);
      showToast.error({
        title: "Error",
        message: "Failed to update profile picture"
      });
    }
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Check out my profile on Worm!\nhttps://yourapp.com/profile/${user?.id}`,
      });
    } catch (error) {
      console.error('Error sharing profile:', error);
      showToast.error({
        title: "Error",
        message: "Failed to share profile"
      });
    }
  };

  const handleEditProfile = () => {
    router.push('/profile/edit');
  };

  const handleGoalSelect = async (goal: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ goals: parseInt(goal) })
        .eq('id', user.id);

      if (error) throw error;

      showToast.success({
        title: "Success",
        message: `Reading goal set to ${goal} books`
      });
      
      router.push('/goal');
    } catch (error) {
      console.error('Error setting goal:', error);
      showToast.error({
        title: "Error",
        message: "Failed to set reading goal"
      });
    }
  };

  // Fetch user's goal and progress
  useEffect(() => {
    const fetchGoalData = async () => {
      if (!user) return;

      try {
        // Fetch user's goal
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('goals')
          .eq('id', user.id)
          .single();

        if (profileError) throw profileError;

        // Fetch books read count for progress
        const { count: booksReadCount, error: booksError } = await supabase
          .from('user_books')
          .select('count', { count: 'exact' })
          .eq('user_id', user.id)
          .eq('status', 'READ');

        if (booksError) throw booksError;

        setUserGoal(profileData.goals);
        setGoalProgress(booksReadCount || 0);
      } catch (error) {
        console.error('Error fetching goal data:', error);
      }
    };

    fetchGoalData();
  }, [user]);

  const renderGoalCard = () => {
    if (!userGoal) {
      // Show goal setter view
      return (
        <Surface style={[styles.infoCard, styles.goalCard]}>
          <View style={styles.cardIconContainer}>
            <MaterialCommunityIcons name="trophy" size={24} color={colors.siennaBrown} />
          </View>
          <Text style={styles.cardTitle}>Set your 2025 goal</Text>
          <Text style={styles.goalSubtitle}>How many books do you want to read in 2025?</Text>
          <View style={styles.goalOptions}>
            {['10', '20', '40'].map((option) => (
              <Button 
                key={option}
                mode="outlined" 
                style={styles.goalButton}
                labelStyle={styles.goalButtonLabel}
                onPress={() => handleGoalSelect(option)}
              >
                {option}
              </Button>
            ))}
          </View>
        </Surface>
      );
    }

    // Show progress view
    const progress = userGoal > 0 ? goalProgress / userGoal : 0;
    const remainingBooks = Math.max(0, userGoal - goalProgress);

    return (
      <Pressable onPress={() => router.push('/goal')}>
        <Surface style={[styles.infoCard, styles.goalCard]}>
          <View style={styles.cardIconContainer}>
            <MaterialCommunityIcons name="trophy" size={24} color={colors.siennaBrown} />
          </View>
          <Text style={styles.cardTitle}>2025 Reading Goal</Text>
          <Text style={styles.cardValue}>{userGoal} books</Text>
          <Text style={styles.goalStatText}>{goalProgress} read • {remainingBooks} to go</Text>
        </Surface>
      </Pressable>
    );
  };

  if (!user) {
    return <AuthGuard message="Sign in to view your profile" />;
  }

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.container, styles.loadingContainer]} edges={['top']}>
        <ActivityIndicator size="large" />
      </SafeAreaView>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text variant="headlineMedium" style={styles.name}>Worm</Text>
        <View style={styles.headerButtons}>
          <IconButton 
            icon="share" 
            size={24} 
            containerColor={colors.softBrown}
            iconColor={colors.siennaBrown}
            onPress={handleShare}
          />
          <IconButton 
            icon="menu" 
            size={24}
            containerColor={colors.softBrown}
            iconColor={colors.siennaBrown}
            onPress={() => setMenuVisible(true)}
          />
        </View>
      </View>

      {/* Profile Avatar */}
      <View style={styles.avatarContainer}>
        <Pressable 
          onPress={() => {
            console.log('Avatar pressed, attempting to open image picker');
            handleAvatarPress();
          }}
        >
          <Avatar.Image 
            size={90} 
            source={{ uri: avatarUrl || 'https://via.placeholder.com/90' }}
            style={styles.avatar}
          />
        </Pressable>
        <Text style={styles.username}>@{user.user_metadata?.username || user.email?.split('@')[0]}</Text>
        <Text style={styles.memberSince}>Member since {new Date(user?.user_metadata?.member_since || memberSince).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</Text>
        {user?.user_metadata?.bio && (
          <Text style={styles.bio}>{user.user_metadata.bio}</Text>
        )}
        
        <View style={styles.buttonContainer}>
          <Button 
            mode="outlined" 
            style={styles.profileButton}
            labelStyle={styles.buttonLabel}
            onPress={handleEditProfile}
          >
            Edit profile
          </Button>
          <Button 
            mode="outlined" 
            style={styles.profileButton}
            labelStyle={styles.buttonLabel}
            onPress={handleShare}
          >
            Share profile
          </Button>
        </View>
      </View>

      {/* Stats */}
      <View style={styles.statsContainer}>
        <Pressable 
          style={styles.stat}
          onPress={() => {
            console.log('Attempting to navigate to followers:', {
              route: '/followers',
              userId: user.id,
              timestamp: new Date().toISOString()
            });
            router.push('/followers');
          }}
        >
          <Text style={styles.statNumber}>{stats.followers}</Text>
          <Text style={[styles.statLabel, styles.clickableLabel]}>Followers</Text>
        </Pressable>
        <View style={styles.stat}>
          <Text style={styles.statNumber}>{stats.booksRead}</Text>
          <Text style={styles.statLabel}>Books Read</Text>
        </View>
        <Pressable 
          style={styles.stat}
          onPress={() => {
            router.push('/rankings' as any);
          }}
        >
          <Text style={styles.statNumber}>{stats.ranking}</Text>
          <Text style={[styles.statLabel, styles.clickableLabel]}>Worm Ranking</Text>
        </Pressable>
      </View>

      {/* List Items */}
      <View style={styles.listContainer}>
        <Pressable onPress={() => router.push({
          pathname: '/(tabs)/bookshelf',
          params: { section: 'READ' }
        })}>
          <Surface style={styles.listItem}>
            <View style={styles.listIconContainer}>
              <MaterialCommunityIcons name="check-circle" size={24} color={colors.siennaBrown} />
            </View>
            <Text style={styles.listText}>Read</Text>
            <Text style={styles.listNumber}>{stats.booksRead}</Text>
            <IconButton icon="chevron-right" size={24} iconColor={colors.warmBrown} />
          </Surface>
        </Pressable>
        
        <Pressable onPress={() => router.push({
          pathname: '/(tabs)/bookshelf',
          params: { section: 'WANT_TO_READ' }
        })}>
          <Surface style={styles.listItem}>
            <View style={styles.listIconContainer}>
              <MaterialCommunityIcons name="bookmark" size={24} color={colors.siennaBrown} />
            </View>
            <Text style={styles.listText}>Want to Read</Text>
            <Text style={styles.listNumber}>{stats.booksToRead}</Text>
            <IconButton icon="chevron-right" size={24} iconColor={colors.warmBrown} />
          </Surface>
        </Pressable>

        <Surface style={styles.listItem}>
          <View style={styles.listIconContainer}>
            <MaterialCommunityIcons name="heart" size={24} color={colors.siennaBrown} />
          </View>
          <Text style={styles.listText}>Recs for You</Text>
          <IconButton icon="lock" size={24} iconColor={colors.warmBrown} />
        </Surface>
      </View>

      {/* Info Cards */}
      <View style={styles.cardsContainer}>
        <Pressable 
          onPress={() => {
            if (favoriteBook !== '-') {
              router.push({
                pathname: '/(tabs)/bookshelf',
                params: { section: 'READ' }
              });
            }
          }}
          style={styles.cardWrapper}
        >
          <Surface style={styles.infoCard}>
            <View style={styles.cardIconContainer}>
              <MaterialCommunityIcons name="trophy" size={24} color={colors.siennaBrown} />
            </View>
            <Text style={styles.cardTitle}>Favorite Book</Text>
            <Text style={styles.cardValue}>{favoriteBook}</Text>
          </Surface>
        </Pressable>

        {renderGoalCard()}
      </View>

      {/* Menu Modal */}
      <MenuModal 
        visible={menuVisible}
        onClose={() => setMenuVisible(false)}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.lightKhaki,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 60,
  },
  headerButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  name: {
    fontWeight: '700',
    color: colors.siennaBrown,
  },
  avatarContainer: {
    alignItems: 'center',
    padding: 20,
  },
  avatar: {
    backgroundColor: colors.warmBrown,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  username: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 12,
    color: colors.siennaBrown,
  },
  memberSince: {
    fontSize: 13,
    color: colors.warmBrown,
    marginTop: 4,
    opacity: 0.8,
  },
  bio: {
    fontSize: 15,
    color: colors.warmBrown,
    marginTop: 8,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  profileButton: {
    borderColor: colors.siennaBrown,
    borderRadius: 25,
    borderWidth: 1.5,
    minWidth: 120,
  },
  buttonLabel: {
    fontSize: 14,
    color: colors.siennaBrown,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 20,
    marginHorizontal: 16,
    backgroundColor: '#fff',
    borderRadius: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  stat: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 22,
    fontWeight: 'bold',
    color: colors.siennaBrown,
  },
  statLabel: {
    color: colors.warmBrown,
    fontSize: 13,
    marginTop: 4,
  },
  listContainer: {
    gap: 12,
    margin: 16,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  listIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.softBrown,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  listText: {
    flex: 1,
    fontSize: 16,
    color: colors.siennaBrown,
    fontWeight: '500',
  },
  listNumber: {
    marginRight: 8,
    color: colors.siennaBrown,
    fontSize: 16,
    fontWeight: '600',
  },
  cardsContainer: {
    flexDirection: 'row',
    gap: 12,
    padding: 16,
    flexWrap: 'wrap',
  },
  cardWrapper: {
    minWidth: '40%',
    flexGrow: 1,
    flexShrink: 1,
  },
  infoCard: {
    padding: 16,
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  cardIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.softBrown,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  cardTitle: {
    color: colors.warmBrown,
    fontSize: 14,
    textAlign: 'center',
  },
  cardValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.siennaBrown,
    marginTop: 4,
    textAlign: 'center',
    flexWrap: 'wrap',
  },
  goalCard: {
    minWidth: '45%',
    flexGrow: 1,
    flexShrink: 1,
    padding: 16,
    alignItems: 'center',
  },
  goalSubtitle: {
    color: colors.warmBrown,
    marginTop: 8,
    marginBottom: 12,
    fontSize: 13,
    textAlign: 'center',
  },
  goalOptions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    gap: 8,
  },
  goalButton: {
    flex: 1,
    borderColor: colors.siennaBrown,
    borderRadius: 12,
  },
  goalButtonLabel: {
    fontSize: 14,
    color: colors.siennaBrown,
  },
  goalStatText: {
    fontSize: 13,
    color: colors.warmBrown,
    marginTop: 4,
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  clickableLabel: {
    textDecorationLine: 'underline',
  },
}); 
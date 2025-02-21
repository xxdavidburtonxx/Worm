import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Pressable, ActivityIndicator } from 'react-native';
import { Text, IconButton, Button, ProgressBar } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { useSupabase } from '@/hooks/useSupabase';
import { useAuth } from '@/hooks/useAuth';
import { showToast } from '@/components/Toast';

// Custom theme colors
const colors = {
  desertSand: '#DF5B39F',
  warmBrown: '#A27C62',
  lightKhaki: '#F2EBD4',
  siennaBrown: '#9A634E',
  goldenSand: '#EAD0B3',
  softBrown: 'rgba(162, 124, 98, 0.1)',
};

export default function GoalScreen() {
  const router = useRouter();
  const { supabase } = useSupabase();
  const { user } = useAuth();
  const [goal, setGoal] = useState<number>(0);
  const [booksRead, setBooksRead] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchGoalAndProgress();
  }, []);

  const fetchGoalAndProgress = async () => {
    if (!user) return;

    try {
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('goals')
        .eq('id', user.id)
        .single();

      if (profileError) throw profileError;

      const { count: booksReadCount, error: booksError } = await supabase
        .from('user_books')
        .select('count', { count: 'exact' })
        .eq('user_id', user.id)
        .eq('status', 'READ');

      if (booksError) throw booksError;

      setGoal(profileData.goals || 0);
      setBooksRead(booksReadCount || 0);
    } catch (error) {
      console.error('Error in fetchGoalAndProgress:', error);
      showToast.error({
        title: 'Error',
        message: 'Failed to load goal data'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSetGoal = async (newGoal: number) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ goals: newGoal })
        .eq('id', user?.id);

      if (error) throw error;

      setGoal(newGoal);
      showToast.success({
        title: "Success",
        message: `Reading goal set to ${newGoal} books`
      });
    } catch (error) {
      console.error('Error setting goal:', error);
      showToast.error({
        title: "Error",
        message: "Failed to set reading goal"
      });
    }
  };

  const progress = goal > 0 ? booksRead / goal : 0;
  const remainingBooks = Math.max(0, goal - booksRead);

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={[styles.content, { justifyContent: 'center', alignItems: 'center' }]}>
          <ActivityIndicator size="large" color={colors.siennaBrown} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <IconButton
          icon="arrow-left"
          size={24}
          onPress={() => router.back()}
          style={styles.backButton}
        />
        <Text style={styles.headerTitle}>2025 Reading Goal</Text>
      </View>

      {/* Content */}
      <View style={styles.content}>
        {goal === 0 ? (
          // Goal Setting View
          <View style={styles.goalSettingContainer}>
            <View style={styles.iconContainer}>
              <MaterialCommunityIcons name="trophy" size={48} color={colors.siennaBrown} />
            </View>
            <Text style={styles.goalSettingTitle}>Set your 2025 reading goal</Text>
            <Text style={styles.goalSettingSubtitle}>
              How many books do you want to read this year?
            </Text>
            <View style={styles.goalOptions}>
              {[10, 20, 40].map((option) => (
                <Button
                  key={option}
                  mode="outlined"
                  style={styles.goalButton}
                  labelStyle={styles.goalButtonLabel}
                  onPress={() => handleSetGoal(option)}
                >
                  {option}
                </Button>
              ))}
            </View>
          </View>
        ) : (
          // Goal Progress View
          <View style={styles.progressContainer}>
            <Text style={styles.goalText}>Your goal: {goal} books</Text>
            <ProgressBar
              progress={progress}
              color={colors.siennaBrown}
              style={styles.progressBar}
            />
            <View style={styles.statsRow}>
              <Text style={styles.statsText}>{booksRead} read</Text>
              <Text style={styles.statsText}>{remainingBooks} to go</Text>
            </View>

            {/* Find More Books Button */}
            <Button
              mode="contained"
              onPress={() => router.push('/(tabs)/search')}
              style={styles.findBooksButton}
              contentStyle={styles.findBooksContent}
              labelStyle={styles.findBooksLabel}
            >
              Find more books!
            </Button>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.lightKhaki,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.siennaBrown,
    marginLeft: 8,
  },
  backButton: {
    margin: 0,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  // Goal Setting Styles
  goalSettingContainer: {
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
    borderRadius: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.softBrown,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  goalSettingTitle: {
    fontSize: 22,
    fontWeight: '600',
    color: colors.siennaBrown,
    marginBottom: 12,
    textAlign: 'center',
  },
  goalSettingSubtitle: {
    fontSize: 16,
    color: colors.warmBrown,
    marginBottom: 24,
    textAlign: 'center',
  },
  goalOptions: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    width: '100%',
    paddingHorizontal: 20,
  },
  goalButton: {
    flex: 1,
    borderColor: colors.siennaBrown,
    borderRadius: 12,
    borderWidth: 1.5,
  },
  goalButtonLabel: {
    fontSize: 18,
    color: colors.siennaBrown,
    fontWeight: '600',
  },
  // Progress View Styles
  progressContainer: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  goalText: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.siennaBrown,
    marginBottom: 16,
    textAlign: 'center',
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.softBrown,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  statsText: {
    fontSize: 14,
    color: colors.warmBrown,
  },
  findBooksButton: {
    backgroundColor: colors.siennaBrown,
    borderRadius: 25,
    marginTop: 'auto',
    marginBottom: 20,
  },
  findBooksContent: {
    height: 50,
  },
  findBooksLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
}); 
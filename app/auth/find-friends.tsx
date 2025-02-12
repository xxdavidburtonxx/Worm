import { useState, useEffect } from "react";
import { View, Text, StyleSheet, Pressable, FlatList, ActivityIndicator, Share } from "react-native";
import { useRouter } from "expo-router";
import * as Contacts from 'expo-contacts';
import { Users, UserPlus, Check } from "lucide-react-native";
import { useSupabase } from "@/hooks/useSupabase";
import { useAuth } from "@/hooks/useAuth";
import { showToast } from "@/components/Toast";
import { CachedImage } from "@/components/CachedImage";
import type { Contact, Profile } from "@/components/types";
import { ROUTES } from "@/constants/routes";

export default function FindFriendsScreen() {
  const router = useRouter();
  const { supabase } = useSupabase();
  const { user } = useAuth();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [suggestedFriends, setSuggestedFriends] = useState<Profile[]>([]);
  const [selectedFriends, setSelectedFriends] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(false);
  const [isContactsLoading, setIsContactsLoading] = useState(true);

  useEffect(() => {
    requestContactsPermission();
  }, []);

  const requestContactsPermission = async () => {
    try {
      const { status } = await Contacts.requestPermissionsAsync();
      if (status === 'granted') {
        const { data } = await Contacts.getContactsAsync({
          fields: [Contacts.Fields.Emails, Contacts.Fields.PhoneNumbers]
        });

        if (data.length > 0) {
          // Filter contacts with email or phone
          const validContacts = data.filter(contact => 
            (contact.emails && contact.emails.length > 0) || 
            (contact.phoneNumbers && contact.phoneNumbers.length > 0)
          );
          setContacts(validContacts);
          findFriendsFromContacts(validContacts);
        }
      } else {
        showToast.error({
          title: "Permission denied",
          message: "We need contacts access to find your friends"
        });
      }
    } catch (error) {
      console.error("Error requesting contacts:", error);
    } finally {
      setIsContactsLoading(false);
    }
  };

  const findFriendsFromContacts = async (contactsList: Contact[]) => {
    try {
      // Extract emails and phone numbers
      const emails = contactsList.flatMap(contact => 
        contact.emails?.map(e => e.email) || []
      );
      const phones = contactsList.flatMap(contact => 
        contact.phoneNumbers?.map(p => p.number) || []
      );

      // Find matching profiles in Supabase
      const { data: matchingProfiles } = await supabase
        .from('profiles')
        .select('*')
        .or(`email.in.(${emails.join(',')}),phone.in.(${phones.join(',')})`)
        .neq('id', user?.id)
        .limit(10);

      if (matchingProfiles) {
        setSuggestedFriends(matchingProfiles);
      }
    } catch (error) {
      console.error("Error finding friends:", error);
    }
  };

  const handleSelectFriend = (profile: Profile) => {
    const newSelected = new Set(selectedFriends);
    if (newSelected.has(profile.id)) {
      newSelected.delete(profile.id);
    } else if (newSelected.size < 3) {
      newSelected.add(profile.id);
    }
    setSelectedFriends(newSelected);
  };

  const handleContinue = async () => {
    setIsLoading(true);
    try {
      // Create friendship connections
      const friendships = Array.from(selectedFriends).map(friendId => ({
        user_id: user?.id,
        friend_id: friendId,
        status: 'pending'
      }));

      await supabase.from('friendships').insert(friendships);

      showToast.success({
        title: "Friend requests sent!",
        message: "We'll notify you when they accept"
      });

      // Go to final onboarding step instead of main app
      router.push(ROUTES.ONBOARDING);
    } catch (error) {
      console.error("Error adding friends:", error);
      showToast.error({
        title: "Error",
        message: "Failed to send friend requests"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSkip = () => {
    // Go to onboarding instead of tabs
    router.push(ROUTES.ONBOARDING);
  };

  const handleFinish = () => {
    router.push(ROUTES.ONBOARDING);
  };

  const handleInviteFriends = async () => {
    try {
      await Share.share({
        message: 'Join me on Worm! Download the app: https://yourapp.com/download',
        // Add your actual app link here
      });
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  if (isContactsLoading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Finding your friends...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Find your friends</Text>
        <Text style={styles.subtitle}>
          Connect with friends to share book recommendations
        </Text>
      </View>

      {suggestedFriends.length > 0 ? (
        <FlatList
          data={suggestedFriends}
          keyExtractor={item => item.id}
          renderItem={({ item }) => (
            <Pressable 
              style={styles.friendItem}
              onPress={() => handleSelectFriend(item)}
            >
              <CachedImage
                uri={item.avatar_url}
                style={styles.avatar}
                fallback={<Users size={40} color="#666" />}
              />
              <View style={styles.friendInfo}>
                <Text style={styles.friendName}>{item.name}</Text>
                <Text style={styles.friendUsername}>@{item.username}</Text>
              </View>
              <View style={[
                styles.selectIndicator,
                selectedFriends.has(item.id) && styles.selected
              ]}>
                {selectedFriends.has(item.id) ? (
                  <Check size={20} color="#fff" />
                ) : (
                  <UserPlus size={20} color="#007AFF" />
                )}
              </View>
            </Pressable>
          )}
          contentContainerStyle={styles.list}
        />
      ) : (
        <View style={styles.emptyState}>
          <Users size={48} color="#666" />
          <Text style={styles.emptyTitle}>No friends found</Text>
          <Text style={styles.emptyText}>
            We couldn't find any of your contacts using the app yet
          </Text>
        </View>
      )}

      <View style={styles.footer}>
        <Pressable 
          style={[
            styles.button,
            selectedFriends.size === 0 && styles.skipButton
          ]}
          onPress={selectedFriends.size > 0 ? handleContinue : handleSkip}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={[
              styles.buttonText,
              selectedFriends.size === 0 && styles.skipButtonText
            ]}>
              {selectedFriends.size > 0 
                ? `Continue (${selectedFriends.size}/3)` 
                : "Skip for now"}
            </Text>
          )}
        </Pressable>
      </View>

      <Pressable 
        style={styles.inviteButton} 
        onPress={handleInviteFriends}
      >
        <Text style={styles.inviteButtonText}>Invite Friends</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  header: {
    padding: 24,
    paddingTop: 48,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
  },
  list: {
    padding: 16,
    gap: 16,
  },
  friendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#f1f1f1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  friendInfo: {
    flex: 1,
    marginLeft: 12,
  },
  friendName: {
    fontSize: 16,
    fontWeight: '600',
  },
  friendUsername: {
    fontSize: 14,
    color: '#666',
  },
  selectIndicator: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f1f1f1',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
  },
  selected: {
    backgroundColor: '#007AFF',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#f1f1f1',
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  skipButton: {
    backgroundColor: '#f1f1f1',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  skipButtonText: {
    color: '#666',
  },
  inviteButton: {
    backgroundColor: '#007AFF',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 16,
  },
  inviteButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
}); 
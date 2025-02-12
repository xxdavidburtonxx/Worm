import * as Clipboard from "expo-clipboard";
import * as Contacts from "expo-contacts";
import { useRouter } from "expo-router";
import { ArrowLeft, Copy, MessageCircle } from "lucide-react-native";
import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  FlatList,
  Share,
  ActivityIndicator,
} from "react-native";
import Toast from "react-native-toast-message";

import { showToast } from "@/components/Toast";
import { useAuth } from "@/hooks/useAuth";
import type { Contact } from "@/components/types";

export default function InviteScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const loadContacts = async () => {
    try {
      setIsLoading(true);
      const { status } = await Contacts.requestPermissionsAsync();
      if (status === 'granted') {
        const { data } = await Contacts.getContactsAsync({
          fields: [Contacts.Fields.PhoneNumbers, Contacts.Fields.Emails],
        });
        setContacts(data);
      }
    } catch (error) {
      console.error('Error loading contacts:', error);
      showToast.error({
        title: "Error",
        message: "Could not load contacts"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleShare = async (contact?: Contact) => {
    try {
      const inviteLink = `https://worm.app/invite/${user?.id}`;
      const message = `Join me on Worm! Download the app and let's share book recommendations.\n\n${inviteLink}`;

      if (contact?.phoneNumbers?.[0]?.number) {
        // Share via SMS if phone number available
        const result = await Share.share({
          message,
          // You can customize the message for SMS
          title: "Join me on Worm!",
        });

        if (result.action === Share.sharedAction) {
          showToast.success({
            title: "Shared!",
            message: "Invite sent successfully"
          });
        }
      } else {
        // General share if no phone number
        await Share.share({
          message,
          title: "Join Worm",
          url: inviteLink,
        });
      }
    } catch (error) {
      console.error('Error sharing invite:', error);
      showToast.error({
        title: "Error",
        message: "Could not share invite"
      });
    }
  };

  const copyLink = async () => {
    try {
      const inviteLink = `https://worm.app/invite/${user?.id}`;
      await Clipboard.setStringAsync(inviteLink);
      showToast.success({
        title: "Copied!",
        message: "Invite link copied to clipboard"
      });
    } catch (error) {
      showToast.error({
        title: "Error",
        message: "Could not copy link"
      });
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()}>
          <ArrowLeft size={24} color="#000" />
        </Pressable>
        <Text style={styles.title}>Invite Friends</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.actions}>
        <Pressable style={styles.button} onPress={() => handleShare()}>
          <MessageCircle size={20} color="#666" />
          <Text style={styles.buttonText}>Share Invite Link</Text>
        </Pressable>

        <Pressable style={styles.button} onPress={copyLink}>
          <Copy size={20} color="#666" />
          <Text style={styles.buttonText}>Copy Link</Text>
        </Pressable>
      </View>

      <Text style={styles.sectionTitle}>Share with Contacts</Text>
      {contacts.length === 0 && !isLoading && (
        <Pressable style={styles.loadButton} onPress={loadContacts}>
          <Text style={styles.loadButtonText}>Load Contacts</Text>
        </Pressable>
      )}

      {isLoading ? (
        <ActivityIndicator style={styles.loading} />
      ) : (
        <FlatList
          data={contacts}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <Pressable
              style={styles.contactItem}
              onPress={() => handleShare(item)}
            >
              <Text style={styles.contactName}>{item.name}</Text>
              {item.phoneNumbers?.[0] && (
                <Text style={styles.contactInfo}>
                  {item.phoneNumbers[0].number}
                </Text>
              )}
            </Pressable>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f1f1",
  },
  title: {
    fontSize: 18,
    fontWeight: "600",
  },
  actions: {
    padding: 16,
    gap: 12,
  },
  button: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 12,
    borderRadius: 8,
    backgroundColor: "#f1f1f1",
  },
  buttonText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#666",
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    paddingHorizontal: 16,
    marginTop: 16,
  },
  loadButton: {
    margin: 16,
    padding: 12,
    borderRadius: 8,
    backgroundColor: "#007AFF",
    alignItems: "center",
  },
  loadButtonText: {
    color: "#fff",
    fontWeight: "500",
  },
  loading: {
    marginTop: 32,
  },
  contactItem: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f1f1",
  },
  contactName: {
    fontSize: 16,
    fontWeight: "500",
  },
  contactInfo: {
    fontSize: 14,
    color: "#666",
    marginTop: 4,
  },
});

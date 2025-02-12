import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  Alert,
} from "react-native";
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from "@/hooks/useAuth";
import { useSupabase } from "@/hooks/useSupabase";

export default function EditBioScreen() {
  const router = useRouter();
  const { supabase } = useSupabase();
  const { user } = useAuth();
  const [bio, setBio] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSave = async () => {
    setIsLoading(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ bio: bio.trim() || null })
        .eq("id", user?.id);

      if (error) throw error;
      router.back();
    } catch (error) {
      console.error("Error updating bio:", error);
      Alert.alert("Error", "Failed to update bio");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()}>
          <Text style={styles.cancelButton}>Cancel</Text>
        </Pressable>
        <Text style={styles.title}>Edit bio</Text>
        <Pressable onPress={handleSave} disabled={isLoading}>
          <Text
            style={[styles.saveButton, isLoading && styles.saveButtonDisabled]}
          >
            Save
          </Text>
        </Pressable>
      </View>

      <View style={styles.form}>
        <TextInput
          style={styles.bioInput}
          placeholder="Write a short bio..."
          value={bio}
          onChangeText={setBio}
          multiline
          autoFocus
          maxLength={150}
        />
        <Text style={styles.charCount}>{bio.length}/150</Text>
      </View>
    </SafeAreaView>
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
  cancelButton: {
    fontSize: 16,
    color: "#007AFF",
  },
  saveButton: {
    fontSize: 16,
    color: "#007AFF",
    fontWeight: "600",
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  form: {
    padding: 16,
  },
  bioInput: {
    fontSize: 16,
    paddingVertical: 12,
    height: 100,
    textAlignVertical: "top",
  },
  charCount: {
    fontSize: 14,
    color: "#666",
    textAlign: "right",
    marginTop: 8,
  },
});

import { useRouter } from "expo-router";
import { debounce } from "lodash";
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  Alert,
  ActivityIndicator,
  Animated,
} from "react-native";
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from "@/hooks/useAuth";
import { useSupabase } from "@/hooks/useSupabase";
import { validateUsername } from "@/utils/validation";

export default function EditUsernameScreen() {
  const router = useRouter();
  const { supabase } = useSupabase();
  const { user } = useAuth();
  const [username, setUsername] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isAvailable, setIsAvailable] = useState<boolean | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const fadeAnim = React.useRef(new Animated.Value(0)).current;

  // Debounced username check
  const debouncedCheck = React.useCallback(
    debounce(async (value: string) => {
      const validation = validateUsername(value);
      if (!validation.isValid) {
        setValidationError(validation.error);
        setIsAvailable(false);
        return;
      }

      setValidationError(null);
      setIsChecking(true);
      try {
        const { data } = await supabase
          .from("profiles")
          .select("id")
          .eq("username", value.toLowerCase())
          .neq("id", user?.id)
          .single();

        setIsAvailable(!data);
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }).start();
      } catch (error) {
        setIsAvailable(true);
      } finally {
        setIsChecking(false);
      }
    }, 500),
    [user?.id],
  );

  useEffect(() => {
    return () => {
      debouncedCheck.cancel();
    };
  }, []);

  const handleUsernameChange = (text: string) => {
    setUsername(text);
    setIsAvailable(null);
    fadeAnim.setValue(0);
    if (text.trim()) {
      debouncedCheck(text);
    }
  };

  const handleSave = async () => {
    if (!username.trim() || !isAvailable) return;

    setIsLoading(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ username: username.toLowerCase() })
        .eq("id", user?.id);

      if (error) throw error;
      router.back();
    } catch (error) {
      console.error("Error updating username:", error);
      Alert.alert("Error", "Failed to update username");
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
        <Text style={styles.title}>Change username</Text>
        <Pressable
          onPress={handleSave}
          disabled={isLoading || !username.trim() || !isAvailable}
        >
          <Text
            style={[
              styles.saveButton,
              (!username.trim() || !isAvailable || isLoading) &&
                styles.saveButtonDisabled,
            ]}
          >
            Save
          </Text>
        </Pressable>
      </View>

      <View style={styles.form}>
        <TextInput
          style={[styles.input, validationError && styles.inputError]}
          placeholder="Username"
          value={username}
          onChangeText={handleUsernameChange}
          autoFocus
          autoCapitalize="none"
          autoCorrect={false}
        />

        <View style={styles.statusContainer}>
          {isChecking ? (
            <View style={styles.checkingContainer}>
              <ActivityIndicator size="small" color="#666" />
              <Text style={styles.checkingText}>Checking availability...</Text>
            </View>
          ) : (
            username.trim() && (
              <Animated.View
                style={[styles.statusMessage, { opacity: fadeAnim }]}
              >
                {validationError ? (
                  <Text style={styles.errorText}>{validationError}</Text>
                ) : (
                  isAvailable !== null && (
                    <Text
                      style={[
                        styles.availability,
                        isAvailable ? styles.available : styles.unavailable,
                      ]}
                    >
                      {isAvailable
                        ? "✓ Username is available"
                        : "✕ Username is taken"}
                    </Text>
                  )
                )}
              </Animated.View>
            )
          )}
        </View>

        <Text style={styles.helpText}>
          Usernames can only contain letters, numbers, and underscores.
        </Text>
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
  input: {
    fontSize: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f1f1",
    marginBottom: 16,
  },
  availability: {
    fontSize: 14,
    marginTop: 8,
  },
  available: {
    color: "#34C759",
  },
  unavailable: {
    color: "#FF3B30",
  },
  inputError: {
    borderBottomColor: "#FF3B30",
  },
  statusContainer: {
    height: 20,
    marginTop: 8,
  },
  checkingContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  checkingText: {
    fontSize: 14,
    color: "#666",
  },
  statusMessage: {
    flexDirection: "row",
    alignItems: "center",
  },
  errorText: {
    fontSize: 14,
    color: "#FF3B30",
  },
  helpText: {
    fontSize: 14,
    color: "#666",
    marginTop: 16,
  },
});

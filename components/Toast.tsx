import { StyleSheet } from "react-native";
import RNToast, { 
  BaseToast, 
  ErrorToast,
  ToastConfig,
  ToastConfigParams,
} from "react-native-toast-message";
import type { ReactNode } from 'react';

// Define base toast props interface
interface BaseToastProps {
  text1?: string;
  text2?: string | ReactNode;
  props?: ToastConfigParams<any>;
}

const toastConfig: ToastConfig = {
  success: ({ text1, text2, ...props }: BaseToastProps) => (
    <BaseToast
      {...props}
      text1={text1}
      text2={typeof text2 === 'string' ? text2 : undefined}
      style={styles.success}
      contentContainerStyle={styles.contentContainer}
      text1Style={styles.text1}
      text2Style={styles.text2}
      text1NumberOfLines={2}
      text2NumberOfLines={2}
    />
  ),
  error: ({ text1, text2, ...props }: BaseToastProps) => (
    <ErrorToast
      {...props}
      text1={text1}
      text2={typeof text2 === 'string' ? text2 : undefined}
      style={styles.error}
      contentContainerStyle={styles.contentContainer}
      text1Style={styles.text1}
      text2Style={styles.text2}
      text1NumberOfLines={2}
      text2NumberOfLines={2}
    />
  ),
  info: ({ text1, text2, ...props }: BaseToastProps) => (
    <BaseToast
      {...props}
      text1={text1}
      text2={typeof text2 === 'string' ? text2 : undefined}
      style={styles.info}
      contentContainerStyle={styles.contentContainer}
      text1Style={styles.text1}
      text2Style={styles.text2}
      text1NumberOfLines={2}
      text2NumberOfLines={2}
    />
  ),
};

const styles = StyleSheet.create({
  success: {
    borderLeftColor: "#00C851",
    backgroundColor: "#fff",
    minHeight: 60,
    width: '90%',
  },
  error: {
    borderLeftColor: "#ff4444",
    backgroundColor: "#fff",
    minHeight: 60,
    width: '90%',
  },
  info: {
    borderLeftColor: "#33b5e5",
    backgroundColor: "#fff",
    minHeight: 60,
    width: '90%',
  },
  contentContainer: {
    paddingHorizontal: 15,
  },
  text1: {
    fontSize: 16,
    fontWeight: "600",
    color: "#000",
  },
  text2: {
    fontSize: 14,
    color: "#666",
  },
});

// Helper functions for showing toasts with proper types
interface ToastMessage {
  title: string;
  message?: string | ReactNode;
}

export const showToast = {
  success: ({ title, message }: ToastMessage) => {
    RNToast.show({
      type: 'success',
      text1: title,
      text2: typeof message === 'string' ? message : undefined,
      position: 'bottom',
      visibilityTime: 3000,
    });
  },
  error: ({ title, message }: ToastMessage) => {
    RNToast.show({
      type: 'error',
      text1: title,
      text2: typeof message === 'string' ? message : undefined,
      position: 'bottom',
      visibilityTime: 4000,
    });
  },
  info: ({ title, message }: ToastMessage) => {
    RNToast.show({
      type: 'info',
      text1: title,
      text2: typeof message === 'string' ? message : undefined,
      position: 'bottom',
      visibilityTime: 3000,
    });
  },
};

export default RNToast;
export { toastConfig }; 
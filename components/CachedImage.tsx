import React, { useState, useEffect } from "react";
import { Image, ImageProps, ActivityIndicator, View, StyleProp, ImageStyle, ViewStyle, StyleSheet } from "react-native";
import * as FileSystem from 'expo-file-system';

import { ImageCache } from "@/utils/imageCache";

interface CachedImageProps extends Omit<ImageProps, "source" | "style"> {
  uri: string | null | undefined;
  fallback?: {
    avatar?: string;
    bookCover?: string;
  };
  style?: StyleProp<ImageStyle>;
  containerStyle?: StyleProp<ViewStyle>;
}

export function CachedImage({ 
  uri, 
  fallback = {
    avatar: 'https://via.placeholder.com/150',
    bookCover: 'https://via.placeholder.com/128x196'
  },
  style,
  containerStyle,
  ...props 
}: CachedImageProps) {
  const [localUri, setLocalUri] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    if (!uri) return;

    const cacheImage = async () => {
      try {
        const filename = uri.split('/').pop();
        const path = `${FileSystem.cacheDirectory}${filename}`;
        
        const image = await FileSystem.getInfoAsync(path);
        if (!image.exists) {
          await FileSystem.downloadAsync(uri, path);
        }
      } catch (err) {
        console.error('Error caching image:', err);
        setHasError(true);
      }
    };

    cacheImage();
  }, [uri]);

  if (isLoading) {
    return (
      <View style={[containerStyle, { justifyContent: "center", alignItems: "center" }]}>
        <ActivityIndicator size="small" color="#999" />
      </View>
    );
  }

  if (hasError || !uri) {
    return (
      <Image 
        {...props} 
        style={style}
        source={{ uri: fallback.bookCover }}
      />
    );
  }

  return <Image source={{ uri }} {...props} />;
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center"
  }
});

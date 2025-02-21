import 'dotenv/config';

export default {
  "expo": {
    "name": "Worm",
    "slug": "worm",
    "version": "1.0.0",
    "orientation": "portrait",
    "icon": "./assets/images/icon.png",
    "scheme": "worm",
    "userInterfaceStyle": "automatic",
    "newArchEnabled": true,
    "ios": {
      "supportsTablet": true,
      "bundleIdentifier": "com.worm.app",
      "googleServicesFile": "./GoogleService-Info.plist"
    },
    "android": {
      "adaptiveIcon": {
        "foregroundImage": "./assets/images/adaptive-icon.png",
        "backgroundColor": "#ffffff"
      },
      "package": "com.worm.app"
    },
    "web": {
      "bundler": "metro",
      "output": "static",
      "favicon": "./assets/images/favicon.png"
    },
    "plugins": [
      "expo-router",
      [
        "expo-splash-screen",
        {
          "image": "./assets/images/splash-icon.png",
          "imageWidth": 200,
          "resizeMode": "contain",
          "backgroundColor": "#ffffff"
        }
      ],
      [
        "expo-contacts",
        {
          "contactsPermission": "Allow Worm to access your contacts."
        }
      ],
      [
        "expo-image-picker",
        {
          "photosPermission": "Allow Worm to access your photos to set your profile picture.",
          "cameraPermission": "Allow Worm to access your camera to take a profile picture."
        }
      ],
      "@react-native-google-signin/google-signin"
    ],
    "experiments": {
      "typedRoutes": true,
      "tsconfigPaths": true
    },
    "extra": {
      "googleBooksApiKey": process.env.EXPO_PUBLIC_GOOGLE_PUBLIC_API,
      "supabaseUrl": process.env.EXPO_PUBLIC_SUPABASE_URL,
      "supabaseAnonKey": process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
      "eas": {
        "projectId": "13b0366f-4ecd-4060-9a4b-672cde2571b9"
      }
    }
  }
};
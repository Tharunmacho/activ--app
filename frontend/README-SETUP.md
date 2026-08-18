# Activ - React Native App

## Installed Dependencies

### Core Navigation & UI
- **@react-navigation/native** - Navigation library
- **@react-navigation/native-stack** - Stack navigator
- **react-native-screens** - Native screen components
- **react-native-safe-area-context** - Safe area handling

### State Management
- **zustand** - Lightweight state management

### HTTP Client
- **axios** - Promise-based HTTP client

### Media & UI Libraries
- **react-native-vector-icons** - Icon library
- **react-native-reanimated** - Advanced animations
- **react-native-image-picker** - Image/camera picker
- **react-native-video** - Video player component

## Project Structure

```
src/
  ├── screens/       - Screen components
  ├── stores/        - Zustand stores
  └── services/      - API services and utilities
```

## Configuration Done

### Babel Configuration
- Added react-native-reanimated plugin to `babel.config.js`

### Android Configuration
- Added react-native-vector-icons fonts configuration in `android/app/build.gradle`

## Running the App

### Android
```bash
npx react-native run-android
```

### iOS (macOS only)
```bash
cd ios && pod install && cd ..
npx react-native run-ios
```

## Additional Setup Required

### react-native-vector-icons (iOS)
1. Run `cd ios && pod install && cd ..`

### react-native-image-picker
- Android: Already configured via autolinking
- iOS: Run pod install and add privacy descriptions to Info.plist

### react-native-video
- Android: Already configured via autolinking
- iOS: Run pod install

### react-native-reanimated
- Requires app restart after adding the Babel plugin

## Usage Examples

### Zustand Store
See `src/stores/exampleStore.ts` for a simple counter example.

### Axios API
See `src/services/api.ts` for configured axios instance with interceptors.

### React Navigation
See `App.tsx` for basic navigation setup with Stack Navigator.

## Next Steps

1. Configure app permissions in `android/app/src/main/AndroidManifest.xml`
2. Configure iOS privacy settings in `ios/Activ/Info.plist`
3. Build your screens in `src/screens/`
4. Create additional navigation flows as needed
5. Set up your API endpoints in `src/services/api.ts`

## Troubleshooting

If you encounter build issues:

1. Clean build:
   ```bash
   # Android
   cd android && ./gradlew clean && cd ..
   
   # iOS
   cd ios && pod install && cd ..
   ```

2. Clear cache:
   ```bash
   npx react-native start --reset-cache
   ```

3. Rebuild:
   ```bash
   npx react-native run-android
   # or
   npx react-native run-ios
   ```

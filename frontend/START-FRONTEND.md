# Starting ACTIV React Native App

## Prerequisites
- Node.js installed
- Android Studio / Xcode installed
- Android emulator running OR physical device connected
- Backend server must be running first

## Starting the Frontend

### Terminal 1: Start Metro Bundler
```powershell
cd C:\activfinal\activ-project-new\Activ
npx react-native start
```
**Keep this terminal open**

### Terminal 2: Run Android App

#### Option A: Using React Native CLI
```powershell
cd C:\activfinal\activ-project-new\Activ
npx react-native run-android
```

#### Option B: Using PowerShell Script
```powershell
cd C:\activfinal\activ-project-new\Activ
.\run-android.ps1
```

### Terminal 2: Run iOS App (Mac only)
```bash
cd C:\activfinal\activ-project-new\Activ
npx react-native run-ios
```

## Device Setup

### Android Physical Device
1. Enable Developer Options on your phone
2. Enable USB Debugging
3. Connect via USB
4. Run: `adb devices` to verify connection

### Android Emulator
1. Open Android Studio
2. Go to Device Manager
3. Start an emulator
4. Wait for it to fully boot

## Troubleshooting

### Metro Bundler Issues
```powershell
# Clean cache and restart
npx react-native start --reset-cache
```

### Build Issues
```powershell
# Clean Android build
cd android
.\gradlew clean
cd ..

# Rebuild
npx react-native run-android
```

### Connection Issues
- Make sure backend is running on `http://localhost:5000`
- Check `src/config/api.config.ts` for correct backend URL
- For physical device, update API URL to your computer's IP address

## Important Notes
- Keep Metro Bundler terminal open while using the app
- Backend server must be running first
- First build takes 20-40 minutes
- Subsequent builds are much faster

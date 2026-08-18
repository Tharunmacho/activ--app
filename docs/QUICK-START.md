# ACTIV App - Quick Start Guide

## Complete Startup Process

Follow these steps in order to run the complete ACTIV application:

---

## Step 1: Start Backend Server

**Open Terminal 1 (PowerShell)**
```powershell
cd C:\activfinal\activ-project-new\activ-backend
node src/server.js
```

✅ **Verify:** You should see "ACTIV Backend Server Started" message

**Keep this terminal open!**

---

## Step 2: Start Metro Bundler (React Native)

**Open Terminal 2 (PowerShell)**
```powershell
cd C:\activfinal\activ-project-new\Activ
npx react-native start
```

✅ **Verify:** You should see "Welcome to Metro" with the React logo

**Keep this terminal open!**

---

## Step 3: Run Android App

**Open Terminal 3 (PowerShell)**

### First, make sure your device is ready:
- **Emulator:** Start it from Android Studio
- **Physical Device:** Connect via USB and enable USB debugging

### Then run:
```powershell
cd C:\activfinal\activ-project-new\Activ
npx react-native run-android
```

✅ **Verify:** App should install and launch on your device

---

## Quick Reference

### Required Terminals
| Terminal | Command | Purpose |
|----------|---------|---------|
| Terminal 1 | `node src/server.js` | Backend API Server |
| Terminal 2 | `npx react-native start` | Metro Bundler |
| Terminal 3 | `npx react-native run-android` | Build & Deploy App |

### URLs
- **Backend API:** http://localhost:5000
- **Metro Bundler:** http://localhost:8081
- **MongoDB:** MongoDB Atlas (cloud)

### Common Commands

**Restart Backend:**
```powershell
# In Terminal 1: Press Ctrl+C, then run:
node src/server.js
```

**Reload App:**
```
Press 'R' twice in the Metro terminal
OR
Shake device and select "Reload"
```

**Clear Cache:**
```powershell
npx react-native start --reset-cache
```

---

## Test User
- **Email:** tharunroobika@gmail.com
- **Status:** Active user in database
- **Membership:** Pending

---

## Troubleshooting

### Backend won't start
```powershell
# Check MongoDB connection
cd C:\activfinal\activ-project-new\activ-backend
node check-db.js
```

### App won't build
```powershell
# Clean build
cd C:\activfinal\activ-project-new\Activ\android
.\gradlew clean
cd ..
npx react-native run-android
```

### Can't connect to backend from app
- Verify backend is running (Terminal 1)
- Check API configuration in `src/config/api.config.ts`
- For physical device, use computer's IP instead of localhost

---

## Important Notes

⚠️ **Always start in this order:**
1. Backend Server (Terminal 1)
2. Metro Bundler (Terminal 2)  
3. Android App (Terminal 3)

⚠️ **Keep Terminals 1 & 2 running** - Don't close them while using the app

⚠️ **First build takes 20-40 minutes** - Subsequent builds are much faster

✅ **Your app is now ready to use!**

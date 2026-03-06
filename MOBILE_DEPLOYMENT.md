# Fynd — Mobile Deployment Guide

## Project Structure

```
fynd-app/
├── android/                 # Expo prebuild (React Native Android)
├── android-webview/         # Standalone Android WebView wrapper
│   ├── app/
│   │   ├── src/main/
│   │   │   ├── AndroidManifest.xml
│   │   │   ├── java/com/fynd/app/
│   │   │   │   ├── FyndApplication.kt
│   │   │   │   └── MainActivity.kt
│   │   │   └── res/
│   │   │       ├── layout/activity_main.xml
│   │   │       ├── values/{colors,strings,themes}.xml
│   │   │       ├── xml/network_security_config.xml
│   │   │       └── drawable/
│   │   ├── build.gradle.kts
│   │   └── proguard-rules.pro
│   ├── build.gradle.kts
│   ├── settings.gradle.kts
│   └── gradle.properties
├── ios-webview/             # iOS WKWebView wrapper
│   ├── FyndApp.xcodeproj/
│   └── FyndApp/
│       ├── AppDelegate.swift
│       ├── SceneDelegate.swift
│       ├── WebViewController.swift
│       ├── ErrorViewController.swift
│       ├── Info.plist
│       ├── LaunchScreen.storyboard
│       └── Main.storyboard
└── src/                     # Web app source (Expo/React Native)
```

---

## 1. Android WebView App

### Open in Android Studio

1. Open Android Studio
2. **File → Open** → select `android-webview/` folder
3. Wait for Gradle sync to complete
4. Select device/emulator and click **Run**

### Configuration

| Setting         | Value           |
|-----------------|-----------------|
| applicationId   | `com.fynd.app`  |
| versionCode     | `1`             |
| versionName     | `1.0.0`         |
| minSdk          | `24` (Android 7)|
| targetSdk       | `34` (Android 14)|
| Web URL         | `https://fynd.app` |

### Testing on Android Emulator

1. In Android Studio: **Tools → Device Manager → Create Device**
2. Recommended test devices:
   - **Pixel 4** (Android 10, API 29)
   - **Pixel 6** (Android 12, API 31)
   - **Pixel 7** (Android 13, API 33)
   - **Pixel 8** (Android 14, API 34)
   - **Nexus 5** (Android 9, API 28) — small screen test
3. Download system images for each API level
4. Run app on each emulator: **Run → Select Device → Run 'app'**

### Testing on Physical Device

1. Enable **Developer Options** on your Android device
2. Enable **USB Debugging**
3. Connect device via USB
4. Accept the debugging prompt on your device
5. Select your device from the device dropdown in Android Studio
6. Click **Run**

### Generate APK (Debug)

```bash
cd android-webview
./gradlew assembleDebug
```

Output: `app/build/outputs/apk/debug/app-debug.apk`

### Generate APK (Release)

```bash
cd android-webview
./gradlew assembleRelease
```

Output: `app/build/outputs/apk/release/app-release.apk`

### Generate AAB for Google Play Store

```bash
cd android-webview
./gradlew bundleRelease
```

Output: `app/build/outputs/bundle/release/app-release.aab`

### Signing the Release Build

1. Generate a keystore:
   ```bash
   keytool -genkey -v -keystore release.keystore -alias fynd -keyalg RSA -keysize 2048 -validity 10000
   ```

2. Place `release.keystore` in `android-webview/app/`

3. Update `app/build.gradle.kts` signing config:
   ```kotlin
   create("release") {
       storeFile = file("release.keystore")
       storePassword = System.getenv("KEYSTORE_PASSWORD") ?: "your-password"
       keyAlias = "fynd"
       keyPassword = System.getenv("KEY_PASSWORD") ?: "your-password"
   }
   ```

4. Uncomment the signing config line in the release build type:
   ```kotlin
   signingConfig = signingConfigs.getByName("release")
   ```

---

## 2. iOS WKWebView App

### Open in Xcode

1. Open Xcode
2. **File → Open** → select `ios-webview/FyndApp.xcodeproj`
3. Set your Development Team in **Signing & Capabilities**
4. Select a simulator or device
5. Click **Run** (⌘R)

### Testing on Simulator

Recommended test devices:
- **iPhone SE (3rd gen)** — small screen (375pt)
- **iPhone 14** — standard (390pt)
- **iPhone 14 Pro Max** — large (430pt)
- **iPad Air** — tablet support

### Testing on Physical Device

1. Connect iPhone/iPad via USB
2. Trust the computer on the device
3. Select device in Xcode toolbar
4. Click **Run**

### Generate Archive for App Store

1. Select **Any iOS Device** as build target
2. **Product → Archive**
3. In Organizer: **Distribute App → App Store Connect**

---

## 3. Android Version Compatibility Matrix

| Android Version | API Level | Status     |
|----------------|-----------|------------|
| Android 7.0    | 24        | minSdk     |
| Android 9.0    | 28        | ✅ Tested  |
| Android 10     | 29        | ✅ Tested  |
| Android 11     | 30        | ✅ Tested  |
| Android 12     | 31        | ✅ Tested  |
| Android 13     | 33        | ✅ Tested  |
| Android 14     | 34        | targetSdk  |

---

## 4. Features Included

### Android WebView Wrapper
- ✅ WebView loading `https://fynd.app`
- ✅ JavaScript enabled
- ✅ DOM storage enabled
- ✅ WebView caching (LOAD_DEFAULT)
- ✅ Loading progress bar
- ✅ Network error page with retry
- ✅ Pull-to-refresh
- ✅ Android back button navigation
- ✅ Google Maps intent integration
- ✅ Geolocation support
- ✅ Splash screen (AndroidX SplashScreen)
- ✅ Network security configuration (HTTPS only)
- ✅ External link handling
- ✅ Debug WebView inspection

### iOS WKWebView Wrapper
- ✅ WKWebView loading `https://fynd.app`
- ✅ Navigation gestures (swipe back/forward)
- ✅ Google Maps link handling
- ✅ Loading progress bar
- ✅ Network error page with retry
- ✅ Pull-to-refresh
- ✅ Launch screen
- ✅ Safe area support
- ✅ External link handling

### Web UI Fixes Applied
- ✅ Bottom navigation pinned on all platforms (not just web)
- ✅ Responsive banner width (% instead of hardcoded px)
- ✅ Dynamic dimensions via `useWindowDimensions()`
- ✅ Responsive animation container on ProcessingScreen
- ✅ Responsive card images on SuggestedPlacesScreen
- ✅ Horizontal overflow prevention in scroll containers
- ✅ Viewport meta tag with `viewport-fit=cover`
- ✅ Performance CSS (content-visibility, image optimization)
- ✅ Calibrated browser bottom cushion on MapScreen
- ✅ Removed unnecessary horizontal padding from app frame

# 📱 StockSmart AI — Production Android Release & Play Store Readiness Guide

This comprehensive guide is prepared by the Senior Android Engineering team to compile, sign, optimize, and publish **StockSmart AI** as a native, enterprise-grade Android application using Capacitor.

---

## 🛠️ Phase 1: Capacitor Native Android Bootstrap

To build the project and initialize the Android native directory, execute the following commands in your CLI workspace:

```bash
# 1. Build the high-performance optimized web dist folder
npm run build

# 2. Add the Android Capacitor platform wrapper
npx cap add android

# 3. Copy assets and sync plugins with native Gradle dependencies
npx cap sync
```

---

## 🔒 Phase 2: Android Security & Permission Manifest (`AndroidManifest.xml`)

Open your native project manifest file located at `android/app/src/main/AndroidManifest.xml` and configure these production permissions:

```xml
<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android"
    package="com.stocksmartai.app">

    <!-- 1. Network & Offline Synchronization -->
    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />

    <!-- 2. Hyperlocal GPS Location (High Precision & Low-Power Coarse Location) -->
    <uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />
    <uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
    
    <!-- 3. Camera (For Shelf computer vision scans & Invoice Receipt OCR) -->
    <uses-permission android:name="android.permission.CAMERA" />
    <uses-feature android:name="android.hardware.camera" android:required="false" />

    <!-- 4. Push & Local Notifications (Android 13+ Opt-In Requirement) -->
    <uses-permission android:name="android.permission.POST_NOTIFICATIONS" />

    <!-- 5. Background Tasks & Battery Optimization Exemption -->
    <!-- Ensures background demand-prediction sync runs uninterrupted in Kirana store environments -->
    <uses-permission android:name="android.permission.RECEIVE_BOOT_COMPLETED" />
    <uses-permission android:name="android.permission.WAKE_LOCK" />
    <uses-permission android:name="android.permission.REQUEST_IGNORE_BATTERY_OPTIMIZATIONS" />

    <application
        android:allowBackup="true"
        android:icon="@mipmap/ic_launcher"
        android:label="@string/app_name"
        android:roundIcon="@mipmap/ic_launcher_round"
        android:supportsRtl="true"
        android:theme="@style/AppTheme">

        <activity
            android:configChanges="orientation|keyboardHidden|keyboard|screenSize|locale|layoutDirection|fontScale|screenLayout|density"
            android:name=".MainActivity"
            android:label="@string/title_activity_main"
            android:theme="@style/AppTheme.NoActionBarLaunch"
            android:launchMode="singleTask"
            android:exported="true">

            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>

            <!-- 6. Deep Linking Configuration (e.g. sharing discounts on WhatsApp) -->
            <intent-filter android:autoVerify="true">
                <action android:name="android.intent.action.VIEW" />
                <category android:name="android.intent.category.DEFAULT" />
                <category android:name="android.intent.category.BROWSABLE" />
                <data android:scheme="https" android:host="stocksmartai.app" />
            </intent-filter>

        </activity>

        <!-- Push Notifications Service Receiver -->
        <meta-data
            android:name="com.google.firebase.messaging.default_notification_icon"
            android:resource="@drawable/ic_stat_ic_notification" />
        <meta-data
            android:name="com.google.firebase.messaging.default_notification_color"
            android:resource="@color/colorPrimary" />

    </application>
</manifest>
```

---

## 🎨 Phase 3: Premium Native Splash Screen & Adaptive Icons

Capacitor utilizes the modern Android Splash Screen API (introduced in Android 12) for seamless, smooth launch performance with zero lag.

1. Install the official Splash Screen asset tool:
   ```bash
   npm install @capacitor/assets --save-dev
   ```
2. Put your high-resolution original app icon (`icon.png`) and splash banner (`splash.png`) in the root `/assets` or `resources` folder.
3. Generate all adaptive icons, density buckets (mdpi, hdpi, xhdpi, xxhdpi, xxxhdpi), and dark-mode splash resources:
   ```bash
   npx capacitor-assets generate --android
   ```

---

## 🔋 Phase 4: Battery Optimization & Background Sync

To ensure critical restocking processes and ONDC orders are processed on time, we bypass aggressive Doze Mode when permitted.

### Android Java Implementation
Inside your `MainActivity.java` or `MainActivity.kt`, request the battery optimization dialog prompt if needed:

```kotlin
package com.stocksmartai.app

import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.os.PowerManager
import android.provider.Settings
import com.getcapacitor.BridgeActivity

class MainActivity : BridgeActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        
        // Request battery saver exemption to protect the automated background sync worker
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            val intent = Intent()
            val packageName = packageName
            val pm = getSystemService(Context.POWER_SERVICE) as PowerManager
            if (!pm.isIgnoringBatteryOptimizations(packageName)) {
                intent.action = Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS
                intent.data = Uri.parse("package:$packageName")
                startActivity(intent)
            }
        }
    }
}
```

---

## 🔑 Phase 5: APK & Android App Bundle (AAB) Release Signing

For Google Play Store submission, you must compile an Android App Bundle (AAB) rather than a simple APK, utilizing **Play App Signing**.

### 1. Generate Your Release Keystore (Store securely!)
Generate a 2048-bit RSA key with a 25-year validity period:

```bash
keytool -genkey -v -keystore stocksmartai-release-key.keystore -alias stocksmartai-alias -keyalg RSA -keysize 2048 -validity 10000
```

### 2. Configure Native Gradle Release Credentials (`android/app/build.gradle`)
Protect your keystore passwords by using system environment variables on your CI/CD runner:

```groovy
android {
    ...
    defaultConfig {
        applicationId "com.stocksmartai.app"
        minSdkVersion 22
        targetSdkVersion 34 // Compliant with latest Google Play guidelines
        versionCode 1
        versionName "1.0.0"
    }

    signingConfigs {
        release {
            storeFile file(System.getenv("ANDROID_KEYSTORE_PATH") ?: "stocksmartai-release-key.keystore")
            storePassword System.getenv("ANDROID_KEYSTORE_PASSWORD") ?: "your-store-pass"
            keyAlias System.getenv("ANDROID_KEY_ALIAS") ?: "stocksmartai-alias"
            keyPassword System.getenv("ANDROID_KEY_PASSWORD") ?: "your-key-pass"
        }
    }

    buildTypes {
        release {
            signingConfig signingConfigs.release
            minifyEnabled true // Enable R8 code shrinking and obfuscation
            shrinkResources true
            proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'), 'proguard-rules.pro'
        }
    }
}
```

---

## 🚀 Phase 6: Play Store Optimization & Performance Audit Checklist

Before releasing, execute these final automated optimization steps:

1. **R8 Code Obfuscation (`proguard-rules.pro`)**: Protect proprietary AI Demand Forecasting algorithms and server proxy logic.
2. **Web Bundle Asset Compression**: We have enabled gzip/brotli compression (`compression`) in `server.ts` to instantly deliver static HTML/CSS/JS with minimal latency over mobile networks (4G/5G).
3. **HTTP Keep-Alive**: Configured to hold network sockets open for rapid successive inventory writes, reducing time-to-first-byte (TTFB).
4. **Offline Resilience**: LocalStorage and Preferences logic cache active SKUs, customer loyalty points, and Khata books in local indexed stores, allowing instant offline operation with automated cloud-sync when network reconnects.

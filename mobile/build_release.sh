#!/bin/bash
set -e

# Usage: bash build_release.sh [debug|release]
BUILD_TYPE="${1:-release}" # default release

PROJECT_ROOT="/Users/samerelhamdo/Desktop/stockly/mobile"
ANDROID_DIR="$PROJECT_ROOT/android"
ASSETS_DIR="$ANDROID_DIR/app/src/main/assets"
OUTPUT_DEBUG_DIR="$ANDROID_DIR/app/build/outputs/apk/debug"
OUTPUT_RELEASE_DIR="$ANDROID_DIR/app/build/outputs/apk/release"

APP_NAME="stockly"
VERSION_NAME=$(date +"%Y-%m-%d_%H-%M")

if [[ "$BUILD_TYPE" == "debug" ]]; then
  APK_NAME="${APP_NAME}-debug-${VERSION_NAME}.apk"
  OUTPUT_DIR="$OUTPUT_DEBUG_DIR"
  GRADLE_TASK="assembleDebug"
else
  APK_NAME="${APP_NAME}-release-${VERSION_NAME}.apk"
  OUTPUT_DIR="$OUTPUT_RELEASE_DIR"
  GRADLE_TASK="assembleRelease"
fi

echo "🧹 Cleaning old APKs in $OUTPUT_DIR ..."
rm -f "$OUTPUT_DIR"/*.apk || true

echo "📦 Bundling React Native code (expo-entry.js)..."
mkdir -p "$ASSETS_DIR"
NODE_ENV=production npx react-native bundle \
  --platform android \
  --dev false \
  --entry-file expo-entry.js \
  --bundle-output "$ASSETS_DIR/index.android.bundle" \
  --assets-dest "$ANDROID_DIR/app/src/main/res/"

echo "🏗️ Running Gradle ($GRADLE_TASK) without global clean..."
cd "$ANDROID_DIR"
./gradlew --no-daemon "$GRADLE_TASK"

echo "📁 Copying final APK..."
mkdir -p "$PROJECT_ROOT/build_outputs"
if [[ "$BUILD_TYPE" == "debug" ]]; then
  cp "$OUTPUT_DEBUG_DIR/app-debug.apk" "$PROJECT_ROOT/build_outputs/$APK_NAME"
else
  cp "$OUTPUT_RELEASE_DIR/app-release.apk" "$PROJECT_ROOT/build_outputs/$APK_NAME"
fi

echo "✅ Done!"
echo "📦 Your APK: $PROJECT_ROOT/build_outputs/$APK_NAME"

# Optional (macOS): open output folder
open "$PROJECT_ROOT/build_outputs" >/dev/null 2>&1 || true



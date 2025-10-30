#!/bin/bash
set -e

# Usage: bash build_aab.sh

PROJECT_ROOT="/Users/samerelhamdo/Desktop/stockly/mobile"
ANDROID_DIR="$PROJECT_ROOT/android"
ASSETS_DIR="$ANDROID_DIR/app/src/main/assets"
OUTPUT_BUNDLE_DIR="$ANDROID_DIR/app/build/outputs/bundle/release"

APP_NAME="stockly"
VERSION_NAME=$(date +"%Y-%m-%d_%H-%M")
AAB_NAME="${APP_NAME}-release-${VERSION_NAME}.aab"

echo "🧹 Cleaning old AABs in $OUTPUT_BUNDLE_DIR ..."
rm -f "$OUTPUT_BUNDLE_DIR"/*.aab || true

echo "📦 Bundling React Native code (expo-entry.js)..."
mkdir -p "$ASSETS_DIR"
NODE_ENV=production npx react-native bundle \
  --platform android \
  --dev false \
  --entry-file expo-entry.js \
  --bundle-output "$ASSETS_DIR/index.android.bundle" \
  --assets-dest "$ANDROID_DIR/app/src/main/res/"

echo "🏗️ Running Gradle (bundleRelease)..."
cd "$ANDROID_DIR"
./gradlew --no-daemon bundleRelease

echo "📁 Copying final AAB..."
mkdir -p "$PROJECT_ROOT/build_outputs"
cp "$OUTPUT_BUNDLE_DIR/app-release.aab" "$PROJECT_ROOT/build_outputs/$AAB_NAME"

echo "✅ Done!"
echo "📦 Your AAB: $PROJECT_ROOT/build_outputs/$AAB_NAME"

# Optional (macOS): open output folder
open "$PROJECT_ROOT/build_outputs" >/dev/null 2>&1 || true



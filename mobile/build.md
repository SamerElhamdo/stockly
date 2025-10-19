


```bash
cd /Users/samerelhamdo/Desktop/stockly/mobile
npx --yes expo prebuild --clean --platform android
export JAVA_HOME=/opt/homebrew/opt/openjdk@17/libexec/openjdk.jdk/Contents/Home
export ANDROID_SDK_ROOT="$HOME/Library/Android/sdk"
export ANDROID_HOME="$HOME/Library/Android/sdk"
export PATH="$JAVA_HOME/bin:$ANDROID_SDK_ROOT/cmdline-tools/latest/bin:$ANDROID_SDK_ROOT/platform-tools:$PATH"
bash /Users/samerelhamdo/Desktop/stockly/mobile/build_release.sh release
ls -lah /Users/samerelhamdo/Desktop/stockly/mobile/build_outputs
```


#!/usr/bin/env bash
# Build the Android app (release/dead-or-alive.apk) from the single-file build, on
# a machine with a JDK and no Android SDK. Tools come from Maven Central: apktool's
# bundled aapt2 and framework resources, the repackaged dx dexer, Google's apksig.
#   bash tools/build-apk.sh            (after node tools/bundle.js)
# The signing key is release/KEEP-PRIVATE/dead-or-alive.p12 (made on first run).
# Keep it: an APK signed with another key cannot update this one, and players
# would have to uninstall and lose their saves.
set -euo pipefail
ROOT=$(cd "$(dirname "$0")/.." && pwd)
SRC=$ROOT/tools/android
T=$ROOT/release/.android-tools
W=$ROOT/release/.android-build
KEYDIR=$ROOT/release/KEEP-PRIVATE
KEY=$KEYDIR/dead-or-alive.p12
OUT=$ROOT/release/dead-or-alive.apk
M=https://repo1.maven.org/maven2
mkdir -p "$T" "$KEYDIR"
rm -rf "$W" && mkdir -p "$W"

get() { # path in Maven Central -> $T/<file>; Central rate-limits, so retry slowly
  local f=$T/$(basename "$1")
  [ -s "$f" ] && return
  for i in 1 2 3 4 5 6; do curl -sf -o "$f" "$M/$1" && return; sleep $((i * 8)); done
  echo "could not download $1" >&2; exit 1
}
get org/apktool/apktool-lib/3.0.3/apktool-lib-3.0.3.jar
get com/jakewharton/android/repackaged/dalvik-dx/16.0.1/dalvik-dx-16.0.1.jar
get com/android/tools/build/apksig/2.3.0/apksig-2.3.0.jar
if [ ! -x "$T/aapt2" ]; then
  (cd "$T" && unzip -o -q apktool-lib-3.0.3.jar prebuilt/linux/aapt2 prebuilt/android-framework.jar \
    && mv prebuilt/linux/aapt2 prebuilt/android-framework.jar . && chmod +x aapt2)
fi

[ -s "$ROOT/dist/dead-or-alive.html" ] || { echo "build first: node tools/bundle.js" >&2; exit 1; }

# 1. resources: the launcher icon at each density, from the game's 512px icon
mkdir -p "$W/res" "$W/assets"
node "$SRC/icons.mjs" "$ROOT/assets/icon-512.png" "$W/res"
"$T/aapt2" compile --dir "$W/res" -o "$W/res.zip"
cp "$ROOT/dist/dead-or-alive.html" "$W/assets/index.html"
"$T/aapt2" link -o "$W/base.apk" -I "$T/android-framework.jar" --manifest "$SRC/AndroidManifest.xml" \
  -A "$W/assets" "$W/res.zip" --auto-add-overlay

# 2. code: compile against the stubs, dex only the app's own classes
mkdir -p "$W/stubs" "$W/classes"
javac -nowarn --release 8 -d "$W/stubs" $(find "$SRC/stubs" -name '*.java') 2>&1 | grep -v "warning" || true
javac -nowarn --release 8 -cp "$W/stubs" -d "$W/classes" $(find "$SRC/src" -name '*.java') 2>&1 | grep -v "warning" || true
java -cp "$T/dalvik-dx-16.0.1.jar" com.android.dx.command.Main --dex --min-sdk-version=24 --output="$W/classes.dex" "$W/classes"
(cd "$W" && zip -q -j base.apk classes.dex)

# 3. align (resources.arsc stored, 4-byte aligned), then sign v1 + v2 and verify
python3 -I "$SRC/align.py" "$W/base.apk" "$W/aligned.apk"
if [ ! -s "$KEY" ]; then
  PASS=$(head -c 18 /dev/urandom | base64 | tr -dc 'A-Za-z0-9' | head -c 20)
  keytool -genkeypair -keystore "$KEY" -storetype PKCS12 -storepass "$PASS" -alias release \
    -keyalg RSA -keysize 2048 -validity 10000 -dname "CN=Heirs of Ruin, O=Heirs of Ruin" >/dev/null 2>&1
  printf '%s\n' "$PASS" > "$KEYDIR/password.txt"
  echo "made a new signing key: $KEY (password in $KEYDIR/password.txt). Keep both."
fi
PASS=$(cat "$KEYDIR/password.txt")
javac -nowarn -cp "$T/apksig-2.3.0.jar" -d "$W" "$SRC/Sign.java" 2>&1 | grep -v warning || true
java --add-exports java.base/sun.security.x509=ALL-UNNAMED --add-exports java.base/sun.security.pkcs=ALL-UNNAMED --add-exports java.base/sun.security.util=ALL-UNNAMED -cp "$T/apksig-2.3.0.jar:$W" Sign "$KEY" "$PASS" release "$W/aligned.apk" "$OUT"
"$T/aapt2" dump badging "$OUT" | head -4
ls -la "$OUT"

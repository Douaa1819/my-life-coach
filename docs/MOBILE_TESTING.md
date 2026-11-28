# Mobile compatibility and testing

Identifiers (Expo config): Android package and iOS bundle identifier are both `com.aicoach.app`.

## Verification status

"Verified" means it was actually run. "Code-level" means it was read and reasoned about but not executed on that platform. **iOS has not been built or run on any device or simulator.**

| Area                                                | Android                                                         | iOS                                           |
| --------------------------------------------------- | --------------------------------------------------------------- | --------------------------------------------- |
| App bundle compiles (Metro)                         | Verified (1,777 modules)                                        | Not run                                       |
| Resolved native config (permissions, identifiers)   | Verified with `expo config --type introspect`                   | Verified with `expo config --type introspect` |
| Runs on an emulator or device                       | **Not verified**: emulator unstable on this machine (see below) | Not verified                                  |
| Navigation, auth, onboarding, Goals, Today, Profile | Not verified                                                    | Not verified                                  |
| Sound (`expo-audio`), haptics (`expo-haptics`)      | Not verified on a device                                        | Not verified on a device                      |
| Unit and component tests (Jest)                     | Platform-independent; pass                                      | Platform-independent; pass                    |
| Web (Chrome, 390 px and 1280 px)                    | Verified for Today                                              | n/a                                           |

**Android emulator.** The Pixel_10a AVD (Android 17, 16 KB page image, 2 GB RAM) boots but the Android `system_server` crashed twice and the system UI stopped responding while the machine had under 1 GB of free memory. The app was not observed running. Retry after closing heavy applications; if it is still unstable the next options are a lighter system image (needs approval to download) or a physical Android phone.

## Native configuration (verified from the resolved config)

- **iOS:** no `NSMicrophoneUsageDescription`. `expo-audio` is configured with `microphonePermission: false` because the app never records. `usesNonExemptEncryption: false` (the app uses only standard HTTPS).
- **Android:** `RECORD_AUDIO`, `MODIFY_AUDIO_SETTINGS`, `FOREGROUND_SERVICE` and `FOREGROUND_SERVICE_MEDIA_PLAYBACK` are removed from the merged manifest (`blockedPermissions`), as are storage and overlay permissions. `INTERNET` and `VIBRATE` remain.
- **Audio.** Effects use the ambient session: they respect the iOS silent switch and mix with other apps' audio.
- **Haptics.** `expo-haptics` (Taptic Engine on iOS, the system haptic motor on Android). Off by default and controlled by one switch in Profile. The system's own settings still apply (iOS System Haptics, Android touch feedback). Web does nothing.

## iOS code-level audit

Read, not run:

- **Platform branches** exist only in keyboard events (`keyboardWillShow` on iOS), `KeyboardAvoidingView` behaviour, system font and web fallbacks. All have an iOS path.
- **Session storage** uses chunked `expo-secure-store` (Keychain), which avoids the 2 KB value limit.
- **Tabs** use `NativeTabs` with SF Symbols on iOS. These native tab icons cannot use the drawn SVG icon family, so the tab bar icons differ slightly from in-app icons.
- **Unused template packages** `expo-glass-effect` and `@expo/ui` are installed but not imported anywhere in `src/`. They add native code on every platform; consider removing them (not done, needs a decision).
- **Android edge-to-edge** keyboard behaviour in the goal form needs a device check.

## Dependency review (`npx expo install --check`)

14 packages are behind the versions the installed `expo` recommends (`expo` 58.0.22 → 58.1.0, `expo-router` 58.0.29 → 58.0.33, `expo-secure-store`, `expo-image`, `expo-linking`, `expo-splash-screen`, `expo-status-bar`, `expo-symbols`, `expo-web-browser`, `expo-font`, `expo-glass-effect`, `@expo/ui`, `react-native-safe-area-context` 5.10.1 → 5.11.1, `jest-expo`). All are patch or minor updates inside SDK 58. None fixes a known problem in this app, so none was applied. Apply them as one tested batch if a device test shows a platform bug.

## Testing on an iPhone: what is required

Findings come from Expo's documentation, read on 2026-11-28. One point is **not confirmed** (marked).

| Method                         | Apple account                                               | Cost            | Mac needed                   | Notes                                                                                                                                       |
| ------------------------------ | ----------------------------------------------------------- | --------------- | ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| Expo Go on the friend's iPhone | **Not confirmed.** See below                                | $0 if App Store | No                           | Loads the JS bundle from a running dev server; the friend's Expo Go must be signed in to the same free Expo account as the developer's CLI. |
| Development or ad hoc build    | Paid Apple Developer Program, plus the phone's UDID         | $99 per year    | No (EAS builds in the cloud) | Up to 100 devices per year. Needs `expo-dev-client` for a development build (not installed).                                                |
| TestFlight, internal           | Paid Apple Developer Program; testers join your team        | $99 per year    | No                           | Up to 100 testers.                                                                                                                          |
| TestFlight, external           | Paid Apple Developer Program; testers need no Apple account | $99 per year    | No                           | Up to 10,000 testers; first build of a version needs Apple's Beta App Review.                                                               |
| iOS Simulator build            | None to build                                               | $0              | Yes, to run it               | Not usable without a Mac.                                                                                                                   |

**Not confirmed:** whether the current Expo Go for SDK 58 is installable from the App Store for free. Expo's set-up page describes an Expo Go route through TestFlight that needs the paid program, and the pages read do not state the App Store route. The quickest check is for the friend to search "Expo Go" in the App Store and open it: Expo Go shows which SDK it supports. If it does not support SDK 58, the options are a paid Apple Developer account (for a build) or waiting until you have access to one.

**EAS Build free plan** (Expo account, no Apple account): up to 15 Android and 15 iOS builds, low-priority queue (waits of 90 minutes or more at peak), 45-minute timeout. Free Android `preview` builds (an installable APK) work without any Apple account and without a Mac. `eas.json` has a `preview` profile for this.

**There is no free way to install a custom iOS build on a real iPhone.** Every documented route for a real device needs the paid Apple Developer Program.

## The bigger blocker for a friend's test: the backend

The app talks to Supabase. On this machine it uses the **local** Supabase stack (`127.0.0.1`), which a friend's phone cannot reach. For anyone outside this machine to test, one of these is needed, and each needs a decision:

1. **Tunnel the local stack** (for example with `expo start --tunnel`, which installs `@expo/ngrok`, a new dependency, plus a tunnel for Supabase on port 54321). Slower and fragile on Windows.
2. **A hosted Supabase project** with the migrations applied. This is currently not allowed (no hosted migrations) and would need your explicit approval.

## Draft instructions for the friend (use only when a path above is chosen)

1. Install **Expo Go** from the App Store. Open it and check the supported SDK shown in the app.
2. Create a free account at expo.dev and sign in inside Expo Go with the same account the developer shares for testing.
3. Open the link or scan the QR code the developer sends.
4. Create an account in the app, then try: onboarding, adding a goal, marking a goal reached, Profile settings (sound, haptic feedback).
5. Send back: what worked, what looked wrong (screenshots), and the phone model and iOS version.

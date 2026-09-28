# Splash Circuit — 2.5D side-scrolling 3D obstacle-course game (Web + Android)

One shared JavaScript/WebGL 2 codebase. It contains the **45 embedded courses** and ships as:

- **Web**: `dist/web` (a static site; works in Chrome, Edge, Firefox, Safari 15+, and mobile browsers)
- **Android APK**: `android/` (a Gradle project with a WebView host that packages the same `www` bundle)

There are no third-party runtime dependencies. All models, the athlete, animations, textures, VFX, SFX and music are original and procedurally generated.

## Quick start

```bash
node tools/validate-courses.mjs          # verify the 45-course database
node tools/sim-test.mjs                  # headless run of all 45 courses (shared gameplay code)
node tools/build.mjs web release         # -> dist/web  (use "debug" to enable the dev overlay)
node tools/serve.mjs dist/web 8080       # open http://localhost:8080
node tools/browser-test.mjs              # end-to-end Playwright test of the built game
```

Node ≥ 18 is required. You need a local HTTP server because the game uses ES modules; opening `file://` directly will not work.

## Android APK

Requirements: Android Studio (or the SDK command-line tools) with **SDK 34**, **JDK 17**, and internet access for the first Gradle sync (it downloads AGP 8.5.2, `androidx.webkit` and `core-splashscreen`).

```bash
node tools/build.mjs android debug      # copies the shared game into android/app/src/main/assets/www
cd android && ./gradlew assembleDebug    # -> app/build/outputs/apk/debug/app-debug.apk
adb install -r app/build/outputs/apk/debug/app-debug.apk

node tools/build.mjs android release
cp keystore.properties.example keystore.properties   # fill in your keystore
./gradlew assembleRelease                # -> app/build/outputs/apk/release/app-release.apk
```

| Item | Value |
|---|---|
| Application ID (placeholder) | `com.example.splashcircuit` (`.debug` suffix for debug) |
| Version | name `1.0.0`, code `1` (`android/app/build.gradle`) |
| Min / target SDK | 26 / 34. There is no native code, so it runs on arm64-v8a and all other ABIs. |
| Permissions | **none** |
| Orientation | `sensorLandscape`, immersive, notch-aware (`shortEdges` cutout mode + CSS safe-area insets) |
| Icon / splash | adaptive vector launcher icon, AndroidX SplashScreen |
| Release | R8 minify + resource shrinking; signed with `keystore.properties`, or with the debug key if that file is missing |
| Storage | `SharedPreferences` via the `AndroidStorage` JS bridge |
| Back button | forwarded to the game (pause/back); exits the app at the root menu |

## Architecture (shared systems)

| Requested system | Implementation |
|---|---|
| Player / PlayerPhysics | `src/game/Player.js`: kinematic lane controller (walk 4, run 6, backward 2, jump 10, gravity −20, max velocity 14, slide 0.9 / 1.25 / 0.75) |
| PlayerAnimation | `src/game/PlayerAnimation.js`: procedural poses with foot planting (idle through defeat, all 18 states) |
| PlayerRagdoll | `src/game/PlayerRagdoll.js`: Verlet ragdoll with the 13 requested bones and a 0.5 s blend |
| Character | `src/game/CharacterModel.js`, `src/data/characters.js`: 4 lean athletes (1.68–1.83 m), 6 outfits, 8 cosmetic accessories |
| Camera | `src/game/Camera.js`: 2.5D side camera; floor-height limit 4.5, shake 0.15 s (0.001–0.1), 2 s wipeout transition |
| CourseManager / CourseData / ChunkManager / ObstacleManager | `src/data/courses.js` (exact data), `src/data/chunkLibrary.js`, `src/game/CourseBuilder.js`, `src/game/chunks.js` |
| Checkpoint / Wipeout / Star / Timer / Ring / Powerup / Ghost / SlowMo | `src/game/systems.js`, `src/game/GameSession.js` |
| Environment / Water / VFX | `src/game/EnvironmentSystem.js`, `src/data/themes.js`, `src/game/WaterSystem.js`, `src/game/VFXSystem.js` |
| Audio | `src/audio/AudioSystem.js`: Web Audio SFX, per-theme music and ambience; master/music/SFX volumes |
| UI | `src/ui/UIManager.js`, `src/ui/styles.css` |
| Save / Progression | `src/save/SaveManager.js` |
| Graphics | `src/gfx/GraphicsManager.js`, `src/engine/*`: WebGL 2, shadow maps, ACES tone mapping, static batching, LOD, culling |
| Platform adapters | `src/platform/InputManager.js` (WebInput/AndroidInput, touch/swipe, keyboard, gamepad), `src/platform/storage.js` (WebStorage/AndroidStorage) |

`GameSession` has no DOM or WebGL dependency. The Node test harness, the browser and the Android WebView all run the identical simulation at a fixed 120 Hz step. Only the input, storage and graphics quality differ per platform.

## Course data

The chunk order and IDs follow the brief exactly. Each course is `START → chunk 1..N → END`, with a checkpoint connector between consecutive chunks.

The source data contains no geometry, so each ChunkID has a single original implementation asset. It is built deterministically from a seed derived from its ID, tuned by its listed difficulty and family, and is identical in every course that uses it.

Some IDs are marked "source-defined" in the brief: **113, 114, 115, 117 and 118**. Their family and difficulty are stored as `null` rather than invented. Their assets are keyed by ID, use the kind implied by the chunk name (bumper14/15 → bumper asset, convey10/11 → conveyor asset, pendul15 → pendulum asset) and Average tuning. Position 5 of S05E02C2 has no name in the source; it reuses ChunkID 113 (`bumper14`).

## Verification (in this sandbox)

- `validate-courses`: 45 courses and 126 unique chunks. Every course code equals the layout followed by the chunk IDs, and the environments, names and star thresholds are consistent.
- `sim-test` (`docs/sim-test-report.txt`): all 45 courses pass.
  - The exact chunk sequence is instantiated.
  - Each course can be traversed to the finish with obstacles disabled; that clean autopilot time is under the 3★ target on every course.
  - With obstacles enabled, the autopilot always finishes: wipeout → recovery/respawn never leaves it permanently stuck.
  - All checkpoints fire, and the timer and stars are correct.
- `browser-test` (`docs/browser-test-report.txt`, screenshots in `docs/screenshots/`), all checks pass:
  - boot and menus
  - all 45 courses loaded and completed
  - luminance per theme between 0.41 and 0.57, with no washed-out or crushed frames
  - Low/Medium/High quality with an unchanged layout
  - keyboard controls
  - save/reload persistence and ghost storage
  - touch drag and swipe-to-jump on a 19.5:9 phone viewport
  - responsive layouts at 16:9, 18:9, 19.5:9, 20:9, 4:3 and a 360 px-high phone
  - the Android `www` bundle running under an emulated Android WebView (AndroidStorage bridge, back button, same results; S05E03C3 finished in 28.04 s on both)

## Known limitations

- **The APK was not built or installed here.** The sandbox has no Android SDK and no network access for Gradle. The Gradle project is complete; build it with the commands above, then test it on real devices.
- Performance was only measured with a software renderer (SwiftShader). Real GPU frame rates, especially on low-end Android phones, have not been measured. The Low preset is aimed at those devices.
- The athlete is a realistic, lean, anatomically proportioned procedural model with a face, hair, hands, feet and clothing. It is not a photo-scanned character: that would need artist-made assets.
- "Air-control reaction ≈ 5" is used as a responsiveness rate (1/s). The two trampoline "bouncing velocity = 1" values are used as multipliers on the base launch. The wipeout penalty of 5 s is added to the course timer.

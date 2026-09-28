# Keep the JavaScript bridge used by the shared game code (AndroidStorage).
-keepclassmembers class com.example.splashcircuit.MainActivity$StorageBridge {
    @android.webkit.JavascriptInterface <methods>;
}
-keepattributes JavascriptInterface

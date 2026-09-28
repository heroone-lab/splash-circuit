package com.example.splashcircuit;

import android.annotation.SuppressLint;
import android.app.Activity;
import android.content.Context;
import android.content.SharedPreferences;
import android.os.Build;
import android.os.Bundle;
import android.view.View;
import android.view.WindowInsets;
import android.view.WindowInsetsController;
import android.view.WindowManager;
import android.webkit.JavascriptInterface;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

import androidx.annotation.NonNull;
import androidx.core.splashscreen.SplashScreen;
import androidx.webkit.WebViewAssetLoader;

/**
 * Hosts the shared Splash Circuit game (the exact same code and 45-course
 * database as the Web build, packaged under assets/www) in a hardware
 * accelerated WebView. Only the input (back button) and storage bridges are
 * Android specific.
 */
public class MainActivity extends Activity {
    private WebView webView;

    @SuppressLint("SetJavaScriptEnabled")
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        SplashScreen.installSplashScreen(this);
        super.onCreate(savedInstanceState);
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);

        // Serve assets from a secure https origin (ES modules + localStorage work normally).
        final WebViewAssetLoader loader = new WebViewAssetLoader.Builder()
                .addPathHandler("/assets/", new WebViewAssetLoader.AssetsPathHandler(this))
                .build();

        webView = new WebView(this);
        webView.setBackgroundColor(0xFF0E1A28);
        WebSettings s = webView.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setDatabaseEnabled(true);
        s.setMediaPlaybackRequiresUserGesture(false);
        s.setAllowFileAccess(false);
        s.setAllowContentAccess(false);
        s.setUseWideViewPort(true);
        s.setLoadWithOverviewMode(true);
        s.setSupportZoom(false);
        s.setUserAgentString(s.getUserAgentString() + " SplashCircuitApp/" + BuildConfig.VERSION_NAME);
        if (BuildConfig.DEBUG) WebView.setWebContentsDebuggingEnabled(true);

        webView.addJavascriptInterface(new StorageBridge(this), "AndroidStorage");
        webView.setWebViewClient(new WebViewClient() {
            @Override
            public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                return loader.shouldInterceptRequest(request.getUrl());
            }
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                return !"appassets.androidplatform.net".equals(request.getUrl().getHost());
            }
        });
        setContentView(webView);
        enterImmersive();
        String extra = BuildConfig.DEBUG ? "?debug" : "";
        webView.loadUrl("https://appassets.androidplatform.net/assets/www/index.html" + extra);
    }

    private void enterImmersive() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            getWindow().setDecorFitsSystemWindows(false);
            WindowInsetsController c = getWindow().getInsetsController();
            if (c != null) {
                c.hide(WindowInsets.Type.statusBars() | WindowInsets.Type.navigationBars());
                c.setSystemBarsBehavior(WindowInsetsController.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE);
            }
        } else {
            getWindow().getDecorView().setSystemUiVisibility(View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
                    | View.SYSTEM_UI_FLAG_FULLSCREEN | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
                    | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
                    | View.SYSTEM_UI_FLAG_LAYOUT_STABLE);
        }
    }

    @Override
    public void onWindowFocusChanged(boolean hasFocus) {
        super.onWindowFocusChanged(hasFocus);
        if (hasFocus) enterImmersive();
    }

    @Override
    @SuppressWarnings("deprecation")
    public void onBackPressed() {
        // Forward the hardware back button to the game (pause / navigate back).
        webView.evaluateJavascript("(window.__onAndroidBack && window.__onAndroidBack()) ? 1 : 0", value -> {
            if (!"1".equals(value)) MainActivity.super.onBackPressed();
        });
    }

    @Override protected void onPause() { super.onPause(); if (webView != null) webView.onPause(); }
    @Override protected void onResume() { super.onResume(); if (webView != null) webView.onResume(); enterImmersive(); }
    @Override protected void onDestroy() { if (webView != null) { webView.destroy(); webView = null; } super.onDestroy(); }

    /** Persistent application storage (SharedPreferences) exposed to the shared SaveManager. */
    static final class StorageBridge {
        private final SharedPreferences prefs;
        StorageBridge(@NonNull Context ctx) { prefs = ctx.getSharedPreferences("splashcircuit_save", Context.MODE_PRIVATE); }
        @JavascriptInterface public String getItem(String key) { return prefs.getString(key, null); }
        @JavascriptInterface public void setItem(String key, String value) { prefs.edit().putString(key, value).apply(); }
        @JavascriptInterface public void removeItem(String key) { prefs.edit().remove(key).apply(); }
    }
}

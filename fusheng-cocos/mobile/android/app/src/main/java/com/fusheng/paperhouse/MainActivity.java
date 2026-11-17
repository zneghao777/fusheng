package com.fusheng.paperhouse;

import android.os.Build;
import android.os.Bundle;
import android.content.pm.ApplicationInfo;
import android.view.WindowManager;
import android.webkit.WebView;
import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.core.view.WindowInsetsControllerCompat;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.WebViewListener;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        WebView.setWebContentsDebuggingEnabled((getApplicationInfo().flags & ApplicationInfo.FLAG_DEBUGGABLE) != 0);
        getBridge().addWebViewListener(new WebViewListener() {
            @Override
            public void onPageLoaded(WebView webView) {
                ViewCompat.requestApplyInsets(webView);
            }
        });
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
            WindowManager.LayoutParams attributes = getWindow().getAttributes();
            attributes.layoutInDisplayCutoutMode = Build.VERSION.SDK_INT >= Build.VERSION_CODES.R
                ? WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_ALWAYS
                : WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_SHORT_EDGES;
            getWindow().setAttributes(attributes);
        }
        // Draw paper under the camera cutout, but report its insets to game controls.
        ViewCompat.setOnApplyWindowInsetsListener(getBridge().getWebView(), (view, insets) -> {
            Insets safe = insets.getInsets(WindowInsetsCompat.Type.displayCutout());
            float density = getResources().getDisplayMetrics().density;
            String script = "(()=>{const s=document.documentElement.style;"
                + "s.setProperty('--native-safe-left','" + safe.left / density + "px');"
                + "s.setProperty('--native-safe-right','" + safe.right / density + "px');"
                + "s.setProperty('--native-safe-top','" + safe.top / density + "px');"
                + "s.setProperty('--native-safe-bottom','" + safe.bottom / density + "px');"
                + "window.dispatchEvent(new Event('fusheng:insets'));})()";
            getBridge().getWebView().evaluateJavascript(script, null);
            return insets;
        });
        immersive();
    }

    private void immersive() {
        WindowCompat.setDecorFitsSystemWindows(getWindow(), false);
        WindowInsetsControllerCompat controller = WindowCompat.getInsetsController(getWindow(), getWindow().getDecorView());
        controller.setSystemBarsBehavior(WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE);
        controller.hide(WindowInsetsCompat.Type.systemBars());
        if (getBridge() != null) ViewCompat.requestApplyInsets(getBridge().getWebView());
    }

    @Override
    public void onWindowFocusChanged(boolean hasFocus) {
        super.onWindowFocusChanged(hasFocus);
        if (hasFocus) immersive();
    }
    @Override
    public void onPause() {
        if (getBridge() != null) getBridge().triggerWindowJSEvent("blur");
        super.onPause();
    }

    @Override
    public void onResume() {
        super.onResume();
        immersive();
        if (getBridge() != null) getBridge().triggerWindowJSEvent("focus");
    }
}

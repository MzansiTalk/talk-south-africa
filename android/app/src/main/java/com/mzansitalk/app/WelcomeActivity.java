package com.mzansitalk.app;

import android.os.Bundle;
import android.util.Log;
import android.widget.TextView;

import com.getcapacitor.BridgeActivity;

/**
 * Launcher activity for the locally bundled WelcomeScreen.
 *
 * onCreate is guarded so a plugin/WebView failure logs under the "MzansiTalk"
 * tag and shows a readable fallback screen instead of closing the app.
 */
public class WelcomeActivity extends BridgeActivity {

    private static final String TAG = "MzansiTalk";

    @Override
    public void onCreate(Bundle savedInstanceState) {
        Log.i(TAG, "WelcomeActivity.onCreate start");
        try {
            super.onCreate(savedInstanceState);
            Log.i(TAG, "WelcomeActivity.onCreate ok — Capacitor bridge ready");
        } catch (Throwable t) {
            Log.e(TAG, "WelcomeActivity.onCreate failed", t);
            showFallback(t);
        }
    }

    private void showFallback(Throwable t) {
        try {
            TextView view = new TextView(this);
            view.setPadding(48, 96, 48, 48);
            view.setTextSize(16f);
            view.setText("Welcome to MzansiTalk\n\nThe app could not finish starting up.\n\n"
                    + t.getClass().getSimpleName() + ": " + t.getMessage());
            setContentView(view);
        } catch (Throwable inner) {
            Log.e(TAG, "Fallback screen failed too", inner);
        }
    }
}

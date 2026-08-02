package com.mzansitalk.app;

import android.content.Context;
import android.net.ConnectivityManager;
import android.net.Network;
import android.net.NetworkCapabilities;
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
            Log.i(TAG, "Internet available: " + hasInternet());
        } catch (Throwable t) {
            Log.e(TAG, "WelcomeActivity.onCreate failed", t);
            showFallback(t);
        }
    }

    /**
     * Real connectivity check: any transport (mobile data on any carrier, WiFi,
     * ethernet, VPN) counts as long as the OS validated internet access.
     */
    private boolean hasInternet() {
        try {
            ConnectivityManager cm =
                    (ConnectivityManager) getSystemService(Context.CONNECTIVITY_SERVICE);
            if (cm == null) return false;
            Network network = cm.getActiveNetwork();
            if (network == null) return false;
            NetworkCapabilities caps = cm.getNetworkCapabilities(network);
            return caps != null && caps.hasCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET);
        } catch (Throwable t) {
            Log.w(TAG, "Connectivity check failed", t);
            return false;
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

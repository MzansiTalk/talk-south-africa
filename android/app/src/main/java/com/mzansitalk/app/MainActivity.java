package com.mzansitalk.app;

import android.os.Bundle;
import android.util.Log;
import android.widget.TextView;

import com.getcapacitor.BridgeActivity;

/** Main chat shell. Guarded startup so failures log instead of closing the app. */
public class MainActivity extends BridgeActivity {

    private static final String TAG = "MzansiTalk";

    @Override
    public void onCreate(Bundle savedInstanceState) {
        Log.i(TAG, "MainActivity.onCreate start");
        try {
            super.onCreate(savedInstanceState);
            Log.i(TAG, "MainActivity.onCreate ok");
        } catch (Throwable t) {
            Log.e(TAG, "MainActivity.onCreate failed", t);
            try {
                TextView view = new TextView(this);
                view.setPadding(48, 96, 48, 48);
                view.setText("MzansiTalk could not start.\n\n"
                        + t.getClass().getSimpleName() + ": " + t.getMessage());
                setContentView(view);
            } catch (Throwable inner) {
                Log.e(TAG, "Fallback screen failed too", inner);
            }
        }
    }
}

package vooxr.droid;

import android.os.Bundle;
import com.phonegap.DroidGap;
import voxxr.droid.R;

public class VoxxrDroid extends DroidGap {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        super.setIntegerProperty("splashscreen", R.drawable.splash);
        super.loadUrl("file:///android_asset/www/m.html");
    }
}


package me.loveday.aetherfm;

import android.Manifest;
import android.content.Context;
import android.content.Intent;
import android.os.Build;

import androidx.core.content.ContextCompat;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;

@CapacitorPlugin(
        name = "MediaControls",
        permissions = {
                @Permission(
                        alias = "notifications",
                        strings = { Manifest.permission.POST_NOTIFICATIONS }
                )
        }
)
public class MediaControlsPlugin extends Plugin {

    private String stationTitle = "Aether FM";
    private String stationArtist = "Live Radio";
    private boolean isPlaying = false;

    @Override
    public void load() {
        MediaPlaybackService.setActionCallback(this::sendAction);
    }

    @PluginMethod
    public void updateMetadata(PluginCall call) {
        String title = call.getString("title");
        String artist = call.getString("artist");

        if (title != null && !title.trim().isEmpty()) {
            stationTitle = title;
        }

        if (artist != null && !artist.trim().isEmpty()) {
            stationArtist = artist;
        }

        dispatchUpdateToService();
        call.resolve();
    }

    @PluginMethod
    public void updatePlaybackState(PluginCall call) {
        Boolean playing = call.getBoolean("isPlaying");

        if (playing != null) {
            isPlaying = playing;
        }

        dispatchUpdateToService();
        call.resolve();
    }

    @PluginMethod
    public void stop(PluginCall call) {
        isPlaying = false;
        Context context = getContext();
        if (context != null) {
            context.stopService(new Intent(context, MediaPlaybackService.class));
        }
        call.resolve();
    }

    private void dispatchUpdateToService() {
        Context context = getContext();
        if (context == null) return;

        Intent intent = new Intent(context, MediaPlaybackService.class);
        intent.setAction(MediaPlaybackService.ACTION_UPDATE);
        intent.putExtra(MediaPlaybackService.EXTRA_TITLE, stationTitle);
        intent.putExtra(MediaPlaybackService.EXTRA_ARTIST, stationArtist);
        intent.putExtra(MediaPlaybackService.EXTRA_IS_PLAYING, isPlaying);

        try {
            if (isPlaying && Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                ContextCompat.startForegroundService(context, intent);
            } else {
                context.startService(intent);
            }
        } catch (Exception e) {
            // Guard against rare Android background start restrictions
        }
    }

    private void sendAction(String action) {
        JSObject data = new JSObject();
        data.put("action", action);
        notifyListeners("mediaAction", data);
    }
}

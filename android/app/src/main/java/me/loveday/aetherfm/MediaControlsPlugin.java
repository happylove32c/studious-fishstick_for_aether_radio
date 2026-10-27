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
    public void updateRecording(PluginCall call) {
        Boolean rec = call.getBoolean("recording");
        Integer elapsed = call.getInt("elapsed");

        Context context = getContext();
        if (context != null) {
            Intent intent = new Intent(context, MediaPlaybackService.class);
            intent.setAction(MediaPlaybackService.ACTION_UPDATE);
            // Only recording state is sent. Title, artist and isPlaying extras would
            // make the service treat every tick as a metadata change and defeat the
            // 5-second throttle in MediaPlaybackService.onStartCommand.
            if (rec != null) {
                intent.putExtra(MediaPlaybackService.EXTRA_RECORDING, rec);
            }
            if (elapsed != null) {
                intent.putExtra(MediaPlaybackService.EXTRA_ELAPSED, elapsed);
            }

            try {
                if ((isPlaying || (rec != null && rec)) && Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    ContextCompat.startForegroundService(context, intent);
                } else {
                    context.startService(intent);
                }
            } catch (Exception e) {
                // Guard against rare Android background start restrictions
            }
        }
        call.resolve();
    }

    @PluginMethod
    public void updateOfflinePlayback(PluginCall call) {
        String title = call.getString("title", "Recording");
        long durationMs = call.getData().optLong("durationMs", 0L);
        long positionMs = call.getData().optLong("positionMs", 0L);
        boolean playing = call.getBoolean("isPlaying", false);
        boolean offline = call.getBoolean("offline", true);
        double speed = call.getData().optDouble("speed", 1.0);

        Context context = getContext();
        if (context != null) {
            Intent intent = new Intent(context, MediaPlaybackService.class);
            intent.setAction(MediaPlaybackService.ACTION_UPDATE_OFFLINE);
            intent.putExtra(MediaPlaybackService.EXTRA_TITLE, title);
            intent.putExtra(MediaPlaybackService.EXTRA_ARTIST, "Archived Broadcast");
            intent.putExtra(MediaPlaybackService.EXTRA_DURATION, durationMs);
            intent.putExtra(MediaPlaybackService.EXTRA_POSITION, positionMs);
            intent.putExtra(MediaPlaybackService.EXTRA_IS_PLAYING, playing);
            intent.putExtra(MediaPlaybackService.EXTRA_OFFLINE, offline);
            intent.putExtra(MediaPlaybackService.EXTRA_SPEED, (float) speed);

            try {
                if (playing && Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    ContextCompat.startForegroundService(context, intent);
                } else {
                    context.startService(intent);
                }
            } catch (Exception e) {
                // Guard against rare Android background start restrictions
            }
        }
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
        intent.putExtra(MediaPlaybackService.EXTRA_OFFLINE, false);

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

    private void sendAction(String action, Long position) {
        JSObject data = new JSObject();
        data.put("action", action);
        if (position != null) {
            data.put("position", position);
        }
        notifyListeners("mediaAction", data);
    }
}

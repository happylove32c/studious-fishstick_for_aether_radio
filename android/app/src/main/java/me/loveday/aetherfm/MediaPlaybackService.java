package me.loveday.aetherfm;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.net.wifi.WifiManager;
import android.os.Build;
import android.os.IBinder;
import android.os.PowerManager;
import android.support.v4.media.MediaMetadataCompat;
import android.support.v4.media.session.MediaSessionCompat;
import android.support.v4.media.session.PlaybackStateCompat;
import android.util.Log;

import androidx.annotation.Nullable;
import androidx.core.app.NotificationCompat;
import androidx.media.app.NotificationCompat.MediaStyle;
import androidx.media.session.MediaButtonReceiver;

public class MediaPlaybackService extends Service {

    private static final String TAG = "AetherSvc";

    public static final String ACTION_PLAY = "me.loveday.aetherfm.ACTION_PLAY";
    public static final String ACTION_PAUSE = "me.loveday.aetherfm.ACTION_PAUSE";
    public static final String ACTION_NEXT = "me.loveday.aetherfm.ACTION_NEXT";
    public static final String ACTION_PREVIOUS = "me.loveday.aetherfm.ACTION_PREVIOUS";
    public static final String ACTION_STOP = "me.loveday.aetherfm.ACTION_STOP";
    public static final String ACTION_UPDATE = "me.loveday.aetherfm.ACTION_UPDATE";
    public static final String ACTION_STOP_REC = "me.loveday.aetherfm.ACTION_STOP_REC";
    public static final String ACTION_UPDATE_OFFLINE = "me.loveday.aetherfm.ACTION_UPDATE_OFFLINE";
    public static final String ACTION_SEEK_TO = "me.loveday.aetherfm.ACTION_SEEK_TO";
    public static final String ACTION_REWIND = "me.loveday.aetherfm.ACTION_REWIND";
    public static final String ACTION_FAST_FORWARD = "me.loveday.aetherfm.ACTION_FAST_FORWARD";

    public static final String EXTRA_TITLE = "extra_title";
    public static final String EXTRA_ARTIST = "extra_artist";
    public static final String EXTRA_IS_PLAYING = "extra_is_playing";
    public static final String EXTRA_RECORDING = "extra_recording";
    public static final String EXTRA_ELAPSED = "extra_elapsed";
    public static final String EXTRA_OFFLINE = "extra_offline";
    public static final String EXTRA_DURATION = "extra_duration";
    public static final String EXTRA_POSITION = "extra_position";
    public static final String EXTRA_SPEED = "extra_speed";

    private static final String CHANNEL_ID = "aether_fm_media";
    private static final int NOTIFICATION_ID = 1001;

    public interface ActionCallback {
        void onAction(String action, Long position);
    }

    private static ActionCallback actionCallback;

    public static void setActionCallback(ActionCallback callback) {
        actionCallback = callback;
    }

    private MediaSessionCompat mediaSession;
    private NotificationManager notificationManager;
    private PowerManager.WakeLock wakeLock;
    private WifiManager.WifiLock wifiLock;

    private String currentTitle = "Aether FM";
    private String currentArtist = "Live Radio";
    private boolean isPlaying = false;
    private boolean isRecording = false;
    private int recordElapsed = 0;
    private long lastNotificationUpdateTime = 0;
    private boolean lastIsRecording = false;

    private boolean isOffline = false;
    private long durationMs = -1L;
    private long positionMs = 0L;
    private float playbackSpeed = 1.0f;

    @Override
    public void onCreate() {
        super.onCreate();
        Log.d(TAG, "onCreate");

        notificationManager = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
        createNotificationChannel();

        mediaSession = new MediaSessionCompat(this, "AetherFMService");
        mediaSession.setFlags(
                MediaSessionCompat.FLAG_HANDLES_MEDIA_BUTTONS
                        | MediaSessionCompat.FLAG_HANDLES_TRANSPORT_CONTROLS
        );

        Intent mediaButtonIntent = new Intent(Intent.ACTION_MEDIA_BUTTON, null, this, MediaButtonReceiver.class);
        int flags = PendingIntent.FLAG_UPDATE_CURRENT;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            flags |= PendingIntent.FLAG_IMMUTABLE;
        }
        PendingIntent mediaButtonPendingIntent = PendingIntent.getBroadcast(this, 0, mediaButtonIntent, flags);
        mediaSession.setMediaButtonReceiver(mediaButtonPendingIntent);

        mediaSession.setCallback(new MediaSessionCompat.Callback() {
            @Override
            public void onPlay() {
                dispatchAction("play", null);
            }

            @Override
            public void onPause() {
                dispatchAction("pause", null);
            }

            @Override
            public void onSkipToNext() {
                dispatchAction("next", null);
            }

            @Override
            public void onSkipToPrevious() {
                dispatchAction("previous", null);
            }

            @Override
            public void onStop() {
                dispatchAction("stop", null);
                stopServiceAndNotification();
            }

            @Override
            public void onSeekTo(long pos) {
                positionMs = pos;
                dispatchAction("seek", pos);
                updateMediaSession();
            }

            @Override
            public void onRewind() {
                dispatchAction("rewind", null);
            }

            @Override
            public void onFastForward() {
                dispatchAction("forward", null);
            }
        });

        mediaSession.setActive(true);

        PowerManager pm = (PowerManager) getSystemService(Context.POWER_SERVICE);
        if (pm != null) {
            wakeLock = pm.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "aetherfm:playback_wakelock");
            wakeLock.setReferenceCounted(false);
        }

        WifiManager wm = (WifiManager) getApplicationContext().getSystemService(Context.WIFI_SERVICE);
        if (wm != null) {
            wifiLock = wm.createWifiLock(WifiManager.WIFI_MODE_FULL_HIGH_PERF, "aetherfm:playback_wifilock");
            wifiLock.setReferenceCounted(false);
        }
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        if (intent == null) {
            Log.d(TAG, "onStartCommand: null intent, redelivery after kill");
            // Service was restarted by the system; rebuild notification with last state
            if (isPlaying) {
                updateMediaSession();
                Notification notification = buildNotification();
                acquireLocks();
                startForeground(NOTIFICATION_ID, notification);
            }
            return START_STICKY;
        }

        String action = intent.getAction();
        Log.d(TAG, "onStartCommand: action=" + action + " isPlaying=" + isPlaying);

        // If we are currently playing, re-assert foreground immediately so Android
        // never has a window to kill the service before we finish processing.
        if (isPlaying) {
            updateMediaSession();
            Notification notification = buildNotification();
            startForeground(NOTIFICATION_ID, notification);
        }

        if (ACTION_PLAY.equals(action)) {
            dispatchAction("play", null);
        } else if (ACTION_PAUSE.equals(action)) {
            dispatchAction("pause", null);
        } else if (ACTION_NEXT.equals(action)) {
            dispatchAction("next", null);
        } else if (ACTION_PREVIOUS.equals(action)) {
            dispatchAction("previous", null);
        } else if (ACTION_REWIND.equals(action)) {
            dispatchAction("rewind", null);
        } else if (ACTION_FAST_FORWARD.equals(action)) {
            dispatchAction("forward", null);
        } else if (ACTION_SEEK_TO.equals(action)) {
            long pos = intent.getLongExtra(EXTRA_POSITION, 0L);
            positionMs = pos;
            dispatchAction("seek", pos);
        } else if (ACTION_STOP.equals(action)) {
            dispatchAction("stop", null);
            stopServiceAndNotification();
            return START_NOT_STICKY;
        } else if (ACTION_STOP_REC.equals(action)) {
            dispatchAction("stoprec", null);
            return START_STICKY;
        } else if (ACTION_UPDATE_OFFLINE.equals(action)) {
            isOffline = intent.getBooleanExtra(EXTRA_OFFLINE, true);
            durationMs = intent.getLongExtra(EXTRA_DURATION, 0L);
            positionMs = intent.getLongExtra(EXTRA_POSITION, 0L);
            playbackSpeed = intent.getFloatExtra(EXTRA_SPEED, 1.0f);
            isPlaying = intent.getBooleanExtra(EXTRA_IS_PLAYING, false);
            if (intent.hasExtra(EXTRA_TITLE)) {
                String t = intent.getStringExtra(EXTRA_TITLE);
                if (t != null && !t.trim().isEmpty()) {
                    currentTitle = t;
                }
            }
            if (intent.hasExtra(EXTRA_ARTIST)) {
                String a = intent.getStringExtra(EXTRA_ARTIST);
                if (a != null && !a.trim().isEmpty()) {
                    currentArtist = a;
                }
            }
            isRecording = false;
        } else if (ACTION_UPDATE.equals(action)) {
            isOffline = intent.getBooleanExtra(EXTRA_OFFLINE, false);
            if (!isOffline) {
                durationMs = -1L;
                positionMs = 0L;
                playbackSpeed = 1.0f;
            }
            if (intent.hasExtra(EXTRA_TITLE)) {
                String t = intent.getStringExtra(EXTRA_TITLE);
                if (t != null && !t.trim().isEmpty()) {
                    currentTitle = t;
                }
            }
            if (intent.hasExtra(EXTRA_ARTIST)) {
                String a = intent.getStringExtra(EXTRA_ARTIST);
                if (a != null && !a.trim().isEmpty()) {
                    currentArtist = a;
                }
            }
            if (intent.hasExtra(EXTRA_IS_PLAYING)) {
                isPlaying = intent.getBooleanExtra(EXTRA_IS_PLAYING, false);
            }
            if (intent.hasExtra(EXTRA_RECORDING)) {
                isRecording = intent.getBooleanExtra(EXTRA_RECORDING, false);
            }
            if (intent.hasExtra(EXTRA_ELAPSED)) {
                recordElapsed = intent.getIntExtra(EXTRA_ELAPSED, 0);
            }

            // Metadata-only update while playing must keep the service foreground.
            if (isPlaying && !isOffline) {
                updateMediaSession();
                Notification fgNotification = buildNotification();
                acquireLocks();
                startForeground(NOTIFICATION_ID, fgNotification);
                lastNotificationUpdateTime = System.currentTimeMillis();
                return START_STICKY;
            }
        }

        long now = System.currentTimeMillis();
        boolean recStateChanged = (isRecording != lastIsRecording);
        lastIsRecording = isRecording;
        boolean metaOrPlayChanged = intent.hasExtra(EXTRA_TITLE) || intent.hasExtra(EXTRA_ARTIST) || intent.hasExtra(EXTRA_IS_PLAYING) || intent.hasExtra(EXTRA_POSITION);

        // Service updates the notification at most once per 5s when recording ticks
        if (isRecording && !recStateChanged && !metaOrPlayChanged && (now - lastNotificationUpdateTime < 5000)) {
            return START_STICKY;
        }
        lastNotificationUpdateTime = now;

        updateMediaSession();
        Notification notification = buildNotification();

        if (isPlaying || isRecording) {
            acquireLocks();
            startForeground(NOTIFICATION_ID, notification);
        } else {
            releaseLocks();
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
                stopForeground(STOP_FOREGROUND_DETACH);
            } else {
                stopForeground(false);
            }
            if (notificationManager != null) {
                notificationManager.notify(NOTIFICATION_ID, notification);
            }
        }

        return START_STICKY;
    }

    private void dispatchAction(String action, Long position) {
        if (actionCallback != null) {
            actionCallback.onAction(action, position);
        }
    }

    private void updateMediaSession() {
        if (mediaSession == null) return;

        MediaMetadataCompat.Builder metaBuilder = new MediaMetadataCompat.Builder()
                .putString(MediaMetadataCompat.METADATA_KEY_TITLE, currentTitle)
                .putString(MediaMetadataCompat.METADATA_KEY_ARTIST, currentArtist)
                .putString(MediaMetadataCompat.METADATA_KEY_ALBUM, "Aether FM");

        if (isOffline) {
            metaBuilder.putLong(MediaMetadataCompat.METADATA_KEY_DURATION, durationMs);
        } else {
            metaBuilder.putLong(MediaMetadataCompat.METADATA_KEY_DURATION, -1L);
        }
        mediaSession.setMetadata(metaBuilder.build());

        long actions;
        if (isOffline) {
            actions = PlaybackStateCompat.ACTION_PLAY
                    | PlaybackStateCompat.ACTION_PAUSE
                    | PlaybackStateCompat.ACTION_PLAY_PAUSE
                    | PlaybackStateCompat.ACTION_STOP
                    | PlaybackStateCompat.ACTION_SEEK_TO
                    | PlaybackStateCompat.ACTION_REWIND
                    | PlaybackStateCompat.ACTION_FAST_FORWARD;
        } else {
            actions = PlaybackStateCompat.ACTION_PLAY
                    | PlaybackStateCompat.ACTION_PAUSE
                    | PlaybackStateCompat.ACTION_PLAY_PAUSE
                    | PlaybackStateCompat.ACTION_SKIP_TO_NEXT
                    | PlaybackStateCompat.ACTION_SKIP_TO_PREVIOUS
                    | PlaybackStateCompat.ACTION_STOP;
        }

        int state = isPlaying ? PlaybackStateCompat.STATE_PLAYING : PlaybackStateCompat.STATE_PAUSED;
        long pos = isOffline ? positionMs : PlaybackStateCompat.PLAYBACK_POSITION_UNKNOWN;
        float speed = isPlaying ? (isOffline ? playbackSpeed : 1.0f) : 0f;

        PlaybackStateCompat playbackState = new PlaybackStateCompat.Builder()
                .setActions(actions)
                .setState(state, pos, speed)
                .build();

        mediaSession.setPlaybackState(playbackState);
    }

    private Notification buildNotification() {
        int pendingFlags = PendingIntent.FLAG_UPDATE_CURRENT;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            pendingFlags |= PendingIntent.FLAG_IMMUTABLE;
        }

        Intent playPauseIntent = new Intent(this, MediaPlaybackService.class)
                .setAction(isPlaying ? ACTION_PAUSE : ACTION_PLAY);
        PendingIntent playPausePending = PendingIntent.getService(this, 2, playPauseIntent, pendingFlags);

        Intent stopIntent = new Intent(this, MediaPlaybackService.class).setAction(ACTION_STOP);
        PendingIntent stopPending = PendingIntent.getService(this, 4, stopIntent, pendingFlags);

        Intent launchIntent = getPackageManager().getLaunchIntentForPackage(getPackageName());
        PendingIntent contentIntent = null;
        if (launchIntent != null) {
            launchIntent.setFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP | Intent.FLAG_ACTIVITY_CLEAR_TOP);
            contentIntent = PendingIntent.getActivity(this, 0, launchIntent, pendingFlags);
        }

        int iconId = getResources().getIdentifier("ic_stat_radio", "drawable", getPackageName());
        if (iconId == 0) {
            iconId = getApplicationInfo().icon;
        }

        NotificationCompat.Builder builder = new NotificationCompat.Builder(this, CHANNEL_ID)
                .setSmallIcon(iconId)
                .setContentTitle(currentTitle)
                .setContentIntent(contentIntent)
                .setDeleteIntent(stopPending)
                .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
                .setCategory(NotificationCompat.CATEGORY_TRANSPORT)
                .setPriority(NotificationCompat.PRIORITY_LOW)
                .setOngoing(isPlaying || isRecording)
                .setOnlyAlertOnce(true)
                .setShowWhen(false);

        if (isOffline) {
            Intent rewindIntent = new Intent(this, MediaPlaybackService.class).setAction(ACTION_REWIND);
            PendingIntent rewindPending = PendingIntent.getService(this, 6, rewindIntent, pendingFlags);

            Intent ffIntent = new Intent(this, MediaPlaybackService.class).setAction(ACTION_FAST_FORWARD);
            PendingIntent ffPending = PendingIntent.getService(this, 7, ffIntent, pendingFlags);

            builder.setContentText(currentArtist)
                    .addAction(android.R.drawable.ic_media_rew, "Rewind", rewindPending)
                    .addAction(
                            isPlaying ? android.R.drawable.ic_media_pause : android.R.drawable.ic_media_play,
                            isPlaying ? "Pause" : "Play",
                            playPausePending
                    )
                    .addAction(android.R.drawable.ic_media_ff, "Forward", ffPending);

            builder.setStyle(
                    new MediaStyle()
                            .setMediaSession(mediaSession != null ? mediaSession.getSessionToken() : null)
                            .setShowActionsInCompactView(0, 1, 2)
                            .setShowCancelButton(true)
                            .setCancelButtonIntent(stopPending)
            );
        } else {
            Intent prevIntent = new Intent(this, MediaPlaybackService.class).setAction(ACTION_PREVIOUS);
            PendingIntent prevPending = PendingIntent.getService(this, 1, prevIntent, pendingFlags);

            Intent nextIntent = new Intent(this, MediaPlaybackService.class).setAction(ACTION_NEXT);
            PendingIntent nextPending = PendingIntent.getService(this, 3, nextIntent, pendingFlags);

            Intent stopRecIntent = new Intent(this, MediaPlaybackService.class).setAction(ACTION_STOP_REC);
            PendingIntent stopRecPending = PendingIntent.getService(this, 5, stopRecIntent, pendingFlags);

            int minutes = recordElapsed / 60;
            int seconds = recordElapsed % 60;
            String recTime = String.format("%02d:%02d", minutes, seconds);
            String contentText = isRecording ? ("● REC " + recTime) : currentArtist;

            builder.setContentText(contentText)
                    .addAction(android.R.drawable.ic_media_previous, "Previous", prevPending)
                    .addAction(
                            isPlaying ? android.R.drawable.ic_media_pause : android.R.drawable.ic_media_play,
                            isPlaying ? "Pause" : "Play",
                            playPausePending
                    )
                    .addAction(android.R.drawable.ic_media_next, "Next", nextPending);

            if (isRecording) {
                builder.addAction(android.R.drawable.ic_menu_close_clear_cancel, "Stop Rec", stopRecPending);
            }

            builder.setStyle(
                    new MediaStyle()
                            .setMediaSession(mediaSession != null ? mediaSession.getSessionToken() : null)
                            .setShowActionsInCompactView(0, 1, 2)
                            .setShowCancelButton(true)
                            .setCancelButtonIntent(stopPending)
            );
        }

        return builder.build();
    }

    private void acquireLocks() {
        try {
            if (wakeLock != null && !wakeLock.isHeld()) {
                wakeLock.acquire(12 * 60 * 60 * 1000L); // Max 12 hours timeout safety
            }
            if (wifiLock != null && !wifiLock.isHeld()) {
                wifiLock.acquire();
            }
        } catch (Exception e) {
            // ignore
        }
    }

    private void releaseLocks() {
        try {
            if (wakeLock != null && wakeLock.isHeld()) {
                wakeLock.release();
            }
            if (wifiLock != null && wifiLock.isHeld()) {
                wifiLock.release();
            }
        } catch (Exception e) {
            // ignore
        }
    }

    private void stopServiceAndNotification() {
        releaseLocks();
        if (mediaSession != null) {
            mediaSession.setActive(false);
        }
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
            stopForeground(STOP_FOREGROUND_REMOVE);
        } else {
            stopForeground(true);
        }
        if (notificationManager != null) {
            notificationManager.cancel(NOTIFICATION_ID);
        }
        stopSelf();
    }

    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                    CHANNEL_ID,
                    "Aether FM playback",
                    NotificationManager.IMPORTANCE_LOW
            );
            channel.setDescription("Playback controls for Aether FM");
            notificationManager.createNotificationChannel(channel);
        }
    }

    @Nullable
    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }

    @Override
    public void onTaskRemoved(Intent rootIntent) {
        Log.d(TAG, "onTaskRemoved");
        // Service keeps running (stopWithTask=false); re-assert foreground if playing
        if (isPlaying) {
            updateMediaSession();
            Notification notification = buildNotification();
            startForeground(NOTIFICATION_ID, notification);
        }
        super.onTaskRemoved(rootIntent);
    }

    @Override
    public void onDestroy() {
        Log.d(TAG, "onDestroy");
        super.onDestroy();
        releaseLocks();
        if (mediaSession != null) {
            mediaSession.setActive(false);
            mediaSession.release();
            mediaSession = null;
        }
        if (notificationManager != null) {
            notificationManager.cancel(NOTIFICATION_ID);
        }
    }
}
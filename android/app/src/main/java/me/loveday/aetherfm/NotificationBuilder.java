package me.loveday.aetherfm;

import android.app.Notification;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.os.Build;

import androidx.core.app.NotificationCompat;
import androidx.media.app.NotificationCompat.MediaStyle;
import android.support.v4.media.session.MediaSessionCompat;

/**
 * Builds the playback / recording notification for {@link MediaPlaybackService}.
 *
 * Stateless. Every value it needs is passed in by the service, so the service
 * keeps ownership of playback and recording state.
 */
final class NotificationBuilder {

    private NotificationBuilder() {
    }

    /**
     * @param context       service context used for intents, resources and package lookups
     * @param mediaSession  session to attach to the MediaStyle; may be null
     * @param currentTitle  notification title
     * @param currentArtist artist line; also shown as content text when not recording
     * @param isPlaying     whether playback is active
     * @param isRecording   whether a station recording is active
     * @param isOffline     true for offline recording playback (rewind / forward layout)
     * @param recordElapsed recording elapsed time in seconds
     */
    static Notification build(
            Context context,
            MediaSessionCompat mediaSession,
            String currentTitle,
            String currentArtist,
            boolean isPlaying,
            boolean isRecording,
            boolean isOffline,
            int recordElapsed) {
        int pendingFlags = PendingIntent.FLAG_UPDATE_CURRENT;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            pendingFlags |= PendingIntent.FLAG_IMMUTABLE;
        }

        Intent playPauseIntent = new Intent(context, MediaPlaybackService.class)
                .setAction(isPlaying ? MediaPlaybackService.ACTION_PAUSE : MediaPlaybackService.ACTION_PLAY);
        PendingIntent playPausePending = PendingIntent.getService(context, 2, playPauseIntent, pendingFlags);

        Intent stopIntent = new Intent(context, MediaPlaybackService.class).setAction(MediaPlaybackService.ACTION_STOP);
        PendingIntent stopPending = PendingIntent.getService(context, 4, stopIntent, pendingFlags);

        Intent launchIntent = context.getPackageManager().getLaunchIntentForPackage(context.getPackageName());
        PendingIntent contentIntent = null;
        if (launchIntent != null) {
            launchIntent.setFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP | Intent.FLAG_ACTIVITY_CLEAR_TOP);
            contentIntent = PendingIntent.getActivity(context, 0, launchIntent, pendingFlags);
        }

        int iconId = context.getResources().getIdentifier("ic_stat_radio", "drawable", context.getPackageName());
        if (iconId == 0) {
            iconId = context.getApplicationInfo().icon;
        }

        NotificationCompat.Builder builder = new NotificationCompat.Builder(context, MediaPlaybackService.CHANNEL_ID)
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
            Intent rewindIntent = new Intent(context, MediaPlaybackService.class).setAction(MediaPlaybackService.ACTION_REWIND);
            PendingIntent rewindPending = PendingIntent.getService(context, 6, rewindIntent, pendingFlags);

            Intent ffIntent = new Intent(context, MediaPlaybackService.class).setAction(MediaPlaybackService.ACTION_FAST_FORWARD);
            PendingIntent ffPending = PendingIntent.getService(context, 7, ffIntent, pendingFlags);

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
            Intent prevIntent = new Intent(context, MediaPlaybackService.class).setAction(MediaPlaybackService.ACTION_PREVIOUS);
            PendingIntent prevPending = PendingIntent.getService(context, 1, prevIntent, pendingFlags);

            Intent nextIntent = new Intent(context, MediaPlaybackService.class).setAction(MediaPlaybackService.ACTION_NEXT);
            PendingIntent nextPending = PendingIntent.getService(context, 3, nextIntent, pendingFlags);

            Intent stopRecIntent = new Intent(context, MediaPlaybackService.class).setAction(MediaPlaybackService.ACTION_STOP_REC);
            PendingIntent stopRecPending = PendingIntent.getService(context, 5, stopRecIntent, pendingFlags);

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
}

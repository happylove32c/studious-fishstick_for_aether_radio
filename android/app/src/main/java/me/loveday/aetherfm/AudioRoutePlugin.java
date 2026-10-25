package me.loveday.aetherfm;

import android.content.Context;
import android.media.AudioDeviceCallback;
import android.media.AudioDeviceInfo;
import android.media.AudioManager;
import android.os.Build;
import android.os.Handler;
import android.os.Looper;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "AudioRoute")
public class AudioRoutePlugin extends Plugin {

    private AudioDeviceCallback audioDeviceCallback;

    @Override
    public void load() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            AudioManager audioManager = getAudioManager();
            if (audioManager != null) {
                audioDeviceCallback = new AudioDeviceCallback() {
                    @Override
                    public void onAudioDevicesAdded(AudioDeviceInfo[] addedDevices) {
                        notifyRouteChange();
                    }

                    @Override
                    public void onAudioDevicesRemoved(AudioDeviceInfo[] removedDevices) {
                        notifyRouteChange();
                    }
                };
                audioManager.registerAudioDeviceCallback(audioDeviceCallback, new Handler(Looper.getMainLooper()));
            }
        }
    }

    @Override
    protected void handleOnDestroy() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            AudioManager audioManager = getAudioManager();
            if (audioManager != null && audioDeviceCallback != null) {
                audioManager.unregisterAudioDeviceCallback(audioDeviceCallback);
                audioDeviceCallback = null;
            }
        }
        super.handleOnDestroy();
    }

    @PluginMethod
    public void getRoute(PluginCall call) {
        JSObject ret = new JSObject();
        ret.put("route", computeRoute());
        call.resolve(ret);
    }

    private void notifyRouteChange() {
        JSObject ret = new JSObject();
        ret.put("route", computeRoute());
        notifyListeners("routeChanged", ret);
    }

    private AudioManager getAudioManager() {
        Context context = getContext();
        if (context == null) return null;
        return (AudioManager) context.getSystemService(Context.AUDIO_SERVICE);
    }

    private String computeRoute() {
        AudioManager audioManager = getAudioManager();
        if (audioManager == null) {
            return "speaker";
        }

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            AudioDeviceInfo[] devices = audioManager.getDevices(AudioManager.GET_DEVICES_OUTPUTS);
            boolean hasBluetooth = false;
            boolean hasWired = false;
            boolean hasSpeaker = false;
            boolean hasEarpiece = false;

            if (devices != null) {
                for (AudioDeviceInfo device : devices) {
                    int type = device.getType();

                    if (type == AudioDeviceInfo.TYPE_BLUETOOTH_A2DP
                            || type == AudioDeviceInfo.TYPE_BLUETOOTH_SCO
                            || (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S && type == AudioDeviceInfo.TYPE_BLE_HEADSET)) {
                        hasBluetooth = true;
                    } else if (type == AudioDeviceInfo.TYPE_WIRED_HEADSET
                            || type == AudioDeviceInfo.TYPE_WIRED_HEADPHONES
                            || (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O && type == AudioDeviceInfo.TYPE_USB_HEADSET)
                            || type == AudioDeviceInfo.TYPE_USB_DEVICE) {
                        hasWired = true;
                    } else if (type == AudioDeviceInfo.TYPE_BUILTIN_SPEAKER) {
                        hasSpeaker = true;
                    } else if (type == AudioDeviceInfo.TYPE_BUILTIN_EARPIECE) {
                        hasEarpiece = true;
                    }
                }
            }

            if (hasBluetooth) return "bluetooth";
            if (hasWired) return "wired";
            if (hasSpeaker) return "speaker";
            if (hasEarpiece) return "earpiece";
            return "speaker";
        } else {
            // API < 23 fallback
            try {
                if (audioManager.isBluetoothA2dpOn()) {
                    return "bluetooth";
                }
            } catch (Exception ignored) {}

            try {
                if (audioManager.isWiredHeadsetOn()) {
                    return "wired";
                }
            } catch (Exception ignored) {}

            return "speaker";
        }
    }
}

package com.kenmedya.gssdrive

import android.content.Intent
import android.os.Build
import android.widget.Toast
import androidx.core.content.ContextCompat
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin

@CapacitorPlugin(name = "GssDrive")
class GssDrivePlugin : Plugin() {

    @PluginMethod
    fun startTracking(call: PluginCall) {
        Toast.makeText(context, "Native takip başlat tetiklendi", Toast.LENGTH_LONG).show()

        val intent = Intent(context, LocationForegroundService::class.java)

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            ContextCompat.startForegroundService(context, intent)
        } else {
            context.startService(intent)
        }

        val ret = JSObject()
        ret.put("success", true)
        ret.put("message", "Takip servisi başlatıldı")
        call.resolve(ret)
    }

    @PluginMethod
    fun stopTracking(call: PluginCall) {
        Toast.makeText(context, "Native takip durdur tetiklendi", Toast.LENGTH_SHORT).show()

        val intent = Intent(context, LocationForegroundService::class.java)
        context.stopService(intent)

        val ret = JSObject()
        ret.put("success", true)
        ret.put("message", "Takip servisi durduruldu")
        call.resolve(ret)
    }
}
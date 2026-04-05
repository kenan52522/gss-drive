package com.kenmedya.gssdrive

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.Service
import android.content.Intent
import android.os.Build
import android.os.IBinder
import androidx.core.app.NotificationCompat

class LocationForegroundService : Service() {

    companion object {
        const val CHANNEL_ID = "gss_channel"
        const val NOTIFICATION_ID = 1001
    }

    override fun onCreate() {
        super.onCreate()
        createNotificationChannel()
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        val notification: Notification = NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("GSS Drive Aktif")
            .setContentText("Rota takibi arka planda çalışıyor")
            .setSmallIcon(android.R.drawable.ic_dialog_map)
            .setOngoing(true)
            .setSilent(false)
            .setPriority(NotificationCompat.PRIORITY_MAX)
            .build()

        startForeground(NOTIFICATION_ID, notification)

        return START_STICKY
    }

    override fun onDestroy() {
        super.onDestroy()
        stopForeground(STOP_FOREGROUND_REMOVE)
    }

    override fun onBind(intent: Intent?): IBinder? {
        return null
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                "GSS Drive Takip",
                NotificationManager.IMPORTANCE_HIGH
            )
            channel.description = "GSS Drive arka plan rota takibi"
            channel.setShowBadge(true)

            val manager = getSystemService(NotificationManager::class.java)
            manager.createNotificationChannel(channel)
        }
    }
}
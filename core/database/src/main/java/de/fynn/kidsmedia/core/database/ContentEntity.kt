package de.fynn.kidsmedia.core.database

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "content")
data class ContentEntity(
    @PrimaryKey val id: String,
    val title: String,
    val type: String,
    val category: String,
    val ageGroup: String,
    val durationSeconds: Int?,
    val thumbnailUrl: String?,
    val localThumbnailPath: String?,
    val remoteUrl: String?,
    val localPath: String?,
    val description: String?,
    val tags: String,
    val isFavorite: Boolean,
    val isDownloaded: Boolean,
    val progress: Float,
    val version: Long
)

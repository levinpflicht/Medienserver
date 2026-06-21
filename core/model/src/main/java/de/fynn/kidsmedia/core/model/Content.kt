package de.fynn.kidsmedia.core.model

data class Content(
    val id: String,
    val title: String,
    val type: ContentType,
    val category: String,
    val ageGroup: String,
    val durationSeconds: Int?,
    val thumbnailUrl: String?,
    val localThumbnailPath: String?,
    val remoteUrl: String?,
    val localPath: String?,
    val description: String?,
    val tags: List<String>,
    val isFavorite: Boolean,
    val isDownloaded: Boolean,
    val progress: Float,
    val version: Long
)

enum class ContentType {
    VIDEO, AUDIO, PDF, QUIZ, OTHER
}

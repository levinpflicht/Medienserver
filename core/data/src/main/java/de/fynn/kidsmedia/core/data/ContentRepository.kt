package de.fynn.kidsmedia.core.data

import de.fynn.kidsmedia.core.database.ContentDao
import de.fynn.kidsmedia.core.database.ContentEntity
import de.fynn.kidsmedia.core.model.Content
import de.fynn.kidsmedia.core.model.ContentType
import de.fynn.kidsmedia.core.network.ContentApi
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class ContentRepository @Inject constructor(
    private val contentDao: ContentDao,
    private val contentApi: ContentApi
) {

    fun observeAll(): Flow<List<Content>> =
        contentDao.observeAll().map { list -> list.map { it.toDomain() } }

    suspend fun syncManifest() {
        val manifest = contentApi.getManifest()
        val entities = manifest.contents.map { dto ->
            ContentEntity(
                id = dto.id,
                title = dto.title,
                type = dto.type,
                category = dto.category,
                ageGroup = dto.ageGroup,
                durationSeconds = dto.durationSeconds,
                thumbnailUrl = dto.thumbnailUrl,
                localThumbnailPath = null,
                remoteUrl = dto.remoteUrl,
                localPath = null,
                description = dto.description,
                tags = dto.tags.joinToString(","),
                isFavorite = false,
                isDownloaded = false,
                progress = 0f,
                version = dto.version
            )
        }
        contentDao.upsertAll(entities)
    }

    private fun ContentEntity.toDomain(): Content =
        Content(
            id = id,
            title = title,
            type = when (type) {
                "VIDEO" -> ContentType.VIDEO
                "AUDIO" -> ContentType.AUDIO
                "PDF" -> ContentType.PDF
                "QUIZ" -> ContentType.QUIZ
                else -> ContentType.OTHER
            },
            category = category,
            ageGroup = ageGroup,
            durationSeconds = durationSeconds,
            thumbnailUrl = thumbnailUrl,
            localThumbnailPath = localThumbnailPath,
            remoteUrl = remoteUrl,
            localPath = localPath,
            description = description,
            tags = if (tags.isBlank()) emptyList() else tags.split(","),
            isFavorite = isFavorite,
            isDownloaded = isDownloaded,
            progress = progress,
            version = version
        )
}

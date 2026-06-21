package de.fynn.kidsmedia.core.network

import retrofit2.http.GET

data class ContentDto(
    val id: String,
    val title: String,
    val type: String,
    val category: String,
    val ageGroup: String,
    val durationSeconds: Int?,
    val thumbnailUrl: String?,
    val remoteUrl: String?,
    val description: String?,
    val tags: List<String>,
    val version: Long
)

data class ManifestResponse(
    val contents: List<ContentDto>
)

interface ContentApi {
    @GET("manifest")
    suspend fun getManifest(): ManifestResponse
}

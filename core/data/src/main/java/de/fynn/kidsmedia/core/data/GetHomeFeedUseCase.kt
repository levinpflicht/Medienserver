package de.fynn.kidsmedia.core.data

import de.fynn.kidsmedia.core.model.Content
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map
import javax.inject.Inject

data class HomeFeed(
    val featured: List<Content>,
    val continueWatching: List<Content>,
    val newItems: List<Content>,
    val recommended: List<Content>
)

class GetHomeFeedUseCase @Inject constructor(
    private val repository: ContentRepository
) {
    fun execute(): Flow<HomeFeed> =
        repository.observeAll().map { all ->
            HomeFeed(
                featured = all.take(5),
                continueWatching = all.filter { it.progress in 0.1f..0.9f },
                newItems = all.sortedByDescending { it.version }.take(10),
                recommended = all.shuffled().take(10)
            )
        }
}

package de.fynn.kidsmedia.di

import android.content.Context
import androidx.room.Room
import de.fynn.kidsmedia.core.database.AppDatabase
import de.fynn.kidsmedia.core.database.ContentDao
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.android.qualifiers.ApplicationContext
import dagger.hilt.components.SingletonComponent
import javax.inject.Singleton

@Module
@InstallIn(SingletonComponent::class)
object DatabaseModule {

    @Provides
    @Singleton
    fun provideAppDatabase(
        @ApplicationContext context: Context
    ): AppDatabase =
        Room.databaseBuilder(
            context,
            AppDatabase::class.java,
            "kidsmedia.db"
        ).build()

    @Provides
    fun provideContentDao(database: AppDatabase): ContentDao =
        database.contentDao()
}

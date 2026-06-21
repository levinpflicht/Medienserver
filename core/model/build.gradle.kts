plugins {
    id("com.android.library")
    kotlin("android")
}

android {
    namespace = "de.fynn.kidsmedia.core.model"
    compileSdk = 35
    defaultConfig {
        minSdk = 24
    }
}

dependencies {
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-core:1.9.0")
}

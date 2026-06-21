plugins {
    id("com.android.library")
    kotlin("android")
}

android {
    namespace = "de.fynn.kidsmedia.core.network"
    compileSdk = 35
    defaultConfig {
        minSdk = 24
    }
}

dependencies {
    implementation("com.squareup.retrofit2:retrofit:2.11.0")
    implementation("com.squareup.retrofit2:converter-moshi:2.11.0")
    implementation("com.squareup.okhttp3:logging-interceptor:5.0.0-alpha.14")
    implementation("com.squareup.moshi:moshi-kotlin:1.15.1")
}

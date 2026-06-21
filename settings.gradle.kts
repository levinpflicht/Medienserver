pluginManagement {
    repositories {
        google()
        mavenCentral()
        gradlePluginPortal()
    }
}
dependencyResolutionManagement {
    repositoriesMode.set(RepositoriesMode.FAILONPROJECT_REPOS)
    repositories {
        google()
        mavenCentral()
    }
}
rootProject.name = "KidsMedia"
include(
    ":app",
    ":core:ui",
    ":core:model",
    ":core:data",
    ":core:database",
    ":core:network",
    ":feature:home",
    ":feature:discover",
    ":feature:library",
    ":feature:downloads",
    ":feature:favorites",
    ":feature:settings",
    ":feature:contentdetail",
    ":feature:player",
    ":feature:reader"
)

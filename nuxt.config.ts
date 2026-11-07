import tailwindcss from "@tailwindcss/vite";

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: "2025-07-15",
  devtools: { enabled: true },

  app: {
    head: {
      htmlAttrs: {
        lang: "en",
      },
      title: "Wallgrade",
    },
  },

  modules: [
    "@nuxt/eslint",
    "@nuxt/fonts",
    "@nuxt/icon",
    "@nuxt/test-utils/module",
  ],

  css: ["~/assets/css/main.css"],

  // @nuxt/fonts only loads weight 400 by default; without the other weights the browser
  // fakes bold text by smearing the regular glyphs, which looks blurry or "glowing".
  fonts: {
    families: [
      { name: "Inter", weights: [400, 500, 600, 700] },
      { name: "JetBrains Mono", weights: [400, 500] },
    ],
  },

  // Icons come from the installed collection, so the app works offline.
  icon: {
    serverBundle: "local",
  },

  typescript: {
    typeCheck: true,
    // The unit tests run in plain Node, against the shared and server code.
    nodeTsConfig: {
      include: ["../test/unit/**/*"],
      compilerOptions: { types: ["node"] },
    },
  },

  // Relative paths are resolved against the directory the server is started in.
  runtimeConfig: {
    // Images to convert, scanned recursively (NUXT_SOURCE_DIR).
    sourceDir: "./.data/source",
    // Where <WxH>-<palette> folders are written, <sourceDir>/output when empty
    // (NUXT_OUTPUT_DIR).
    outputDir: "",
    // Previews and generated LUTs (NUXT_CACHE_DIR).
    cacheDir: "./.data/cache",
  },

  ssr: false,

  vite: {
    plugins: [tailwindcss()],
  },
});

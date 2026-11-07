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
    "nuxt-auth-utils",
  ],

  // The app asks /api/session itself, which also answers when there are no users.
  auth: {
    loadStrategy: "none",
  },

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
    // Gives everyone a sign-in and their own library in a folder named after them
    // below this one (NUXT_USERS_DIR). sourceDir and outputDir are unused then.
    usersDir: "",
    // The admin, who adds the other users (NUXT_ADMIN_USERNAME, NUXT_ADMIN_PASSWORD).
    adminUsername: "admin",
    adminPassword: "",
    session: {
      // Seals the sign-in cookie, at least 32 characters (NUXT_SESSION_PASSWORD).
      password: "",
      maxAge: 60 * 60 * 24 * 30,
      cookie: {
        sameSite: "lax",
        // Browsers drop secure cookies over plain HTTP, except on localhost
        // (NUXT_SESSION_COOKIE_SECURE=false for e.g. http://192.168.1.10:3000).
        secure: true,
      },
    },
  },

  ssr: false,

  vite: {
    plugins: [tailwindcss()],
  },
});

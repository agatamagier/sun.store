// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },

  modules: ['@nuxt/ui'],

  css: ['~/assets/css/main.css'],

  nitro: {
    // Bundle the CSV as a server asset so it is readable in any deploy target
    // (incl. serverless on Vercel) via useStorage('assets:data').
    serverAssets: [{ baseName: 'data', dir: 'server/data' }],
  },

  typescript: {
    strict: true,
    // Type-checking is run explicitly via `pnpm typecheck` to keep dev/build fast.
    typeCheck: false,
  },

  app: {
    head: {
      htmlAttrs: { lang: 'en' },
      // Sensible defaults; pages override title/meta based on active filters.
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      ],
    },
  },
})

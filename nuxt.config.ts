export default defineNuxtConfig({
  compatibilityDate: '2026-11-01',
  runtimeConfig: { adminPassword: '', adminHost: '', serverIp: '', dataDir: './data', public: { previewOnly: false } },
  hooks: { 'pages:extend'(pages) { if(process.env.NUXT_PUBLIC_PREVIEW_ONLY==='true') { for(let i=pages.length-1;i>=0;i--) if(pages[i].path!=='/') pages.splice(i,1) } } },
  routeRules: { '/admin/**': { ssr: false }, '/preview/**': { ssr: false } },
  nitro: { preset: 'node-server', prerender: { ignore: ['/admin', '/preview'] } },
  app: { head: { htmlAttrs: { lang: 'ru' }, title: 'Facebook — приложения в Google Play', meta: [{ name: 'viewport', content: 'width=device-width, initial-scale=1, viewport-fit=cover' }, { name: 'robots', content: 'noindex, nofollow' }] } },
  devtools: { enabled: false }
})

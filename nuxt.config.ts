export default defineNuxtConfig({
  compatibilityDate: '2026-11-01',
  css: ['~/assets/main.css'],
  app: { head: { htmlAttrs: { lang: 'ru' }, title: 'Facebook — приложения в Google Play', meta: [{ name: 'viewport', content: 'width=device-width, initial-scale=1, viewport-fit=cover' }, { name: 'robots', content: 'noindex, nofollow' }] } },
  devtools: { enabled: false }
})

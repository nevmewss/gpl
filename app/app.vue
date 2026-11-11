<script setup>
import content from '../public/app-content.json'
const app = ref(content)
const baseURL = useRuntimeConfig().app.baseURL
const assetUrl = (src) => src.startsWith('/') && !src.startsWith('//') ? `${baseURL}${src.slice(1)}` : src
const scrolled = ref(false)
const gallery = ref(null)
let startX = 0, startScroll = 0, dragging = false, moved = false
const url = computed(() => {
  try { const u = new URL(app.value.playStoreUrl); if (u.protocol === 'https:' && u.hostname === 'play.google.com') return u.href } catch {}
  return 'https://play.google.com/store/apps/details?id=com.facebook.katana'
})
function onScroll() { scrolled.value = window.scrollY > 10 }
function dragStart(e) { if(e.pointerType !== 'mouse' || e.button !== 0) return; dragging = true; moved = false; startX = e.clientX; startScroll = gallery.value.scrollLeft }
function dragMove(e) { if(!dragging) return; const dx = e.clientX-startX; if(Math.abs(dx)>5) moved=true; if(moved) { e.preventDefault(); gallery.value.scrollLeft=startScroll-dx } }
function dragEnd() { dragging=false }
function galleryClick(e) { if(moved) { e.preventDefault(); moved=false } }
onMounted(() => { window.addEventListener('scroll', onScroll, {passive:true}); window.addEventListener('pointerup',dragEnd); onScroll() })
onBeforeUnmount(() => { window.removeEventListener('scroll',onScroll); window.removeEventListener('pointerup',dragEnd) })
useHead({ title: computed(() => `${app.value?.name || 'Приложение'} — приложения в Google Play`) })
</script>
<template>
  <div v-if="app">
    <header class="header" :class="{ elevated: scrolled }">
      <a :href="url" class="brand" aria-label="Google Play"><svg class="play-logo" viewBox="0 0 40 44" aria-hidden="true"><path fill="#34a853" d="M2 2c1-2 3-2 5-1l24 14-9 9Z"/><path fill="#4285f4" d="M2 2 23 23 2 43c-1-1-2-2-2-4V6c0-2 1-3 2-4"/><path fill="#fbbc04" d="m23 22 8-7 7 4c3 2 3 4 0 6l-7 4Z"/><path fill="#ea4335" d="m2 43 21-21 8 7L7 43c-2 1-4 1-5 0"/></svg><span>Google Play</span></a>
      <nav class="header-tools" aria-label="Меню"><a :href="url" aria-label="Поиск"><AppIcon name="search"/></a><a :href="url" aria-label="Справка"><AppIcon name="help"/></a><a :href="url" aria-label="Аккаунт"><img class="profile" :src="assetUrl('/assets/avatar-3.png')" alt="" /></a></nav>
    </header>
    <main>
      <section class="overview" aria-label="Приложение">
        <div class="app-heading"><a :href="url"><img class="app-icon" :src="assetUrl(app.icon)" :alt="app.name" /></a><div><h1>{{ app.name }}</h1><a class="developer" :href="url">{{ app.developer }}</a><p class="notice">{{ app.notice }}</p></div></div>
        <div class="metrics"><a :href="url"><strong>{{ app.rating }}<span class="tiny-star">★</span></strong><span>Отзывы: {{ app.reviewCount }}</span></a><a :href="url"><strong class="age-badge">{{ app.age }}</strong><span>{{ app.age }} ⓘ</span></a><a :href="url"><strong>{{ app.downloads }}</strong><span>(количество скачиваний)</span></a></div>
        <a class="install" :href="url">Установить</a>
        <div class="actions"><a :href="url"><AppIcon name="share"/>Поделиться</a><a :href="url"><AppIcon name="bookmark"/>Добавить в список желаний</a></div>
        <div class="availability"><p><AppIcon name="devices"/><span>Это приложение можно скачать на ваше устройство.</span></p><p><AppIcon name="family"/><span>Вы можете открыть доступ к этому контенту членам вашей семьи.<br><a :href="url">Подробнее</a></span><a class="family-link" :href="url">О Семейной…<br> библиотеке</a></p></div>
      </section>
      <div v-if="app.screenshots.length" ref="gallery" class="gallery" aria-label="Скриншоты приложения — листайте горизонтально" tabindex="0" @pointerdown="dragStart" @pointermove="dragMove" @pointerleave="dragEnd" @click.capture="galleryClick"><a v-for="(shot,i) in app.screenshots" :key="shot.src + i" :href="url" draggable="false"><img :src="assetUrl(shot.src)" :alt="shot.alt" draggable="false" /></a></div>
      <section class="description"><a class="section-title" :href="url"><h2>Описание</h2><AppIcon name="arrow"/></a><p class="description-text">{{ app.description }}<br>…</p><h3>Последнее обновление</h3><p class="update-date">{{ app.updatedAt }}</p><div class="chips"><a :href="url">{{ app.ranking }}</a><a :href="url">{{ app.category }}</a></div></section>
      <section class="safety"><a class="section-title" :href="url"><h2>Безопасность данных</h2><AppIcon name="arrow"/></a><p>Чтобы контролировать безопасность, нужно знать, как разработчики собирают ваши данные и передают их третьим лицам. Практики обеспечения безопасности и конфиденциальности могут зависеть от того, как вы используете приложение, а также от вашего региона и возраста.</p><div class="safety-card"><p><AppIcon name="share"/><span>Это приложение может передавать указанные типы данных третьим лицам<br><small>Личная информация и идентификаторы устройства</small></span></p><p><AppIcon name="upload"/><span>Это приложение может собирать указанные типы данных<br><small>Местоположение, личная информация и другие</small></span></p><p><AppIcon name="lock"/>Данные шифруются при передаче</p><p><AppIcon name="trash"/>Вы можете запросить удаление данных</p><a :href="url">Подробнее</a></div></section>
      <section class="ratings"><a class="section-title" :href="url"><h2>Оценки и отзывы</h2><AppIcon name="arrow"/></a><div class="device-tabs"><a class="selected" :href="url"><AppIcon name="phone"/>Телефон</a><a :href="url"><AppIcon name="desktop"/>Desktop</a><a :href="url"><AppIcon name="tablet"/>Планшет</a></div><div class="rating-summary"><div class="rating-total"><div class="rating-number">{{ app.rating }}</div><div class="stars" :style="{'--fill': `${Number(app.rating.replace(',','.'))/5*100}%`}">★★★★★</div><small>{{ app.reviewCount }} отзыва</small></div><div class="rating-bars"><div v-for="(value,i) in app.ratingDistribution" :key="i"><span>{{ 5-i }}</span><div class="track"><div :style="{width: `${Math.min(100,Math.max(0,value))}%`}" /></div></div></div></div>
        <article v-for="review in app.reviews" :key="review.id" class="review"><div class="review-head"><img :src="assetUrl(review.avatar)" alt="" loading="lazy"/><span>{{ review.name }}</span><a class="more" :href="url" aria-label="Действия с отзывом">⋮</a></div><div class="review-meta"><span class="stars" :style="{'--fill': `${review.rating/5*100}%`}">★★★★★</span><time>{{ review.date }}</time></div><p>{{ review.text }}</p><small>{{ review.helpfulCount }} человек отметили этот отзыв как полезный.</small><div class="helpful"><span>Вам помогла эта информация?</span><a :href="url">Да</a><a :href="url">Нет</a></div></article><a class="all-reviews" :href="url">Все отзывы</a>
      </section>
      <footer><a :href="url">Google Play</a><a :href="url">Условия использования</a><a :href="url">Конфиденциальность</a></footer>
    </main>
    <nav class="bottom-nav" aria-label="Разделы Google Play"><a v-for="item in [{icon:'games',label:'Игры'},{icon:'apps',label:'Приложения'},{icon:'books',label:'Книги'},{icon:'star',label:'Детям'}]" :key="item.icon" :href="url" :class="{active:item.icon==='apps'}"><AppIcon :name="item.icon"/><span>{{ item.label }}</span></a></nav>
  </div>
</template>

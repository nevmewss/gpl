<script setup>
const route = useRoute()
const { data, error } = await useFetch(`/api/admin/sites/${encodeURIComponent(String(route.params.id))}`)
useHead({meta:[{name:'robots',content:'noindex,nofollow'}]})
function receive(event){if(event.origin===location.origin&&event.source===window.parent&&event.data?.type==='site-preview'&&data.value)data.value={...data.value,content:event.data.content}}
onMounted(()=>window.addEventListener('message',receive))
onBeforeUnmount(()=>window.removeEventListener('message',receive))
</script>
<template><div v-if="error" style="padding:48px">Для предпросмотра войдите в <NuxtLink to="/admin">админку</NuxtLink>.</div><StorePage v-else-if="data" :content="data.content" /></template>

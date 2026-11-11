<script setup>
const route = useRoute()
const { data, error } = await useFetch(`/api/public/sites/${encodeURIComponent(String(route.params.slug))}`)
if (error.value || !data.value) throw createError({ statusCode: 404, statusMessage: 'Сайт не опубликован' })
</script>
<template><StorePage v-if="data" :content="data.content" /></template>

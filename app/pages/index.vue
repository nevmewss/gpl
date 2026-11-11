<script setup>
import sample from '../../public/app-content.json'
const content = ref(sample)
if (!useRuntimeConfig().public.previewOnly && !import.meta.prerender) {
  const headers = useRequestHeaders(['host'])
  const { data, error } = await useFetch('/api/public/host', { headers })
  if (error.value) throw createError({ statusCode: 404, statusMessage: 'Сайт не опубликован' })
  if (data.value?.content) content.value = data.value.content
}
</script>
<template><StorePage :content="content" /></template>

<script setup>
defineProps({ name: String })
const paths = {
 search: 'm21 21-5-5M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0',
 help: 'M9.1 9a3 3 0 0 1 5.8 1c0 2-3 2-3 4m0 3h.01M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0',
 arrow: 'M5 12h14m-6-6 6 6-6 6',
 share: 'm7 11 10-6M7 13l10 6M7 12a2 2 0 1 1-4 0 2 2 0 0 1 4 0M21 4a2 2 0 1 1-4 0 2 2 0 0 1 4 0M21 20a2 2 0 1 1-4 0 2 2 0 0 1 4 0',
 bookmark: 'M6 3h12v19l-6-4-6 4V3m3 7h6m-3-3v6',
 devices: 'M3 17V4h13v6M1 20h11m2-9h8v10h-8z',
 family: 'm2 10 10-8 10 8M5 9v12h14V9m-7 8-4-4a2.5 2.5 0 0 1 4-3 2.5 2.5 0 0 1 4 3l-4 4',
 phone: 'M7 2h10v20H7zM7 5h10M10 19h4',
 desktop: 'M3 3h18v14H3zM1 21h22',
 tablet: 'M5 2h14v20H5zM5 5h14M10 19h4',
 games: 'M7 6h10c3 0 4 3 5 11 0 3-3 4-5 0l-1-1H8l-1 1c-2 4-5 3-5 0C3 9 4 6 7 6Zm1 3v6m-3-3h6m5-2h.01M19 13h.01',
 books: 'M5 2h14v20H5zM9 2v10l3-2 3 2V2',
 star: 'm12 2 3 6 7 1-5 5 1 8-6-4-6 4 1-8-5-5 7-1 3-6Z',
 shield: 'm12 2 9 4v6c0 5-9 10-9 10S3 17 3 12V6l9-4Zm-4 10 3 3 5-6',
 lock: 'M5 10h14v12H5zM8 10V6a4 4 0 0 1 8 0v4',
 trash: 'M3 6h18M6 6v16h12V6M9 6V2h6v4',
 upload: 'M12 16V2m-5 5 5-5 5 5M3 14v8h18v-8'
}
</script>
<template><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><template v-if="name === 'apps'"><rect v-for="(p,i) in [[3,3],[14,3],[3,14],[14,14]]" :key="i" :x="p[0]" :y="p[1]" width="7" height="7" rx="1" fill="currentColor" /></template><path v-else :d="paths[name] || paths.arrow" /></svg></template>

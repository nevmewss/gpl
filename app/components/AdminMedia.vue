<script setup>
const props=defineProps({modelValue:String,label:{type:String,default:'Изображение'},compact:Boolean})
const emit=defineEmits(['update:modelValue','error'])
const busy=ref(false)
async function upload(event){
 const file=event.target.files?.[0]; if(!file)return
 if(file.size>10*1024*1024){emit('error','Максимальный размер изображения — 10 МБ');return}
 busy.value=true
 try {const form=new FormData();form.append('file',file);const result=await $fetch('/api/admin/upload',{method:'POST',body:form});emit('update:modelValue',result.url)}
 catch(e){emit('error',e.data?.statusMessage||'Не удалось загрузить изображение')}
 finally{busy.value=false;event.target.value=''}
}
</script>
<template><div class="media-field" :class="{compact}"><img v-if="modelValue" :src="modelValue" :alt="label"/><div class="media-controls"><strong>{{label}}</strong><label class="upload-button">{{busy?'Загрузка…':'Загрузить изображение'}}<input type="file" accept="image/png,image/jpeg,image/webp" :disabled="busy" @change="upload"/></label><small>PNG, JPG или WebP · до 10 МБ</small><input :value="modelValue" :aria-label="`${label}: адрес изображения`" placeholder="или HTTPS-ссылка" @input="emit('update:modelValue',$event.target.value)" /></div></div></template>

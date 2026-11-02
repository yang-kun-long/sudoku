<script setup>
import { RouterView } from 'vue-router'

document.documentElement.dataset.font = localStorage.getItem('sudoku-font') === 'handwriting' ? 'handwriting' : 'default'
</script>

<template>
  <RouterView />
</template>

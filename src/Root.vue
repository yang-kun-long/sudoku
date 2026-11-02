<script setup>
import { RouterView } from 'vue-router'

document.documentElement.dataset.font = localStorage.getItem('sudoku-font') === 'default' ? 'default' : 'handwriting'
</script>

<template>
  <RouterView />
</template>

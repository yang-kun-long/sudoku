<script setup>
import { ref } from 'vue'

const selected = ref(localStorage.getItem('sudoku-font') === 'default' ? 'default' : 'handwriting')
function chooseFont(value) {
  selected.value = value
  document.documentElement.dataset.font = value
  localStorage.setItem('sudoku-font', value)
}
</script>

<template>
  <details class="font-settings" @keydown.esc="$event.currentTarget.open = false">
    <summary class="icon-button" aria-label="字体设置" title="字体设置">⚙</summary>
    <div class="font-settings-panel">
      <span class="label">字体设置</span>
      <div class="font-options" role="group" aria-label="选择字体">
        <button type="button" :aria-pressed="selected === 'default'" @click="chooseFont('default')">默认字体</button>
        <button type="button" :aria-pressed="selected === 'handwriting'" @click="chooseFont('handwriting')">昆龙手写</button>
      </div>
      <p>自动保存，适用于所有页面。</p>
    </div>
  </details>
</template>

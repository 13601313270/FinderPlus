<script setup lang="ts">
import { ref } from 'vue'

const versions = window.electron?.process?.versions
const platform = window.electron?.process?.platform ?? 'unknown'
const message = ref('')

async function handlePing(): Promise<void> {
  message.value = await window.api.ping()
}
</script>

<template>
  <main class="home">
    <h1 class="home__title">CanvasDesk</h1>
    <p class="home__desc">Electron + Vue 3 + Less + TypeScript</p>

    <ul class="home__meta">
      <li>Electron {{ versions?.electron }}</li>
      <li>Chromium {{ versions?.chrome }}</li>
      <li>Node {{ versions?.node }}</li>
      <li>Platform {{ platform }}</li>
    </ul>

    <button class="home__btn" type="button" @click="handlePing">IPC ping</button>
    <p v-if="message" class="home__result">{{ message }}</p>
  </main>
</template>

<style scoped lang="less">
.home {
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: @space-md;

  &__title {
    margin: 0;
    font-size: 32px;
    letter-spacing: 1px;
  }

  &__desc {
    margin: 0;
    color: @color-text-weak;
  }

  &__meta {
    display: flex;
    gap: @space-md;
    margin: 0;
    padding: @space-md;
    list-style: none;
    background: @color-surface;
    border-radius: @radius-md;
    color: @color-text-weak;
    font-size: 13px;
  }

  &__btn {
    padding: 8px 20px;
    border: none;
    border-radius: @radius-md;
    background: @color-primary;
    color: #fff;
    font-size: 14px;
    cursor: pointer;

    &:hover {
      opacity: 0.9;
    }
  }

  &__result {
    margin: 0;
    color: @color-primary;
  }
}
</style>
import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', name: 'game', component: () => import('./App.vue') },
    { path: '/techniques', name: 'techniques', component: () => import('./views/TechniquesView.vue') },
  ],
  scrollBehavior: () => ({ top: 0 }),
})

export default router

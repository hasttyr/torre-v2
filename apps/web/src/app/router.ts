import { createRouter, createWebHistory } from 'vue-router';
import type { RouteRecordRaw, RouterHistory } from 'vue-router';

/** Every view is loaded on demand, in its own chunk (US-009:AC2). */
export const routes: RouteRecordRaw[] = [
  { path: '/', name: 'home', component: () => import('../features/home/HomeView.vue') },
];

export function createAppRouter(history: RouterHistory = createWebHistory()) {
  return createRouter({ history, routes });
}

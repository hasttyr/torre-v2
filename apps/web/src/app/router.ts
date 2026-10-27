import { createRouter, createWebHistory } from 'vue-router';
import type { RouteRecordRaw, RouterHistory } from 'vue-router';

/** Every view is loaded on demand, in its own chunk (US-009:AC2). */
export const routes: RouteRecordRaw[] = [
  { path: '/', name: 'home', component: () => import('../features/home/HomeView.vue') },
  { path: '/403', name: 'forbidden', component: () => import('./views/ForbiddenView.vue') },
  { path: '/500', name: 'server-error', component: () => import('./views/ServerErrorView.vue') },
  { path: '/:pathMatch(.*)*', name: 'not-found', component: () => import('./views/NotFoundView.vue') },
];

export function createAppRouter(history: RouterHistory = createWebHistory()) {
  return createRouter({ history, routes });
}

// Entry point of @torre/web (US-009).
import { createApp } from 'vue';
import App from './app/App.vue';
import { installErrorHandler } from './app/error-handler.js';
import { installProviders } from './app/providers.js';
import { createAppRouter } from './app/router.js';

const app = createApp(App);
const router = createAppRouter();
installProviders(app, { router });
installErrorHandler(app, router);
app.mount('#app');

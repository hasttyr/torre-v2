// Entry point of @torre/web (US-009).
import { createApp } from 'vue';
import App from './app/App.vue';
import { installProviders } from './app/providers.js';
import { createAppRouter } from './app/router.js';

const app = createApp(App);
installProviders(app, { router: createAppRouter() });
app.mount('#app');

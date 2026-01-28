import { createApp } from "vue";
import { createPinia } from "pinia";
import { createRouter, createWebHistory } from "vue-router";
import App from "./App.vue";
import PartyPage from "./pages/PartyPage.vue";

const routes = [
  { path: "/", component: PartyPage },
  { path: "/party/:id", component: PartyPage },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

const pinia = createPinia();
const app = createApp(App);

app.use(pinia);
app.use(router);
app.mount("#app");

import betterAuth from "@convex-dev/better-auth/convex.config.js";
import afferent from "afferent/convex.config.js";
import { defineApp } from "convex/server";

const app = defineApp();
app.use(afferent);
app.use(betterAuth);

export default app;

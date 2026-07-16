import afferent from "afferent/convex.config.js";
import { defineApp } from "convex/server";

const app = defineApp();
app.use(afferent);

export default app;

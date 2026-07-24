import afferent from "afferent/convex.config.js";
import { defineApp } from "convex/server";

const app = defineApp();
app.use(afferent, { name: "showcase" });
app.use(afferent, { name: "sandbox" });

export default app;

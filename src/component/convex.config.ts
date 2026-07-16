import { defineComponent } from "convex/server";
import rateLimiter from "@convex-dev/rate-limiter/convex.config.js";

const component = defineComponent("afferent");
component.use(rateLimiter, { name: "rateLimiter" });

export default component;

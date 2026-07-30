import { defineConfig } from "vitepress";

export default defineConfig({
  title: "Afferent",
  description:
    "Install, secure, and customize the Afferent product-feedback Convex component.",
  lang: "en-US",
  cleanUrls: true,
  lastUpdated: true,
  outDir: "../dist/docs",
  vite: {
    cacheDir: "../node_modules/.vitepress-cache",
  },
  themeConfig: {
    nav: [
      { text: "Guide", link: "/guide/install" },
      { text: "Local demo", link: "/guide/local-demo" },
      {
        text: "v0.1",
        items: [
          { text: "Install", link: "/guide/install" },
          { text: "Mount", link: "/guide/mount" },
        ],
      },
    ],
    sidebar: [
      {
        text: "Start",
        items: [
          { text: "Overview", link: "/" },
          { text: "Local demo", link: "/guide/local-demo" },
          { text: "Install", link: "/guide/install" },
          { text: "Mount", link: "/guide/mount" },
        ],
      },
    ],
    search: {
      provider: "local",
    },
    outline: {
      level: [2, 3],
    },
  },
});

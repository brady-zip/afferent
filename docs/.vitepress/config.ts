import { defineConfig } from "vitepress";

import { loadReleaseIdentity } from "../../scripts/generate-release-manifest.mjs";

const releaseIdentity = await loadReleaseIdentity();

export default defineConfig({
  // The approved release uses a GitHub Pages project site without a custom domain.
  base: `/${releaseIdentity.repository.split("/")[1]}/`,
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
      { text: "Authentication", link: "/auth/convex-auth" },
      { text: "UI", link: "/ui/headless" },
      { text: "Operations", link: "/operations/testing" },
      { text: "Local demo", link: "/guide/local-demo" },
      {
        text: `v${releaseIdentity.docsVersion}`,
        items: [
          { text: "Install", link: "/guide/install" },
          { text: "Mount", link: "/guide/mount" },
          { text: "Upgrade", link: "/operations/upgrades" },
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
      {
        text: "Authentication",
        items: [
          { text: "Convex Auth", link: "/auth/convex-auth" },
          { text: "Clerk", link: "/auth/clerk" },
          { text: "Convex Better Auth", link: "/auth/better-auth" },
        ],
      },
      {
        text: "UI",
        items: [
          { text: "Headless React", link: "/ui/headless" },
          { text: "Static registry", link: "/ui/registry" },
          { text: "Customization", link: "/ui/customization" },
        ],
      },
      {
        text: "Operations",
        items: [
          { text: "Testing", link: "/operations/testing" },
          { text: "Deployment", link: "/operations/deployment" },
          { text: "Upgrades", link: "/operations/upgrades" },
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

export const afferentRegistry = {
  name: "afferent",
  homepage: "https://github.com/bradywatkinson/afferent",
  dependencies: [
    "class-variance-authority@0.7.1",
    "clsx@2.1.1",
    "lucide-react@1.20.0",
    "radix-ui@1.6.0",
    "tailwind-merge@3.6.0",
  ],
  items: [
    {
      name: "afferent-board",
      description: "Source-owned public feedback board over Afferent hooks.",
      registryDependencies: ["./afferent-ui-core.json"],
      files: [
        {
          path: "ui/afferent/board/activity.tsx",
          type: "registry:component",
          target: "components/afferent/board/activity.tsx",
        },
        {
          path: "ui/afferent/board/board-screen.tsx",
          type: "registry:component",
          target: "components/afferent/board/board-screen.tsx",
        },
        {
          path: "ui/afferent/board/discussion.tsx",
          type: "registry:component",
          target: "components/afferent/board/discussion.tsx",
        },
        {
          path: "ui/afferent/board/feedback-card.tsx",
          type: "registry:component",
          target: "components/afferent/board/feedback-card.tsx",
        },
        {
          path: "ui/afferent/board/feedback-composer.tsx",
          type: "registry:component",
          target: "components/afferent/board/feedback-composer.tsx",
        },
        {
          path: "ui/afferent/board/feedback-list.tsx",
          type: "registry:component",
          target: "components/afferent/board/feedback-list.tsx",
        },
        {
          path: "ui/afferent/board/post-detail.tsx",
          type: "registry:component",
          target: "components/afferent/board/post-detail.tsx",
        },
        {
          path: "ui/afferent/board/similar-feedback.tsx",
          type: "registry:component",
          target: "components/afferent/board/similar-feedback.tsx",
        },
      ],
    },
    {
      name: "afferent-ui-core",
      description: "Shared source-owned Afferent UI adapters and tokens.",
      registryDependencies: [],
      files: [
        {
          path: "ui/afferent/afferent.css",
          type: "registry:style",
          target: "components/afferent/afferent.css",
        },
        {
          path: "ui/afferent/core/afferent-ui-provider.tsx",
          type: "registry:component",
          target: "components/afferent/core/afferent-ui-provider.tsx",
        },
        {
          path: "ui/afferent/core/copy.ts",
          type: "registry:lib",
          target: "components/afferent/core/copy.ts",
        },
        {
          path: "ui/afferent/core/icons.tsx",
          type: "registry:component",
          target: "components/afferent/core/icons.tsx",
        },
        {
          path: "ui/afferent/core/navigation.tsx",
          type: "registry:component",
          target: "components/afferent/core/navigation.tsx",
        },
        {
          path: "ui/afferent/core/state-region.tsx",
          type: "registry:component",
          target: "components/afferent/core/state-region.tsx",
        },
        {
          path: "ui/afferent/core/utils.ts",
          type: "registry:lib",
          target: "components/afferent/core/utils.ts",
        },
      ],
    },
  ],
} as const;

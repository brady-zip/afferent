import { useConvex, useMutation, useQuery } from "convex/react";
import { useEffect, useState } from "react";
import type { FormEvent } from "react";

import { api } from "../convex/_generated/api.js";
import type { AfferentActionResult, PostDto, PostId } from "afferent";
import {
  AfferentProvider,
  useAdminCapability,
  useChangelogEditor,
  useChangelogEntry,
  useChangelogFeed,
  useFeedbackFeed,
  useFeedbackMutations,
  useFeedbackSearch,
  useMergePost,
  useNotifications,
  usePost,
  usePostModeration,
  usePostSubscription,
  useRoadmap,
  useSimilarPosts,
  useTagManagement,
  useTags,
  useUnreadNotificationCount,
} from "afferent/react.js";
import type { AfferentBindings } from "afferent/react.js";

const headlessBindings = {
  public: {
    listFeedback: api.afferent.listFeedback,
    getPost: api.afferent.resolvePost,
    searchFeedback: api.afferent.searchFeedback,
    suggestSimilarPosts: api.afferent.suggestSimilarPosts,
  },
  participation: {
    createPost: api.afferent.createPost,
    editPost: api.afferent.editPost,
    withdrawPost: api.afferent.withdrawPost,
    setVote: api.afferent.setVote,
    addComment: api.afferent.addComment,
  },
  roadmap: { listRoadmapGroup: api.afferent.listRoadmapGroup },
  changelog: {
    listPublished: api.afferent.listPublishedChangelog,
    getPublishedBySlug: api.afferent.getPublishedChangelogBySlug,
  },
  notifications: {
    getPostSubscription: api.afferent.getPostSubscription,
    setPostSubscription: api.afferent.setPostSubscription,
    listNotifications: api.afferent.listNotifications,
    getUnreadCount: api.afferent.getUnreadCount,
    markNotificationRead: api.afferent.markNotificationRead,
  },
  admin: {
    capability: api.afferent.adminCapability,
    editPost: api.afferent.adminEditPost,
    movePost: api.afferent.movePost,
    setPostStatus: api.afferent.setPostStatus,
    setDiscussionLock: api.afferent.setDiscussionLock,
    setArchived: api.afferent.setArchived,
    listPostActivity: api.afferent.listPostActivity,
    listTags: api.afferent.listTags,
    createTag: api.afferent.createTag,
    renameTag: api.afferent.renameTag,
    setPostTag: api.afferent.setPostTag,
    deleteTag: api.afferent.deleteTag,
    mergePost: api.afferent.mergePost,
    createChangelogDraft: api.afferent.createChangelogDraft,
    editChangelog: api.afferent.editChangelog,
    setChangelogLinks: api.afferent.setChangelogLinks,
    publishChangelog: api.afferent.publishChangelog,
    unpublishChangelog: api.afferent.unpublishChangelog,
  },
} satisfies AfferentBindings;

function HeadlessWorkflow({ postId }: Readonly<{ postId?: PostId }>) {
  const feed = useFeedbackFeed({ order: "newest" });
  const search = useFeedbackSearch({ query: "feedback" });
  const similar = useSimilarPosts({ title: "feedback" });
  const direct = usePost(postId ?? ("missing" as PostId));
  const participation = useFeedbackMutations();
  const admin = useAdminCapability();
  const moderation = usePostModeration();
  const tags = useTags();
  const tagManagement = useTagManagement();
  const merge = useMergePost();
  const roadmap = useRoadmap();
  const changelog = useChangelogFeed();
  const changelogEntry = useChangelogEntry("welcome");
  const changelogEditor = useChangelogEditor();
  const subscription = usePostSubscription(postId ?? ("missing" as PostId));
  const notifications = useNotifications();
  const unread = useUnreadNotificationCount();

  return (
    <section aria-label="Afferent headless contract">
      <h2>Workflow state</h2>
      <dl>
        {Object.entries({
          feed: feed.status,
          search: search.status,
          similar: similar.status,
          direct: direct.status,
          participation: participation.status,
          admin: admin.status,
          moderation: moderation.status,
          tags: tags.status,
          tagManagement: tagManagement.status,
          merge: merge.status,
          roadmap: roadmap.groups.planned.status,
          changelog: changelog.status,
          changelogEntry: changelogEntry.status,
          changelogEditor: changelogEditor.status,
          subscription: subscription.status,
          notifications: notifications.status,
          unread: unread.status,
        }).map(([capability, status]) => (
          <div key={capability}>
            <dt>{capability}</dt>
            <dd>{status}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

export type FeedbackIntent = Readonly<{
  boardId: string;
  title: string;
  body: string;
}>;

export async function submitFeedback(
  intent: FeedbackIntent,
  actions: {
    createPost: (
      args: FeedbackIntent,
    ) => Promise<AfferentActionResult<PostDto>>;
  },
) {
  return await actions.createPost(intent);
}

export function App() {
  const convex = useConvex();
  const configureInstallation = useMutation(api.afferent.configureInstallation);
  const createPost = useMutation(api.afferent.createPost);
  const [boardId, setBoardId] = useState<string>();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const posts = useQuery(
    api.afferent.listPosts,
    boardId ? { boardId } : "skip",
  );

  useEffect(() => {
    void configureInstallation({
      readPolicy: "public",
      boards: [{ slug: "feedback", name: "Product Feedback" }],
    }).then((configured) => setBoardId(configured.boards[0].id));
  }, [configureInstallation]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!boardId) return;
    await submitFeedback({ boardId, title, body }, { createPost });
    setTitle("");
    setBody("");
  }

  return (
    <AfferentProvider
      bindings={headlessBindings}
      client={convex}
      auth={{ status: "authenticated", identityToken: "fixture-user" }}
    >
      <main>
        <h1>Product Feedback</h1>
        <form onSubmit={onSubmit}>
          <label>
            Title
            <input
              name="title"
              required
              value={title}
              onChange={(event) => setTitle(event.currentTarget.value)}
            />
          </label>
          <label>
            Details
            <textarea
              name="body"
              required
              value={body}
              onChange={(event) => setBody(event.currentTarget.value)}
            />
          </label>
          <button type="submit" disabled={!boardId}>
            Submit feedback
          </button>
        </form>
        <ul>
          {posts?.posts.map((post) => (
            <li key={post.id}>
              <h2>{post.title}</h2>
              <p>{post.body}</p>
              <span>{post.voteCount} votes</span>
              <span>{post.commentCount} comments</span>
            </li>
          ))}
        </ul>
        <HeadlessWorkflow postId={posts?.posts[0]?.id as PostId | undefined} />
      </main>
    </AfferentProvider>
  );
}

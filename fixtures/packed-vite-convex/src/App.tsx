import { useMutation, useQuery } from "convex/react";
import { useEffect, useState } from "react";
import type { FormEvent } from "react";

import { api } from "../convex/_generated/api.js";

export type FeedbackIntent = Readonly<{
  boardId: string;
  title: string;
  body: string;
}>;

export async function submitFeedback(
  intent: FeedbackIntent,
  actions: {
    createPost: (args: FeedbackIntent) => Promise<{
      id: string;
      boardId: string;
      title: string;
      body: string;
      voteCount: number;
      commentCount: number;
    }>;
  },
) {
  return await actions.createPost(intent);
}

export function App() {
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
    await submitFeedback(
      { boardId, title, body },
      { createPost },
    );
    setTitle("");
    setBody("");
  }

  return (
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
    </main>
  );
}

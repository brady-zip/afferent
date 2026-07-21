"use client";

import { useState, type FormEvent } from "react";
import type { AdminFeedbackPostDto } from "afferent";
import { useTagManagement, useTags } from "afferent/react.js";
import { useAfferentUi } from "@/components/afferent/core/afferent-ui-provider";

export function AfferentTagManager({
  post,
}: Readonly<{ post: AdminFeedbackPostDto }>) {
  const { copy } = useAfferentUi();
  const tags = useTags();
  const management = useTagManagement();
  const [name, setName] = useState("");
  function create(event: FormEvent) {
    event.preventDefault();
    if (name.trim()) void management.createTag({ name: name.trim() });
  }
  return (
    <section>
      <h2>{copy.admin.manageTags}</h2>
      <form onSubmit={create}>
        <label>
          New tag
          <input
            value={name}
            onChange={(event) => setName(event.currentTarget.value)}
          />
        </label>
        <button type="submit">Create tag</button>
      </form>
      {tags.status === "ready" ? (
        <ul>
          {tags.items.map((tag) => {
            const assigned = post.feedback.tags.some(
              (item) => item.id === tag.id,
            );
            return (
              <li key={tag.id}>
                <span>{tag.name}</span>
                <button
                  type="button"
                  onClick={() =>
                    void management.setPostTag({
                      postId: post.feedback.id,
                      tagId: tag.id,
                      desired: !assigned,
                    })
                  }
                >
                  {assigned ? "Remove tag" : "Assign tag"}
                </button>
                <button
                  type="button"
                  onClick={() => void management.deleteTag({ tagId: tag.id })}
                >
                  Delete tag
                </button>
              </li>
            );
          })}
        </ul>
      ) : (
        <p role="status">{tags.status}</p>
      )}
    </section>
  );
}

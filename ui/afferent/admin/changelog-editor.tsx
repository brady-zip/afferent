"use client";

import { useState, type FormEvent } from "react";
import type { AdminChangelogEntryDto, AdminFeedbackPostDto } from "afferent";
import { useAdminChangelog, useChangelogEditor } from "afferent/react.js";
import { useAfferentUi } from "@/components/afferent/core/afferent-ui-provider";

export function AfferentChangelogEditor({
  feedback,
}: Readonly<{ feedback: readonly AdminFeedbackPostDto[] }>) {
  const { copy } = useAfferentUi();
  const entries = useAdminChangelog();
  const editor = useChangelogEditor();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  function create(event: FormEvent) {
    event.preventDefault();
    void editor.createDraft({ title, body });
  }
  return (
    <section className="afferent-changelog-editor">
      <h2>{copy.admin.changelogHeading}</h2>
      <form onSubmit={create}>
        <label>
          Changelog title
          <input
            value={title}
            onChange={(event) => setTitle(event.currentTarget.value)}
          />
        </label>
        <label>
          Changelog body
          <textarea
            value={body}
            onChange={(event) => setBody(event.currentTarget.value)}
          />
        </label>
        <button type="submit">{copy.admin.saveChangelogDraft}</button>
      </form>
      {entries.status === "ready" ? (
        <ol>
          {entries.items.map((entry) => (
            <Entry key={entry.id} entry={entry} feedback={feedback} />
          ))}
        </ol>
      ) : (
        <p role="status">{entries.status}</p>
      )}
    </section>
  );
  function Entry({
    entry,
    feedback,
  }: Readonly<{
    entry: AdminChangelogEntryDto;
    feedback: readonly AdminFeedbackPostDto[];
  }>) {
    return (
      <li>
        <article>
          <h3>{entry.title}</h3>
          <p>{entry.state}</p>
          <fieldset>
            <legend>Linked feedback</legend>
            {feedback.map((post) => (
              <label key={post.feedback.id}>
                <input
                  type="checkbox"
                  defaultChecked={entry.links.some(
                    (link) => link.id === post.feedback.id,
                  )}
                  onChange={() =>
                    void editor.setLinks({
                      entryId: entry.id,
                      postIds: [post.feedback.id],
                    })
                  }
                />
                {post.feedback.title}
              </label>
            ))}
          </fieldset>
          <button
            type="button"
            onClick={() =>
              void (entry.state === "published"
                ? editor.unpublish(entry.id)
                : editor.publish(entry.id))
            }
          >
            {entry.state === "published"
              ? copy.admin.unpublishChangelog
              : copy.admin.publishChangelog}
          </button>
        </article>
      </li>
    );
  }
}

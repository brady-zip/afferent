"use client";

import { useState, type FormEvent } from "react";
import type { AdminChangelogEntryDto, AdminFeedbackPostDto } from "afferent";
import {
  changelogActionKey,
  useAdminChangelog,
  useChangelogEditor,
} from "afferent/react.js";

import { AfferentConfirmationDialog } from "@/components/afferent/admin/confirmation-dialog";
import { useAfferentUi } from "@/components/afferent/core/afferent-ui-provider";
import {
  formatAfferentDateTime,
  formatAfferentDateTimeValue,
  formatEditorialState,
} from "@/components/afferent/core/format";
import {
  AfferentStateRegion,
  afferentErrorText,
  assertNever,
} from "@/components/afferent/core/state-region";

export function AfferentChangelogEditor({
  feedback,
}: Readonly<{ feedback: readonly AdminFeedbackPostDto[] }>) {
  const { copy } = useAfferentUi();
  const entries = useAdminChangelog();
  const editor = useChangelogEditor();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const createKey = changelogActionKey("new", "create");

  async function create(event: FormEvent) {
    event.preventDefault();
    const result = await editor.createDraft({ title, body });
    if (result.ok) {
      setTitle("");
      setBody("");
    }
  }

  function renderEditorState() {
    switch (editor.status) {
      case "unsupported": {
        return (
          <AfferentStateRegion title={copy.admin.changelogUnsupportedHeading}>
            <p>{copy.common.unsupportedBody}</p>
          </AfferentStateRegion>
        );
      }
      case "loading": {
        return <AfferentStateRegion title={copy.admin.changelogLoading} />;
      }
      case "not-authorized": {
        return (
          <AfferentStateRegion title={copy.admin.changelogNotAuthorizedHeading}>
            <p>{copy.common.notAuthorizedBody}</p>
          </AfferentStateRegion>
        );
      }
      case "ready": {
        return (
          <form onSubmit={(event) => void create(event)}>
            <label>
              {copy.admin.changelogTitleLabel}
              <input
                value={title}
                onChange={(event) => setTitle(event.currentTarget.value)}
              />
            </label>
            <label>
              {copy.admin.changelogBodyLabel}
              <textarea
                value={body}
                onChange={(event) => setBody(event.currentTarget.value)}
              />
            </label>
            <button
              type="submit"
              disabled={editor.pending[createKey]}
              aria-busy={editor.pending[createKey]}
            >
              {copy.admin.saveChangelogDraft}
            </button>
            {editor.errors[createKey] ? (
              <div className="afferent-inline-error" role="alert">
                <p>{afferentErrorText(editor.errors[createKey]!)}</p>
                <button
                  type="button"
                  onClick={() => editor.reset("new", "create")}
                >
                  {copy.admin.dismissMutationError}
                </button>
              </div>
            ) : null}
          </form>
        );
      }
      default: {
        return assertNever(editor.status as never);
      }
    }
  }

  function renderEntries() {
    switch (entries.status) {
      case "unsupported": {
        return (
          <AfferentStateRegion title={copy.admin.changelogUnsupportedHeading}>
            <p>{copy.common.unsupportedBody}</p>
          </AfferentStateRegion>
        );
      }
      case "loading": {
        return <AfferentStateRegion title={copy.admin.changelogLoading} />;
      }
      case "not-authorized": {
        return (
          <AfferentStateRegion title={copy.admin.changelogNotAuthorizedHeading}>
            <p>{copy.common.notAuthorizedBody}</p>
          </AfferentStateRegion>
        );
      }
      case "empty": {
        return (
          <AfferentStateRegion title={copy.admin.changelogEmptyHeading}>
            <p>{copy.admin.changelogEmptyBody}</p>
          </AfferentStateRegion>
        );
      }
      case "error": {
        return (
          <AfferentStateRegion
            title={copy.admin.changelogErrorHeading}
            tone="error"
            action={
              <button type="button" onClick={entries.loadMore}>
                {copy.common.tryLoadingAgain}
              </button>
            }
          >
            {entries.error ? <p>{afferentErrorText(entries.error)}</p> : null}
          </AfferentStateRegion>
        );
      }
      case "loading-more":
      case "ready": {
        return (
          <>
            <ol>
              {entries.items.map((entry) => (
                <Entry
                  key={entry.id}
                  entry={entry}
                  feedback={feedback}
                  editor={editor}
                />
              ))}
            </ol>
            {entries.canLoadMore ? (
              <button
                type="button"
                disabled={entries.status === "loading-more"}
                aria-busy={entries.status === "loading-more"}
                onClick={entries.loadMore}
              >
                {entries.status === "loading-more"
                  ? copy.admin.loadingMoreChangelog
                  : copy.admin.loadMoreChangelog}
              </button>
            ) : null}
          </>
        );
      }
      default: {
        return assertNever(entries.status as never);
      }
    }
  }

  return (
    <section className="afferent-changelog-editor">
      <h2>{copy.admin.changelogHeading}</h2>
      {renderEditorState()}
      {renderEntries()}
    </section>
  );
}

function Entry({
  entry,
  feedback,
  editor,
}: Readonly<{
  entry: AdminChangelogEntryDto;
  feedback: readonly AdminFeedbackPostDto[];
  editor: ReturnType<typeof useChangelogEditor>;
}>) {
  const { copy } = useAfferentUi();
  const action = entry.state === "published" ? "unpublish" : "publish";
  const key = changelogActionKey(entry.id, action);
  const published = entry.state === "published";
  return (
    <li>
      <article>
        <header>
          <h3>{entry.title}</h3>
          <p>{formatEditorialState(entry.state)}</p>
          <time dateTime={formatAfferentDateTimeValue(entry.updatedAt)}>
            Updated {formatAfferentDateTime(entry.updatedAt)}
          </time>
        </header>
        <fieldset>
          <legend>{copy.admin.linkedFeedback}</legend>
          {feedback.map((post) => (
            <label key={post.feedback.id}>
              <input
                type="checkbox"
                defaultChecked={entry.links.some(
                  (link) => link.id === post.feedback.id,
                )}
                disabled={editor.pending[changelogActionKey(entry.id, "links")]}
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
        <div className={published ? "afferent-destructive-actions" : undefined}>
          <AfferentConfirmationDialog
            triggerLabel={
              published
                ? copy.admin.unpublishChangelog
                : copy.admin.publishChangelog
            }
            title={
              published
                ? copy.admin.unpublishTitle(entry.title)
                : copy.admin.publishTitle(entry.title)
            }
            description={
              published ? copy.admin.unpublishBody : copy.admin.publishBody
            }
            confirmLabel={
              published
                ? copy.admin.unpublishChangelog
                : copy.admin.publishChangelog
            }
            escapeLabel={
              published
                ? copy.admin.keepChangelogPublished
                : copy.admin.returnToEditing
            }
            destructive={published}
            pending={editor.pending[key] ?? false}
            error={editor.errors[key]}
            onReset={() => editor.reset(entry.id, action)}
            onConfirm={() =>
              published ? editor.unpublish(entry.id) : editor.publish(entry.id)
            }
          />
        </div>
      </article>
    </li>
  );
}

"use client";

import { useRef, useState, type FormEvent } from "react";
import type { AdminFeedbackPostDto } from "afferent";
import { tagActionKey, useTagManagement, useTags } from "afferent/react.js";

import { AfferentConfirmationDialog } from "@/components/afferent/admin/confirmation-dialog";
import { useAfferentUi } from "@/components/afferent/core/afferent-ui-provider";
import {
  AfferentStateRegion,
  afferentErrorText,
  assertNever,
} from "@/components/afferent/core/state-region";

export function AfferentTagManager({
  post,
}: Readonly<{ post: AdminFeedbackPostDto }>) {
  const { copy } = useAfferentUi();
  const tags = useTags();
  const management = useTagManagement();
  const [name, setName] = useState("");
  const heading = useRef<HTMLHeadingElement>(null);
  const createKey = tagActionKey("tag", "create");

  async function create(event: FormEvent) {
    event.preventDefault();
    if (!name.trim()) return;
    const result = await management.createTag({ name: name.trim() });
    if (result.ok) setName("");
  }

  function renderTags() {
    switch (tags.status) {
      case "unsupported": {
        return (
          <AfferentStateRegion title={copy.common.unsupportedHeading}>
            <p>{copy.common.unsupportedBody}</p>
          </AfferentStateRegion>
        );
      }
      case "loading": {
        return <AfferentStateRegion title={copy.admin.tagsLoading} />;
      }
      case "not-authorized": {
        return (
          <AfferentStateRegion title={copy.common.notAuthorizedHeading}>
            <p>{copy.common.notAuthorizedBody}</p>
          </AfferentStateRegion>
        );
      }
      case "empty": {
        return (
          <AfferentStateRegion title={copy.admin.tagsEmptyHeading}>
            <p>{copy.admin.tagsEmptyBody}</p>
          </AfferentStateRegion>
        );
      }
      case "error": {
        return (
          <AfferentStateRegion title={copy.admin.tagsErrorHeading} tone="error">
            {tags.error ? <p>{afferentErrorText(tags.error)}</p> : null}
            <p>{copy.board.loadErrorBody}</p>
          </AfferentStateRegion>
        );
      }
      case "ready": {
        return (
          <ul>
            {tags.items.map((tag) => {
              const assigned = post.feedback.tags.some(
                (item) => item.id === tag.id,
              );
              const relationKey = tagActionKey(
                `${post.feedback.id}:${tag.id}`,
                assigned ? "remove" : "assign",
              );
              const deleteKey = tagActionKey(tag.id, "delete");
              return (
                <li key={tag.id} className="afferent-tag-manager__row">
                  <span>{tag.name}</span>
                  <div className="afferent-tag-manager__actions">
                    <button
                      type="button"
                      disabled={management.pending[relationKey]}
                      aria-busy={management.pending[relationKey]}
                      onClick={() =>
                        void management.setPostTag({
                          postId: post.feedback.id,
                          tagId: tag.id,
                          desired: !assigned,
                        })
                      }
                    >
                      {assigned ? copy.admin.removeTag : copy.admin.assignTag}
                    </button>
                    <AfferentConfirmationDialog
                      triggerLabel={copy.admin.deleteTag}
                      title={copy.admin.deleteTagTitle(tag.name)}
                      description={copy.admin.deleteTagBody}
                      confirmLabel={copy.admin.deleteTag}
                      escapeLabel={copy.admin.keepTag}
                      destructive
                      pending={management.pending[deleteKey] ?? false}
                      error={management.errors[deleteKey]}
                      onReset={() => management.reset(tag.id, "delete")}
                      onConfirm={() => management.deleteTag({ tagId: tag.id })}
                      restoreFocusTo={heading}
                    />
                  </div>
                  {management.errors[relationKey] ? (
                    <div className="afferent-inline-error" role="alert">
                      <p>
                        {afferentErrorText(management.errors[relationKey]!)}
                      </p>
                      <button
                        type="button"
                        onClick={() =>
                          management.reset(
                            `${post.feedback.id}:${tag.id}`,
                            assigned ? "remove" : "assign",
                          )
                        }
                      >
                        {copy.admin.dismissMutationError}
                      </button>
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>
        );
      }
      default: {
        return assertNever(tags.status as never);
      }
    }
  }

  return (
    <section className="afferent-tag-manager">
      <h2 ref={heading} tabIndex={-1}>
        {copy.admin.manageTags}
      </h2>
      <form onSubmit={(event) => void create(event)}>
        <label>
          {copy.admin.newTagLabel}
          <input
            value={name}
            onChange={(event) => setName(event.currentTarget.value)}
          />
        </label>
        <button
          type="submit"
          disabled={management.pending[createKey]}
          aria-busy={management.pending[createKey]}
        >
          {copy.admin.createTag}
        </button>
      </form>
      {management.errors[createKey] ? (
        <div className="afferent-inline-error" role="alert">
          <p>{afferentErrorText(management.errors[createKey]!)}</p>
          <button
            type="button"
            onClick={() => management.reset("tag", "create")}
          >
            {copy.admin.dismissMutationError}
          </button>
        </div>
      ) : null}
      {renderTags()}
    </section>
  );
}

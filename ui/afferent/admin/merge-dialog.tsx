"use client";

import { useRef, useState } from "react";
import type { AdminFeedbackPostDto, PostId } from "afferent";
import { Dialog } from "radix-ui";
import { moderationActionKey, useMergePost } from "afferent/react.js";
import { useAfferentUi } from "@/components/afferent/core/afferent-ui-provider";

export function AfferentMergeDialog({
  source,
  candidates,
}: Readonly<{
  source: AdminFeedbackPostDto;
  candidates: readonly AdminFeedbackPostDto[];
}>) {
  const { copy } = useAfferentUi();
  const merge = useMergePost();
  const [typed, setTyped] = useState("");
  const [target, setTarget] = useState<PostId | "">(
    candidates[0]?.feedback.id ?? "",
  );
  const trigger = useRef<HTMLButtonElement>(null);
  const key = moderationActionKey(source.feedback.id, "merge");
  return (
    <Dialog.Root>
      <Dialog.Trigger asChild>
        <button ref={trigger} type="button">
          {copy.admin.mergeDuplicate}
        </button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="afferent-dialog-overlay" />
        <Dialog.Content
          className="afferent-dialog"
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            trigger.current?.focus();
          }}
        >
          <Dialog.Title>{copy.admin.mergeDuplicate}</Dialog.Title>
          <Dialog.Description>
            Type “{source.feedback.title}” to confirm this irreversible merge.
          </Dialog.Description>
          <label>
            Canonical feedback
            <select
              value={target}
              onChange={(event) =>
                setTarget(event.currentTarget.value as PostId | "")
              }
            >
              {candidates
                .filter((item) => item.feedback.id !== source.feedback.id)
                .map((item) => (
                  <option key={item.feedback.id} value={item.feedback.id}>
                    {item.feedback.title}
                  </option>
                ))}
            </select>
          </label>
          <label>
            Duplicate title
            <input
              value={typed}
              onChange={(event) => setTyped(event.currentTarget.value)}
            />
          </label>
          <button
            type="button"
            disabled={
              typed !== source.feedback.title || !target || merge.pending[key]
            }
            onClick={() =>
              void merge.merge({
                sourcePostId: source.feedback.id,
                canonicalPostId: target as PostId,
              })
            }
          >
            {copy.admin.mergeDuplicate}
          </button>
          <Dialog.Close asChild>
            <button type="button">{copy.detail.keepFeedback}</button>
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

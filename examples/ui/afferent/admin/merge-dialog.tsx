"use client";

import { useEffect, useRef, useState } from "react";
import type { AdminFeedbackPostDto, PostId } from "afferent";
import { Dialog } from "radix-ui";
import { moderationActionKey, useMergePost } from "afferent/react.js";

import { useAfferentUi } from "@/components/afferent/core/afferent-ui-provider";
import { afferentErrorText } from "@/components/afferent/core/state-region";

export function AfferentMergeDialog({
  source,
  candidates,
}: Readonly<{
  source: AdminFeedbackPostDto;
  candidates: readonly AdminFeedbackPostDto[];
}>) {
  const { copy } = useAfferentUi();
  const merge = useMergePost();
  const available = candidates.filter(
    (item) => item.feedback.id !== source.feedback.id,
  );
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState("");
  const [target, setTarget] = useState<PostId | "">(
    available[0]?.feedback.id ?? "",
  );
  const trigger = useRef<HTMLButtonElement>(null);
  const opened = useRef(false);
  const key = moderationActionKey(source.feedback.id, "merge");
  const canonical = available.find((item) => item.feedback.id === target);
  const pending = merge.pending[key] ?? false;
  const error = merge.errors[key];

  useEffect(() => {
    if (open) {
      opened.current = true;
    } else if (opened.current) {
      opened.current = false;
      trigger.current?.focus();
    }
  }, [open]);

  async function confirm() {
    if (!target || typed !== source.feedback.title) return;
    const result = await merge.merge({
      sourcePostId: source.feedback.id,
      canonicalPostId: target,
    });
    if (result.ok) {
      setOpen(false);
    }
  }

  return (
    <div className="afferent-destructive-actions">
      <Dialog.Root
        open={open}
        onOpenChange={(nextOpen) => {
          if (pending && !nextOpen) return;
          if (!nextOpen) {
            setTyped("");
            if (error) merge.reset(source.feedback.id);
          }
          setOpen(nextOpen);
        }}
      >
        <Dialog.Trigger asChild>
          <button
            ref={trigger}
            type="button"
            className="afferent-button--destructive"
            disabled={available.length === 0}
          >
            {copy.admin.mergeDuplicate}
          </button>
        </Dialog.Trigger>
        <Dialog.Portal>
          <Dialog.Overlay className="afferent-dialog-overlay" />
          <Dialog.Content
            className="afferent-dialog"
            data-tone="destructive"
            onEscapeKeyDown={(event) => {
              if (pending) event.preventDefault();
            }}
            onCloseAutoFocus={(event) => {
              event.preventDefault();
              trigger.current?.focus();
            }}
          >
            <Dialog.Title>{copy.admin.mergeDuplicate}</Dialog.Title>
            <Dialog.Description>
              {copy.admin.mergeDescription(
                source.feedback.title,
                canonical?.feedback.title ?? "the selected feedback",
              )}
            </Dialog.Description>
            <label>
              {copy.admin.canonicalFeedback}
              <select
                value={target}
                disabled={pending}
                onChange={(event) =>
                  setTarget(event.currentTarget.value as PostId | "")
                }
              >
                {available.map((item) => (
                  <option key={item.feedback.id} value={item.feedback.id}>
                    {item.feedback.title}
                  </option>
                ))}
              </select>
            </label>
            <label>
              {copy.admin.duplicateTitle}
              <input
                value={typed}
                disabled={pending}
                onChange={(event) => setTyped(event.currentTarget.value)}
              />
            </label>
            {error ? (
              <div className="afferent-inline-error" role="alert">
                <h3>
                  {copy.admin.mutationErrorHeading(copy.admin.mergeDuplicate)}
                </h3>
                <p>{afferentErrorText(error)}</p>
                <button
                  type="button"
                  onClick={() => merge.reset(source.feedback.id)}
                >
                  {copy.admin.dismissMutationError}
                </button>
              </div>
            ) : null}
            <div className="afferent-dialog__actions">
              <button
                type="button"
                className="afferent-button--destructive"
                disabled={typed !== source.feedback.title || !target || pending}
                aria-busy={pending}
                onClick={() => void confirm()}
              >
                {copy.admin.mergeDuplicate}
              </button>
              <Dialog.Close asChild>
                <button type="button" disabled={pending}>
                  {copy.detail.keepFeedback}
                </button>
              </Dialog.Close>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}

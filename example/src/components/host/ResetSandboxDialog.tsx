"use client";

import type { RefObject } from "react";
import { Dialog } from "radix-ui";

export function ResetSandboxDialog({
  open,
  busy,
  onOpenChange,
  onConfirm,
  restoreFocusRef,
}: Readonly<{
  open: boolean;
  busy: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void | Promise<void>;
  restoreFocusRef?: RefObject<HTMLElement | null>;
}>) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Overlay className="host-dialog__overlay" />
      <Dialog.Content
        className="host-dialog"
        onCloseAutoFocus={(event) => {
          if (!restoreFocusRef?.current) return;
          event.preventDefault();
          restoreFocusRef.current.focus();
        }}
      >
        <Dialog.Title>Reset your private sandbox?</Dialog.Title>
        <Dialog.Description>
          This removes the feedback, comments, votes, moderation work,
          notifications, and changelog changes in your private sandbox only.
          Afferent will restore the original demo content. The shared showcase
          and every other visitor&apos;s sandbox are not affected.
        </Dialog.Description>
        <div className="host-dialog__actions">
          <button
            type="button"
            className="host-button host-button--destructive"
            disabled={busy}
            aria-busy={busy}
            onClick={() => {
              onOpenChange(false);
              void onConfirm();
            }}
          >
            Reset my sandbox
          </button>
          <Dialog.Close asChild>
            <button type="button" className="host-button" disabled={busy}>
              Keep my sandbox
            </button>
          </Dialog.Close>
        </div>
      </Dialog.Content>
    </Dialog.Root>
  );
}

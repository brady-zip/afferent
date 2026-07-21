"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import { Dialog } from "radix-ui";

import { useAfferentUi } from "@/components/afferent/core/afferent-ui-provider";
import { afferentErrorText } from "@/components/afferent/core/state-region";

type ConfirmationResult = Readonly<{ ok: boolean }> | void;

export function AfferentConfirmationDialog({
  triggerLabel,
  title,
  description,
  confirmLabel,
  escapeLabel,
  pending,
  error,
  onConfirm,
  onReset,
  restoreFocusTo,
  destructive = false,
}: Readonly<{
  triggerLabel: string;
  title: string;
  description: string;
  confirmLabel: string;
  escapeLabel: string;
  pending: boolean;
  error?: Readonly<{ code: string; message?: string }>;
  onConfirm: () => Promise<ConfirmationResult>;
  onReset: () => void;
  restoreFocusTo?: RefObject<HTMLElement | null>;
  destructive?: boolean;
}>) {
  const { copy } = useAfferentUi();
  const [open, setOpen] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  const opened = useRef(false);

  useEffect(() => {
    if (open) {
      opened.current = true;
    } else if (opened.current) {
      opened.current = false;
      restoreFocus();
    }
  }, [open]);

  async function confirm() {
    const result = await onConfirm();
    if (result && result.ok) {
      setOpen(false);
    }
  }

  function restoreFocus() {
    const target = trigger.current?.isConnected
      ? trigger.current
      : restoreFocusTo?.current;
    target?.focus();
  }

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(nextOpen) => {
        if (pending && !nextOpen) return;
        if (!nextOpen && error) onReset();
        setOpen(nextOpen);
      }}
    >
      <Dialog.Trigger asChild>
        <button
          ref={trigger}
          type="button"
          className={destructive ? "afferent-button--destructive" : undefined}
        >
          {triggerLabel}
        </button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="afferent-dialog-overlay" />
        <Dialog.Content
          className="afferent-dialog"
          data-tone={destructive ? "destructive" : "consequential"}
          onEscapeKeyDown={(event) => {
            if (pending) event.preventDefault();
          }}
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            restoreFocus();
          }}
        >
          <Dialog.Title>{title}</Dialog.Title>
          <Dialog.Description>{description}</Dialog.Description>
          {error ? (
            <div className="afferent-inline-error" role="alert">
              <h3>{copy.admin.mutationErrorHeading(confirmLabel)}</h3>
              <p>{afferentErrorText(error)}</p>
              <button type="button" onClick={onReset}>
                {copy.admin.dismissMutationError}
              </button>
            </div>
          ) : null}
          <div className="afferent-dialog__actions">
            <button
              type="button"
              className={
                destructive ? "afferent-button--destructive" : undefined
              }
              disabled={pending}
              aria-busy={pending}
              onClick={() => void confirm()}
            >
              {confirmLabel}
            </button>
            <Dialog.Close asChild>
              <button type="button" disabled={pending}>
                {escapeLabel}
              </button>
            </Dialog.Close>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

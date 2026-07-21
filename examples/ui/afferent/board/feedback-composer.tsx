"use client";

import { useId, useState, type FormEvent } from "react";
import type { BoardId } from "afferent";
import { feedbackMutationKey, useFeedbackMutations } from "afferent/react.js";

import { AfferentSimilarFeedback } from "@/components/afferent/board/similar-feedback";
import { useAfferentUi } from "@/components/afferent/core/afferent-ui-provider";
import {
  AfferentStateRegion,
  afferentErrorText,
} from "@/components/afferent/core/state-region";

export function AfferentFeedbackComposer({
  boardId,
  onClose,
}: Readonly<{ boardId?: BoardId; onClose: () => void }>) {
  const { copy } = useAfferentUi();
  const mutations = useFeedbackMutations();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const titleHelpId = useId();
  const bodyHelpId = useId();
  const key = feedbackMutationKey("post", "create");
  const pending = mutations.pending[key] ?? false;
  const error = mutations.errors[key];

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!boardId || title.trim().length === 0 || body.trim().length === 0)
      return;
    await mutations.createPost({
      boardId,
      title: title.trim(),
      body: body.trim(),
    });
  }

  if (mutations.status === "loading") {
    return (
      <AfferentStateRegion title={copy.common.loadingParticipation}>
        <p>{copy.board.createHelp}</p>
      </AfferentStateRegion>
    );
  }
  if (mutations.status === "unsupported") {
    return (
      <AfferentStateRegion title={copy.common.unsupportedHeading}>
        <p>{copy.common.unsupportedBody}</p>
      </AfferentStateRegion>
    );
  }
  if (mutations.status === "unauthenticated") {
    return (
      <AfferentStateRegion title={copy.common.signInHeading}>
        <p>{copy.board.signInToCreate}</p>
      </AfferentStateRegion>
    );
  }

  return (
    <section
      className="afferent-composer"
      aria-labelledby="afferent-composer-heading"
    >
      <h2 id="afferent-composer-heading">{copy.board.createFeedback}</h2>
      <p>{copy.board.createHelp}</p>
      <form data-afferent-composer onSubmit={submit} aria-busy={pending}>
        <div className="afferent-field">
          <label htmlFor="afferent-feedback-title">
            {copy.board.titleLabel}
          </label>
          <input
            id="afferent-feedback-title"
            name="title"
            value={title}
            onChange={(event) => setTitle(event.currentTarget.value)}
            aria-describedby={titleHelpId}
            required
          />
          <p id={titleHelpId}>{copy.board.titleHelp}</p>
        </div>
        <div className="afferent-field">
          <label htmlFor="afferent-feedback-body">{copy.board.bodyLabel}</label>
          <textarea
            id="afferent-feedback-body"
            name="body"
            value={body}
            onChange={(event) => setBody(event.currentTarget.value)}
            aria-describedby={bodyHelpId}
            required
          />
          <p id={bodyHelpId}>{copy.board.bodyHelp}</p>
        </div>
        {title.trim() ? (
          <AfferentSimilarFeedback title={title} body={body} />
        ) : null}
        {error ? (
          <div role="alert" className="afferent-inline-error">
            <h3>{copy.board.createErrorHeading}</h3>
            <p>{afferentErrorText(error)}</p>
            <button type="button" onClick={() => mutations.reset(key)}>
              {copy.common.dismissError}
            </button>
          </div>
        ) : null}
        <div className="afferent-actions">
          <button
            type="submit"
            className="afferent-button"
            disabled={pending || !boardId}
          >
            {copy.board.postFeedback}
          </button>
          <button
            type="button"
            className="afferent-button afferent-button--secondary"
            onClick={onClose}
          >
            {copy.board.returnToFeedback}
          </button>
        </div>
      </form>
      <p className="afferent-sr-only" role="status" aria-live="polite">
        {pending ? copy.board.postingFeedback : ""}
      </p>
    </section>
  );
}

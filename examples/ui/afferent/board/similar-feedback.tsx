"use client";

import { useSimilarPosts, type BoundedDiscoveryState } from "afferent/react.js";

import { AfferentFeedbackList } from "@/components/afferent/board/feedback-list";
import { useAfferentUi } from "@/components/afferent/core/afferent-ui-provider";
import {
  AfferentStateRegion,
  afferentErrorText,
  assertNever,
} from "@/components/afferent/core/state-region";

export function AfferentSimilarFeedback({
  title,
  body,
}: Readonly<{ title: string; body: string }>) {
  const state = useSimilarPosts({ title, body, debounceMs: 0 });
  return <AfferentSimilarFeedbackView state={state} />;
}

export function AfferentSimilarFeedbackView({
  state,
}: Readonly<{ state: BoundedDiscoveryState }>) {
  const { copy } = useAfferentUi();
  switch (state.status) {
    case "unsupported": {
      return null;
    }
    case "loading": {
      return (
        <AfferentStateRegion title={copy.board.loadingSimilar}>
          <p>{copy.board.similarHelp}</p>
        </AfferentStateRegion>
      );
    }
    case "empty": {
      return (
        <AfferentStateRegion title={copy.board.noSimilarHeading}>
          <p>{copy.board.noSimilarBody}</p>
        </AfferentStateRegion>
      );
    }
    case "error": {
      return (
        <AfferentStateRegion
          title={copy.board.similarErrorHeading}
          tone="error"
        >
          <p>{afferentErrorText(state.error)}</p>
        </AfferentStateRegion>
      );
    }
    case "ready": {
      return (
        <section
          className="afferent-similar"
          aria-labelledby="afferent-similar-heading"
        >
          <h3 id="afferent-similar-heading">{copy.board.similarHeading}</h3>
          <p>{copy.board.similarHelp}</p>
          <AfferentFeedbackList
            items={state.items}
            label={copy.board.similarHeading}
          />
        </section>
      );
    }
    default: {
      return assertNever(state);
    }
  }
}

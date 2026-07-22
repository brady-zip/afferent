"use client";

import { useState } from "react";
import type { AdminFeedbackPostDto, BoardDto, PostId } from "afferent";
import {
  useAdminCapability,
  useAdminFeedback,
  useAdminPost,
  usePostActivity,
  type PostActivityState,
} from "afferent/react.js";

import { AfferentChangelogEditor } from "@/components/afferent/admin/changelog-editor";
import { AfferentFeedbackQueue } from "@/components/afferent/admin/feedback-queue";
import { AfferentMergeDialog } from "@/components/afferent/admin/merge-dialog";
import { AfferentModerationForm } from "@/components/afferent/admin/moderation-form";
import { AfferentTagManager } from "@/components/afferent/admin/tag-manager";
import { useAfferentUi } from "@/components/afferent/core/afferent-ui-provider";
import {
  formatActivityDescription,
  formatAfferentDateTime,
  formatAfferentDateTimeValue,
} from "@/components/afferent/core/format";
import {
  AfferentStateRegion,
  afferentErrorText,
  assertNever,
} from "@/components/afferent/core/state-region";

export type AfferentAdminMobileView = "queue" | "detail";

export function AfferentAdminScreen({
  boards = [],
  pageOwner = true,
  mobileView,
  onMobileViewChange,
}: Readonly<{
  boards?: readonly BoardDto[];
  pageOwner?: boolean;
  mobileView: AfferentAdminMobileView;
  onMobileViewChange: (view: AfferentAdminMobileView) => void;
}>) {
  const { copy } = useAfferentUi();
  const capability = useAdminCapability();
  const visible = useAdminFeedback("visible");
  const hidden = useAdminFeedback("hidden");
  const [selected, setSelected] = useState<PostId | undefined>();
  const candidates = uniquePosts([...visible.items, ...hidden.items]);

  function select(postId: PostId) {
    setSelected(postId);
    onMobileViewChange("detail");
  }

  function render() {
    switch (capability.status) {
      case "unsupported": {
        return (
          <AfferentStateRegion title={copy.common.unsupportedHeading}>
            <p>{copy.common.unsupportedBody}</p>
          </AfferentStateRegion>
        );
      }
      case "loading": {
        return <AfferentStateRegion title={copy.admin.loading} />;
      }
      case "not-authorized": {
        return (
          <AfferentStateRegion title={copy.common.notAuthorizedHeading}>
            <p>{copy.common.notAuthorizedBody}</p>
          </AfferentStateRegion>
        );
      }
      case "error": {
        return (
          <AfferentStateRegion title={copy.admin.loadError} tone="error">
            <p>{afferentErrorText(capability.error)}</p>
            <p>{copy.board.loadErrorBody}</p>
          </AfferentStateRegion>
        );
      }
      case "ready": {
        return (
          <div
            className="afferent-admin-workspace"
            data-admin-workspace
            data-mobile-view={mobileView}
          >
            <div className="afferent-admin-pane" data-admin-pane="queue">
              <AfferentFeedbackQueue
                feed={visible}
                selectedId={selected}
                onSelect={select}
              />
            </div>
            <div className="afferent-admin-pane" data-admin-pane="detail">
              <button
                type="button"
                className="afferent-admin__return"
                onClick={() => onMobileViewChange("queue")}
              >
                {copy.admin.returnToQueue}
              </button>
              <AdminDetail
                postId={selected}
                boards={boards}
                candidates={candidates}
                onReturnToQueue={() => onMobileViewChange("queue")}
              />
              <section className="afferent-admin-section" data-admin-section="changelog">
                <AfferentChangelogEditor feedback={candidates} />
              </section>
            </div>
          </div>
        );
      }
      default: {
        return assertNever(capability);
      }
    }
  }

  const body = (
    <div className="afferent-admin" data-afferent-screen="admin">
      <header>
        <h1>{copy.admin.title}</h1>
      </header>
      {render()}
    </div>
  );
  return pageOwner ? <main>{body}</main> : body;
}

function uniquePosts(items: readonly AdminFeedbackPostDto[]) {
  return [...new Map(items.map((item) => [item.feedback.id, item])).values()];
}

function AdminDetail({
  postId,
  boards,
  candidates,
  onReturnToQueue,
}: Readonly<{
  postId?: PostId;
  boards: readonly BoardDto[];
  candidates: readonly AdminFeedbackPostDto[];
  onReturnToQueue: () => void;
}>) {
  const { copy } = useAfferentUi();
  if (!postId)
    return (
      <AfferentStateRegion title={copy.admin.selectFeedbackHeading}>
        <p>{copy.admin.selectFeedbackBody}</p>
      </AfferentStateRegion>
    );
  return (
    <AdminPostDetail
      postId={postId}
      boards={boards}
      candidates={candidates}
      onReturnToQueue={onReturnToQueue}
    />
  );
}

function AdminPostDetail({
  postId,
  boards,
  candidates,
  onReturnToQueue,
}: Readonly<{
  postId: PostId;
  boards: readonly BoardDto[];
  candidates: readonly AdminFeedbackPostDto[];
  onReturnToQueue: () => void;
}>) {
  const { copy } = useAfferentUi();
  const state = useAdminPost(postId);
  const activity = usePostActivity(postId);
  switch (state.status) {
    case "unsupported": {
      return (
        <AfferentStateRegion title={copy.admin.detailUnsupportedHeading}>
          <p>{copy.common.unsupportedBody}</p>
        </AfferentStateRegion>
      );
    }
    case "loading": {
      return <AfferentStateRegion title={copy.admin.loadingDetail} />;
    }
    case "not-authorized": {
      return (
        <AfferentStateRegion title={copy.common.notAuthorizedHeading}>
          <p>{copy.common.notAuthorizedBody}</p>
        </AfferentStateRegion>
      );
    }
    case "error": {
      return (
        <AfferentStateRegion
          title={copy.admin.detailErrorHeading}
          tone="error"
          action={
            <button type="button" onClick={onReturnToQueue}>
              {copy.admin.returnToQueue}
            </button>
          }
        >
          <p>{afferentErrorText(state.error)}</p>
        </AfferentStateRegion>
      );
    }
    case "ready": {
      return (
        <section className="afferent-admin-detail">
          <section className="afferent-admin-section" data-admin-section="moderation">
            <AfferentModerationForm post={state.post} boards={boards} />
          </section>
          <section className="afferent-admin-section" data-admin-section="tags">
            <AfferentTagManager post={state.post} />
          </section>
          <section className="afferent-admin-section" data-admin-section="activity">
            <AdminActivity activity={activity} />
          </section>
          <section className="afferent-admin-section" data-admin-section="merge">
            <AfferentMergeDialog source={state.post} candidates={candidates} />
          </section>
        </section>
      );
    }
    default: {
      return assertNever(state);
    }
  }
}

function AdminActivity({
  activity,
}: Readonly<{ activity: PostActivityState }>) {
  const { copy } = useAfferentUi();
  switch (activity.status) {
    case "unsupported": {
      return (
        <AfferentStateRegion title={copy.admin.activityUnsupportedHeading}>
          <p>{copy.common.unsupportedBody}</p>
        </AfferentStateRegion>
      );
    }
    case "loading": {
      return <AfferentStateRegion title={copy.admin.activityLoading} />;
    }
    case "empty": {
      return (
        <AfferentStateRegion title={copy.admin.activityEmptyHeading}>
          <p>{copy.admin.activityEmptyBody}</p>
        </AfferentStateRegion>
      );
    }
    case "error": {
      return (
        <AfferentStateRegion
          title={copy.admin.activityErrorHeading}
          tone="error"
          action={
            <button type="button" onClick={activity.retry}>
              {copy.common.tryLoadingAgain}
            </button>
          }
        >
          {activity.error ? <p>{afferentErrorText(activity.error)}</p> : null}
        </AfferentStateRegion>
      );
    }
    case "ready": {
      return (
        <section className="afferent-admin-activity">
          <h2>{copy.admin.activityHeading}</h2>
          <ol>
            {activity.items.map((item) => (
              <li key={item.id}>
                <p>{formatActivityDescription(item)}</p>
                <time dateTime={formatAfferentDateTimeValue(item.occurredAt)}>
                  {formatAfferentDateTime(item.occurredAt)}
                </time>
              </li>
            ))}
          </ol>
          {activity.canLoadMore ? (
            <button
              type="button"
              disabled={activity.isLoadingMore}
              aria-busy={activity.isLoadingMore}
              onClick={activity.loadMore}
            >
              {activity.isLoadingMore
                ? copy.admin.loadingMoreActivity
                : copy.admin.loadMoreActivity}
            </button>
          ) : null}
        </section>
      );
    }
    default: {
      return assertNever(activity);
    }
  }
}

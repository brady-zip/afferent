"use client";

import { useState } from "react";
import type { BoardDto, PostId } from "afferent";
import {
  useAdminCapability,
  useAdminFeedback,
  useAdminPost,
  usePostActivity,
} from "afferent/react.js";
import { AfferentChangelogEditor } from "@/components/afferent/admin/changelog-editor";
import { AfferentFeedbackQueue } from "@/components/afferent/admin/feedback-queue";
import { AfferentMergeDialog } from "@/components/afferent/admin/merge-dialog";
import { AfferentModerationForm } from "@/components/afferent/admin/moderation-form";
import { AfferentTagManager } from "@/components/afferent/admin/tag-manager";
import { useAfferentUi } from "@/components/afferent/core/afferent-ui-provider";
import {
  AfferentStateRegion,
  assertNever,
} from "@/components/afferent/core/state-region";

export function AfferentAdminScreen({
  boards = [],
  pageOwner = true,
}: Readonly<{ boards?: readonly BoardDto[]; pageOwner?: boolean }>) {
  const { copy } = useAfferentUi();
  const capability = useAdminCapability();
  const visible = useAdminFeedback("visible");
  const hidden = useAdminFeedback("hidden");
  const [selected, setSelected] = useState<PostId | undefined>();
  const body = (
    <div className="afferent-admin" data-afferent-screen="admin">
      <header>
        <h1>{copy.admin.title}</h1>
      </header>
      {render()}
    </div>
  );
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
        return <AfferentStateRegion title={copy.common.loading} />;
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
          <AfferentStateRegion title={copy.admin.loadError} tone="error" />
        );
      }
      case "ready": {
        return (
          <div className="afferent-admin-workspace" data-admin-workspace>
            <AfferentFeedbackQueue
              feed={visible}
              selectedId={selected}
              onSelect={setSelected}
            />
            <AdminDetail
              postId={selected}
              boards={boards}
              candidates={[...visible.items, ...hidden.items]}
            />
            <AfferentChangelogEditor
              feedback={[...visible.items, ...hidden.items]}
            />
          </div>
        );
      }
      default: {
        return assertNever(capability);
      }
    }
  }
  return pageOwner ? <main>{body}</main> : body;
}
function AdminDetail({
  postId,
  boards,
  candidates,
}: Readonly<{
  postId?: PostId;
  boards: readonly BoardDto[];
  candidates: readonly any[];
}>) {
  if (!postId)
    return (
      <section>
        <h2>Select feedback</h2>
      </section>
    );
  return (
    <AdminPostDetail postId={postId} boards={boards} candidates={candidates} />
  );
}
function AdminPostDetail({
  postId,
  boards,
  candidates,
}: Readonly<{
  postId: PostId;
  boards: readonly BoardDto[];
  candidates: readonly any[];
}>) {
  const state = useAdminPost(postId);
  const activity = usePostActivity(postId);
  if (state.status !== "ready") return <p role="status">{state.status}</p>;
  return (
    <section className="afferent-admin-detail">
      <AfferentModerationForm post={state.post} boards={boards} />
      <AfferentTagManager post={state.post} />
      <section>
        <h2>Activity</h2>
        <ol>
          {activity.items.map((item) => (
            <li key={item.id}>{item.type.replaceAll("_", " ")}</li>
          ))}
        </ol>
      </section>
      <AfferentMergeDialog source={state.post} candidates={candidates} />
    </section>
  );
}

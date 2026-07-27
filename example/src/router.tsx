"use client";

import { useState } from "react";
import type { BoardDto, PostId } from "afferent";
import { Navigate, Route, Routes, useParams } from "react-router";

import { AfferentAdminScreen } from "@/components/afferent/admin/admin-screen";
import { AfferentBoardScreen } from "@/components/afferent/board/board-screen";
import { AfferentChangelogScreen } from "@/components/afferent/changelog/changelog-screen";
import { AfferentNotificationsList } from "@/components/afferent/notifications/notifications-list";
import { AfferentRoadmapScreen } from "@/components/afferent/roadmap/roadmap-screen";

import type { HostedEnvironment } from "./components/host/AppShell.js";

export function HostedRoutes({
  environment,
  boards,
}: Readonly<{
  environment: HostedEnvironment;
  boards: readonly BoardDto[];
}>) {
  return (
    <Routes>
      {environment === "showcase" ? (
        <>
          <Route
            path="/"
            element={
              <AfferentBoardScreen
                boards={boards}
                pageOwner={false}
                title="Representative feedback"
              />
            }
          />
          <Route path="/feedback/:postId" element={<FeedbackDetail />} />
          <Route
            path="/roadmap"
            element={
              <AfferentRoadmapScreen boards={boards} pageOwner={false} />
            }
          />
          <Route
            path="/changelog"
            element={<AfferentChangelogScreen pageOwner={false} />}
          />
          <Route path="/changelog/:slug" element={<ChangelogDetail />} />
          <Route path="*" element={<Navigate replace to="/" />} />
        </>
      ) : (
        <>
          <Route
            path="/sandbox"
            element={
              <AfferentBoardScreen
                boards={boards}
                pageOwner={false}
                title="Sandbox feedback"
              />
            }
          />
          <Route
            path="/sandbox/feedback/:postId"
            element={<FeedbackDetail />}
          />
          <Route
            path="/sandbox/roadmap"
            element={
              <AfferentRoadmapScreen boards={boards} pageOwner={false} />
            }
          />
          <Route
            path="/sandbox/changelog"
            element={<AfferentChangelogScreen pageOwner={false} />}
          />
          <Route
            path="/sandbox/changelog/:slug"
            element={<ChangelogDetail />}
          />
          <Route
            path="/sandbox/notifications"
            element={<AfferentNotificationsList pageOwner={false} />}
          />
          <Route
            path="/sandbox/admin"
            element={<AdminScreen boards={boards} />}
          />
          <Route path="*" element={<Navigate replace to="/sandbox" />} />
        </>
      )}
    </Routes>
  );
}

function FeedbackDetail() {
  const { postId } = useParams();
  return (
    <AfferentBoardScreen
      pageOwner={false}
      postId={postId as PostId | undefined}
    />
  );
}

function ChangelogDetail() {
  const { slug } = useParams();
  return <AfferentChangelogScreen pageOwner={false} slug={slug} />;
}

function AdminScreen({ boards }: Readonly<{ boards: readonly BoardDto[] }>) {
  const [mobileView, setMobileView] = useState<"queue" | "detail">("queue");
  return (
    <AfferentAdminScreen
      boards={boards}
      pageOwner={false}
      mobileView={mobileView}
      onMobileViewChange={setMobileView}
    />
  );
}

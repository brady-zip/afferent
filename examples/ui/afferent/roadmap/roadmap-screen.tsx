"use client";

import { useId, useState } from "react";
import type { BoardDto } from "afferent";
import { useRoadmap } from "afferent/react.js";

import { useAfferentUi } from "@/components/afferent/core/afferent-ui-provider";
import { AfferentRoadmapGroup } from "@/components/afferent/roadmap/roadmap-group";

export function AfferentRoadmapScreen({
  boards = [],
  initialBoardId,
  pageOwner = true,
}: Readonly<{
  boards?: readonly BoardDto[];
  initialBoardId?: BoardDto["id"];
  pageOwner?: boolean;
}>) {
  const { copy } = useAfferentUi();
  const [boardId, setBoardId] = useState<BoardDto["id"] | undefined>(
    initialBoardId,
  );
  const controlId = useId();
  const roadmap = useRoadmap({ boardId });
  const body = (
    <div className="afferent-roadmap" data-afferent-screen="roadmap">
      <header className="afferent-public-header">
        <div>
          <h1>{copy.roadmap.title}</h1>
          <p>{copy.roadmap.description}</p>
        </div>
        {boards.length > 0 ? (
          <label htmlFor={controlId}>
            {copy.roadmap.boardLabel}
            <select
              id={controlId}
              name="roadmap-board"
              value={boardId ?? ""}
              onChange={(event) =>
                setBoardId(
                  event.currentTarget.value
                    ? (event.currentTarget.value as BoardDto["id"])
                    : undefined,
                )
              }
            >
              <option value="">{copy.roadmap.allBoards}</option>
              {boards.map((candidate) => (
                <option key={candidate.id} value={candidate.id}>
                  {candidate.name}
                </option>
              ))}
            </select>
          </label>
        ) : null}
      </header>
      <div className="afferent-roadmap__groups">
        <AfferentRoadmapGroup
          groupKey="planned"
          name="Planned"
          group={roadmap.groups.planned}
        />
        <AfferentRoadmapGroup
          groupKey="in_progress"
          name="In Progress"
          group={roadmap.groups.inProgress}
        />
        <AfferentRoadmapGroup
          groupKey="complete"
          name="Complete"
          group={roadmap.groups.complete}
        />
      </div>
    </div>
  );
  return pageOwner ? <main>{body}</main> : body;
}

import type { AfferentClient } from "afferent";

export const SHOWCASE_BROWSER_READS = Object.freeze([
  "listBoards",
  "listFeedback",
  "listComments",
  "resolvePost",
  "searchFeedback",
  "suggestSimilarPosts",
  "listRoadmapGroup",
  "listPublishedChangelog",
  "getPublishedChangelogBySlug",
] as const);

export function createShowcaseReads(client: AfferentClient) {
  return Object.freeze({
    listBoards: client.read.listBoards,
    listFeedback: client.read.listFeedback,
    listComments: client.read.listComments,
    resolvePost: client.read.resolvePost,
    searchFeedback: client.read.searchFeedback,
    suggestSimilarPosts: client.read.suggestSimilarPosts,
    listRoadmapGroup: client.read.listRoadmapGroup,
    listPublishedChangelog: client.read.listPublishedChangelog,
    getPublishedChangelogBySlug: client.read.getPublishedChangelogBySlug,
  });
}

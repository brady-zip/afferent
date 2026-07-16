export const SIMILAR_CANDIDATE_LIMIT = 30;
export const SIMILAR_DEFAULT_LIMIT = 5;
export const SIMILAR_HARD_LIMIT = 10;

export interface SimilarityText {
  title: string;
  body?: string;
}

export interface SimilarityCandidate extends SimilarityText {
  id: string;
  createdAt: number;
}

function tokens(value: string | undefined) {
  return new Set(
    (value ?? "")
      .normalize("NFKC")
      .toLocaleLowerCase("en-US")
      .match(/[\p{L}\p{N}]+/gu),
  );
}

function overlap(left: Set<string>, right: Set<string>) {
  let matches = 0;
  for (const token of left) if (right.has(token)) matches += 1;
  return matches;
}

export function scoreSimilarity(
  target: SimilarityText,
  candidate: SimilarityText,
) {
  const targetTitle = tokens(target.title);
  const targetBody = tokens(target.body);
  return (
    overlap(targetTitle, tokens(candidate.title)) * 10 +
    overlap(targetTitle, tokens(candidate.body)) * 2 +
    overlap(targetBody, tokens(candidate.title)) * 2 +
    overlap(targetBody, tokens(candidate.body))
  );
}

export function rankSimilarCandidates<T extends SimilarityCandidate>(
  target: SimilarityText,
  candidates: readonly T[],
  limit = SIMILAR_DEFAULT_LIMIT,
) {
  const boundedLimit = Math.max(1, Math.min(limit, SIMILAR_HARD_LIMIT));
  return candidates
    .slice(0, SIMILAR_CANDIDATE_LIMIT)
    .map((candidate) => ({
      candidate,
      score: scoreSimilarity(target, candidate),
    }))
    .filter(({ score }) => score > 0)
    .sort(
      (left, right) =>
        right.score - left.score ||
        right.candidate.createdAt - left.candidate.createdAt ||
        left.candidate.id.localeCompare(right.candidate.id),
    )
    .slice(0, boundedLimit)
    .map(({ candidate }) => candidate);
}

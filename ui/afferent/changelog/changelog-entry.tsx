import type { PublicChangelogEntryDto } from "afferent";

import { useAfferentUi } from "@/components/afferent/core/afferent-ui-provider";
import { formatAfferentDateTimeValue } from "@/components/afferent/core/format";

export function AfferentChangelogEntry({
  entry,
  detail = false,
}: Readonly<{ entry: PublicChangelogEntryDto; detail?: boolean }>) {
  const { copy, navigation } = useAfferentUi();
  const Link = navigation.Link;
  return (
    <article
      className="afferent-changelog-entry"
      data-changelog-entry={entry.id}
    >
      <header>
        <h2>
          {detail ? (
            entry.title
          ) : (
            <Link href={navigation.href.changelog(entry.slug)}>
              {entry.title}
            </Link>
          )}
        </h2>
        <time dateTime={formatAfferentDateTimeValue(entry.firstPublishedAt)}>
          {copy.changelog.publishedAt(entry.firstPublishedAt)}
        </time>
      </header>
      <p className="afferent-changelog-entry__body">{entry.body}</p>
      {entry.links.length > 0 ? (
        <section aria-label={copy.changelog.linkedFeedback}>
          <h3>{copy.changelog.linkedFeedback}</h3>
          <ol>
            {entry.links.map((post) => (
              <li key={post.id}>
                <Link href={navigation.href.post(post.id)}>{post.title}</Link>
                <span>{post.status.label}</span>
              </li>
            ))}
          </ol>
        </section>
      ) : null}
    </article>
  );
}

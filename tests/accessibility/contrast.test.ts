import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";

type Rgb = readonly [number, number, number];

function rgb(hex: string): Rgb {
  const value = hex.replace(/^#/, "");
  if (!/^[\da-f]{6}$/i.test(value)) throw new Error(`Unsupported color ${hex}`);
  return [0, 2, 4].map((index) =>
    Number.parseInt(value.slice(index, index + 2), 16),
  ) as unknown as Rgb;
}

function channel(value: number) {
  const normalized = value / 255;
  return normalized <= 0.04045
    ? normalized / 12.92
    : ((normalized + 0.055) / 1.055) ** 2.4;
}

function luminance(color: Rgb) {
  return (
    0.2126 * channel(color[0]) +
    0.7152 * channel(color[1]) +
    0.0722 * channel(color[2])
  );
}

export function contrastRatio(foreground: string, background: string) {
  const left = luminance(rgb(foreground));
  const right = luminance(rgb(background));
  return (Math.max(left, right) + 0.05) / (Math.min(left, right) + 0.05);
}

function tokens(block: string) {
  return Object.fromEntries(
    [...block.matchAll(/--([\w-]+):\s*(#[\da-f]{6});/gi)].map((match) => [
      match[1],
      match[2].toLowerCase(),
    ]),
  );
}

const css = readFileSync("ui/afferent/afferent.css", "utf8");
const light = tokens(css.match(/:root\s*\{([^}]+)\}/)?.[1] ?? "");
const dark = {
  ...light,
  ...tokens(css.match(/\.dark\s*\{([^}]+)\}/)?.[1] ?? ""),
};

const checks = [
  ["light foreground", light.foreground, light.background, 4.5, "1.4.3"],
  ["light muted text", light["muted-foreground"], light.muted, 4.5, "1.4.3"],
  [
    "light primary text",
    light["primary-foreground"],
    light.primary,
    4.5,
    "1.4.3",
  ],
  ["light destructive text", light.destructive, light.background, 4.5, "1.4.3"],
  ["light border", light.border, light.background, 3, "1.4.11"],
  ["light focus ring", light.ring, light.background, 3, "1.4.11"],
  ["dark foreground", dark.foreground, dark.background, 4.5, "1.4.3"],
  ["dark muted text", dark["muted-foreground"], dark.muted, 4.5, "1.4.3"],
  ["dark primary text", dark["primary-foreground"], dark.primary, 4.5, "1.4.3"],
  ["dark destructive text", dark.destructive, dark.background, 4.5, "1.4.3"],
  ["dark border", dark.border, dark.background, 3, "1.4.11"],
  ["dark focus ring", dark.ring, dark.background, 3, "1.4.11"],
] as const;

describe("exact default token contrast", () => {
  test.each(checks)(
    "%s meets WCAG %s without rounded-threshold acceptance",
    (name, foreground, background, minimum) => {
      expect(foreground, `${name} foreground token`).toBeTruthy();
      expect(background, `${name} background token`).toBeTruthy();
      const actual = contrastRatio(foreground, background);
      expect(
        actual,
        `${name}: ${actual} must be >= ${minimum}`,
      ).toBeGreaterThanOrEqual(minimum);
    },
  );
});

export const contrastChecks = checks.map(
  ([id, foreground, background, minimum, criterion]) => ({
    id,
    criterion,
    foreground,
    background,
    minimum,
    ratio: contrastRatio(foreground, background),
  }),
);

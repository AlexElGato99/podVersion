import type { ReactElement } from "react";

/**
 * Renders admin-supplied tags into <head>.
 *
 * The value is pasted verbatim from a third party (Pinterest, Google, Bing,
 * an analytics vendor), so it arrives as an HTML string. React cannot render a
 * raw string into <head> without replacing the whole element, so the string is
 * parsed and re-emitted as real elements. That also means only head-appropriate
 * tags are rendered and anything else is ignored.
 *
 * Rendering happens on the server so verification crawlers, which read the
 * initial HTML and do not execute JavaScript, can see the tags.
 */

/** Tags that are meaningful inside <head> and safe to reproduce. */
const ALLOWED = new Set(["meta", "link", "script"]);

function parseAttributes(raw: string): Record<string, string> {
  const attrs: Record<string, string> = {};
  // name="value" | name='value' | name=value | name
  const re = /([a-zA-Z_:][-a-zA-Z0-9_:.]*)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+)))?/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(raw)) !== null) {
    const key = m[1];
    const value = m[2] ?? m[3] ?? m[4] ?? "";
    attrs[key] = value;
  }
  return attrs;
}

/**
 * React uses different prop names than HTML for a handful of attributes.
 * Anything not listed passes through unchanged, which is what custom
 * attributes like `data-*` and `p:domain_verify` need.
 */
const PROP_ALIASES: Record<string, string> = {
  class: "className",
  for: "htmlFor",
  charset: "charSet",
  crossorigin: "crossOrigin",
  referrerpolicy: "referrerPolicy",
  httpequiv: "httpEquiv",
  "http-equiv": "httpEquiv",
};

function toReactProps(attrs: Record<string, string>): Record<string, unknown> {
  const props: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(attrs)) {
    const mapped = PROP_ALIASES[key.toLowerCase()] ?? key;
    // Valueless attributes (async, defer) are booleans in React.
    props[mapped] = value === "" && /^(async|defer|nomodule)$/i.test(key) ? true : value;
  }
  return props;
}

export function parseHeadTags(html: string): ReactElement[] {
  if (!html?.trim()) return [];

  const elements: ReactElement[] = [];
  // Matches <tag ...>inner</tag> and self-closing <tag ... />
  const tagRe = /<(meta|link|script)\b([^>]*?)(?:\/>|>([\s\S]*?)<\/\1>|>)/gi;

  let match: RegExpExecArray | null;
  let key = 0;
  while ((match = tagRe.exec(html)) !== null) {
    const tag = match[1].toLowerCase();
    if (!ALLOWED.has(tag)) continue;

    const props = toReactProps(parseAttributes(match[2] ?? ""));
    const inner = match[3];

    if (tag === "script") {
      elements.push(
        inner && inner.trim()
          ? <script key={key++} {...props} dangerouslySetInnerHTML={{ __html: inner }} />
          : <script key={key++} {...props} />
      );
    } else if (tag === "meta") {
      elements.push(<meta key={key++} {...props} />);
    } else {
      elements.push(<link key={key++} {...props} />);
    }
  }

  return elements;
}

export default function CustomHeadTags({ html }: { html?: string | null }) {
  if (!html?.trim()) return null;
  return <>{parseHeadTags(html)}</>;
}

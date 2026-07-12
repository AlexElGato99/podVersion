# PrintDrop — Agent Instructions

These instructions apply to **every** AI agent working on this codebase. Follow all sections in order when adding, editing, or generating any user-facing content (product listings, pages, metadata, categories, descriptions, alt text, nav labels).

---

## Project Context

- **Store name:** PrintDrop
- **Type:** Print-on-demand (POD) store — products are fulfilled via Printful
- **Platform:** Next.js (App Router) + Supabase + Printful API
- **Target audience:** Online shoppers looking for custom/graphic apparel, gifts, home décor, and accessories
- **Brand colors:** Warm orange (`#ea580c`) + teal accent (`#0d9488`), inspired by Etsy style

---

## SEO Playbook — Apply to ALL Content

### Core Principles

1. **Buyer intent first.** Every title, tag, and description must match what a real buyer types into search — not clever branding copy.
2. **Specificity beats cleverness.** "Funny Dog Mom Sweatshirt Gift For Her" > "Woof Vibes Apparel."
3. **Never keyword-stuff.** Every keyword placed must read naturally to a human.
4. **Consistency across fields.** Core keywords appear (in different natural phrasings) across `<title>`, `<meta description>`, `og:title`, `og:description`, `alt` text, and page headings.
5. **One page = one clear customer + one clear use case.** Don't try to rank a single page for unrelated audiences.

---

### Keyword Research Workflow (Required Before Writing Any Copy)

Complete these steps **before** generating any title, description, or metadata:

1. **Seed term:** Start from the product + core theme (e.g., "retro sunset t-shirt").
2. **Autocomplete expansion:** Simulate marketplace autocomplete suggestions — record real, high-volume buyer phrases.
3. **Competitor pattern mining:** Extract recurring phrase patterns (not verbatim copies) from top-ranking listings.
4. **Classify into 3 buckets:**
   - **Primary keyword** — single most important phrase → goes in `<title>` first 40–60 chars and `<h1>`
   - **Secondary keywords** — 3–5 phrases describing product, style, or theme
   - **Long-tail/gift-intent keywords** — occasion, recipient, niche modifiers ("gift for new mom", "christmas stocking stuffer")
5. **Seasonal/trend check:** Check for current trending modifiers before finalizing.

> ⚠️ If real-time search access isn't available, flag that keyword data is assumed/placeholder and should be verified before publishing.

---

### Page `<title>` Rules

- Front-load the primary keyword in the first 40–60 characters
- Structure: `[Primary Keyword] | [Brand Name]` or `[Primary Keyword] — [Short Descriptor] | PrintDrop`
- Keep under 60 characters to avoid truncation in SERPs
- No ALL CAPS, excessive punctuation, or filler words ("Amazing", "Best", "Cool")
- Example: `Retro Sunset Graphic Tee | PrintDrop`

### `<meta description>` Rules

- 140–160 characters
- Include primary keyword naturally in the first sentence
- Include a soft CTA ("Shop now", "Free shipping on $50+", "Perfect gift for…")
- Example: `Shop our retro sunset graphic tee — a vintage-style unisex t-shirt perfect for 90s aesthetic lovers. Free shipping on orders over $50.`

### Open Graph / Social Meta

- `og:title` = same as `<title>` or slightly expanded (up to 90 chars)
- `og:description` = same as `<meta description>`
- `og:image` = high-quality product image, 1200×630px, named with keywords (e.g., `retro-sunset-graphic-tee.jpg`)

---

### Image SEO Rules

- **Alt text:** Describe the image literally + include the primary keyword once, naturally. Example: `"Retro sunset graphic t-shirt in mustard yellow, flat lay on wood background"`
- Never use empty `alt=""` on product images
- **File names:** Use hyphens, include keywords (e.g., `retro-sunset-graphic-tee-mustard.jpg`), not `IMG_2931.jpg`
- Product thumbnails must show the product clearly on a clean or lifestyle background

---

### Product Description Rules

1. **First 2 lines:** Restate the primary keyword + core value proposition immediately (these show in search snippets)
2. **Structure:**
   - Hook line with primary keyword + who it's for
   - Bullet list: material, fit, sizing, print method, care instructions
   - Gift/use-case framing (occasions, recipients)
   - Shipping/production time
   - Soft CTA ("Add to cart", "Check out matching designs")
3. Naturally weave secondary and long-tail keywords in sentence form — do not paste tag lists
4. Short paragraphs (2–3 sentences) for mobile readability

---

### Navigation & Category Label Rules

- Section names and nav labels should use keyword-rich phrases, not generic labels
  - ✅ "Retro Graphic Tees" instead of ❌ "New Arrivals"
  - ✅ "Gifts for Her" instead of ❌ "Section 1"
- Shop section URLs should also be descriptive (`/shop?category=retro-graphic-tees`)

---

### Store-Level SEO

- **Page titles** for collection/category pages must include the category keyword + "PrintDrop"
- **Homepage** `<title>` should include the store's core niche: e.g., `Custom Print-on-Demand Apparel & Gifts | PrintDrop`
- **About page** should mention the niche and target audience in natural language
- Maintain consistent niche focus — tightly themed shops rank and convert better

---

### Things Agents Must NOT Do

- ❌ Copy competitor titles/tags verbatim — reverse-engineer the *pattern*, not the exact text
- ❌ Use trademarked terms, character names, or brand names without explicit licensing
- ❌ Stuff irrelevant trending keywords unrelated to the actual product
- ❌ Leave `alt` attributes empty on product images
- ❌ Fabricate keyword volume data — flag when data is assumed/unverified

---

### QC Checklist (Verify Before Marking Any Content Task Complete)

- [ ] Keyword research done for this specific product/page (not reused from another)
- [ ] Primary keyword in: `<title>` (first 40 chars), `<h1>`, `<meta description>`, at least one image `alt`
- [ ] `<meta description>` is 140–160 chars, includes CTA
- [ ] `og:title` and `og:description` filled
- [ ] All product images have descriptive `alt` text with primary keyword
- [ ] Description has hook, specifics, gift framing, and CTA
- [ ] No keyword stuffing — reads naturally to a human
- [ ] Navigation/category labels use keyword-rich phrases

---

## Code Conventions

- **Framework:** Next.js 15, App Router, TypeScript
- **Styling:** Tailwind CSS v4 (`@import "tailwindcss"`)
- **Database:** Supabase (project ID: `slxqvlnxlmzitbmeqzvn`)
- **Fulfillment:** Printful API (Bearer token in `.env.local`)
- **SEO metadata:** Use Next.js `export const metadata` in Server Components for all `<title>` and `<meta>` tags
- **Images:** Use `next/image` for all product images; always provide `alt` text

---

## Applying These Instructions

When an agent is asked to:
- **Add a new product listing** → Follow the full keyword research + title/tag/description/alt workflow
- **Add a new page** → Apply `<title>`, `<meta description>`, and `og:*` metadata following the rules above
- **Add a new category or nav section** → Use keyword-rich labels and matching URL slugs
- **Update existing content** → Audit against the QC checklist before and after changes

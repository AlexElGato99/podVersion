import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatPrice(amount: number | string, currency = "USD") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  }).format(Number(amount));
}

export function slugify(text: string) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

/** Build a SEO-friendly product URL slug: "retro-sunset-tee--445808888" */
export function productSlug(name: string, id: number | string) {
  return `${slugify(name)}--${id}`;
}

/** Extract the Printful product ID from a slug like "retro-sunset-tee--445808888" */
export function productIdFromSlug(slug: string) {
  const parts = slug.split("--");
  return parts[parts.length - 1];
}

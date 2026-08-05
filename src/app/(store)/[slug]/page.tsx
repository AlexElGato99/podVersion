import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";

interface Props {
  params: Promise<{ slug: string }>;
}

interface PageRow {
  title: string;
  content: string;
  meta_description: string | null;
  updated_at: string;
}

async function getPage(slug: string): Promise<PageRow | null> {
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("pages")
      .select("title, content, meta_description, updated_at")
      .eq("slug", slug)
      .eq("is_published", true)
      .single();
    return data ?? null;
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const page = await getPage(slug);
  if (!page) return { title: "Page Not Found | Veliova" };
  return {
    title: `${page.title} | Veliova`,
    description: page.meta_description || undefined,
    alternates: { canonical: `https://veliova.com/${slug}` },
  };
}

export default async function CmsPage({ params }: Props) {
  const { slug } = await params;
  const page = await getPage(slug);
  if (!page) notFound();

  return (
    <div className="pt-20 sm:pt-32 pb-20 bg-white">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-extrabold tracking-tight text-zinc-900 sm:text-4xl">
          {page.title}
        </h1>
        <p className="mt-2 text-xs text-zinc-400">
          Last updated {new Date(page.updated_at).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
        </p>
        <div
          className="page-content mt-8"
          dangerouslySetInnerHTML={{ __html: page.content }}
        />
      </div>
    </div>
  );
}

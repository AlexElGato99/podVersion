import Link from "next/link";
import { ArrowLeft, Home } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="text-center">
        <p className="text-8xl font-black gradient-text mb-4">404</p>
        <h1 className="text-2xl font-bold text-zinc-900 mb-3">
          Page not found
        </h1>
        <p className="text-zinc-500 mb-10 max-w-sm">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>
        <div className="flex items-center justify-center gap-3">
          <Link href="/" className="btn-primary">
            <Home className="h-4 w-4" />
            Back Home
          </Link>
          <Link href="/shop" className="btn-secondary">
            Browse Shop
          </Link>
        </div>
      </div>
    </div>
  );
}

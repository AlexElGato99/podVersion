"use client";

import { useEffect, useRef } from "react";
import Script from "next/script";
import { usePathname, useSearchParams } from "next/navigation";

declare global {
  interface Window {
    pintrk?: ((...args: unknown[]) => void) & { queue?: unknown[]; version?: string };
  }
}

interface Props {
  tagId: string;
  /**
   * SHA256 hash of the signed-in user's email, for Enhanced Match. Hashed on
   * the server so the raw address is never exposed to client-side scripts.
   * Undefined when the visitor is anonymous or the feature is disabled.
   */
  hashedEmail?: string;
}

/**
 * Pinterest Tag (pintrk) for conversion tracking and retargeting audiences.
 *
 * Pinterest's stock snippet fires a single `page` event on load. That is enough
 * for a traditional multi-page site, but this app navigates client-side, so
 * without the effect below every route after the first would go unrecorded.
 */
export default function PinterestTag({ tagId, hashedEmail }: Props) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  // The loader script already sends the first page view; skip it here so the
  // landing page is not counted twice.
  const initialised = useRef(false);

  useEffect(() => {
    if (!initialised.current) {
      initialised.current = true;
      return;
    }
    window.pintrk?.("page");
  }, [pathname, searchParams]);

  const loadOptions = hashedEmail ? `, { em: ${JSON.stringify(hashedEmail)} }` : "";

  return (
    <>
      <Script id="pinterest-tag" strategy="afterInteractive">
        {`
!function(e){if(!window.pintrk){window.pintrk=function(){window.pintrk.queue.push(Array.prototype.slice.call(arguments))};var n=window.pintrk;n.queue=[],n.version="3.0";var t=document.createElement("script");t.async=!0,t.src=e;var r=document.getElementsByTagName("script")[0];r.parentNode.insertBefore(t,r)}}("https://s.pinimg.com/ct/core.js");
pintrk('load', ${JSON.stringify(tagId)}${loadOptions});
pintrk('page');
        `}
      </Script>
      <noscript>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          height="1"
          width="1"
          style={{ display: "none" }}
          alt=""
          src={
            `https://ct.pinterest.com/v3/?event=init&tid=${encodeURIComponent(tagId)}` +
            (hashedEmail ? `&pd[em]=${encodeURIComponent(hashedEmail)}` : "") +
            `&noscript=1`
          }
        />
      </noscript>
    </>
  );
}

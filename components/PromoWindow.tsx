"use client";

import Link from "next/link";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { site } from "@/data/site";

export default function PromoWindow({
  kind,
  number,
}: {
  kind: "shop" | "patreon";
  number: string;
}) {
  const [open, setOpen] = useState(false);
  const wrapper = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const popup = useRef<HTMLDivElement>(null);
  const shop = kind === "shop";
  useLayoutEffect(() => {
    if (!open || shop) return;
    const anchor = wrapper.current;
    const windowElement = popup.current;
    if (!anchor || !windowElement) return;
    const position = () => {
      const bounds = anchor.getBoundingClientRect();
      const viewport = window.visualViewport;
      const topEdge = (viewport?.offsetTop ?? 0) + 8;
      const leftEdge = (viewport?.offsetLeft ?? 0) + 8;
      const height = viewport?.height ?? window.innerHeight;
      const width = viewport?.width ?? document.documentElement.clientWidth;
      windowElement.style.maxHeight = `${Math.max(0, height - 16)}px`;
      const top = Math.max(topEdge, Math.min(bounds.top - windowElement.offsetHeight,
        topEdge + height - 16 - windowElement.offsetHeight));
      const left = Math.max(leftEdge, Math.min(bounds.left,
        leftEdge + width - 16 - windowElement.offsetWidth));
      windowElement.style.top = `${top - bounds.top}px`;
      windowElement.style.left = `${left - bounds.left}px`;
    };
    position();
    const observer = new ResizeObserver(position);
    observer.observe(anchor);
    observer.observe(windowElement);
    window.addEventListener("resize", position);
    window.addEventListener("scroll", position, true);
    window.visualViewport?.addEventListener("resize", position);
    window.visualViewport?.addEventListener("scroll", position);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", position);
      window.removeEventListener("scroll", position, true);
      window.visualViewport?.removeEventListener("resize", position);
      window.visualViewport?.removeEventListener("scroll", position);
    };
  }, [open, shop]);
  useEffect(() => {
    if (!open) return;
    const outside = (event: PointerEvent) => {
      if (!wrapper.current?.contains(event.target as Node)) setOpen(false);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        trigger.current?.focus();
      }
    };
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("keydown", escape);
    };
  }, [open]);
  return (
    <div
      className="promo-anchor"
      id={kind}
      ref={wrapper}
      onPointerEnter={(event) => {
        if (event.pointerType === "mouse") setOpen(true);
      }}
      onPointerLeave={(event) => {
        if (
          event.pointerType === "mouse" &&
          !wrapper.current?.contains(document.activeElement)
        )
          setOpen(false);
      }}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
      }}
    >
      <button
        ref={trigger}
        className="nav-trigger"
        aria-expanded={open}
        aria-controls={`${kind}-promo`}
        onClick={() => setOpen((value) => !value)}
      >
        <span>{number}</span>
        {shop ? "REQUISITIONS / SHOP" : "PATREON ACCESS"}
      </button>
      {open && (
        <div
          className="promo-window"
          ref={popup}
          id={`${kind}-promo`}
          role="region"
          aria-label={`${shop ? "SHOP" : "PATREON"} promotional window`}
        >
          <div className="promo-title">
            <span>{shop ? "BEST_DEALS.exe" : "SUPPORT_THE_ARTS.exe"}</span>
            <span className="window-controls">
              <span aria-hidden="true">_ □</span>
              <button
                aria-label={`Close ${kind} promotion`}
                onClick={() => {
                  setOpen(false);
                  trigger.current?.focus();
                }}
              >
                ×
              </button>
            </span>
          </div>
          <div className="promo-body">
            <span className="promo-new">★ NEW!!! ★</span>
            <h2>{shop ? "★★★ BUY BUY BUY!!! ★★★" : "SUPPORT THE ARTS!!!"}</h2>
            <p className="promo-slogan">
              {shop ? "COOL SHIT FOR SALE" : "UNLOCK SECRET FILES!!!"}
            </p>
            <p>
              {shop
                ? "Objects! Prints! Things you can TOUCH!!!"
                : "Keep the studio lights ON!!!"}
            </p>
            {shop ? (
              <a className="promo-cta" href={site.shopUrl}>
                {">>> ENTER STORE <<<"}
              </a>
            ) : (
              <Link className="promo-cta" href="/patreon">
                {">>> JOIN PATREON <<<"}
              </Link>
            )}
            <small>
              {shop
                ? site.shopIsPlaceholder
                  ? "Placeholder store URL — real storefront coming later."
                  : "Visit the separate Studio Migrainz storefront."
                : "Access preview only. Account connection is a future feature."}
            </small>
          </div>
        </div>
      )}
    </div>
  );
}

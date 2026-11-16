"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, type MouseEvent, type ReactNode } from "react";

export function PageTransition({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [isExiting, setIsExiting] = useState(false);
  const isNavigating = useRef(false);

  function handleClickCapture(event: MouseEvent<HTMLDivElement>) {
    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey ||
      isNavigating.current ||
      !(event.target instanceof Element)
    ) {
      return;
    }

    const link = event.target.closest("a[href]");
    if (
      !(link instanceof HTMLAnchorElement) ||
      (link.target && link.target !== "_self") ||
      link.hasAttribute("download")
    ) {
      return;
    }

    const destination = new URL(link.href, window.location.href);
    if (
      destination.origin !== window.location.origin ||
      (destination.pathname === window.location.pathname &&
        destination.search === window.location.search)
    ) {
      return;
    }

    event.preventDefault();
    isNavigating.current = true;
    setIsExiting(true);
    const exitDuration = window.matchMedia("(prefers-reduced-motion: reduce)").matches
      ? 0
      : 180;
    if (exitDuration > 0) {
      event.currentTarget.animate(
        [{ opacity: getComputedStyle(event.currentTarget).opacity }, { opacity: 0 }],
        { duration: exitDuration, easing: "ease-in", fill: "forwards" },
      );
    }
    window.setTimeout(() => {
      router.push(`${destination.pathname}${destination.search}${destination.hash}`);
    }, exitDuration);
  }

  return (
    <div
      className={`page-transition${isExiting ? " page-transition--exiting" : ""}`}
      onClickCapture={handleClickCapture}
      style={isExiting ? { pointerEvents: "none" } : undefined}
    >
      {children}
    </div>
  );
}

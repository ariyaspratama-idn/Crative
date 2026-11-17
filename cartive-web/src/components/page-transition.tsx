"use client";

import { useRouter } from "next/navigation";
import { usePathname } from "next/navigation";
import { useEffect, useRef, type MouseEvent, type ReactNode } from "react";

export function PageTransition({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const isNavigating = useRef(false);
  const exitTimer = useRef<number | null>(null);
  const exitAnimation = useRef<Animation | null>(null);
  const container = useRef<HTMLDivElement>(null);

  useEffect(() => {
    isNavigating.current = false;
    exitAnimation.current?.cancel();
    exitAnimation.current = null;
    if (container.current) {
      container.current.removeAttribute("data-exiting");
      container.current.style.pointerEvents = "";
    }
    if (exitTimer.current !== null) {
      window.clearTimeout(exitTimer.current);
      exitTimer.current = null;
    }
  }, [pathname]);

  useEffect(() => () => {
    if (exitTimer.current !== null) window.clearTimeout(exitTimer.current);
    exitAnimation.current?.cancel();
  }, []);

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
      destination.pathname === window.location.pathname
    ) {
      return;
    }

    event.preventDefault();
    isNavigating.current = true;
    event.currentTarget.dataset.exiting = "true";
    event.currentTarget.style.pointerEvents = "none";
    const exitDuration = window.matchMedia("(prefers-reduced-motion: reduce)").matches
      ? 0
      : 180;
    if (exitDuration > 0) {
      exitAnimation.current = event.currentTarget.animate(
        [{ opacity: getComputedStyle(event.currentTarget).opacity }, { opacity: 0 }],
        { duration: exitDuration, easing: "ease-in", fill: "forwards" },
      );
    }
    exitTimer.current = window.setTimeout(() => {
      router.push(`${destination.pathname}${destination.search}${destination.hash}`);
    }, exitDuration);
  }

  return (
    <div
      ref={container}
      className="page-transition"
      onClickCapture={handleClickCapture}
    >
      {children}
    </div>
  );
}

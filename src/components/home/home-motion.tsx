"use client";

import { useEffect, useRef, type ReactNode } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

export function HomeMotion({ children }: { children: ReactNode }) {
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const ctx = gsap.context(() => {
      gsap.set("[data-hero], [data-reveal]", { opacity: 1, y: 0, clearProps: "visibility" });
      if (reduced) return;
      const tl = gsap.timeline({ defaults: { ease: "power2.out" } });
      tl.from("[data-hero='kicker']", { y: 14, duration: 0.35 }, 0)
        .from("[data-hero='title']", { y: 18, duration: 0.4 }, 0.05)
        .from("[data-hero='copy']", { y: 12, duration: 0.35 }, 0.12)
        .from("[data-hero='cta']", { y: 10, duration: 0.3 }, 0.18)
        .from("[data-hero='stage']", { y: 16, duration: 0.4 }, 0.1);

      gsap.utils.toArray<HTMLElement>("[data-reveal]").forEach((node, index) => {
        gsap.from(node, {
          y: 18,
          duration: 0.45,
          delay: Math.min(index * 0.03, 0.3),
          scrollTrigger: { trigger: node, start: "top 92%", once: true },
        });
      });
    }, el);

    return () => {
      ctx.revert();
      ScrollTrigger.getAll().forEach((trigger) => trigger.kill());
    };
  }, []);

  return <div ref={root}>{children}</div>;
}

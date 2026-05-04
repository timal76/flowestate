"use client";

import { useEffect, useRef, useState } from "react";

export type UseIntersectionObserverOptions = IntersectionObserverInit & {
  /** Si true (défaut), arrête d'observer après la première intersection */
  once?: boolean;
};

const DEFAULT_ROOT_MARGIN = "0px 0px -10% 0px";
const DEFAULT_THRESHOLD = 0.12;

export function useIntersectionObserver(options?: UseIntersectionObserverOptions) {
  const { once = true, threshold = DEFAULT_THRESHOLD, root = null, rootMargin = DEFAULT_ROOT_MARGIN } =
    options ?? {};
  const ref = useRef<HTMLDivElement | null>(null);
  const [isIntersecting, setIsIntersecting] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry) return;
        if (entry.isIntersecting) {
          setIsIntersecting(true);
          if (once) observer.unobserve(element);
        } else if (!once) {
          setIsIntersecting(false);
        }
      },
      { threshold, root, rootMargin }
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, [once, threshold, root, rootMargin]);

  return { ref, isIntersecting } as const;
}

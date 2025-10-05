import { useCallback, useEffect } from "react";

interface UseInfiniteScrollOptions {
  hasNextPage: boolean;
  fetchNextPage: () => void;
  isFetchingNextPage: boolean;
  threshold?: number;
}

export function useInfiniteScroll({
  hasNextPage,
  fetchNextPage,
  isFetchingNextPage,
  threshold = 100,
}: UseInfiniteScrollOptions) {
  const handleScroll = useCallback(
    (event: Event) => {
      const target = event.target as HTMLElement;
      if (!target) return;

      const { scrollTop, scrollHeight, clientHeight } = target;
      const distanceFromBottom = scrollHeight - scrollTop - clientHeight;

      if (
        distanceFromBottom < threshold &&
        hasNextPage &&
        !isFetchingNextPage
      ) {
        fetchNextPage();
      }
    },
    [hasNextPage, fetchNextPage, isFetchingNextPage, threshold]
  );

  const attachScrollListener = useCallback(
    (element: HTMLElement | null) => {
      if (!element) return;

      element.addEventListener("scroll", handleScroll, { passive: true });

      return () => {
        element.removeEventListener("scroll", handleScroll);
      };
    },
    [handleScroll]
  );

  return { attachScrollListener };
}

// Alternative version that uses ref
export function useInfiniteScrollRef({
  hasNextPage,
  fetchNextPage,
  isFetchingNextPage,
  threshold = 100,
}: UseInfiniteScrollOptions) {
  const handleScroll = useCallback(
    (event: Event) => {
      const target = event.target as HTMLElement;
      if (!target) return;

      const { scrollTop, scrollHeight, clientHeight } = target;
      const distanceFromBottom = scrollHeight - scrollTop - clientHeight;

      if (
        distanceFromBottom < threshold &&
        hasNextPage &&
        !isFetchingNextPage
      ) {
        fetchNextPage();
      }
    },
    [hasNextPage, fetchNextPage, isFetchingNextPage, threshold]
  );

  const scrollRef = useCallback(
    (element: HTMLElement | null) => {
      if (!element) return;

      element.addEventListener("scroll", handleScroll, { passive: true });

      return () => {
        element.removeEventListener("scroll", handleScroll);
      };
    },
    [handleScroll]
  );

  return scrollRef;
}

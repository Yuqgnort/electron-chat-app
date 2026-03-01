import { DependencyList, useLayoutEffect } from "react";

type TUseStickToBottomOnLoadParams = {
  containerRef: React.RefObject<HTMLDivElement | null>;
  deps: DependencyList;
};

export function useStickToBottomOnLoad({
  containerRef,
  deps,
}: TUseStickToBottomOnLoadParams) {
  useLayoutEffect(() => {
    const container = containerRef.current;
    if (container) {
      container.scrollTop = container.scrollHeight;
    }
  }, deps);
}

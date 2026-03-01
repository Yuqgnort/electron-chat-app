import { DependencyList, useLayoutEffect } from "react";

type TUseScrollToBottomParams = {
  containerRef: React.RefObject<HTMLElement | null>;
  dependencies?: DependencyList;
};

export const useScrollToBottom = ({
  containerRef,
  dependencies = [],
}: TUseScrollToBottomParams) => {
  useLayoutEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTo({
        top: containerRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  }, [containerRef, ...dependencies]);
};

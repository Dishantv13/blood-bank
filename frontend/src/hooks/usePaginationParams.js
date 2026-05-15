import { useSearchParams } from "react-router-dom";
import { useCallback, useMemo } from "react";

export const usePaginationParams = (defaultLimit = 10) => {
  const [searchParams, setSearchParams] = useSearchParams();

  const page = useMemo(() => {
    return parseInt(searchParams.get("page")) || 1;
  }, [searchParams]);

  const limit = useMemo(() => {
    return parseInt(searchParams.get("limit")) || defaultLimit;
  }, [searchParams, defaultLimit]);

  const setPage = useCallback((newPage) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (newPage === 1) {
        next.delete("page");
      } else {
        next.set("page", String(newPage));
      }
      return next;
    }, { replace: true });
  }, [setSearchParams]);

  const setLimit = useCallback((newLimit) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set("limit", String(newLimit));
      next.delete("page"); // Reset page when limit changes
      return next;
    }, { replace: true });
  }, [setSearchParams]);

  return { page, limit, setPage, setLimit };
};

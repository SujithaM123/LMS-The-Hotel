import { useCallback, useEffect, useState } from "react";
import { friendlyMessage } from "./client";

interface AsyncState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  reload: () => void;
  setData: React.Dispatch<React.SetStateAction<T | null>>;
}

/** Owns loading/error/data for a fetch-on-mount list/detail request so pages stop hand-rolling it. */
export function useAsync<T>(fetcher: () => Promise<T>, deps: unknown[]): AsyncState<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    fetcher()
      .then((result) => setData(result))
      .catch((err) => setError(friendlyMessage(err)))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, tick]);

  useEffect(load, [load]);

  return { data, loading, error, reload: () => setTick((t) => t + 1), setData };
}

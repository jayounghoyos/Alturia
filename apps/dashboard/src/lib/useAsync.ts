import { useCallback, useEffect, useRef, useState } from "react";

interface AsyncState<T> {
  data: T | undefined;
  error: Error | undefined;
  loading: boolean;
}

/**
 * Loads data for a screen and keeps the last good value while it reloads,
 * so a refresh never blanks what is already on screen. `key` restarts the
 * load when what it depends on changes (an id, the signed-in admin).
 */
export function useAsync<T>(load: () => Promise<T>, key: string) {
  const [state, setState] = useState<AsyncState<T>>({
    data: undefined,
    error: undefined,
    loading: true,
  });
  const [version, setVersion] = useState(0);
  const loadRef = useRef(load);
  useEffect(() => {
    loadRef.current = load;
  });

  // `key` and `version` are triggers: a new key or a reload() runs the load.
  // oxlint-disable-next-line react/exhaustive-deps
  useEffect(() => {
    let active = true;
    loadRef.current().then(
      (data) => active && setState({ data, error: undefined, loading: false }),
      (error: unknown) =>
        active &&
        setState((prev) => ({
          ...prev,
          error: error instanceof Error ? error : new Error(String(error)),
          loading: false,
        })),
    );
    return () => {
      active = false;
    };
  }, [key, version]);

  const reload = useCallback(() => {
    setState((prev) => ({ ...prev, loading: true }));
    setVersion((v) => v + 1);
  }, []);

  /** Replace the data locally (after a save) without a round trip. */
  const set = useCallback((data: T) => {
    setState({ data, error: undefined, loading: false });
  }, []);

  return { ...state, reload, set };
}

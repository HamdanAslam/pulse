import { useSyncExternalStore } from "react";
import { mockStore } from "@/services/_mockStore";

export function useMockSync(selector) {
  return useSyncExternalStore(
    (callback) => mockStore.subscribe(callback),
    selector,
    selector,
  );
}

"use client";

import { Text } from "@once-ui-system/core";
import type { DraftState } from "@/hooks/useDraftAutosave";

function hhmm(ts: number) {
  const d = new Date(ts);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export function DraftBadge({ state }: { state: DraftState }) {
  if (state.dirty) {
    return (
      <Text variant="body-default-xs" onBackground="neutral-weak">
        Saving draft…
      </Text>
    );
  }
  if (state.savedAt) {
    return (
      <Text variant="body-default-xs" onBackground="neutral-weak">
        Draft saved {hhmm(state.savedAt)}
      </Text>
    );
  }
  return null;
}

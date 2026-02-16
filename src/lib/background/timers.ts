import {
  TIME_UPDATE_INTERVAL_MS,
  INTERACTION_UPDATE_INTERVAL_MS,
  logError
} from "./constants";
import { getStorage, setStorage } from "../storage";

export class TimerManager {
  private timeUpdateTimer: ReturnType<typeof setInterval> | null = null;
  private lastInteractionUpdateTimer: ReturnType<typeof setInterval> | null = null;

  startTimeUpdateTimer(): void {
    if (this.timeUpdateTimer) {
      clearInterval(this.timeUpdateTimer);
    }

    this.timeUpdateTimer = setInterval(async () => {
      try {
        const data = await getStorage(
          "focusing",
          "since_last_change",
          "last_update_timestamp"
        );

        if (
          data.focusing !== undefined &&
          data.since_last_change !== undefined &&
          data.last_update_timestamp
        ) {
          const now = Date.now();
          const elapsed = Math.floor((now - data.last_update_timestamp) / 1000);
          const newSinceLastChange = data.since_last_change + elapsed;

          await setStorage({
            since_last_change: newSinceLastChange,
            last_update_timestamp: now
          });
        }
      } catch (error) {
        logError("Error updating time", error);
      }
    }, TIME_UPDATE_INTERVAL_MS);
  }

  startLastInteractionUpdateTimer(): void {
    if (this.lastInteractionUpdateTimer) {
      clearInterval(this.lastInteractionUpdateTimer);
    }

    this.lastInteractionUpdateTimer = setInterval(async () => {
      try {
        const data = await getStorage(
          "last_interaction",
          "last_interaction_timestamp"
        );

        if (data.last_interaction !== undefined && data.last_interaction_timestamp) {
          const now = Date.now();
          const elapsed = Math.floor((now - data.last_interaction_timestamp) / 1000);
          const newLastInteraction = data.last_interaction + elapsed;

          await setStorage({
            last_interaction: newLastInteraction,
            last_interaction_timestamp: now
          });
        }
      } catch (error) {
        logError("Error updating last interaction time", error);
      }
    }, INTERACTION_UPDATE_INTERVAL_MS);
  }

  cleanup(): void {
    if (this.timeUpdateTimer) {
      clearInterval(this.timeUpdateTimer);
      this.timeUpdateTimer = null;
    }
    if (this.lastInteractionUpdateTimer) {
      clearInterval(this.lastInteractionUpdateTimer);
      this.lastInteractionUpdateTimer = null;
    }
  }
}

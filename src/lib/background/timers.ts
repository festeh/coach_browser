import { logError } from "./constants";
import { getStorage, setStorage } from "../storage";

const TIME_UPDATE_ALARM = "time-update";

const TIME_UPDATE_PERIOD_MIN = 0.5;

export class TimerManager {
  start(): void {
    browser.alarms.create(TIME_UPDATE_ALARM, { periodInMinutes: TIME_UPDATE_PERIOD_MIN });
  }

  registerHandlers(): void {
    browser.alarms.onAlarm.addListener(async (alarm) => {
      if (alarm.name === TIME_UPDATE_ALARM) {
        await this.tickTimeUpdate();
      }
    });
  }

  private async tickTimeUpdate(): Promise<void> {
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
  }
}

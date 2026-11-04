/** After a touch, a toast stays at least this long, so it doesn't vanish under the finger. */
const MIN_REMAINING_AFTER_RESUME = 1000;

/** A pausable `setTimeout`: a toast stops counting down while it is touched. */
export const createTimer = () => {
  let handle: ReturnType<typeof setTimeout> | undefined;
  let callback: (() => void) | undefined;
  let remaining = 0;
  let startedAt = 0;
  let paused = false;

  const clear = () => {
    if (handle !== undefined) {
      clearTimeout(handle);
      handle = undefined;
    }
  };

  return {
    /** Starts (or restarts) the countdown. Returns a function that cancels it. */
    start(ms: number, onDone: () => void) {
      clear();
      callback = onDone;
      remaining = ms;
      paused = false;
      startedAt = Date.now();
      handle = setTimeout(onDone, ms);
      return () => {
        clear();
        callback = undefined;
      };
    },
    pause() {
      if (callback === undefined || paused) {
        return;
      }
      paused = true;
      clear();
      remaining -= Date.now() - startedAt;
    },
    resume() {
      if (callback === undefined || !paused) {
        return;
      }
      paused = false;
      startedAt = Date.now();
      remaining = Math.max(remaining, MIN_REMAINING_AFTER_RESUME);
      handle = setTimeout(callback, remaining);
    },
  };
};

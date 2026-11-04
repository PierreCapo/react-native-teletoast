import { describe, expect, mock, test } from "bun:test";
import { createToastStore } from "../src/store";
import { createTimer } from "../src/timer";

const visible = (store: ReturnType<typeof createToastStore>) =>
  store.getSnapshot().toasts.filter((toast) => !toast.dismissed);

const host = (name: string, top = 0) => ({
  name,
  insets: { top, right: 0, bottom: 0, left: 0 },
  size: { width: 390, height: 844 },
});

describe("toasts", () => {
  test("add returns a generated id, or the one given", () => {
    const store = createToastStore();
    const generated = store.add("a");
    const given = store.add("b", { id: "saved" });

    expect(typeof generated).toBe("string");
    expect(given).toBe("saved");
    expect(visible(store).map((toast) => toast.id)).toEqual([generated, "saved"]);
  });

  test("reusing a visible id updates the toast in place", () => {
    const store = createToastStore();
    store.add("loading", { id: "upload", duration: Infinity });
    store.add("done", { id: "upload", duration: 2000 });

    const [toast] = visible(store);
    expect(visible(store)).toHaveLength(1);
    expect(toast?.content).toBe("done");
    expect(toast?.version).toBe(1);
    expect(toast?.options.duration).toBe(2000);
  });

  test("reusing the id of a leaving toast starts a new one", () => {
    const store = createToastStore();
    store.add("first", { id: "x" });
    const leavingKey = store.getSnapshot().toasts[0]?.key;
    store.dismiss("x");
    store.add("second", { id: "x" });

    const toasts = store.getSnapshot().toasts;
    expect(toasts).toHaveLength(2);
    expect(toasts[1]?.key).not.toBe(leavingKey);
    expect(toasts[1]?.dismissed).toBe(false);
  });

  test("dismiss keeps the toast for its exit, remove drops it", () => {
    const store = createToastStore();
    store.add("a", { id: "a" });
    store.dismiss("a");

    const [toast] = store.getSnapshot().toasts;
    expect(toast?.dismissed).toBe(true);

    store.remove(toast!.key);
    expect(store.getSnapshot().toasts).toHaveLength(0);
  });

  test("dismiss without an id dismisses everything", () => {
    const store = createToastStore();
    store.add("a");
    store.add("b");
    store.dismiss();

    expect(visible(store)).toHaveLength(0);
  });

  test("onDismiss and onAutoClose follow the reason, once", () => {
    const store = createToastStore();
    const onDismiss = mock();
    const onAutoClose = mock();
    store.add("a", { id: "a", onDismiss, onAutoClose });
    const key = store.getSnapshot().toasts[0]!.key;

    store.dismissByKey(key, "auto");
    store.dismissByKey(key, "auto");
    store.dismiss("a");

    expect(onAutoClose).toHaveBeenCalledTimes(1);
    expect(onAutoClose).toHaveBeenCalledWith("a");
    expect(onDismiss).not.toHaveBeenCalled();
  });

  test("subscribers hear every change, and only changes", () => {
    const store = createToastStore();
    const listener = mock();
    const unsubscribe = store.subscribe(listener);

    store.add("a", { id: "a" });
    store.dismiss("missing");
    store.dismiss("a");
    unsubscribe();
    store.add("b");

    expect(listener).toHaveBeenCalledTimes(2);
  });
});

describe("hosts", () => {
  test("the latest host wins and a resize keeps its rank", () => {
    const store = createToastStore();
    store.upsertHost(host("sheet"));
    store.upsertHost(host("overlay"));
    store.upsertHost(host("sheet", 20));

    expect(store.getSnapshot().hosts.map(({ name }) => name)).toEqual([
      "sheet",
      "overlay",
    ]);
    expect(store.getSnapshot().hosts[0]?.insets.top).toBe(20);
  });

  test("an unchanged host does not notify", () => {
    const store = createToastStore();
    store.upsertHost(host("sheet"));
    const listener = mock();
    store.subscribe(listener);
    store.upsertHost(host("sheet"));

    expect(listener).not.toHaveBeenCalled();
  });

  test("unregistering falls back to the previous host", () => {
    const store = createToastStore();
    store.upsertHost(host("sheet"));
    store.upsertHost(host("overlay"));
    store.unregisterHost("overlay");

    expect(store.getSnapshot().hosts.map(({ name }) => name)).toEqual(["sheet"]);
  });
});

describe("timer", () => {
  test("fires after its duration", async () => {
    const timer = createTimer();
    const done = mock();
    timer.start(20, done);
    await Bun.sleep(40);

    expect(done).toHaveBeenCalledTimes(1);
  });

  test("a paused timer does not fire, and resumes with at least a second", async () => {
    const timer = createTimer();
    const done = mock();
    timer.start(20, done);
    timer.pause();
    await Bun.sleep(40);
    expect(done).not.toHaveBeenCalled();

    timer.resume();
    await Bun.sleep(200);
    expect(done).not.toHaveBeenCalled();
  });

  test("cancelling stops it for good", async () => {
    const timer = createTimer();
    const done = mock();
    const cancel = timer.start(20, done);
    cancel();
    timer.resume();
    await Bun.sleep(40);

    expect(done).not.toHaveBeenCalled();
  });
});

import type { ToastContent, ToastId, ToastOptions } from "./types";

export type Insets = { top: number; right: number; bottom: number; left: number };
export type Size = { width: number; height: number };

export type ToastRecord = {
  /** Unique per toast instance, even when a public id is reused. */
  key: number;
  id: ToastId;
  content: ToastContent;
  options: ToastOptions;
  /** Bumped by every in-place update, so the toast restarts its timer. */
  version: number;
  /** A dismissed toast stays in the list while it plays its exit. */
  dismissed: boolean;
};

export type HostRecord = {
  name: string;
  insets: Insets;
  size: Size;
};

export type ToastState = {
  /** Oldest first. */
  toasts: readonly ToastRecord[];
  /** Mounted `<ToastHost />`s, most recent last: the last one wins. */
  hosts: readonly HostRecord[];
};

export type DismissReason = "manual" | "auto";

const isSameHost = (a: HostRecord, b: HostRecord) =>
  a.insets.top === b.insets.top &&
  a.insets.right === b.insets.right &&
  a.insets.bottom === b.insets.bottom &&
  a.insets.left === b.insets.left &&
  a.size.width === b.size.width &&
  a.size.height === b.size.height;

export const createToastStore = () => {
  let state: ToastState = { toasts: [], hosts: [] };
  let counter = 0;
  const listeners = new Set<() => void>();

  const setState = (next: ToastState) => {
    state = next;
    listeners.forEach((listener) => listener());
  };

  const dismissWhere = (
    match: (toast: ToastRecord) => boolean,
    reason: DismissReason,
  ) => {
    const targets = state.toasts.filter(
      (toast) => !toast.dismissed && match(toast),
    );
    if (targets.length === 0) {
      return;
    }
    setState({
      ...state,
      toasts: state.toasts.map((toast) =>
        targets.includes(toast) ? { ...toast, dismissed: true } : toast,
      ),
    });
    // After the state change: a callback that shows a new toast sees a list
    // where this one is already gone.
    for (const toast of targets) {
      const callback =
        reason === "auto" ? toast.options.onAutoClose : toast.options.onDismiss;
      callback?.(toast.id);
    }
  };

  return {
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },

    getSnapshot: () => state,

    add(content: ToastContent, options: ToastOptions = {}): ToastId {
      counter += 1;
      const id = options.id ?? `teletoast-${counter}`;
      const current = state.toasts.find(
        (toast) => toast.id === id && !toast.dismissed,
      );

      if (current) {
        setState({
          ...state,
          toasts: state.toasts.map((toast) =>
            toast === current
              ? {
                  ...toast,
                  content,
                  options: { ...toast.options, ...options },
                  version: toast.version + 1,
                }
              : toast,
          ),
        });
        return id;
      }

      setState({
        ...state,
        toasts: [
          ...state.toasts,
          { key: counter, id, content, options, version: 0, dismissed: false },
        ],
      });
      return id;
    },

    /** Dismisses one toast by id, or every toast without an id. */
    dismiss(id?: ToastId) {
      dismissWhere((toast) => id === undefined || toast.id === id, "manual");
    },

    dismissByKey(key: number, reason: DismissReason = "manual") {
      dismissWhere((toast) => toast.key === key, reason);
    },

    /** Drops a toast from the list once its exit has played. */
    remove(key: number) {
      if (!state.toasts.some((toast) => toast.key === key)) {
        return;
      }
      setState({
        ...state,
        toasts: state.toasts.filter((toast) => toast.key !== key),
      });
    },

    /**
     * Adds a host on top of the stack, or updates it in place: a host that
     * resizes keeps its rank.
     */
    upsertHost(host: HostRecord) {
      const current = state.hosts.find(({ name }) => name === host.name);
      if (current === undefined) {
        setState({ ...state, hosts: [...state.hosts, host] });
        return;
      }
      if (isSameHost(current, host)) {
        return;
      }
      setState({
        ...state,
        hosts: state.hosts.map((existing) =>
          existing === current ? host : existing,
        ),
      });
    },

    unregisterHost(name: string) {
      if (!state.hosts.some((host) => host.name === name)) {
        return;
      }
      setState({
        ...state,
        hosts: state.hosts.filter((host) => host.name !== name),
      });
    },
  };
};

export type ToastStore = ReturnType<typeof createToastStore>;

/** The app-wide store behind `toast()` and `<Toaster />`. */
export const store = createToastStore();

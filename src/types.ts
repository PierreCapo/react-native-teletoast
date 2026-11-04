import type { ReactNode } from "react";

export type ToastId = string | number;

export type ToastRenderProps = {
  /** The toast's id, as returned by `toast()`. */
  id: ToastId;
  /** Dismisses this toast, with its exit animation. */
  dismiss: () => void;
};

/**
 * What a toast renders. Teletoast ships no visuals: you pass your own element,
 * or a function that receives `{ id, dismiss }` so a close button or an action
 * can dismiss its own toast.
 */
export type ToastContent =
  | ReactNode
  | ((props: ToastRenderProps) => ReactNode);

export type ToastOptions = {
  /**
   * Reusing the id of a visible toast updates it in place and restarts its
   * timer, instead of stacking a second one.
   */
  id?: ToastId;
  /** Milliseconds on screen. `Infinity` keeps it until dismissed. */
  duration?: number;
  /** Allows swiping this toast away. Defaults to `true`. */
  dismissible?: boolean;
  /** Called when the toast is dismissed by a swipe or by `toast.dismiss()`. */
  onDismiss?: (id: ToastId) => void;
  /** Called when the toast's timer runs out. */
  onAutoClose?: (id: ToastId) => void;
};

export type ToastPosition = "top-center" | "bottom-center";

export type ToasterProps = {
  /** Defaults to `"top-center"`. */
  position?: ToastPosition;
  /** Default duration of every toast, in milliseconds. Defaults to `4000`. */
  duration?: number;
  /**
   * How many toasts can be on screen at once. A new toast past this count
   * dismisses the oldest one. Defaults to `3`.
   */
  visibleToasts?: number;
  /** Space between two stacked toasts. Defaults to `14`. */
  gap?: number;
  /**
   * Distance from the safe area edge (at least 8 points from the screen edge
   * when there is no safe area). Defaults to `8`.
   */
  offset?: number;
  /** Lets toasts be swiped toward the screen edge. Defaults to `true`. */
  swipeToDismiss?: boolean;
  /**
   * The `PortalHost` the toasts are teleported to when no `<ToastHost />` is
   * mounted. Defaults to `"root"`, the host `PortalProvider` renders on top of
   * your app.
   */
  hostName?: string;
};

import { store } from "./store";
import type { ToastContent, ToastId, ToastOptions } from "./types";

const show = (content: ToastContent, options?: ToastOptions): ToastId =>
  store.add(content, options);

/**
 * Shows a toast and returns its id.
 *
 * @example
 * toast(<MyToast title="Saved" />);
 * toast(({ dismiss }) => <MyToast title="Saved" onClose={dismiss} />, {
 *   duration: 6000,
 * });
 */
export const toast = Object.assign(show, {
  /** Same as `toast()`, named like sonner's `toast.custom()`. */
  custom: show,
  /** Dismisses one toast by id, or every toast when called without an id. */
  dismiss: (id?: ToastId) => store.dismiss(id),
});

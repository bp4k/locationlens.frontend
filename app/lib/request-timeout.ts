export const REQUEST_TIMEOUT_MS = 10_000;

/** Bound the entire operation, including response-body reads. SDK promises may
 * ignore cancellation, so race the deadline as well as aborting network I/O. */
export async function withRequestTimeout<T>(
  operation: (signal: AbortSignal) => Promise<T>,
  timeoutError: Error,
  callerSignal?: AbortSignal | null,
): Promise<T> {
  if (callerSignal?.aborted) throw callerSignal.reason;
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  let cancel: (() => void) | undefined;
  const deadline = new Promise<never>((_, reject) => {
    cancel = () => {
      reject(callerSignal?.reason);
      controller.abort(callerSignal?.reason);
    };
    callerSignal?.addEventListener("abort", cancel, { once: true });
    timer = setTimeout(() => {
      reject(timeoutError);
      controller.abort(timeoutError);
    }, REQUEST_TIMEOUT_MS);
  });
  try {
    return await Promise.race([operation(controller.signal), deadline]);
  } finally {
    clearTimeout(timer);
    if (cancel) callerSignal?.removeEventListener("abort", cancel);
  }
}

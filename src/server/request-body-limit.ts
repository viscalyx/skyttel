import type { Context, MiddlewareHandler } from 'hono';

/** Bound actual body bytes, including requests with a declared Content-Length.
 * Register authorization before this middleware for protected large bodies. */
export function requestBodyLimit({
  maxSize,
  onError = (context) => context.text('Payload Too Large', 413),
}: {
  maxSize: number;
  onError?: (context: Context) => Response;
}): MiddlewareHandler {
  return async (context, next) => {
    const request = context.req.raw;
    if (!request.body) return next();
    const declared = request.headers.get('content-length');
    if (declared && /^\d+$/.test(declared) && Number(declared) > maxSize) return onError(context);
    const reader = request.body.getReader();
    const chunks: Uint8Array[] = [];
    let size = 0;
    try {
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        size += value.byteLength;
        if (size > maxSize) {
          // A source's cancellation hook must not delay the rejection.
          void reader.cancel().catch(() => {});
          return onError(context);
        }
        chunks.push(value);
      }
    } finally {
      reader.releaseLock();
    }
    context.req.raw = new Request(request, {
      body: new ReadableStream<Uint8Array>({
        start(controller) {
          for (const chunk of chunks) controller.enqueue(chunk);
          controller.close();
        },
      }),
      duplex: 'half',
    } as RequestInit);
    await next();
  };
}

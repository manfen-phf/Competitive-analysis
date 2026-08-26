export const FIXED_WORKER_ORIGIN = "https://gx-food-delivery-competition.136010028.workers.dev";

function isBodylessMethod(method: string) {
  return method === "GET" || method === "HEAD";
}

export function createFixedOriginRequest(request: Request, upstreamOrigin?: string): Request {
  if (upstreamOrigin !== FIXED_WORKER_ORIGIN) {
    throw new Error("Pages upstream is not configured for this workspace");
  }

  const source = new URL(request.url);
  const target = new URL(`${source.pathname}${source.search}`, FIXED_WORKER_ORIGIN);
  const headers = new Headers(request.headers);
  headers.delete("host");

  const init: RequestInit & { duplex?: "half" } = {
    method: request.method,
    headers,
    redirect: "manual",
  };

  if (!isBodylessMethod(request.method)) {
    init.body = request.body;
    // Node's standards implementation requires this for a streaming request body.
    init.duplex = "half";
  }

  return new Request(target, init);
}

export async function proxyToFixedOrigin(
  request: Request,
  upstreamOrigin: string | undefined,
  fetcher: typeof fetch = fetch,
): Promise<Response> {
  return fetcher(createFixedOriginRequest(request, upstreamOrigin));
}

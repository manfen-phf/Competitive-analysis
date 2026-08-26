import { proxyToFixedOrigin } from "../../src/lib/pages-proxy";

interface PagesEnvironment {
  UPSTREAM_ORIGIN?: string;
}

interface PagesRequestContext {
  request: Request;
  env: PagesEnvironment;
}

export function onRequest({ request, env }: PagesRequestContext): Promise<Response> {
  return proxyToFixedOrigin(request, env.UPSTREAM_ORIGIN, fetch);
}

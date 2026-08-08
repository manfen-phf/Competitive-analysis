import { NextResponse } from "next/server";

/**
 * P0-0 deliberately keeps pre-V1 APIs from serving legacy database, storage,
 * or AI paths. Each route is reintroduced only in its acceptance stage.
 */
export function p0Unavailable(stage: string) {
  return NextResponse.json(
    {
      error: `This endpoint is unavailable until ${stage} is implemented and accepted.`,
      stage,
    },
    { status: 503 },
  );
}

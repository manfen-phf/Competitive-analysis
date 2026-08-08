import { p0Unavailable } from "@/lib/p0-gate";

export async function POST() {
  return p0Unavailable("P0-1");
}

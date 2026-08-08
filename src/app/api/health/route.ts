import { p0Unavailable } from "@/lib/p0-gate";

export async function GET() {
  return p0Unavailable("P0-0 remote verification");
}

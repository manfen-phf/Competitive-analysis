import { NextResponse } from "next/server";

// The legacy one-image endpoint cannot create a complete, authorized paired collection.
// Keep its route explicit so direct callers cannot bypass the Task 5 collection flow.
export async function POST() {
  return NextResponse.json({ error: "请通过双平台采集任务上传截图" }, { status: 410 });
}

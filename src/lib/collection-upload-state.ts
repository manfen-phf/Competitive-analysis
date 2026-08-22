type CollectionTaskWriter = {
  updateMany: (input: { where: { id: string; status: { in?: string[]; not?: string } }; data: { status: string } }) => Promise<{ count: number }>;
};

export async function updateCollectionUploadTaskStatus(task: CollectionTaskWriter, id: string, status: string) {
  const where = status === "DRAFT"
    ? { id, status: { in: ["DRAFT", "UPLOADING", "RECOGNIZING"] } }
    : { id, status: { not: "CONFIRMED" } };
  const updated = await task.updateMany({ where, data: { status } });
  if (status === "DRAFT" && updated.count === 0) return;
  if (updated.count === 0) throw new Error("该采集任务已确认");
}

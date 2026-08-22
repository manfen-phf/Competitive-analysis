"use client";

import type { ChangeEvent } from "react";

import type { UploadPlatform } from "@/lib/collections";

export type UploadCardStatus = "EMPTY" | "UPLOADING" | "RECOGNIZING" | "SUCCEEDED" | "FAILED" | "DUPLICATE";

type PlatformUploadCardProps = {
  platform: UploadPlatform;
  status: UploadCardStatus;
  message?: string;
  disabled?: boolean;
  onFileChange: (file: File) => void;
};

const platformCopy: Record<UploadPlatform, { label: string; helper: string }> = {
  MEITUAN: { label: "美团订单截图", helper: "上传一张完整的美团订单详情截图" },
  B_JIA: { label: "B家订单截图", helper: "上传一张完整的 B 家订单详情截图" },
};

const statusCopy: Record<UploadCardStatus, string> = {
  EMPTY: "待上传", UPLOADING: "上传中", RECOGNIZING: "AI 识别中", SUCCEEDED: "识别成功", FAILED: "识别失败", DUPLICATE: "重复上传",
};

export function PlatformUploadCard({ platform, status, message, disabled, onFileChange }: PlatformUploadCardProps) {
  const copy = platformCopy[platform];
  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.currentTarget.files?.[0];
    if (file) onFileChange(file);
    event.currentTarget.value = "";
  };

  return <section className={`collection-upload-card platform-${platform === "MEITUAN" ? "meituan" : "bjia"}`} data-status={status}>
    <div className="collection-upload-card-heading"><h2>{copy.label}</h2><span>{statusCopy[status]}</span></div>
    <p>{copy.helper}</p>
    <label className="collection-upload-picker">
      <input type="file" accept="image/png,image/jpeg,image/webp" disabled={disabled || status === "UPLOADING" || status === "RECOGNIZING"} onChange={handleChange} />
      <span>{status === "EMPTY" || status === "FAILED" || status === "DUPLICATE" ? "选择截图" : "重新上传"}</span>
    </label>
    {message ? <p className="collection-upload-message" role="status">{message}</p> : null}
  </section>;
}

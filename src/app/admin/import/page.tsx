"use client";

import Link from "next/link";
import { useState } from "react";

export default function ImportPage() {
  const [passcode, setPasscode] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [effectiveFrom, setEffectiveFrom] = useState("");
  const [status, setStatus] = useState("");
  const [verified, setVerified] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function post(form: FormData) {
    const response = await fetch("/api/admin/master-data", { method: "POST", body: form });
    const body = await response.json().catch(() => ({ error: `服务请求失败（${response.status}）` }));
    return { response, body };
  }

  async function verify() {
    setSubmitting(true);
    try {
      const form = new FormData();
      form.set("passcode", passcode);
      form.set("verifyOnly", "true");
      const { body } = await post(form);
      setVerified(Boolean(body.valid));
      setStatus(body.valid ? "管理员口令正确，可以导入或下载数据。" : body.error ?? "口令校验失败");
    } catch {
      setVerified(false);
      setStatus("口令校验请求失败，请刷新页面后重试。");
    } finally {
      setSubmitting(false);
    }
  }

  async function submit() {
    if (!file || !verified) return;
    setSubmitting(true);
    setStatus("正在校验并导入，请稍候…");
    try {
      const form = new FormData();
      form.set("passcode", passcode);
      form.set("file", file);
      if (effectiveFrom) form.set("effectiveFrom", effectiveFrom);
      const { body } = await post(form);
      setStatus(body.error || body.errors?.join("；") || `导入成功：${body.imported} 条商家归属记录。`);
    } catch {
      setStatus("导入请求失败，请稍后重试。");
    } finally {
      setSubmitting(false);
    }
  }

  async function download() {
    if (!verified) return;
    setSubmitting(true);
    try {
      const response = await fetch("/api/admin/records-export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ passcode }),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        setStatus(body.error ?? "下载失败，请稍后重试。");
        return;
      }
      const url = URL.createObjectURL(await response.blob());
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = "识别订单数据.xlsx";
      anchor.click();
      URL.revokeObjectURL(url);
      setStatus("识别结果表格已开始下载。");
    } finally {
      setSubmitting(false);
    }
  }

  return <main><Link href="/">← 首页</Link><h1>主数据导入</h1><p className="muted">截图仅用于即时识别，不会保存。系统仅保留识别 JSON 与结构化订单数据。</p><div className="filters"><label>管理员口令<input type="password" autoComplete="new-password" value={passcode} onChange={(event) => { setPasscode(event.target.value); setVerified(false); }} /></label><button className="secondary" onClick={verify} disabled={!passcode || submitting}>验证口令</button><label>生效开始日（留空即按导入当天）<input type="date" value={effectiveFrom} onChange={(event) => setEffectiveFrom(event.target.value)} /></label><label>Excel 数据源<input type="file" accept=".xlsx,.xls" onChange={(event) => setFile(event.target.files?.[0] || null)} /></label><button className="primary" onClick={submit} disabled={!file || !verified || submitting}>{submitting ? "处理中…" : "校验并导入"}</button><button className="secondary" onClick={download} disabled={!verified || submitting}>下载识别数据 Excel</button></div>{status && <p className="status">{status}</p>}</main>;
}
"use client";
import Link from "next/link";
import { useState } from "react";
export default function ImportPage() {
  const [passcode, setPasscode] = useState(""); const [file, setFile] = useState<File | null>(null); const [status, setStatus] = useState(""); const [verified, setVerified] = useState(false);
  async function verify() { const form = new FormData(); form.set("passcode", passcode); form.set("verifyOnly", "true"); const body = await (await fetch("/api/admin/master-data", { method: "POST", body: form })).json(); setVerified(Boolean(body.valid)); setStatus(body.valid ? "管理员口令正确，请选择 Excel 文件后导入。" : body.error ?? "口令校验失败"); }
  async function submit() { if (!file || !verified) return; const form = new FormData(); form.set("passcode", passcode); form.set("file", file); const body = await (await fetch("/api/admin/master-data", { method: "POST", body: form })).json(); setStatus(body.error || body.errors?.join("；") || `导入成功：${body.imported} 条商家归属记录`); }
  return <main><Link href="/">← 首页</Link><h1>主数据导入</h1><p className="muted">先验证管理员口令，再选择 Excel 数据源导入。</p><div className="filters"><label>管理员口令<input type="password" autoComplete="new-password" value={passcode} onChange={(event) => { setPasscode(event.target.value); setVerified(false); }} /></label><button className="secondary" onClick={verify} disabled={!passcode}>验证口令</button><label>Excel 数据源<input type="file" accept=".xlsx,.xls" onChange={(event) => setFile(event.target.files?.[0] || null)} /></label><button className="primary" onClick={submit} disabled={!file || !verified}>校验并导入</button></div>{status && <p className="status">{status}</p>}</main>;
}

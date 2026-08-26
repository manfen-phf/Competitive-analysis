"use client";

import { useCallback, useEffect, useState } from "react";

import { PageHeader } from "@/components/workspace/page-header";

type Role = "SUPER_ADMIN" | "CITY_ADMIN" | "BD";
type Account = { id: string; username: string; role: Role; city: string | null; bdName: string | null; isActive: boolean };

const ROLE_LABEL: Record<Role, string> = { SUPER_ADMIN: "超级管理员", CITY_ADMIN: "城市管理员", BD: "BD" };

export default function AccountManagementPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [status, setStatus] = useState("正在加载账号…");
  const [pending, setPending] = useState(false);
  const [form, setForm] = useState({ username: "", password: "", role: "BD" as Role, city: "", bdName: "" });

  const load = useCallback(async () => {
    const response = await fetch("/api/admin/users");
    const body = await response.json();
    if (!response.ok) throw new Error(body.error || "账号加载失败");
    setAccounts(body.users);
    setStatus("");
  }, []);

  useEffect(() => { load().catch((error: Error) => setStatus(error.message)); }, [load]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setPending(true); setStatus("");
    const payload = { ...form, username: form.role === "BD" ? form.bdName.trim() : form.username.trim(), city: form.role === "SUPER_ADMIN" ? undefined : form.city.trim() || undefined, bdName: form.role === "BD" ? form.bdName.trim() : undefined };
    try {
      const response = await fetch("/api/admin/users", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "账号创建失败");
      setForm({ username: "", password: "", role: "BD", city: "", bdName: "" });
      await load(); setStatus("账号已创建。请将初始口令单独告知对应人员。");
    } catch (error) { setStatus(error instanceof Error ? error.message : "账号创建失败"); } finally { setPending(false); }
  }

  async function updateAccount(account: Account) {
    const password = window.prompt(`为“${account.username}”设置新初始口令（至少 8 位）；取消则不修改。`);
    if (password === null) return;
    setPending(true); setStatus("");
    try {
      const response = await fetch("/api/admin/users", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ id: account.id, password }) });
      const body = await response.json(); if (!response.ok) throw new Error(body.error || "口令重置失败");
      setStatus(`“${account.username}”的口令已重置。`);
    } catch (error) { setStatus(error instanceof Error ? error.message : "口令重置失败"); } finally { setPending(false); }
  }

  async function toggleAccount(account: Account) {
    setPending(true); setStatus("");
    try {
      const response = await fetch("/api/admin/users", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ id: account.id, isActive: !account.isActive }) });
      const body = await response.json(); if (!response.ok) throw new Error(body.error || "账号状态更新失败");
      await load(); setStatus(`“${account.username}”已${account.isActive ? "停用" : "启用"}。`);
    } catch (error) { setStatus(error instanceof Error ? error.message : "账号状态更新失败"); } finally { setPending(false); }
  }

  const needsCity = form.role !== "SUPER_ADMIN";
  return <main className="account-management">
    <PageHeader eyebrow="Administration" title="账号管理" description="仅超级管理员可创建账号、设置初始口令与停启用权限。" backHref="/" />
    <section className="account-create-card"><h2>创建账号</h2><form onSubmit={submit} className="account-form">
      <label>角色<select value={form.role} onChange={(event) => setForm({ ...form, role: event.target.value as Role })}><option value="SUPER_ADMIN">超级管理员</option><option value="CITY_ADMIN">城市管理员</option><option value="BD">BD</option></select></label>
      {form.role !== "BD" ? <label>用户名<input value={form.username} onChange={(event) => setForm({ ...form, username: event.target.value })} required /></label> : null}
      {needsCity ? <label>所属城市<input value={form.city} onChange={(event) => setForm({ ...form, city: event.target.value })} required /></label> : null}
      {form.role === "BD" ? <label>BD 姓名（同时作为用户名）<input value={form.bdName} onChange={(event) => setForm({ ...form, bdName: event.target.value })} required /></label> : null}
      <label>初始口令<input type="password" minLength={8} value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} required /></label>
      <button className="primary" type="submit" disabled={pending}>创建账号</button>
    </form></section>
    <section className="account-list-card"><div><h2>现有账号</h2><p>停用后不能登录；不能停用当前登录的超级管理员。</p></div>{status ? <p className="status" role="status">{status}</p> : null}
      <div className="account-list">{accounts.map((account) => <article key={account.id} className="account-row"><div><strong>{account.username}</strong><span>{ROLE_LABEL[account.role]}{account.city ? ` · ${account.city}` : ""}</span></div><span className={account.isActive ? "account-state active" : "account-state"}>{account.isActive ? "启用" : "停用"}</span><div className="account-actions"><button type="button" onClick={() => updateAccount(account)} disabled={pending}>重置口令</button><button type="button" onClick={() => toggleAccount(account)} disabled={pending}>{account.isActive ? "停用" : "启用"}</button></div></article>)}</div>
    </section>
  </main>;
}

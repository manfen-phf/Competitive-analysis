"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type LoginFormProps = { nextPath: string };

export function LoginForm({ nextPath }: LoginFormProps) {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    setPending(true);
    setError("");
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => null);
        setError(body?.error || "登录失败，请稍后重试");
        return;
      }
      router.replace(nextPath);
      router.refresh();
    } catch {
      setError("网络异常，请稍后重试");
    } finally {
      setPending(false);
    }
  }

  return <main className="login-page"><section className="login-card"><p className="eyebrow">OPERATIONS WORKSPACE</p><h1>登录工作区</h1><p className="muted">使用管理员为你创建的账号登录。</p><form onSubmit={submit}><label>用户名<input autoComplete="username" value={username} onChange={(event) => setUsername(event.target.value)} required /></label><label>密码<input type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} required /></label>{error ? <p className="status" role="alert">{error}</p> : null}<button className="primary" type="submit" disabled={pending}>{pending ? "登录中…" : "登录"}</button></form></section></main>;
}

import { redirect } from "next/navigation";

import { getSession } from "@/lib/auth";
import { LoginForm } from "./login-form";

export function safeNextPath(value: string | undefined) {
  if (!value) return "/";

  let decoded = value;
  try {
    for (let index = 0; index < 3; index += 1) {
      const next = decodeURIComponent(decoded);
      if (next === decoded) break;
      decoded = next;
    }
  } catch {
    return "/";
  }

  if (!decoded.startsWith("/") || decoded.startsWith("//") || decoded.includes("\\")) return "/";
  const candidate = new URL(decoded, "https://workspace.invalid");
  if (candidate.origin !== "https://workspace.invalid" || candidate.pathname.startsWith("//") || candidate.pathname.includes("\\")) return "/";
  return `${candidate.pathname}${candidate.search}${candidate.hash}`;
}

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  if (await getSession()) redirect("/");
  const { next } = await searchParams;
  return <LoginForm nextPath={safeNextPath(next)} />;
}

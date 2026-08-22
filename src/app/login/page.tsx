import { redirect } from "next/navigation";

import { getSession } from "@/lib/auth";
import { LoginForm } from "./login-form";

function safeNextPath(value: string | undefined) {
  return value && value.startsWith("/") && !value.startsWith("//") ? value : "/";
}

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  if (await getSession()) redirect("/");
  const { next } = await searchParams;
  return <LoginForm nextPath={safeNextPath(next)} />;
}

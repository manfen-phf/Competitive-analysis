import { redirect } from "next/navigation";

import { getSession } from "@/lib/auth";
import { safeNextPath } from "@/lib/auth-navigation";
import { LoginForm } from "./login-form";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  if (await getSession()) redirect("/");
  const { next } = await searchParams;
  return <LoginForm nextPath={safeNextPath(next)} />;
}

import "./globals.css";
import type { Metadata, Viewport } from "next";
import { WorkspaceShell } from "@/components/workspace/workspace-shell";
import { getSession, initializeAuthentication } from "@/lib/auth";

export const metadata: Metadata = {
  title: "玉林商数据汇总",
  description: "外卖竞争态势运营工作区",
};

export const viewport: Viewport = {
  colorScheme: "dark light",
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  await initializeAuthentication();
  const user = await getSession();

  return (
    <html lang="zh-CN">
      <body>
        <WorkspaceShell contextLabel="玉林 · 外卖竞争态势运营" user={user}>{children}</WorkspaceShell>
      </body>
    </html>
  );
}

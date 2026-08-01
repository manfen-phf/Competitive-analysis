import "./globals.css";
import type { Metadata, Viewport } from "next";
import { WorkspaceShell } from "@/components/workspace/workspace-shell";

export const metadata: Metadata = {
  title: "玉林商数据汇总",
  description: "外卖竞争态势运营工作区",
};

export const viewport: Viewport = {
  colorScheme: "dark light",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body>
        <WorkspaceShell contextLabel="玉林 · 外卖竞争态势运营">{children}</WorkspaceShell>
      </body>
    </html>
  );
}

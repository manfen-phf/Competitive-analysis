import { spawn } from "node:child_process";

function run(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: "inherit" });
    child.once("error", reject);
    child.once("exit", (code) => code === 0 ? resolve() : reject(new Error(`${command} ${args.join(" ")} exited with ${code}`)));
  });
}

try {
  await run("pnpm", ["prisma", "migrate", "deploy"]);
  await run("pnpm", ["start"]);
} catch (error) {
  console.error(error);
  process.exit(1);
}
export function chunkStatements<T>(statements: T[], size = 100): T[][] {
  if (!Number.isInteger(size) || size < 1) throw new Error("size must be a positive integer");
  const chunks: T[][] = [];
  for (let index = 0; index < statements.length; index += size) chunks.push(statements.slice(index, index + size));
  return chunks;
}

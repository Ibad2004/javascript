import { mkdir, writeFile, rename, rm } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import path from "node:path";

function toJsonText(data) {
  let text;
  try {
    text = JSON.stringify(data, null, 2);
  } catch (error) {
    throw new TypeError(`data cannot be turned into JSON: ${error.message}`, { cause: error });
  }
  if (text === undefined) {
    throw new TypeError(`data cannot be turned into JSON: got ${typeof data}`);
  }
  return `${text}\n`;
}

export async function saveJson(filePath, data) {
  if (typeof filePath !== "string" || filePath.trim() === "") {
    throw new TypeError("filePath must be a non-empty string");
  }
  const text = toJsonText(data);
  const folder = path.dirname(filePath);
  const tempFile = path.join(folder, `.${path.basename(filePath)}.${randomUUID()}.tmp`);

  await mkdir(folder, { recursive: true });
  try {
    await writeFile(tempFile, text, "utf8");
    await rename(tempFile, filePath);
  } catch (error) {
    await rm(tempFile, { force: true });
    throw error;
  }
  return filePath;
}

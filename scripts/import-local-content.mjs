import { cp, mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const localRoot = path.join(root, "local-content");
const storyRoot = path.join(localRoot, "story");
const audioRoot = path.join(localRoot, "audio");
const outputRoot = path.join(root, "content");
const audioOutputRoot = path.join(root, "assets", "audio");

async function main() {
  const albums = [];

  if (existsSync(storyRoot)) {
    const files = await readdir(storyRoot);
    for (const file of files.filter((name) => name.endsWith(".json")).sort()) {
      const raw = await readFile(path.join(storyRoot, file), "utf8");
      const album = JSON.parse(raw);
      if (!album.id) {
        throw new Error(`${file} is missing required album id`);
      }
      albums.push(album);
    }
  }

  if (existsSync(audioRoot)) {
    await cp(audioRoot, audioOutputRoot, {
      recursive: true,
      force: true,
      filter: (source) => !path.basename(source).startsWith("."),
    });
  }

  await mkdir(outputRoot, { recursive: true });
  await writeFile(
    path.join(outputRoot, "content.json"),
    `${JSON.stringify({ albums }, null, 2)}\n`,
    "utf8",
  );

  console.log(`Imported ${albums.length} album story override(s).`);
  console.log("Generated content/content.json.");
  console.log("Copied local-content/audio into assets/audio when present.");
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});

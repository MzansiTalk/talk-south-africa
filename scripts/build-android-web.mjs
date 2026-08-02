import { cp, mkdir, rm } from "node:fs/promises";

const target = new URL("../android-web/", import.meta.url);
const source = new URL("../mobile/", import.meta.url);

await rm(target, { recursive: true, force: true });
await mkdir(target, { recursive: true });
await cp(source, target, { recursive: true });
await cp(
  new URL("../src/assets/mzansitalk-logo.png", import.meta.url),
  new URL("./mzansitalk-logo.png", target),
);

console.log("Android offline assets prepared in android-web/");
// Self-check for lib/files.ts. Run: node lib/files.check.ts
import assert from "node:assert/strict";
import { sniff } from "./files.ts";

const bytes = (...v: number[]) => new Uint8Array(v);
assert.equal(sniff(new TextEncoder().encode("%PDF-1.7")), "application/pdf");
assert.equal(sniff(bytes(0xff, 0xd8, 0xff, 0xe0)), "image/jpeg");
assert.equal(sniff(bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a)), "image/png");
assert.equal(sniff(new TextEncoder().encode("<html><script>")), null); // an HTML page named id.png
assert.equal(sniff(new TextEncoder().encode("MZ")), null); // a program
assert.equal(sniff(bytes()), null);
console.log("ok");

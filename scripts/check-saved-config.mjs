import assert from "node:assert/strict";

const HEX = /^#[0-9a-fA-F]{6}$/;

function cleanHexMap(input) {
  const out = {};
  if (!input || typeof input !== "object") return out;
  for (const [key, value] of Object.entries(input)) {
    if (typeof value === "string" && HEX.test(value)) out[key] = value.toLowerCase();
  }
  return out;
}

function toBase64Url(text) {
  return Buffer.from(text, "utf8").toString("base64url");
}
function fromBase64Url(value) {
  return Buffer.from(value, "base64url").toString("utf8");
}

const payload = {
  v: 1,
  s: "bugatti-chiron",
  p: "obsidian",
  c: "original",
  r: "original",
  cam: "side",
  t: "studio",
  pc: { Body: "#1a1a1a", skip: "red" },
  op: { doorL: true },
};
const encoded = toBase64Url(JSON.stringify(payload));
const decoded = JSON.parse(fromBase64Url(encoded));
assert.equal(decoded.s, "bugatti-chiron");
assert.equal(decoded.p, "obsidian");
assert.deepEqual(cleanHexMap(decoded.pc), { Body: "#1a1a1a" });
assert.equal(cleanHexMap({ bad: "blue" }).bad, undefined);
console.log("saved-config checks passed");

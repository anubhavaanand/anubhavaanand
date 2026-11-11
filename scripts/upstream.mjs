#!/usr/bin/env node
// Renders assets/upstream.svg: the repos this profile contributed to, in pixel type.
import fs from "node:fs";

const LOGIN = "anubhavaanand";
const OUT = new URL("../assets/upstream.svg", import.meta.url);

const W = 846, H = 150;
const BG = "#0b1520", EDGE = "#2fd6c8", TITLE = "#ff9ecb",
      NAME = "#dff3f7", NUM = "#7fe3d8", RANK = "#ff7ab8", RULE = "#1d3648";

const FONT = {
  A: ["01110","10001","10001","11111","10001","10001","10001"],
  B: ["11110","10001","10001","11110","10001","10001","11110"],
  C: ["01110","10001","10000","10000","10000","10001","01110"],
  D: ["11110","10001","10001","10001","10001","10001","11110"],
  E: ["11111","10000","10000","11110","10000","10000","11111"],
  F: ["11111","10000","10000","11110","10000","10000","10000"],
  G: ["01110","10001","10000","10111","10001","10001","01111"],
  H: ["10001","10001","10001","11111","10001","10001","10001"],
  I: ["11111","00100","00100","00100","00100","00100","11111"],
  J: ["00111","00010","00010","00010","00010","10010","01100"],
  K: ["10001","10010","10100","11000","10100","10010","10001"],
  L: ["10000","10000","10000","10000","10000","10000","11111"],
  M: ["10001","11011","10101","10101","10001","10001","10001"],
  N: ["10001","11001","10101","10011","10001","10001","10001"],
  O: ["01110","10001","10001","10001","10001","10001","01110"],
  P: ["11110","10001","10001","11110","10000","10000","10000"],
  Q: ["01110","10001","10001","10001","10101","10010","01101"],
  R: ["11110","10001","10001","11110","10100","10010","10001"],
  S: ["01111","10000","10000","01110","00001","00001","11110"],
  T: ["11111","00100","00100","00100","00100","00100","00100"],
  U: ["10001","10001","10001","10001","10001","10001","01110"],
  V: ["10001","10001","10001","10001","10001","01010","00100"],
  W: ["10001","10001","10001","10101","10101","11011","10001"],
  X: ["10001","10001","01010","00100","01010","10001","10001"],
  Y: ["10001","10001","01010","00100","00100","00100","00100"],
  Z: ["11111","00001","00010","00100","01000","10000","11111"],
  0: ["01110","10001","10011","10101","11001","10001","01110"],
  1: ["00100","01100","00100","00100","00100","00100","01110"],
  2: ["01110","10001","00001","00010","00100","01000","11111"],
  3: ["11111","00010","00100","00010","00001","10001","01110"],
  4: ["00010","00110","01010","10010","11111","00010","00010"],
  5: ["11111","10000","11110","00001","00001","10001","01110"],
  6: ["00110","01000","10000","11110","10001","10001","01110"],
  7: ["11111","00001","00010","00100","01000","01000","01000"],
  8: ["01110","10001","10001","01110","10001","10001","01110"],
  9: ["01110","10001","10001","01111","00001","00010","01100"],
  " ": ["00000","00000","00000","00000","00000","00000","00000"],
  "-": ["00000","00000","00000","11111","00000","00000","00000"],
  ".": ["00000","00000","00000","00000","00000","01100","01100"],
  "/": ["00001","00010","00010","00100","01000","01000","10000"],
};

const glyph = (ch) => FONT[ch] ?? FONT["?"] ?? FONT[" "];

function textRuns(text, x, y, scale, color) {
  const out = [];
  let cx = x;
  for (const ch of text.toUpperCase()) {
    const g = glyph(ch);
    for (let r = 0; r < 7; r++) {
      let start = -1;
      for (let c = 0; c <= 5; c++) {
        const on = c < 5 && g[r][c] === "1";
        if (on && start < 0) start = c;
        if (!on && start >= 0) {
          out.push(`<rect x="${cx + start * scale}" y="${y + r * scale}" width="${(c - start) * scale}" height="${scale}" fill="${color}"/>`);
          start = -1;
        }
      }
    }
    cx += 6 * scale;
  }
  return { rects: out, width: cx - x };
}

function pixelBox(x, y, w, h, fill) {
  // rectangle with 3px cut corners, so it reads as a pixel frame
  const c = 3;
  return [
    `<rect x="${x + c}" y="${y}" width="${w - 2 * c}" height="${h}" fill="${fill}"/>`,
    `<rect x="${x}" y="${y + c}" width="${w}" height="${h - 2 * c}" fill="${fill}"/>`,
  ].join("");
}

async function contributions() {
  const token = process.env.GITHUB_TOKEN;
  const headers = { accept: "application/vnd.github+json", "user-agent": "profile-readme" };
  if (token) headers.authorization = `Bearer ${token}`;
  const q = encodeURIComponent(`author:${LOGIN} is:pr is:merged`);
  const res = await fetch(`https://api.github.com/search/issues?q=${q}&per_page=100`, { headers });
  if (!res.ok) throw new Error(`search ${res.status}`);
  const body = await res.json();
  const counts = new Map();
  for (const item of body.items) {
    const [, owner, name] = item.repository_url.match(/repos\/([^/]+)\/([^/]+)$/);
    if (owner.toLowerCase() === LOGIN.toLowerCase()) continue;
    const full = `${owner}/${name}`;
    counts.set(full, (counts.get(full) ?? 0) + 1);
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
}

const rows = await contributions();
const parts = [];
parts.push(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="Open source projects this profile has merged pull requests in">`);
parts.push(pixelBox(0, 0, W, H, BG));
parts.push(pixelBox(6, 6, W - 12, H - 12, EDGE));
parts.push(pixelBox(9, 9, W - 18, H - 18, BG));

const title = textRuns("CONTRIBUTED TO", 0, 22, 3, TITLE);
parts.push(textRuns("CONTRIBUTED TO", (W - title.width) / 2, 22, 3, TITLE).rects.join(""));

const top = 52, rowH = 22, left = 40, right = W - 40;
rows.slice(0, 5).forEach(([repo, n], i) => {
  const y = top + i * rowH;
  if (i > 0) parts.push(`<rect x="${left}" y="${y - 6}" width="${right - left}" height="1" fill="${RULE}"/>`);
  const rank = String(i + 1).padStart(2, "0");
  parts.push(textRuns(rank, left, y, 2, RANK).rects.join(""));
  parts.push(textRuns(repo, left + 46, y, 2, NAME).rects.join(""));
  const count = textRuns(`${n} MERGED`, 0, 0, 2, NUM);
  parts.push(textRuns(`${n} MERGED`, right - count.width, y, 2, NUM).rects.join(""));
});

parts.push("</svg>");
fs.writeFileSync(OUT, parts.join("\n"));
console.log(`wrote ${OUT.pathname} (${rows.length} repos)`);

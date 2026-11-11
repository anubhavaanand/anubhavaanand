#!/usr/bin/env node
// Rewrites the organizations block in README.md: organizations this profile
// has opened pull requests in, shown the way GitHub lists organizations.
import fs from "node:fs";

const LOGIN = "anubhavaanand";
const README = new URL("../README.md", import.meta.url);
const START = "<!-- upstream:start -->";
const END = "<!-- upstream:end -->";

const token = process.env.GITHUB_TOKEN;
const headers = { accept: "application/vnd.github+json", "user-agent": "profile-readme" };
if (token) headers.authorization = `Bearer ${token}`;

async function api(path) {
  const res = await fetch(`https://api.github.com${path}`, { headers });
  if (!res.ok) throw new Error(`${path} ${res.status}`);
  return res.json();
}

const q = encodeURIComponent(`author:${LOGIN} is:pr`);
const counts = new Map();
for (let page = 1; page <= 10; page++) {
  const res = await api(`/search/issues?q=${q}&per_page=100&page=${page}`);
  for (const item of res.items) {
    const [, owner] = item.repository_url.match(/repos\/([^/]+)\/[^/]+$/);
    if (owner.toLowerCase() === LOGIN.toLowerCase()) continue;
    counts.set(owner, (counts.get(owner) ?? 0) + 1);
  }
  if (res.items.length < 100) break;
}

const owners = await Promise.all(
  [...counts.keys()].map(async (login) => ({ login, n: counts.get(login) })),
);

const orgs = owners.sort((a, b) => b.n - a.n || a.login.localeCompare(b.login));

function block() {
  if (orgs.length === 0) return `${START}\n${END}`;
  const cell = (o) =>
    `<a href="https://github.com/${o.login}"><img src="https://avatars.githubusercontent.com/${o.login}?s=40" width="20" height="20" align="absmiddle" alt="${o.login}"> @${o.login}</a>`;
  const rowsCount = Math.ceil(orgs.length / 3);
  const base = Math.floor(orgs.length / rowsCount);
  const extra = orgs.length % rowsCount;
  const lines = [];
  let at = 0;
  for (let r = 0; r < rowsCount; r++) {
    const size = base + (r < extra ? 1 : 0);
    lines.push(orgs.slice(at, at + size).map(cell).join("&nbsp;&nbsp;&nbsp;&nbsp;"));
    at += size;
  }
  const rows = lines.map((line) => `<p align="center">${line}</p>`).join("\n");
  return `${START}
### Contributed to

${rows}
${END}`;
}

const file = fs.readFileSync(README, "utf8");
if (!file.includes(START) || !file.includes(END)) {
  console.error("markers missing from README.md");
  process.exit(1);
}
const next = file.replace(new RegExp(`${START}[\\s\\S]*?${END}`), block());
if (next === file) console.log("up to date");
else {
  fs.writeFileSync(README, next);
  console.log(`updated: ${orgs.map((o) => `@${o.login} (${o.n})`).join(", ")}`);
}

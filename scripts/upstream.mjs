#!/usr/bin/env node
// Rewrites the "Contributed to" list in README.md: repositories this profile
// has merged pull requests in, excluding repositories it owns.
import fs from "node:fs";

const LOGIN = "anubhavaanand";
const README = new URL("../README.md", import.meta.url);
const START = "<!-- upstream:start -->";
const END = "<!-- upstream:end -->";

const token = process.env.GITHUB_TOKEN;
const headers = { accept: "application/vnd.github+json", "user-agent": "profile-readme" };
if (token) headers.authorization = `Bearer ${token}`;

const q = encodeURIComponent(`author:${LOGIN} is:pr is:merged`);
const res = await fetch(`https://api.github.com/search/issues?q=${q}&sort=created&order=desc&per_page=100`, { headers });
if (!res.ok) throw new Error(`search ${res.status}: ${await res.text()}`);
const body = await res.json();

const seen = new Map();
for (const item of body.items) {
  const [, owner, name] = item.repository_url.match(/repos\/([^/]+)\/([^/]+)$/);
  if (owner.toLowerCase() === LOGIN.toLowerCase()) continue;
  const full = `${owner}/${name}`;
  if (!seen.has(full)) seen.set(full, item.closed_at ?? item.created_at);
}

const repos = [...seen.entries()].sort((a, b) => (b[1] ?? "").localeCompare(a[1] ?? ""));

function block() {
  if (repos.length === 0) return `${START}\n${END}`;
  const items = repos.map(([repo]) => `- [${repo}](https://github.com/${repo})`).join("\n");
  return `${START}
### Contributed to

${items}
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
  console.log(`updated: ${repos.map(([r]) => r).join(", ")}`);
}

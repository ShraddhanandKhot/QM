// Team Hub — zero-dependency local app (Node 24+).
// Run: node apps/team-hub/server.mjs [port]
// Data: apps/team-hub/data.json (same file the team-hub skill reads).
import http from "node:http";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const DATA = join(HERE, "data.json");
const PORT = Number(process.argv[2] || process.env.TEAM_HUB_PORT || 8091);
const STATUSES = ["Available", "Working", "Blocked", "On leave"];

function load() {
  if (!existsSync(DATA)) { writeFileSync(DATA, JSON.stringify({ members: [] }, null, 2)); }
  return JSON.parse(readFileSync(DATA, "utf8"));
}
function save(db) { writeFileSync(DATA, JSON.stringify(db, null, 2)); }
function send(res, code, obj) {
  res.writeHead(code, { "content-type": "application/json" });
  res.end(JSON.stringify(obj));
}
function body(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (c) => chunks.push(c));
    req.on("end", () => {
      if (!chunks.length) return resolve({});
      try { resolve(JSON.parse(Buffer.concat(chunks).toString("utf8"))); }
      catch (e) { reject(e); }
    });
  });
}

const PAGE = `<!doctype html><html><head><meta charset="utf8">
<title>Team Hub</title>
<style>body{font-family:system-ui,sans-serif;max-width:720px;margin:32px auto;padding:0 16px}
table{border-collapse:collapse;width:100%}td,th{border:1px solid #ccc;padding:6px 8px;text-align:left}
form{display:flex;gap:8px;flex-wrap:wrap;margin:16px 0}input,select,button{padding:6px 8px}</style>
</head><body><h1>Team Hub</h1>
<p>Simple roster: developers, roles, status. Data lives in <code>apps/team-hub/data.json</code>.</p>
<form id="add">
<input id="name" placeholder="Name" required>
<input id="role" placeholder="Role (e.g. Backend)" required>
<select id="status"><option>Available</option><option>Working</option><option>Blocked</option><option>On leave</option></select>
<button>Add developer</button></form>
<table><thead><tr><th>Name</th><th>Role</th><th>Status</th><th>Updated</th><th></th></tr></thead>
<tbody id="rows"></tbody></table>
<script>
const STATUSES=["Available","Working","Blocked","On leave"];
async function refresh(){
  const m=await (await fetch("/api/members")).json();
  document.getElementById("rows").innerHTML=m.members.map(x=>
    "<tr><td>"+x.name+"</td><td>"+x.role+"</td>"+
    "<td><select data-id='"+x.id+"'>"+STATUSES.map(s=>"<option"+(s===x.status?" selected":"")+">"+s+"</option>").join("")+"</select></td>"+
    "<td>"+(x.updatedAt||"")+"</td>"+
    "<td><button data-del='"+x.id+"'>Remove</button></td></tr>").join("");
  document.querySelectorAll("[data-id]").forEach(s=>s.onchange=async e=>{
    await fetch("/api/members/"+e.target.dataset.id,{method:"PATCH",headers:{"content-type":"application/json"},body:JSON.stringify({status:e.target.value})});
    refresh();});
  document.querySelectorAll("[data-del]").forEach(b=>b.onclick=async e=>{
    await fetch("/api/members/"+e.target.dataset.del,{method:"DELETE"});refresh();});
}
document.getElementById("add").onsubmit=async e=>{
  e.preventDefault();
  await fetch("/api/members",{method:"POST",headers:{"content-type":"application/json"},
    body:JSON.stringify({name:name.value,role:role.value,status:status.value})});
  e.target.reset();refresh();};
refresh();
</script></body></html>`;

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, "http://x");
  if (req.method === "GET" && url.pathname === "/") {
    res.writeHead(200, { "content-type": "text/html" }); res.end(PAGE); return;
  }
  if (req.method === "GET" && url.pathname === "/api/members") {
    send(res, 200, load()); return;
  }
  if (req.method === "POST" && url.pathname === "/api/members") {
    try {
      const p = await body(req);
      if (!p.name || !p.role) return send(res, 400, { error: "name and role required" });
      if (p.status && !STATUSES.includes(p.status)) return send(res, 400, { error: "bad status" });
      const db = load();
      const m = { id: "m" + Date.now().toString(36), name: String(p.name).slice(0, 80), role: String(p.role).slice(0, 80), status: p.status || "Available", updatedAt: new Date().toISOString().slice(0, 10) };
      db.members.push(m); save(db); send(res, 201, m);
    } catch { send(res, 400, { error: "bad json" }); }
    return;
  }
  const match = url.pathname.match(/^\/api\/members\/([A-Za-z0-9_-]+)$/);
  if (match) {
    const db = load();
    const m = db.members.find((x) => x.id === match[1]);
    if (!m) return send(res, 404, { error: "not found" });
    if (req.method === "PATCH") {
      try {
        const p = await body(req);
        if (p.status && !STATUSES.includes(p.status)) return send(res, 400, { error: "bad status" });
        for (const k of ["name", "role", "status"]) if (typeof p[k] === "string") m[k] = p[k].slice(0, 80);
        m.updatedAt = new Date().toISOString().slice(0, 10);
        save(db); send(res, 200, m);
      } catch { send(res, 400, { error: "bad json" }); }
      return;
    }
    if (req.method === "DELETE") {
      db.members = db.members.filter((x) => x.id !== match[1]);
      save(db); send(res, 200, { ok: true }); return;
    }
  }
  send(res, 404, { error: "not found" });
});

server.listen(PORT, "127.0.0.1", () => console.log(`[team-hub] http://localhost:${PORT}`));

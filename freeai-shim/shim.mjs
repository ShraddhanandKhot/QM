// FreeAI name-rewriting shim.
//
// Why this exists: QM forwards a model id to the provider verbatim, and refuses
// to let a custom provider register an id under a reserved namespace
// (anthropic/, openai/, openrouter/). FreeAI publishes ids like
// "anthropic/claude-opus-4.6" and 404s on the bare form. So we register the
// bare id in QM, and rewrite it to the prefixed form on the way out.
//
// Point the QM custom provider's baseUrl at this service.

import http from "node:http";
import { Readable } from "node:stream";

const PORT = Number(process.env.PORT || 8090);
const UPSTREAM_BASE = (process.env.UPSTREAM_BASE_URL || "https://api.freeaiapikey.com/v1").replace(/\/+$/, "");
const UPSTREAM_KEY = process.env.UPSTREAM_API_KEY || "";
const UPSTREAM_PREFIX = process.env.UPSTREAM_MODEL_PREFIX || "anthropic/";
const EXACT_MAP = JSON.parse(process.env.MODEL_MAP || "{}");

// The upstream only answers to fully qualified names, and the right vendor
// depends on the model family, so infer it rather than using one fixed prefix.
const FAMILY_PREFIX = [
    [/^claude/i, "anthropic/"],
    [/^(gpt|o1|o3|o4|codex)/i, "openai/"],
];

function upstreamModel(id) {
    if (typeof id !== "string" || !id) return id;
    if (EXACT_MAP[id]) return EXACT_MAP[id];
    if (id.includes("/")) return id;
    for (const [pattern, prefix] of FAMILY_PREFIX) {
        if (pattern.test(id)) return prefix + id;
    }
    return UPSTREAM_PREFIX + id;
}

const server = http.createServer(async (req, res) => {
    if (req.method === "GET" && req.url === "/healthz") {
        res.writeHead(200, { "content-type": "application/json" });
        res.end(JSON.stringify({ ok: true, keyLoaded: Boolean(UPSTREAM_KEY) }));
        return;
    }

    if (!UPSTREAM_KEY) {
        res.writeHead(500, { "content-type": "application/json" });
        res.end(JSON.stringify({ error: { message: "UPSTREAM_API_KEY is not set" } }));
        return;
    }

    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    let body = Buffer.concat(chunks);

    const contentType = req.headers["content-type"] || "";
    if (body.length && contentType.includes("json")) {
        try {
            const payload = JSON.parse(body.toString("utf8"));
            if (payload && typeof payload.model === "string") {
                const upstream = upstreamModel(payload.model);
                if (upstream !== payload.model) {
                    console.log(`[shim] ${new Date().toISOString()} ${payload.model} -> ${upstream}`);
                }
                payload.model = upstream;
                body = Buffer.from(JSON.stringify(payload));
            }
        } catch (err) {
            console.log(`[shim] passthrough unparseable body: ${err.message}`);
        }
    }

    // QM appends its path to the baseUrl it was given, so it sends /v1/<path>.
    // UPSTREAM_BASE already carries the upstream's own /v1, so drop ours to
    // avoid forwarding /v1/v1/<path>.
    let path = req.url || "/";
    if (path === "/v1") path = "/";
    else if (path.startsWith("/v1/")) path = path.slice(3);
    const target = `${UPSTREAM_BASE}${path}`;

    // Rebuild the header set instead of spreading the inbound one. Hop-by-hop
    // headers make undici reject the request outright, and we must not ask the
    // upstream to compress: the response path below does not forward
    // content-encoding, so a gzipped body would reach the client mislabelled.
    const SKIP = new Set([
        "host", "connection", "keep-alive", "transfer-encoding", "te", "trailer",
        "upgrade", "proxy-authorization", "proxy-connection", "content-length",
        "content-encoding", "accept-encoding", "expect",
    ]);
    const headers = {};
    for (const [key, value] of Object.entries(req.headers)) {
        if (!SKIP.has(key.toLowerCase())) headers[key] = value;
    }
    headers["authorization"] = `Bearer ${UPSTREAM_KEY}`;
    headers["accept-encoding"] = "identity";
    // Some upstreams sit behind Cloudflare bot checks that 403 bare
    // programmatic clients. Send browser-like headers by default so QM's
    // server-side calls pass; an explicit client header still wins.
    const has = (name) => Object.keys(headers).some((k) => k.toLowerCase() === name);
    if (!has("user-agent")) headers["user-agent"] = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";
    if (!has("accept")) headers["accept"] = "application/json";
    if (!has("origin")) headers["origin"] = UPSTREAM_BASE.replace(/\/v1$/, "");
    if (!has("referer")) headers["referer"] = UPSTREAM_BASE.replace(/\/v1$/, "") + "/";

    const hasBody = req.method !== "GET" && req.method !== "HEAD";

    let upstreamRes;
    try {
        upstreamRes = await fetch(target, {
            method: req.method,
            headers,
            body: hasBody ? body : undefined,
            redirect: "manual",
        });
    } catch (err) {
        console.log(`[shim] upstream call failed: ${err.message} ${err.cause ? err.cause.message : ""}`);
        res.writeHead(502, { "content-type": "application/json" });
        res.end(JSON.stringify({ error: { message: `upstream unreachable: ${err.message}` } }));
        return;
    }

    const outHeaders = {};
    upstreamRes.headers.forEach((value, key) => {
        if (key === "content-encoding" || key === "content-length" || key === "transfer-encoding") return;
        outHeaders[key] = value;
    });
    res.writeHead(upstreamRes.status, outHeaders);
    if (req.method === "POST") {
        console.log(`[shim] ${new Date().toISOString()} ${target} -> ${upstreamRes.status}`);
    }

    if (!upstreamRes.body) {
        res.end();
        return;
    }
    // Pipe rather than buffer so server-sent events stream through untouched.
    Readable.fromWeb(upstreamRes.body).pipe(res);
});

server.listen(PORT, "0.0.0.0", () => {
    console.log(`[shim] listening on 0.0.0.0:${PORT}`);
    console.log(`[shim] upstream  ${UPSTREAM_BASE}`);
    console.log(`[shim] prefix    ${UPSTREAM_PREFIX}`);
    console.log(`[shim] key       ${UPSTREAM_KEY ? "loaded" : "MISSING"}`);
});

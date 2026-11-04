import { handleContactForm } from "./contact-form.mjs";
import { Buffer } from "node:buffer";
import { createHash, timingSafeEqual } from "node:crypto";

function digest(value) {
  return createHash("sha256").update(value, "utf8").digest();
}

function unauthorized() {
  return new Response("Sign in to view this site.", {
    status: 401,
    headers: {
      "WWW-Authenticate": 'Basic realm="Parcelis Preview", charset="UTF-8"',
      "Cache-Control": "no-store",
    },
  });
}

export default {
  async fetch(request, env) {
    if (!env.PASSWORD) {
      return new Response("Site locked. Configure the PASSWORD secret in Cloudflare.", {
        status: 503,
        headers: { "Cache-Control": "no-store" },
      });
    }

    const authorization = request.headers.get("Authorization") ?? "";
    const match = /^Basic\s+([A-Za-z0-9+/]+={0,2})$/i.exec(authorization);
    if (!match) return unauthorized();

    let credentials;
    try {
      const bytes = Buffer.from(atob(match[1]), "binary");
      credentials = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    } catch {
      return unauthorized();
    }

    const separator = credentials.indexOf(":");
    if (separator < 0) return unauthorized();

    const validUser = timingSafeEqual(
      digest(credentials.slice(0, separator)),
      digest(env.USERNAME || "admin"),
    );
    const validPassword = timingSafeEqual(
      digest(credentials.slice(separator + 1)),
      digest(env.PASSWORD),
    );
    if (!validUser || !validPassword) return unauthorized();

    if (/^\/__ws-form\/contact\/?$/.test(new URL(request.url).pathname)) {
      return handleContactForm(request, env);
    }

    const assetRequest = new Request(request);
    assetRequest.headers.delete("Authorization");
    const asset = await env.ASSETS.fetch(assetRequest);
    const response = new Response(asset.body, asset);
    response.headers.set("Cache-Control", "private, no-store");
    response.headers.set("Vary", [response.headers.get("Vary"), "Authorization"].filter(Boolean).join(", "));
    return response;
  },
};

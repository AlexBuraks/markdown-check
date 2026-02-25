import dns from "node:dns/promises";
import net from "node:net";

function isPrivateIPv4(ip: string): boolean {
  const parts = ip.split(".").map(Number);
  if (parts.length !== 4 || parts.some((x) => Number.isNaN(x))) {
    return true;
  }

  const [a, b] = parts;
  if (a === 10 || a === 127 || a === 0) return true;
  if (a === 169 && b === 254) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a === 100 && b >= 64 && b <= 127) return true;
  if (a >= 224) return true;
  return false;
}

function isPrivateIPv6(ip: string): boolean {
  const normalized = ip.toLowerCase();
  return (
    normalized === "::1" ||
    normalized === "::" ||
    normalized.startsWith("fc") ||
    normalized.startsWith("fd") ||
    normalized.startsWith("fe8") ||
    normalized.startsWith("fe9") ||
    normalized.startsWith("fea") ||
    normalized.startsWith("feb")
  );
}

function isPrivateIp(ip: string): boolean {
  const family = net.isIP(ip);
  if (family === 4) return isPrivateIPv4(ip);
  if (family === 6) {
    if (ip.startsWith("::ffff:")) {
      const mapped = ip.replace("::ffff:", "");
      if (net.isIP(mapped) === 4) return isPrivateIPv4(mapped);
    }
    return isPrivateIPv6(ip);
  }
  return true;
}

export function assertSupportedUrl(rawUrl: string): URL {
  const parsed = new URL(rawUrl);

  if (!["http:", "https:"].includes(parsed.protocol)) {
    throw new Error("Only HTTP(S) URLs are supported.");
  }

  if (parsed.username || parsed.password) {
    throw new Error("URLs with credentials are not allowed.");
  }

  return parsed;
}

export async function assertSafeTarget(url: URL): Promise<void> {
  const host = url.hostname.toLowerCase();
  if (host === "localhost" || host.endsWith(".local")) {
    throw new Error("Local targets are blocked.");
  }

  if (net.isIP(host)) {
    if (isPrivateIp(host)) {
      throw new Error("Private IP ranges are blocked.");
    }
    return;
  }

  const records = await dns.lookup(host, { all: true, verbatim: true });
  if (records.length === 0) {
    throw new Error("Could not resolve hostname.");
  }

  for (const record of records) {
    // We resolve DNS and verify each address to avoid using this tool for internal network probing.
    if (isPrivateIp(record.address)) {
      throw new Error("Resolved to a private IP range, request blocked.");
    }
  }
}

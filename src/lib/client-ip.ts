import { ipAddress } from "@vercel/functions";
import { NextRequest } from "next/server";

function ipFromForwardedHeaders(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) {
      return first;
    }
  }

  const realIp = headers.get("x-real-ip")?.trim();
  if (realIp) {
    return realIp;
  }

  return "";
}

export function getClientIp(source: NextRequest | Headers): string {
  const headers = source instanceof Headers ? source : source.headers;

  if (source instanceof NextRequest) {
    const vercelIp = ipAddress(source);
    if (vercelIp) {
      return vercelIp;
    }
  } else {
    const vercelIp = ipAddress(
      new Request("https://internal.local", { headers })
    );
    if (vercelIp) {
      return vercelIp;
    }
  }

  return ipFromForwardedHeaders(headers);
}

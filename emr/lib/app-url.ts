import { headers } from "next/headers";

export async function appOrigin() {
  const headerList = await headers();
  const host = headerList.get("x-forwarded-host") || headerList.get("host") || "app.reliefmotionphysio.com";
  const proto = headerList.get("x-forwarded-proto") || "https";
  return `${proto}://${host}`;
}

export function getAuthRedirectUrl(path: string) {
  const configuredSiteUrl = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "");
  const origin =
    configuredSiteUrl ||
    (typeof window !== "undefined" ? window.location.origin : "");

  return `${origin}${path.startsWith("/") ? path : `/${path}`}`;
}

export function isDetailedHealthAuthorized(request: Request): boolean {
  const secret = process.env.HEALTH_CHECK_SECRET?.trim();
  if (!secret) {
    return process.env.NODE_ENV === "development";
  }
  const authorization = request.headers.get("authorization");
  const headerSecret = request.headers.get("x-health-secret");
  return authorization === `Bearer ${secret}` || headerSecret === secret;
}

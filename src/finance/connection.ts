// Only an explicit readiness check contacts the same-origin service. Never send a portfolio here.
export async function checkConnectionService(transport: typeof fetch = fetch): Promise<void> {
  const response = await transport("/api/pio/session/me", {
    method: "GET", credentials: "same-origin", cache: "no-store",
    redirect: "error", signal: AbortSignal.timeout(8000),
  });
  if (!response.headers.get("content-type")?.includes("application/json")) throw new Error("Service indisponible");
  const result = await response.json();
  if (response.status === 401 && result?.error === "Login required") return;
  if (response.ok && result?.role === "owner" && typeof result.csrf === "string" && result.csrf.length > 0) return;
  throw new Error("Service indisponible");
}

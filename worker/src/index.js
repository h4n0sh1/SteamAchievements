/**
 * Cloudflare Worker — Steam Achievements API Proxy
 *
 * Keeps the Steam API key server-side and adds proper CORS headers
 * so the GitHub Pages frontend can call Steam without issues.
 *
 * Environment secrets / vars expected:
 *   STEAM_API_KEY    – (secret) your Steam Web API key
 *   ALLOWED_ORIGINS  – (var)    comma-separated allowed origins
 */

const STEAM_BASE = "https://api.steampowered.com";

// ─── CORS helpers ────────────────────────────────────────────────────────────

function corsHeaders(request, env) {
  const origin = request.headers.get("Origin") || "";
  const allowed = (env.ALLOWED_ORIGINS || "").split(",").map((s) => s.trim());

  // Also allow localhost for development
  const isAllowed =
    allowed.includes(origin) ||
    origin.startsWith("http://localhost") ||
    origin.startsWith("http://127.0.0.1");

  return {
    "Access-Control-Allow-Origin": isAllowed ? origin : allowed[0],
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
  };
}

function handleOptions(request, env) {
  return new Response(null, {
    status: 204,
    headers: corsHeaders(request, env),
  });
}

// ─── Route handlers ──────────────────────────────────────────────────────────

async function handleGetSchema(request, env) {
  const url = new URL(request.url);
  const appid = url.searchParams.get("appid");

  if (!appid) {
    return jsonResponse(
      { error: "Missing required parameter: appid" },
      400,
      request,
      env,
    );
  }

  const steamUrl = `${STEAM_BASE}/ISteamUserStats/GetSchemaForGame/v2/?key=${env.STEAM_API_KEY}&appid=${appid}`;
  return proxySteam(steamUrl, request, env);
}

async function handleGetPlayerAchievements(request, env) {
  const url = new URL(request.url);
  const appid = url.searchParams.get("appid");
  const steamid = url.searchParams.get("steamid");

  if (!appid || !steamid) {
    return jsonResponse(
      { error: "Missing required parameters: appid, steamid" },
      400,
      request,
      env,
    );
  }

  const steamUrl = `${STEAM_BASE}/ISteamUserStats/GetPlayerAchievements/v1/?key=${env.STEAM_API_KEY}&steamid=${steamid}&appid=${appid}`;
  return proxySteam(steamUrl, request, env);
}

async function handleGetGlobalPercentages(request, env) {
  const url = new URL(request.url);
  const appid = url.searchParams.get("appid");

  if (!appid) {
    return jsonResponse(
      { error: "Missing required parameter: appid" },
      400,
      request,
      env,
    );
  }

  const steamUrl = `${STEAM_BASE}/ISteamUserStats/GetGlobalAchievementPercentagesForApp/v2/?gameid=${appid}`;
  return proxySteam(steamUrl, request, env);
}

// ─── Shared proxy logic ──────────────────────────────────────────────────────

async function proxySteam(steamUrl, request, env) {
  try {
    const resp = await fetch(steamUrl, {
      headers: { "User-Agent": "SteamAchievementsTracker/1.0" },
    });

    const data = await resp.text();

    return new Response(data, {
      status: resp.status,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders(request, env),
      },
    });
  } catch (err) {
    return jsonResponse(
      { error: "Failed to reach Steam API", details: err.message },
      502,
      request,
      env,
    );
  }
}

function jsonResponse(body, status, request, env) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...corsHeaders(request, env),
    },
  });
}

// ─── Router ──────────────────────────────────────────────────────────────────

export default {
  async fetch(request, env) {
    // Pre-flight
    if (request.method === "OPTIONS") {
      return handleOptions(request, env);
    }

    // Only allow GET
    if (request.method !== "GET") {
      return jsonResponse({ error: "Method not allowed" }, 405, request, env);
    }

    const url = new URL(request.url);
    const path = url.pathname;

    switch (path) {
      case "/api/schema":
        return handleGetSchema(request, env);
      case "/api/achievements":
        return handleGetPlayerAchievements(request, env);
      case "/api/global":
        return handleGetGlobalPercentages(request, env);
      case "/":
        return jsonResponse(
          { status: "ok", message: "Steam Achievements API Proxy" },
          200,
          request,
          env,
        );
      default:
        return jsonResponse({ error: "Not found" }, 404, request, env);
    }
  },
};

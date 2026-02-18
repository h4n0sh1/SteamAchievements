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

async function handleSearchGames(request, env) {
  const url = new URL(request.url);
  const term = url.searchParams.get("term");

  if (!term || term.length < 2) {
    return jsonResponse(
      { error: "Search term must be at least 2 characters" },
      400,
      request,
      env,
    );
  }

  try {
    // Use Steam's store search suggest endpoint
    const steamUrl = `https://store.steampowered.com/search/suggest?term=${encodeURIComponent(term)}&f=games&cc=us&realm=1&l=english&excluded_content_descriptors%5B%5D=3&excluded_content_descriptors%5B%5D=4&use_b_search_supports_signing=1`;
    const resp = await fetch(steamUrl, {
      headers: {
        "User-Agent": "SteamAchievementsTracker/1.0",
        Accept: "text/html",
      },
    });

    const html = await resp.text();

    // Parse the HTML response into structured data
    // Each result is an <a> with data-ds-appid, containing match_name and match_price divs
    const results = [];
    const regex =
      /<a[^>]*data-ds-appid="(\d+)"[^>]*>[\s\S]*?<div class="match_name">([\s\S]*?)<\/div>[\s\S]*?<div class="match_img"><img[^>]*src="([^"]*)"[^>]*>[\s\S]*?<\/a>/g;
    let match;

    while ((match = regex.exec(html)) !== null && results.length < 20) {
      results.push({
        appid: match[1],
        name: match[2]
          .trim()
          .replace(/&amp;/g, "&")
          .replace(/&lt;/g, "<")
          .replace(/&gt;/g, ">")
          .replace(/&#039;/g, "'")
          .replace(/&quot;/g, '"'),
        img: match[3],
      });
    }

    return jsonResponse(results, 200, request, env);
  } catch (err) {
    return jsonResponse(
      { error: "Failed to search Steam games", details: err.message },
      502,
      request,
      env,
    );
  }
}

// ─── Hidden achievement descriptions (via SteamHunters) ──────────────────────

async function handleGetHiddenDescriptions(request, env) {
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

  try {
    const resp = await fetch(
      `https://steamhunters.com/api/apps/${appid}/achievements`,
      {
        headers: { "User-Agent": "SteamAchievementsTracker/1.0" },
      },
    );

    if (!resp.ok) {
      return jsonResponse(
        { error: "SteamHunters returned " + resp.status },
        502,
        request,
        env,
      );
    }

    const achievements = await resp.json();

    // Return a map of apiName → description for easy merging on the frontend
    const descriptions = {};
    for (const ach of achievements) {
      if (ach.apiName && ach.description) {
        descriptions[ach.apiName] = ach.description;
      }
    }

    return jsonResponse(descriptions, 200, request, env);
  } catch (err) {
    return jsonResponse(
      { error: "Failed to fetch hidden descriptions", details: err.message },
      502,
      request,
      env,
    );
  }
}

// ─── User search (via Steam Community) ───────────────────────────────────────

async function handleSearchUsers(request, env) {
  const url = new URL(request.url);
  const term = url.searchParams.get("term");
  const page = parseInt(url.searchParams.get("page") || "1", 10);

  if (!term || term.length < 2) {
    return jsonResponse(
      { error: "Search term must be at least 2 characters" },
      400,
      request,
      env,
    );
  }

  try {
    // Step 1: Get a session ID from the Steam Community search page
    const pageResp = await fetch(
      "https://steamcommunity.com/search/users/",
      {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        },
      },
    );
    const pageHtml = await pageResp.text();
    const sessionMatch = pageHtml.match(/g_sessionID\s*=\s*"([^"]+)"/);

    if (!sessionMatch) {
      return jsonResponse(
        { error: "Could not obtain Steam session" },
        502,
        request,
        env,
      );
    }

    const sessionId = sessionMatch[1];

    // Step 2: Call the AJAX search endpoint with page parameter
    const ajaxResp = await fetch(
      `https://steamcommunity.com/search/SearchCommunityAjax?text=${encodeURIComponent(term)}&filter=users&sessionid=${sessionId}&steamid_user=false&page=${page}`,
      {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          Cookie: `sessionid=${sessionId}`,
        },
      },
    );

    const data = await ajaxResp.json();

    if (!data.success || !data.html) {
      return jsonResponse(
        { users: [], page, totalResults: 0, hasMore: false },
        200,
        request,
        env,
      );
    }

    // Step 3: Parse the HTML to extract user entries
    const users = [];
    const entryRegex =
      /<a class="searchPersonaName" href="https:\/\/steamcommunity\.com\/(profiles|id)\/([^"]+)"[^>]*>([\s\S]*?)<\/a>/g;
    const avatarRegex =
      /<div class="avatarMedium">\s*<a[^>]*>\s*<img[^>]*src="([^"]*)"[^>]*>/g;

    const entries = [];
    let m;
    while ((m = entryRegex.exec(data.html)) !== null) {
      entries.push({
        type: m[1],
        urlPart: m[2],
        name: decodeHtmlEntities(m[3].trim()),
      });
    }

    const avatars = [];
    while ((m = avatarRegex.exec(data.html)) !== null) {
      avatars.push(m[1]);
    }

    for (let i = 0; i < entries.length; i++) {
      const e = entries[i];
      users.push({
        name: e.name,
        avatar: avatars[i] || "",
        steamId: e.type === "profiles" ? e.urlPart : null,
        vanityUrl: e.type === "id" ? e.urlPart : null,
        profileUrl: `https://steamcommunity.com/${e.type}/${e.urlPart}`,
      });
    }

    const totalResults = data.search_result_count || 0;
    const hasMore = users.length > 0 && page * 20 < totalResults;

    return jsonResponse(
      { users, page, totalResults, hasMore },
      200,
      request,
      env,
    );
  } catch (err) {
    return jsonResponse(
      { error: "Failed to search Steam users", details: err.message },
      502,
      request,
      env,
    );
  }
}

// ─── Resolve vanity URL to Steam64 ID ────────────────────────────────────────

async function handleResolveVanity(request, env) {
  const url = new URL(request.url);
  const vanityurl = url.searchParams.get("vanityurl");

  if (!vanityurl) {
    return jsonResponse(
      { error: "Missing required parameter: vanityurl" },
      400,
      request,
      env,
    );
  }

  const steamUrl = `${STEAM_BASE}/ISteamUser/ResolveVanityURL/v1/?key=${env.STEAM_API_KEY}&vanityurl=${encodeURIComponent(vanityurl)}`;
  return proxySteam(steamUrl, request, env);
}

// ─── Utility ─────────────────────────────────────────────────────────────────

function decodeHtmlEntities(str) {
  return str
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#039;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(n));
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
      case "/api/search":
        return handleSearchGames(request, env);
      case "/api/hidden-descriptions":
        return handleGetHiddenDescriptions(request, env);
      case "/api/search-users":
        return handleSearchUsers(request, env);
      case "/api/resolve-vanity":
        return handleResolveVanity(request, env);
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

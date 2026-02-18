// Steam Achievements Tracker
// Frontend calls Cloudflare Worker proxy — no API key needed on the client.

class SteamAchievementsTracker {
  constructor() {
    // ── Worker endpoint ──────────────────────────────────────────────
    // Change this to your deployed Cloudflare Worker URL.
    // During local dev you can use: http://localhost:8787
    this.WORKER_URL =
      "https://steam-achievements-api.<YOUR_CF_SUBDOMAIN>.workers.dev";

    this.steamId = "";
    this.gameId = "";
    this.allAchievements = [];
    this.userAchievements = [];
    this.showOnlyIncomplete = true;
    this.DEFAULT_ACHIEVEMENT_ICON =
      "data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%2264%22 height=%2264%22%3E%3Crect fill=%22%232a475e%22 width=%2264%22 height=%2264%22/%3E%3C/svg%3E";

    this.initializeEventListeners();
  }

  // ── Events ───────────────────────────────────────────────────────────

  initializeEventListeners() {
    const fetchBtn = document.getElementById("fetchBtn");
    const toggleBtn = document.getElementById("toggleView");

    fetchBtn.addEventListener("click", () => this.fetchAchievements());
    toggleBtn.addEventListener("click", () => this.toggleView());

    document.querySelectorAll("input").forEach((input) => {
      input.addEventListener("keypress", (e) => {
        if (e.key === "Enter") this.fetchAchievements();
      });
    });
  }

  // ── Main flow ────────────────────────────────────────────────────────

  async fetchAchievements() {
    this.steamId = this.extractSteamId(
      document.getElementById("steamId").value.trim(),
    );
    this.gameId = document.getElementById("gameId").value.trim();

    if (!this.steamId) {
      this.showError("Please enter a valid Steam ID or profile URL");
      return;
    }
    if (!this.gameId) {
      this.showError("Please enter a Game App ID");
      return;
    }

    this.showLoading(true);
    this.hideError();
    this.hideResults();

    try {
      const [gameSchema, userAchievements] = await Promise.all([
        this.fetchGameSchema(),
        this.fetchUserAchievements(),
      ]);

      this.processAchievements(gameSchema, userAchievements);
      this.displayResults();
    } catch (error) {
      console.error("Error:", error);
      this.showError(
        error.message ||
          "Failed to fetch achievements. Please check your inputs and try again.",
      );
    } finally {
      this.showLoading(false);
    }
  }

  // ── Helpers ──────────────────────────────────────────────────────────

  extractSteamId(input) {
    if (!input) return "";
    if (/^\d{17}$/.test(input)) return input;

    const profileMatch = input.match(/steamcommunity\.com\/profiles\/(\d{17})/);
    if (profileMatch) return profileMatch[1];

    this.showError(
      "Please enter a valid 17-digit Steam ID. Find yours at steamid.io",
    );
    return "";
  }

  // ── API calls (through Cloudflare Worker) ────────────────────────────

  async fetchGameSchema() {
    const url = `${this.WORKER_URL}/api/schema?appid=${this.gameId}`;
    const response = await fetch(url);

    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      throw new Error(body.error || `HTTP ${response.status}`);
    }

    const data = await response.json();

    if (
      !data.game ||
      !data.game.availableGameStats ||
      !data.game.availableGameStats.achievements
    ) {
      throw new Error(
        "No achievements found for this game. Make sure the App ID is correct and the game has achievements.",
      );
    }

    return data.game.availableGameStats.achievements;
  }

  async fetchUserAchievements() {
    const url = `${this.WORKER_URL}/api/achievements?appid=${this.gameId}&steamid=${this.steamId}`;
    const response = await fetch(url);

    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      throw new Error(body.error || `HTTP ${response.status}`);
    }

    const data = await response.json();

    if (!data.playerstats) {
      throw new Error(
        "No player stats found. Check your Steam ID and make sure your profile is public.",
      );
    }
    if (data.playerstats.error) {
      throw new Error(`Steam API error: ${data.playerstats.error}`);
    }
    if (!data.playerstats.achievements) {
      throw new Error(
        "No achievement data found. The user may not own this game or the game has no achievements.",
      );
    }

    return data.playerstats.achievements;
  }

  // ── Processing & rendering ───────────────────────────────────────────

  processAchievements(gameSchema, userAchievements) {
    this.allAchievements = gameSchema.map((achievement) => {
      const userAch = userAchievements.find(
        (ua) => ua.apiname === achievement.name,
      );
      const unlocked = userAch ? userAch.achieved === 1 : false;
      const unlockTime = userAch && unlocked ? userAch.unlocktime : null;

      return {
        name: achievement.displayName || achievement.name,
        description: achievement.description || "No description available",
        icon: achievement.icon || "",
        iconGray: achievement.icongray || achievement.icon || "",
        hidden: achievement.hidden === 1,
        unlocked,
        unlockTime,
        apiName: achievement.name,
      };
    });
  }

  displayResults() {
    const resultsDiv = document.getElementById("results");

    const total = this.allAchievements.length;
    const unlocked = this.allAchievements.filter((a) => a.unlocked).length;
    const hidden = this.allAchievements.filter(
      (a) => a.hidden && !a.unlocked,
    ).length;
    const completion = total > 0 ? Math.round((unlocked / total) * 100) : 0;

    document.getElementById("totalAchievements").textContent = total;
    document.getElementById("unlockedAchievements").textContent = unlocked;
    document.getElementById("hiddenAchievements").textContent = hidden;
    document.getElementById("completionRate").textContent = completion + "%";

    this.renderAchievements();
    resultsDiv.classList.remove("hidden");
  }

  renderAchievements() {
    const achievementsList = document.getElementById("achievementsList");
    let achievements = this.allAchievements;

    if (this.showOnlyIncomplete) {
      achievements = achievements.filter((a) => !a.unlocked);
    }

    if (achievements.length === 0) {
      achievementsList.innerHTML =
        '<p style="text-align:center;padding:20px;color:var(--steam-light-gray);">No achievements to display.</p>';
      return;
    }

    achievementsList.innerHTML = achievements
      .map(
        (achievement) => `
            <div class="achievement-card ${achievement.unlocked ? "unlocked" : "locked"} ${achievement.hidden && !achievement.unlocked ? "hidden" : ""}">
                <img src="${achievement.unlocked ? achievement.icon : achievement.iconGray}"
                     alt="${achievement.name}"
                     class="achievement-icon ${achievement.unlocked ? "" : "locked"}"
                     onerror="this.src='${this.DEFAULT_ACHIEVEMENT_ICON}'">
                <div class="achievement-info">
                    <div class="achievement-name">
                        ${achievement.name}
                        ${achievement.hidden && !achievement.unlocked ? '<span class="achievement-badge hidden">Hidden</span>' : ""}
                        ${achievement.unlocked ? '<span class="achievement-badge unlocked">Unlocked</span>' : ""}
                    </div>
                    <div class="achievement-description">${achievement.description}</div>
                    <div class="achievement-meta">
                        ${achievement.unlockTime ? `<span>Unlocked: ${new Date(achievement.unlockTime * 1000).toLocaleDateString()}</span>` : ""}
                    </div>
                </div>
            </div>`,
      )
      .join("");
  }

  toggleView() {
    this.showOnlyIncomplete = !this.showOnlyIncomplete;
    const toggleBtn = document.getElementById("toggleView");
    toggleBtn.textContent = this.showOnlyIncomplete
      ? "Show All"
      : "Show Incomplete Only";
    this.renderAchievements();
  }

  // ── UI helpers ───────────────────────────────────────────────────────

  showLoading(show) {
    const loadingDiv = document.getElementById("loading");
    const fetchBtn = document.getElementById("fetchBtn");
    if (show) {
      loadingDiv.classList.remove("hidden");
      fetchBtn.disabled = true;
    } else {
      loadingDiv.classList.add("hidden");
      fetchBtn.disabled = false;
    }
  }

  showError(message) {
    const errorDiv = document.getElementById("error");
    errorDiv.textContent = message;
    errorDiv.classList.remove("hidden");
  }

  hideError() {
    document.getElementById("error").classList.add("hidden");
  }

  hideResults() {
    document.getElementById("results").classList.add("hidden");
  }
}

document.addEventListener("DOMContentLoaded", () => {
  new SteamAchievementsTracker();
});

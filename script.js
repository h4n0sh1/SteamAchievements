// Steam Achievements Tracker
class SteamAchievementsTracker {
    constructor() {
        this.apiKey = '';
        this.steamId = '';
        this.gameId = '';
        this.trophySource = 'steamhunters';
        this.allAchievements = [];
        this.userAchievements = [];
        this.showOnlyIncomplete = true;
        this.DEFAULT_ACHIEVEMENT_ICON = 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%2264%22 height=%2264%22%3E%3Crect fill=%22%232a475e%22 width=%2264%22 height=%2264%22/%3E%3C/svg%3E';

        this.initializeEventListeners();
    }

    initializeEventListeners() {
        const fetchBtn = document.getElementById('fetchBtn');
        const toggleBtn = document.getElementById('toggleView');

        fetchBtn.addEventListener('click', () => this.fetchAchievements());
        toggleBtn.addEventListener('click', () => this.toggleView());

        // Allow Enter key in inputs
        document.querySelectorAll('input').forEach(input => {
            input.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') this.fetchAchievements();
            });
        });
    }

    async fetchAchievements() {
        // Get input values
        this.apiKey = document.getElementById('apiKey').value.trim();
        this.steamId = this.extractSteamId(document.getElementById('steamId').value.trim());
        this.gameId = document.getElementById('gameId').value.trim();
        this.trophySource = document.getElementById('trophySource').value;

        // Validate inputs
        if (!this.apiKey) {
            this.showError('Please enter your Steam API key');
            return;
        }
        if (!this.steamId) {
            this.showError('Please enter a valid Steam ID or profile URL');
            return;
        }
        if (!this.gameId) {
            this.showError('Please enter a Game App ID');
            return;
        }

        this.showLoading(true);
        this.hideError();
        this.hideResults();

        try {
            // Fetch game schema (all achievements including hidden)
            const gameSchema = await this.fetchGameSchema();
            
            // Fetch user achievements
            const userAchievements = await this.fetchUserAchievements();
            
            // Process and display
            this.processAchievements(gameSchema, userAchievements);
            this.displayResults();
            
        } catch (error) {
            console.error('Error:', error);
            this.showError(error.message || 'Failed to fetch achievements. Please check your inputs and try again.');
        } finally {
            this.showLoading(false);
        }
    }

    extractSteamId(input) {
        // Extract Steam ID from various formats
        if (!input) return '';
        
        // If it's a 17-digit Steam ID, return it
        if (/^\d{17}$/.test(input)) {
            return input;
        }
        
        // Try to extract from profile URL format
        const profileMatch = input.match(/steamcommunity\.com\/profiles\/(\d{17})/);
        if (profileMatch) {
            return profileMatch[1];
        }
        
        // For any other format, show error
        this.showError('Please enter a valid 17-digit Steam ID. Find yours at steamid.io');
        return '';
    }

    async fetchGameSchema() {
        const url = `https://api.steampowered.com/ISteamUserStats/GetSchemaForGame/v2/?key=${this.apiKey}&appid=${this.gameId}`;
        
        try {
            const response = await fetch(url);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            
            if (!data.game || !data.game.availableGameStats || !data.game.availableGameStats.achievements) {
                throw new Error('No achievements found for this game. Make sure the App ID is correct and the game has achievements.');
            }
            
            return data.game.availableGameStats.achievements;
        } catch (error) {
            console.error('Fetch error:', error);
            // If Steam API fails, try alternative sources based on selection
            if (this.trophySource === 'steamhunters') {
                throw new Error('Steam Hunters API integration requires additional setup. Please use Steam API Only option.');
            } else if (this.trophySource === 'astats') {
                throw new Error('AStats API integration requires additional setup. Please use Steam API Only option.');
            }
            throw new Error(`Failed to fetch game achievements: ${error.message}`);
        }
    }

    async fetchUserAchievements() {
        const url = `https://api.steampowered.com/ISteamUserStats/GetPlayerAchievements/v1/?key=${this.apiKey}&steamid=${this.steamId}&appid=${this.gameId}`;
        
        try {
            const response = await fetch(url);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            
            if (!data.playerstats) {
                throw new Error('No player stats found. Check your Steam ID and make sure your profile is public.');
            }
            
            if (data.playerstats.error) {
                throw new Error(`Steam API error: ${data.playerstats.error}`);
            }
            
            if (!data.playerstats.achievements) {
                throw new Error('No achievement data found. The user may not own this game or the game has no achievements.');
            }
            
            return data.playerstats.achievements;
        } catch (error) {
            console.error('Fetch error:', error);
            throw new Error(`Failed to fetch user achievements: ${error.message}`);
        }
    }

    async fetchFromSteamHunters() {
        // Steam Hunters doesn't have a public API, but we can scrape (not recommended in production)
        // For now, return empty array and note in error
        throw new Error('Steam Hunters API integration requires additional setup. Please use Steam API directly for now.');
    }

    async fetchFromAStats() {
        // AStats API would go here
        throw new Error('AStats API integration requires additional setup. Please use Steam API directly for now.');
    }

    processAchievements(gameSchema, userAchievements) {
        this.allAchievements = gameSchema.map(achievement => {
            const userAch = userAchievements.find(ua => ua.apiname === achievement.name);
            const unlocked = userAch ? userAch.achieved === 1 : false;
            const unlockTime = userAch && unlocked ? userAch.unlocktime : null;
            
            return {
                name: achievement.displayName || achievement.name,
                description: achievement.description || 'No description available',
                icon: achievement.icon || '',
                iconGray: achievement.icongray || achievement.icon || '',
                hidden: achievement.hidden === 1,
                unlocked: unlocked,
                unlockTime: unlockTime,
                apiName: achievement.name
            };
        });
    }

    displayResults() {
        const resultsDiv = document.getElementById('results');
        const achievementsList = document.getElementById('achievementsList');
        
        // Calculate statistics
        const total = this.allAchievements.length;
        const unlocked = this.allAchievements.filter(a => a.unlocked).length;
        const hidden = this.allAchievements.filter(a => a.hidden && !a.unlocked).length;
        const completion = total > 0 ? Math.round((unlocked / total) * 100) : 0;
        
        // Update stats
        document.getElementById('totalAchievements').textContent = total;
        document.getElementById('unlockedAchievements').textContent = unlocked;
        document.getElementById('hiddenAchievements').textContent = hidden;
        document.getElementById('completionRate').textContent = completion + '%';
        
        // Display achievements
        this.renderAchievements();
        
        resultsDiv.classList.remove('hidden');
    }

    renderAchievements() {
        const achievementsList = document.getElementById('achievementsList');
        let achievements = this.allAchievements;
        
        // Filter based on view mode: show only incomplete (locked or hidden) achievements
        if (this.showOnlyIncomplete) {
            achievements = achievements.filter(a => !a.unlocked);
        }
        
        if (achievements.length === 0) {
            achievementsList.innerHTML = '<p style="text-align: center; padding: 20px; color: var(--steam-light-gray);">No achievements to display.</p>';
            return;
        }
        
        achievementsList.innerHTML = achievements.map(achievement => `
            <div class="achievement-card ${achievement.unlocked ? 'unlocked' : 'locked'} ${achievement.hidden && !achievement.unlocked ? 'hidden' : ''}">
                <img src="${achievement.unlocked ? achievement.icon : achievement.iconGray}" 
                     alt="${achievement.name}" 
                     class="achievement-icon ${achievement.unlocked ? '' : 'locked'}"
                     onerror="this.src='${this.DEFAULT_ACHIEVEMENT_ICON}'">
                <div class="achievement-info">
                    <div class="achievement-name">
                        ${achievement.name}
                        ${achievement.hidden && !achievement.unlocked ? '<span class="achievement-badge hidden">Hidden</span>' : ''}
                        ${achievement.unlocked ? '<span class="achievement-badge unlocked">Unlocked</span>' : ''}
                    </div>
                    <div class="achievement-description">${achievement.description}</div>
                    <div class="achievement-meta">
                        ${achievement.unlockTime ? `<span>Unlocked: ${new Date(achievement.unlockTime * 1000).toLocaleDateString()}</span>` : ''}
                    </div>
                </div>
            </div>
        `).join('');
    }

    toggleView() {
        this.showOnlyIncomplete = !this.showOnlyIncomplete;
        const toggleBtn = document.getElementById('toggleView');
        toggleBtn.textContent = this.showOnlyIncomplete ? 'Show All' : 'Show Incomplete Only';
        this.renderAchievements();
    }

    showLoading(show) {
        const loadingDiv = document.getElementById('loading');
        const fetchBtn = document.getElementById('fetchBtn');
        
        if (show) {
            loadingDiv.classList.remove('hidden');
            fetchBtn.disabled = true;
        } else {
            loadingDiv.classList.add('hidden');
            fetchBtn.disabled = false;
        }
    }

    showError(message) {
        const errorDiv = document.getElementById('error');
        errorDiv.textContent = message;
        errorDiv.classList.remove('hidden');
    }

    hideError() {
        const errorDiv = document.getElementById('error');
        errorDiv.classList.add('hidden');
    }

    hideResults() {
        const resultsDiv = document.getElementById('results');
        resultsDiv.classList.add('hidden');
    }
}

// Initialize the tracker when the page loads
document.addEventListener('DOMContentLoaded', () => {
    new SteamAchievementsTracker();
});

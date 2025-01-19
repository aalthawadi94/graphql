import { default as jwtDecode } from 'https://unpkg.com/jwt-decode@3.1.2/build/jwt-decode.esm.js';
import { GraphQLClient, GET_USER_DATA } from './graphql.js';
import { renderXPOverTime, renderProjectRatio } from './graphs.js';

/**
 * Profile Dashboard Class
 * 
 * This class encapsulates the functionality of the profile dashboard, including
 * data fetching, rendering, and event handling.
 */
class App {
    /**
     * Initialize the dashboard and set up event listeners
     * @constructor
     */
    constructor() {
        this.token = localStorage.getItem('token');
        this.client = new GraphQLClient();
        this.data = null;
        this.setupEventListeners();
        this.checkAuth();
        
        // Store the full lists
        this.allAudits = [];
        this.allProjects = [];
    }

    /**
     * Set up event listeners for interactive elements
     * Primarily handles the graph type selection dropdown
     */
    setupEventListeners() {
        document.getElementById('login-form').addEventListener('submit', (e) => this.handleLogin(e));
        document.getElementById('logout-btn').addEventListener('click', () => this.handleLogout());
        document.getElementById('graph-type').addEventListener('change', (e) => this.handleGraphChange(e));
        
        // Add show more/less event listeners
        document.getElementById('show-more-projects').addEventListener('click', () => this.toggleProjectsList(true));
        document.getElementById('show-less-projects').addEventListener('click', () => this.toggleProjectsList(false));
        document.getElementById('show-more-audits').addEventListener('click', () => this.toggleAuditsList(true));
        document.getElementById('show-less-audits').addEventListener('click', () => this.toggleAuditsList(false));
    }

    /**
     * Toggle the projects list to show more or less
     * @param {boolean} showAll - Whether to show all projects or not
     */
    toggleProjectsList(showAll) {
        const tbody = document.getElementById('projects-tbody');
        const showMoreBtn = document.getElementById('show-more-projects');
        const showLessBtn = document.getElementById('show-less-projects');
        
        if (showAll) {
            this.renderProjectsList(this.allProjects, true);
            showMoreBtn.classList.add('hidden');
            showLessBtn.classList.remove('hidden');
        } else {
            this.renderProjectsList(this.allProjects, false);
            showMoreBtn.classList.remove('hidden');
            showLessBtn.classList.add('hidden');
        }
    }

    /**
     * Toggle the audits list to show more or less
     * @param {boolean} showAll - Whether to show all audits or not
     */
    toggleAuditsList(showAll) {
        const tbody = document.getElementById('audits-tbody');
        const showMoreBtn = document.getElementById('show-more-audits');
        const showLessBtn = document.getElementById('show-less-audits');
        
        if (showAll) {
            this.renderRecentAudits(this.allAudits, true);
            showMoreBtn.classList.add('hidden');
            showLessBtn.classList.remove('hidden');
        } else {
            this.renderRecentAudits(this.allAudits, false);
            showMoreBtn.classList.remove('hidden');
            showLessBtn.classList.add('hidden');
        }
    }

    /**
     * Render the list of recent projects
     * @param {Array} progresses - Array of project progresses
     * @param {boolean} showAll - Whether to show all projects or not
     */
    renderProjectsList(progresses, showAll = false) {
        const tbody = document.getElementById('projects-tbody');
        if (!tbody) return;

        // Store all projects
        // Filter out duplicates based on object.id
        this.allProjects = progresses.filter((progress, index, self) =>
            index === self.findIndex(p => p.object.id === progress.object.id)
        );

        // Clear existing content
        tbody.innerHTML = '';

        // Sort by updatedAt in descending order (newest first)
        const sortedProjects = [...this.allProjects].sort((a, b) => 
            new Date(b.updatedAt) - new Date(a.updatedAt)
        );

        // Determine how many items to show
        const projectsToShow = showAll ? sortedProjects : sortedProjects.slice(0, 10);

        projectsToShow.forEach(progress => {
            const row = document.createElement('tr');
            const date = new Date(progress.updatedAt).toLocaleDateString();
            const status = progress.grade !== null ? 'Passed' : 'In Progress';

            row.innerHTML = `
                <td>${progress.object.name}</td>
                <td>${date}</td>
                <td class="${status.toLowerCase().replace(' ', '-')}">${status}</td>
            `;
            tbody.appendChild(row);
        });

        // Show/hide the show more button based on the number of records
        const showMoreBtn = document.getElementById('show-more-projects');
        if (showMoreBtn) {
            showMoreBtn.classList.toggle('hidden', sortedProjects.length <= 10 || showAll);
        }
    }

    /**
     * Render the list of recent audits
     * @param {Array} audits - Array of recent audits
     * @param {boolean} showAll - Whether to show all audits or not
     */
    renderRecentAudits(audits, showAll = false) {
        const tbody = document.getElementById('audits-tbody');
        if (!tbody) return;

        // Store all audits
        this.allAudits = audits;

        // Clear existing content
        tbody.innerHTML = '';

        // Determine how many items to show
        const auditsToShow = showAll ? audits : audits.slice(0, 10);

        auditsToShow.forEach(audit => {
            const row = document.createElement('tr');
            const date = new Date(audit.createdAt).toLocaleDateString();
            const projectName = audit.group?.object?.name || 'Unknown Project';
            const status = audit.grade >= 1 ? 'Passed' : 'Failed';

            row.innerHTML = `
                <td>${projectName}</td>
                <td>${date}</td>
                <td class="${status.toLowerCase()}">${status}</td>
            `;
            tbody.appendChild(row);
        });

        // Show/hide the show more button based on the number of records
        const showMoreBtn = document.getElementById('show-more-audits');
        if (showMoreBtn) {
            showMoreBtn.classList.toggle('hidden', audits.length <= 10 || showAll);
        }
    }

    /**
     * Check if the user is authenticated and display the profile or login page accordingly
     */
    checkAuth() {
        if (this.token) {
            this.client.setToken(this.token);
            this.showProfile();
        } else {
            this.showLogin();
        }
    }

    /**
     * Handle the login form submission
     * @param {Event} e - Form submission event
     */
    async handleLogin(e) {
        e.preventDefault();
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;
        
        try {
            const credentials = btoa(`${username}:${password}`);
            const response = await fetch('https://learn.reboot01.com/api/auth/signin', {
                method: 'POST',
                headers: {
                    'Authorization': `Basic ${credentials}`
                }
            });

            if (!response.ok) {
                throw new Error('Invalid credentials');
            }

            const token = await response.json();
            if (!token) {
                throw new Error('No token received from server');
            }

            localStorage.setItem('token', token);
            this.token = token;
            this.client.setToken(token);
            this.showProfile();
        } catch (error) {
            console.error('Login failed:', error);
            document.getElementById('error-message').textContent = error.message;
        }
    }

    /**
     * Handle the logout button click
     */
    handleLogout() {
        localStorage.removeItem('token');
        this.token = null;
        this.client.setToken(null);
        this.showLogin();
    }

    /**
     * Show the login page
     */
    showLogin() {
        document.getElementById('login-container').classList.remove('hidden');
        document.getElementById('profile-container').classList.add('hidden');
    }

    /**
     * Show the profile page
     */
    showProfile() {
        document.getElementById('login-container').classList.add('hidden');
        document.getElementById('profile-container').classList.remove('hidden');
        // Wait for DOM to be ready before loading data
        setTimeout(() => this.loadProfileData(), 0);
    }

    /**
     * Main function to load and display all profile data
     * This is the entry point for data fetching and rendering
     */
    async loadProfileData() {
        try {
            const userId = this.getUserIdFromToken();
            const eventId = 20;
            const userData = await this.client.query(GET_USER_DATA, { 
                userId, 
                eventId 
            });
            
            console.log('Profile data loaded:', userData);

            if (userData.data?.user?.[0]) {
                const user = userData.data.user[0];
                this.data = userData.data;
                
                // Log audit ratio data
                console.log('Audit ratio data:', {
                    totalUp: user.totalUp,
                    totalDown: user.totalDown,
                    auditRatio: user.auditRatio
                });

                // Update basic info with extended user data
                this.renderBasicInfo(user);
                
                // Ensure DOM is ready before rendering audit ratio
                requestAnimationFrame(() => {
                    console.log('Rendering audit ratio with data:', {
                        totalUp: user.totalUp,
                        totalDown: user.totalDown,
                        auditRatio: user.auditRatio
                    });
                    this.renderAuditRatio(user);
                });
                
                // Calculate and display XP progress using all xp_transactions
                if (user.xp_transactions) {
                    console.log('Total number of XP transactions:', user.xp_transactions.length);
                    
                    // Log details of each transaction
                    user.xp_transactions.forEach((t, index) => {
                        console.log(`Transaction ${index + 1}:`, {
                            id: t.id,
                            amount: t.amount,
                            date: new Date(t.createdAt).toLocaleString(),
                            path: t.path,
                            objectType: t.object?.type,
                            objectName: t.object?.name
                        });
                    });

                    const totalXP = user.xp_transactions.reduce((sum, t) => sum + t.amount, 0);
                    console.log('Calculated total XP:', totalXP);
                    
                    // Update XP information in kB format
                    const totalXpElement = document.getElementById('total-xp');
                    const projectsCompletedElement = document.getElementById('projects-completed');
                    
                    if (totalXpElement) {
                        // Don't convert to bytes first, amount is already in bytes
                        totalXpElement.textContent = this.formatFileSize(totalXP);
                    }
                    if (projectsCompletedElement && user.progresses) {
                        const uniqueProjects = new Set(user.progresses.filter(p => p.grade !== null).map(p => p.object.id));
                        projectsCompletedElement.textContent = uniqueProjects.size;
                    }

                    // Render XP graph using all transactions
                    const xpGraphContainer = document.getElementById('graph');
                    const graphType = document.getElementById('graph-type');
                    if (xpGraphContainer && graphType && graphType.value === 'xp') {
                        renderXPOverTime(xpGraphContainer, user.xp_transactions);
                    }
                }
                
                // Update projects list
                if (user.progresses) {
                    this.renderProjectsList(user.progresses);
                }

                // Update audit statistics
                if (user.audits) {
                    const sortedAudits = user.audits.nodes
                        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

                    this.updateAuditStats({
                        total: sortedAudits.length,
                        passed: sortedAudits.filter(audit => audit.grade >= 1).length,
                        failed: sortedAudits.filter(audit => audit.grade < 1).length,
                        totalUp: user.totalUp,
                        totalDown: user.totalDown
                    });
                    this.renderRecentAudits(sortedAudits);
                }

                // Render skills information
                if (user.skills) {
                    this.renderSkills(user.skills);
                }

                // Update level if available
                const level = userData.data.event_user?.[0]?.level;
                const userLevelElement = document.getElementById('user-level');
                if (level && userLevelElement) {
                    userLevelElement.textContent = `${level.toFixed(2)}`;
                }

                // Show the profile container
                const profileContainer = document.getElementById('profile-container');
                if (profileContainer) {
                    profileContainer.style.display = 'block';
                }
            }
        } catch (error) {
            console.error('Failed to load profile data:', error);
            // Handle error appropriately
        }
    }

    /**
     * Get the user ID from the token
     * @returns {number|null} User ID or null if token is invalid
     */
    getUserIdFromToken() {
        try {
            const decoded = jwtDecode(this.token);
            console.log('Decoded token:', decoded);
            
            // Check if token is expired
            const currentTime = Math.floor(Date.now() / 1000);
            if (decoded.exp && decoded.exp < currentTime) {
                throw new Error('JWTExpired');
            }
            
            // Try to find userId in common JWT fields
            const userId = parseInt(decoded.userId || decoded.user_id || decoded.id || decoded.sub, 10);
            
            if (isNaN(userId)) {
                console.error('Token payload:', decoded);
                throw new Error('Could not find valid userId in token');
            }
            return userId;
        } catch (error) {
            console.error('Failed to decode token:', error);
            if (error.message === 'JWTExpired') {
                localStorage.removeItem('token');
                this.token = null;
                this.client.setToken(null);
                document.getElementById('error-message').textContent = 'Your session has expired. Please log in again.';
                this.showLogin();
            } else {
                document.getElementById('error-message').textContent = 'Invalid token format. Please log in again.';
                this.showLogin();
            }
            return null;
        }
    }

    /**
     * Render the user's basic information section
     * @param {Object} user - User data containing login and id
     */
    renderBasicInfo(user) {
        const basicInfoContainer = document.getElementById('basic-info');
        if (!basicInfoContainer) return;

        basicInfoContainer.innerHTML = `
            <h2>${user.firstName} ${user.lastName}</h2>
            <p>Login: ${user.login}</p>
            <p>Email: ${user.email}</p>
        `;
    }

    /**
     * Render audit statistics
     * @param {Object} result - GraphQL query result
     */
    renderAuditInfo(result) {
        console.log('Audit data:', result); // Debug log
        
        const totalAudits = result.audits.length;
        const passed = result.audits.filter(audit => audit.grade >= 1).length;
        const failed = totalAudits - passed;
        const successRate = totalAudits > 0 ? ((passed / totalAudits) * 100).toFixed(1) : '0.0';

        console.log('Calculated audit stats:', { totalAudits, passed, failed }); // Debug log

        document.getElementById('total-audits').textContent = totalAudits;
        document.getElementById('passed-audits').textContent = passed;
        document.getElementById('failed-audits').textContent = failed;

        const successRateElement = document.getElementById('success-rate');
        if (successRateElement) {
            successRateElement.textContent = `${successRate}%`;
        }
    }

    /**
     * Render skills information
     * @param {Array} skills - Array of skills
     */
    renderSkills(skills) {
        const skillsContainer = document.getElementById('skills-container');
        if (!skillsContainer) return;

        const skillsList = skills.map(skill => {
            const skillName = skill.type.replace('skill_', '').toUpperCase();
            return `
                <div class="skill-item">
                    <span class="skill-name">${skillName}</span>
                    <span class="skill-level">${skill.amount}</span>
                </div>
            `;
        }).join('')

        skillsContainer.innerHTML = `
            <h3>Skills</h3>
            <div class="skills-list">
                ${skillsList}
            </div>
        `;
    }

    /**
     * Render level information
     * @param {Object} eventUser - Event user data
     */
    renderLevelInfo(eventUser) {
        const levelContainer = document.getElementById('level-info');
        if (!levelContainer) return;

        levelContainer.innerHTML = `
            <div class="level-display">
                <h3>Current Level</h3>
                <span class="level-number">${eventUser.level}</span>
            </div>
        `;
    }

    /**
     * Handle the graph type selection dropdown change
     * @param {Event} e - Dropdown change event
     */
    handleGraphChange(e) {
        const graphType = e.target.value;
        const container = document.getElementById('graph');
        container.innerHTML = ''; // Clear the current graph

        if (this.data?.user?.[0]) {
            const userData = this.data.user[0];
            
            if (graphType === 'xp') {
                renderXPOverTime(container, userData.xp_transactions);
            } else if (graphType === 'ratio') {
                const passed = userData.progresses.filter(p => p.grade >= 1).length;
                const failed = userData.progresses.filter(p => p.grade !== null && p.grade < 1).length;
                const ratioData = [
                    { label: 'Passed', value: passed },
                    { label: 'Failed', value: failed }
                ];
                renderProjectRatio(container, ratioData);
            }
        }
    }

    /**
     * Render the graph
     * @param {string} type - Type of graph to display ('xp' or 'ratio')
     * @param {Array} data - Data for the graph
     */
    async renderGraph(type, data) {
        const graphContainer = document.getElementById('graph');
        graphContainer.innerHTML = ''; // Clear previous graph
        
        // Set a fixed height for the graph container
        graphContainer.style.height = '400px';
        
        if (type === 'ratio') {
            renderProjectRatio(graphContainer, data);
        } else {
            renderXPOverTime(graphContainer, data);
        }
    }

    /**
     * Render XP progress
     * @param {Array} transactions - Array of XP transactions
     */
    renderXPProgress(transactions) {
        if (!transactions || transactions.length === 0) {
            console.log('No XP transactions to display');
            document.getElementById('graph-container').innerHTML = 'No XP data available';
            return;
        }

        const container = document.getElementById('graph-container');
        if (!container) {
            console.error('Graph container not found');
            return;
        }

        // Clear previous graph
        container.innerHTML = '';

        // Import graph rendering function
        import('./graphs.js').then(module => {
            module.renderXPOverTime(container, transactions);
        }).catch(error => {
            console.error('Failed to load graph module:', error);
            container.innerHTML = 'Failed to load XP graph';
        });
    }

    initializeGraph(data) {
        const graphTypeSelect = document.getElementById('graph-type');
        const container = document.getElementById('graph-container');

        if (!graphTypeSelect || !container) {
            console.error('Graph elements not found');
            return;
        }

        // Clear previous graph
        container.innerHTML = '';

        const renderGraph = () => {
            const selectedType = graphTypeSelect.value;
            container.innerHTML = ''; // Clear previous graph

            import('./graphs.js').then(module => {
                if (selectedType === 'xp-over-time') {
                    module.renderXPOverTime(container, data);
                } else if (selectedType === 'project-ratio') {
                    module.renderProjectRatio(container, data);
                }
            }).catch(error => {
                console.error('Failed to load graph module:', error);
                container.innerHTML = 'Failed to load graph';
            });
        };

        // Initial render
        renderGraph();

        // Update graph when type changes
        graphTypeSelect.addEventListener('change', renderGraph);
    }

    formatFileSize(bytes) {
        const kb = bytes / 1000;
        if (kb >= 1000) {
            return `${Math.floor(kb / 1000)}MB`;
        }
        return `${Math.floor(kb)}kB`;
    }

    renderAuditRatio(user) {
        // Get all required DOM elements first using IDs
        const elements = {
            upBar: document.getElementById('up-bar'),
            downBar: document.getElementById('down-bar'),
            upValue: document.getElementById('up-value'),
            downValue: document.getElementById('down-value'),
            ratioValue: document.getElementById('ratio-value')
        };

        // Log found elements for debugging
        console.log('Found DOM elements:', {
            upBarExists: !!elements.upBar,
            downBarExists: !!elements.downBar,
            upValueExists: !!elements.upValue,
            downValueExists: !!elements.downValue,
            ratioValueExists: !!elements.ratioValue
        });

        // Check if all elements exist
        const missingElements = Object.entries(elements)
            .filter(([key, element]) => !element)
            .map(([key]) => key);

        if (missingElements.length > 0) {
            console.error('Missing DOM elements:', missingElements);
            return;
        }

        // Parse values as numbers and handle null/undefined
        const totalUp = user.totalUp ? parseInt(user.totalUp) : 0;
        const totalDown = user.totalDown ? parseInt(user.totalDown) : 0;

        console.log('Processing audit ratio:', {
            rawTotalUp: user.totalUp,
            rawTotalDown: user.totalDown,
            parsedTotalUp: totalUp,
            parsedTotalDown: totalDown
        });
        
        // Calculate ratio with one decimal place
        const ratio = totalDown > 0 ? (totalUp / totalDown).toFixed(1) : '0.0';

        // Format size to show kB or MB as appropriate
        const formatSize = bytes => {
            const kb = bytes / 1024;
            if (kb < 1024) {
                // Less than 1MB, show as kB
                return `${Math.round(kb)} kB`;
            } else {
                // 1MB or more, show as MB with 2 decimal places
                return `${(kb / 1024).toFixed(2)} MB`;
            }
        };
        
        // Update text values
        elements.upValue.textContent = formatSize(totalUp);
        elements.downValue.textContent = formatSize(totalDown);
        elements.ratioValue.textContent = `Ratio: ${ratio}`;

        // Calculate bar widths
        const maxValue = Math.max(totalUp, totalDown);
        if (maxValue > 0) {
            const upWidth = (totalUp / maxValue * 100);
            const downWidth = (totalDown / maxValue * 100);
            console.log('Setting bar widths:', { upWidth, downWidth });
            elements.upBar.style.width = `${upWidth}%`;
            elements.downBar.style.width = `${downWidth}%`;
        } else {
            elements.upBar.style.width = '0%';
            elements.downBar.style.width = '0%';
        }

        console.log('Audit ratio updated successfully');
    }

    updateAuditStats(stats) {
        document.getElementById('total-audits').textContent = stats.total;
        document.getElementById('passed-audits').textContent = stats.passed;
        document.getElementById('failed-audits').textContent = stats.failed;
        const successRate = (stats.passed / stats.total * 100).toFixed(1);
        document.getElementById('success-rate').textContent = `${successRate}%`;
    }

    // Initialize the app
}

const app = new App();

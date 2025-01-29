import { default as jwtDecode } from 'https://unpkg.com/jwt-decode@3.1.2/build/jwt-decode.esm.js';
import { GraphQLClient, GET_USER_DATA } from './graphql.js';
import { renderXPOverTime, renderSkillsRadar } from './graphs.js';

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
        this.client = new GraphQLClient();
        this.setupEventListeners();
        
        // Check for token in localStorage first
        const token = localStorage.getItem('token');
        if (token) {
            this.client.setToken(token);
            this.loadProfileData();
            this.showProfile();
        } else {
            // Only redirect if no token found
            this.showLogin();
        }
    }

    /**
     * Set up event listeners for login form
     */
    setupEventListeners() {
        const loginForm = document.getElementById('login-form');
        if (loginForm) {
            loginForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleLogin();
            });
        }

        const logoutButton = document.getElementById('logout');
        if (logoutButton) {
            logoutButton.addEventListener('click', () => this.handleLogout());
        }

        // Add show more/less event listeners
        const showMoreProjects = document.getElementById('show-more-projects');
        const showLessProjects = document.getElementById('show-less-projects');
        const showMoreAudits = document.getElementById('show-more-audits');
        const showLessAudits = document.getElementById('show-less-audits');

        if (showMoreProjects) {
            showMoreProjects.addEventListener('click', () => this.toggleProjectsList(true));
        }
        if (showLessProjects) {
            showLessProjects.addEventListener('click', () => this.toggleProjectsList(false));
        }
        if (showMoreAudits) {
            showMoreAudits.addEventListener('click', () => this.toggleAuditsList(true));
        }
        if (showLessAudits) {
            showLessAudits.addEventListener('click', () => this.toggleAuditsList(false));
        }
    }

    /**
     * Toggle the visibility of projects in the list
     * @param {boolean} showMore - Whether to show more or less projects
     */
    toggleProjectsList(showMore) {
        const tbody = document.getElementById('projects-tbody');
        const rows = tbody.getElementsByTagName('tr');
        const showMoreBtn = document.getElementById('show-more-projects');
        const showLessBtn = document.getElementById('show-less-projects');

        // Show all rows if showMore is true, otherwise only show first 5
        for (let i = 5; i < rows.length; i++) {
            rows[i].style.display = showMore ? '' : 'none';
        }

        // Toggle button visibility
        showMoreBtn.classList.toggle('hidden', showMore);
        showLessBtn.classList.toggle('hidden', !showMore);
    }

    /**
     * Toggle the visibility of audits in the list
     * @param {boolean} showMore - Whether to show more or less audits
     */
    toggleAuditsList(showMore) {
        const tbody = document.getElementById('audits-tbody');
        const rows = tbody.getElementsByTagName('tr');
        const showMoreBtn = document.getElementById('show-more-audits');
        const showLessBtn = document.getElementById('show-less-audits');

        // Show all rows if showMore is true, otherwise only show first 5
        for (let i = 5; i < rows.length; i++) {
            rows[i].style.display = showMore ? '' : 'none';
        }

        // Toggle button visibility
        showMoreBtn.classList.toggle('hidden', showMore);
        showLessBtn.classList.toggle('hidden', !showMore);
    }

    /**
     * Show the login form
     */
    showLogin() {
        document.getElementById('login-section')?.classList.remove('hidden');
        document.getElementById('profile-section')?.classList.add('hidden');
    }

    /**
     * Show the profile section
     */
    showProfile() {
        document.getElementById('login-section')?.classList.add('hidden');
        document.getElementById('profile-section')?.classList.remove('hidden');
    }

    /**
     * Handle login form submission
     */
    async handleLogin() {
        try {
            const username = document.getElementById('username').value;
            const password = document.getElementById('password').value;

            // Create credentials string
            const credentials = btoa(`${username}:${password}`);

            const response = await fetch('https://learn.reboot01.com/api/auth/signin', {
                method: 'POST',
                headers: {
                    'Authorization': `Basic ${credentials}`
                }
            });

            if (!response.ok) {
                const errorData = await response.text();
                console.error('Login response error:', errorData);
                throw new Error('Login failed');
            }

            const token = await response.text();
            if (!token) {
                throw new Error('No token received');
            }

            // Store the cleaned token
            const cleanToken = token.trim().replace(/^["']|["']$/g, '');
            localStorage.setItem('token', cleanToken);
            this.client.setToken(cleanToken);
            
            // Load profile data before showing profile
            await this.loadProfileData();
            
            // Show profile section
            this.showProfile();
            
            // Clear login form
            document.getElementById('username').value = '';
            document.getElementById('password').value = '';
            document.getElementById('error-message').textContent = '';
        } catch (error) {
            console.error('Login error:', error);
            document.getElementById('error-message').textContent = 'Login failed. Please check your credentials.';
        }
    }

    /**
     * Handle logout button click
     */
    handleLogout() {
        localStorage.removeItem('token');
        this.client.setToken(null);
        this.showLogin();
        window.location.reload(); // Ensure clean state on logout
    }

    /**
     * Render the list of recent projects
     * @param {Array} progresses - Array of project progress data
     */
    renderProjectsList(progresses) {
        const tbody = document.getElementById('projects-tbody');
        if (!tbody) return;

        tbody.innerHTML = '';
        const sortedProjects = progresses
            .filter(p => p.grade !== null)
            .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));

        sortedProjects.forEach((project, index) => {
            const row = document.createElement('tr');
            row.style.display = index >= 5 ? 'none' : ''; // Hide rows beyond the first 5

            const nameCell = document.createElement('td');
            nameCell.textContent = project.object.name;

            const dateCell = document.createElement('td');
            dateCell.textContent = new Date(project.updatedAt).toLocaleDateString();

            const statusCell = document.createElement('td');
            statusCell.textContent = project.grade >= 1 ? 'Passed' : 'Failed';
            statusCell.className = project.grade >= 1 ? 'passed' : 'failed';

            row.appendChild(nameCell);
            row.appendChild(dateCell);
            row.appendChild(statusCell);
            tbody.appendChild(row);
        });

        // Show/hide "Show More" button based on number of projects
        const showMoreBtn = document.getElementById('show-more-projects');
        const showLessBtn = document.getElementById('show-less-projects');
        if (showMoreBtn && showLessBtn) {
            showMoreBtn.classList.toggle('hidden', sortedProjects.length <= 5);
            showLessBtn.classList.add('hidden');
        }
    }

    /**
     * Render the list of recent audits
     * @param {Array} audits - Array of audit data
     */
    renderRecentAudits(audits) {
        const tbody = document.getElementById('audits-tbody');
        if (!tbody) return;

        tbody.innerHTML = '';
        audits.forEach((audit, index) => {
            const row = document.createElement('tr');
            row.style.display = index >= 5 ? 'none' : ''; // Hide rows beyond the first 5

            const projectCell = document.createElement('td');
            projectCell.textContent = audit.group?.object?.name || 'Unknown Project';

            const dateCell = document.createElement('td');
            dateCell.textContent = new Date(audit.createdAt).toLocaleDateString();

            const resultCell = document.createElement('td');
            resultCell.textContent = audit.grade >= 1 ? 'Passed' : 'Failed';
            resultCell.className = audit.grade >= 1 ? 'passed' : 'failed';

            row.appendChild(projectCell);
            row.appendChild(dateCell);
            row.appendChild(resultCell);
            tbody.appendChild(row);
        });

        // Show/hide "Show More" button based on number of audits
        const showMoreBtn = document.getElementById('show-more-audits');
        const showLessBtn = document.getElementById('show-less-audits');
        if (showMoreBtn && showLessBtn) {
            showMoreBtn.classList.toggle('hidden', audits.length <= 5);
            showLessBtn.classList.add('hidden');
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
     * Get the user ID from the token
     * @returns {number|null} User ID or null if token is invalid
     */
    getUserIdFromToken() {
        try {
            const token = localStorage.getItem('token');
            if (!token) {
                this.showLogin();
                return null;
            }
            
            const cleanToken = token.trim().replace(/^["']|["']$/g, '');
            const decoded = jwtDecode(cleanToken);
            return decoded.sub;
        } catch (error) {
            console.error('Error decoding token:', error);
            localStorage.removeItem('token');
            this.showLogin();
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
        
        // Format size to show MB with 2 decimal places
        const formatSize = bytes => {
            // Convert bytes to MB (1 MB = 1,000,000 bytes)
            const mb = bytes / 1000000;
            return `${mb.toFixed(2)} MB`;
        };
        
        // Update text values with exact values from the API
        elements.upValue.textContent = formatSize(totalUp);
        elements.downValue.textContent = formatSize(totalDown);
        
        // Calculate and display ratio with one decimal place
        const ratio = totalDown > 0 ? (totalUp / totalDown).toFixed(1) : '0.0';
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

                // Render skills radar chart
                const graphContainer = document.getElementById('graph');
                if (graphContainer && user.skills) {
                    renderSkillsRadar(graphContainer, user.skills);
                }
                
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
                        totalXpElement.textContent = this.formatFileSize(totalXP);
                    }
                    if (projectsCompletedElement && user.progresses) {
                        const uniqueProjects = new Set(user.progresses.filter(p => p.grade !== null).map(p => p.object.id));
                        projectsCompletedElement.textContent = uniqueProjects.size;
                    }

                    // Render XP graph
                    const xpGraphContainer = document.getElementById('xp-graph');
                    if (xpGraphContainer) {
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

    // Initialize the app
}

const app = new App();

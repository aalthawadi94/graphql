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
        this.client = null;
        this.data = null;
        this.setupEventListeners();
        this.checkAuth();
    }

    /**
     * Set up event listeners for interactive elements
     * Primarily handles the graph type selection dropdown
     */
    setupEventListeners() {
        document.getElementById('login-form').addEventListener('submit', (e) => this.handleLogin(e));
        document.getElementById('logout-btn').addEventListener('click', () => this.handleLogout());
        document.getElementById('graph-type').addEventListener('change', (e) => this.handleGraphChange(e));
    }

    /**
     * Check if the user is authenticated and display the profile or login page accordingly
     */
    checkAuth() {
        if (this.token) {
            this.client = new GraphQLClient(this.token);
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
            this.client = new GraphQLClient(token);
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
        this.client = null;
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
        this.loadProfileData();
    }

    /**
     * Main function to load and display all profile data
     * This is the entry point for data fetching and rendering
     */
    async loadProfileData() {
        try {
            const userId = this.getUserIdFromToken();
            if (!userId) {
                throw new Error('No valid user ID found in token');
            }

            const result = await this.client.query(GET_USER_DATA, { userId });
            console.log('Profile data loaded:', result);

            if (result.data?.user?.length > 0) {
                const userData = result.data.user[0];
                this.data = result.data;
                
                // Update basic info
                this.renderBasicInfo(userData);
                this.renderXPInfo(userData.xp_transactions);
                
                // Update projects list
                if (userData.progresses) {
                    this.renderProjectsList(userData.progresses);
                }

                // Update audit stats and list
                if (userData.recent_audits && userData.audits_aggregate?.nodes) {
                    console.log('Initial arrays length:', {
                        recent_audits: userData.recent_audits.length,
                        audit_nodes: userData.audits_aggregate.nodes.length
                    });

                    const currentDate = new Date('2025-01-16T23:56:44+03:00');

                    // Filter out invalid audit nodes (future dates, null grades)
                    const validAuditNodes = userData.audits_aggregate.nodes.filter(node => {
                        const nodeDate = new Date(node.createdAt);
                        return node.grade !== null && 
                               nodeDate <= currentDate &&
                               (node.group?.object?.name || node.path);
                    });

                    console.log('Valid audit nodes after filtering:', validAuditNodes.length);

                    // Sort both arrays by date descending
                    const sortedAggregateAudits = [...validAuditNodes].sort(
                        (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
                    );
                    
                    // Filter and sort recent audits
                    const validRecentAudits = userData.recent_audits.filter(audit => {
                        const auditDate = new Date(audit.createdAt);
                        return auditDate <= currentDate;
                    });

                    console.log('Valid recent audits after filtering:', validRecentAudits.length);

                    // Create audits array with all passed initially
                    const audits = [...validRecentAudits]
                        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
                        .map(audit => ({
                            ...audit,
                            status: 'passed'
                        }));

                    // Match based on array index for failed grades
                    sortedAggregateAudits.forEach((aggregateAudit, index) => {
                        if (aggregateAudit.grade === 0 && index < audits.length) {
                            console.log('Marking as failed:', {
                                index,
                                aggregateAudit: {
                                    project: aggregateAudit.group?.object?.name,
                                    date: aggregateAudit.createdAt,
                                    grade: aggregateAudit.grade
                                },
                                matchedAudit: {
                                    project: audits[index].object?.name || audits[index].path,
                                    date: audits[index].createdAt
                                }
                            });
                            audits[index].status = 'failed';
                        }
                    });

                    // Calculate stats
                    const totalAudits = audits.length;
                    const passedAuditsCount = audits.filter(audit => audit.status === 'passed').length;
                    const failedAuditsCount = totalAudits - passedAuditsCount;
                    const successRate = totalAudits > 0 ? (passedAuditsCount / totalAudits * 100) : 0;

                    console.log('Final stats:', {
                        total: totalAudits,
                        passed: passedAuditsCount,
                        failed: failedAuditsCount,
                        rate: successRate
                    });

                    // Update stats display
                    document.getElementById('total-audits').textContent = totalAudits;
                    document.getElementById('passed-audits').textContent = passedAuditsCount;
                    document.getElementById('failed-audits').textContent = failedAuditsCount;
                    document.getElementById('success-rate').textContent = successRate.toFixed(1) + '%';

                    // Render recent audits (only show 10 most recent)
                    const recentAudits = audits.slice(0, 10);
                    this.renderRecentAudits(recentAudits);
                }

                // Initialize graph with XP data
                this.renderXPProgress(userData.xp_transactions);
            } else {
                console.error('No user data found in response:', result);
                document.getElementById('error-message').textContent = 'Failed to load user data';
            }
        } catch (error) {
            console.error('Failed to load profile data:', error);
            document.getElementById('error-message').textContent = 'Failed to load profile data: ' + error.message;
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
                this.client = null;
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
        // User data comes as an array, get the first user
        const userData = Array.isArray(user) ? user[0] : user;
        
        if (!userData?.login) {
            console.error('No valid user data available:', user);
            return;
        }
        
        document.getElementById('user-login').textContent = userData.login;
        document.getElementById('user-id').textContent = userData.id;
        console.log('User info rendered:', userData);
    }

    /**
     * Render XP-related information
     * @param {Array} transactions - Array of XP transactions
     */
    renderXPInfo(transactions) {
        if (!Array.isArray(transactions)) {
            console.error('Invalid XP data structure:', transactions);
            document.getElementById('total-xp').textContent = '0kB';
            document.getElementById('projects-completed').textContent = '0';
            return;
        }

        const totalXP = transactions.reduce((sum, t) => sum + (parseInt(t.amount) || 0), 0);
        const completedProjects = transactions.length;

        document.getElementById('total-xp').textContent = `${(totalXP / 1000).toFixed(0)}kB`;
        document.getElementById('projects-completed').textContent = completedProjects;

        console.log('XP Info:', {
            totalXP,
            completedProjects,
            transactionsCount: transactions.length
        });
    }

    /**
     * Render the list of recent projects
     * @param {Array} progresses - Array of project progresses
     */
    renderProjectsList(progresses) {
        const projectsTbody = document.getElementById('projects-tbody');
        if (!projectsTbody || !progresses) return;

        projectsTbody.innerHTML = '';
        
        // Take first 10 projects (already sorted by date desc from GraphQL)
        const recentProjects = progresses.slice(0, 10);

        recentProjects.forEach(project => {
            const row = document.createElement('tr');
            
            // Check if it's a valid project
            if (!project.object?.type === 'project') return;
            
            let status;
            if (project.grade === null) {
                status = 'In Progress';
            } else if (project.grade > 0) {
                status = 'Passed';
            } else {
                status = 'Failed';
            }
            
            const date = new Date(project.updatedAt).toLocaleDateString();
            row.innerHTML = `
                <td>${project.object.name}</td>
                <td>${date}</td>
                <td class="${status.toLowerCase().replace(' ', '-')}">${status}</td>
            `;
            projectsTbody.appendChild(row);
        });
    }

    /**
     * Render the list of recent audits
     * @param {Array} audits - Array of recent audits
     * @param {Array} progresses - Array of progresses
     */
    renderRecentAudits(audits, progresses) {
        const auditsTbody = document.getElementById('audits-tbody');
        if (!auditsTbody) return;

        auditsTbody.innerHTML = '';
        
        // Audits are already sorted and limited by the GraphQL query
        audits.forEach(audit => {  
            const row = document.createElement('tr');
            
            // Format the date
            const date = new Date(audit.createdAt).toLocaleDateString('en-US', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit'
            });
            
            // Extract XP amount from audit
            const xpAmount = audit.amount || 0;
            const status = xpAmount > 0 ? 'Passed' : 'Failed';
            
            // Get project name from the path
            const projectName = audit.object?.name || audit.path.split('/').pop() || 'Unknown Project';
            
            row.innerHTML = `
                <td>${projectName}</td>
                <td>${date}</td>
                <td class="${status.toLowerCase()}">${status}</td>
            `;
            auditsTbody.appendChild(row);
        });
    }

    /**
     * Render audit statistics
     * @param {Object} result - GraphQL query result
     */
    renderAuditInfo(result) {
        console.log('Audit data:', result); // Debug log
        
        const totalAudits = result.user?.[0]?.all_audits?.aggregate?.count || 0;
        const passed = result.user?.[0]?.passed_audits?.aggregate?.count || 0;
        const failed = result.user?.[0]?.failed_audits?.aggregate?.count || 0;

        console.log('Calculated audit stats:', { totalAudits, passed, failed }); // Debug log

        document.getElementById('total-audits').textContent = totalAudits;
        document.getElementById('passed-audits').textContent = passed;
        document.getElementById('failed-audits').textContent = failed;

        const successRate = totalAudits > 0 ? ((passed / totalAudits) * 100).toFixed(1) : '0.0';
        document.getElementById('success-rate').textContent = `${successRate}%`;
    }

    /**
     * Handle the graph type selection dropdown change
     * @param {Event} e - Dropdown change event
     */
    handleGraphChange(e) {
        const type = e.target.value;
        const graphContainer = document.getElementById('graph');
        
        if (type === 'ratio') {
            const passed = parseInt(document.getElementById('passed-audits').textContent) || 0;
            const failed = parseInt(document.getElementById('failed-audits').textContent) || 0;
            
            // Only render if we have valid data
            if (passed > 0 || failed > 0) {
                const data = [
                    { label: 'Passed', value: passed },
                    { label: 'Failed', value: failed }
                ];
                renderProjectRatio(graphContainer, data);
            } else {
                console.error('No valid audit data available');
                graphContainer.innerHTML = '<div class="error-message">No audit data available</div>';
            }
        } else {
            // For XP progress graph
            const transactions = this.data?.user?.transactions || [];
            if (transactions.length > 0) {
                renderXPOverTime(graphContainer, transactions);
            } else {
                console.error('No XP transaction data available');
                graphContainer.innerHTML = '<div class="error-message">No XP data available</div>';
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
}

// Initialize the app
new App();

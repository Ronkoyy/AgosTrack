const SUPABASE_URL = 'https://nlduwtqzuaogqzvabdey.supabase.co'; 
const SUPABASE_ANON_KEY = 'sb_publishable_Zm4qZfegIRn0BhEUbxXk2Q_Jy2t8S3q'; 
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
//to let the user stay lgged in even after refreshing the page.
let currentUserEmail = sessionStorage.getItem("loggedInEmail") || null;
let currentUserName = sessionStorage.getItem("loggedInName") || "Ranger"; 
const currentPage = window.location.pathname.split("/").pop();
const protectedPages = ["dashboard.html", "map.html", "report.html", "profile.html"];

const app = {
    map: null, 
    markers: [], 
    tempMarker: null,
    wasteChartInstance: null,
    statusChartInstance: null,
    severityChartInstance: null, 
    dashboardData: null, 
    reportToDelete: null, 
    allReports: [],

    async init() {
        console.log("AgosTrack Supabase Engine Initializing...");
        
        //check if the user is logged in and redirect to login page if not.
        const { data: { session } } = await supabaseClient.auth.getSession();
        if (session && session.user) {
            currentUserEmail = session.user.email;
            sessionStorage.setItem("loggedInEmail", currentUserEmail);
        } else if (protectedPages.includes(currentPage) || (currentPage === '' && protectedPages.includes('dashboard.html'))) {
            
            window.location.href = "login.html";
            return;
        }

        this.fixLeafletIcons();
        this.updateGlobalUI();
         if (currentPage === 'dashboard.html' || currentPage === '') this.loadDash();
        if (currentPage === 'map.html') this.loadMap();
        if (currentPage === 'report.html') this.loadPickerMap();
        if (currentPage === 'profile.html') this.loadProfile();

        
        // Attaches events to our forms so they don't refresh the page when submitted
        const loginForm = document.getElementById('login-form');
        if (loginForm) loginForm.addEventListener('submit', (e) => { e.preventDefault(); this.login(e); });

        const signupForm = document.getElementById('signup-form');
        if (signupForm) signupForm.addEventListener('submit', (e) => { e.preventDefault(); this.signup(e); });

        const reportForm = document.getElementById('report-form');
        if (reportForm) reportForm.addEventListener('submit', (e) => { e.preventDefault(); this.handleReport(e); });

        const editProfileForm = document.getElementById('edit-profile-form');
        if (editProfileForm) editProfileForm.addEventListener('submit', (e) => { e.preventDefault(); this.saveProfile(e); });

                // --- UI LISTENERS ---
        const searchInput = document.getElementById('search-ledger');
        if (searchInput) searchInput.addEventListener('input', () => this.renderLedger());

        const sortSelect = document.getElementById('sort-ledger');
        if (sortSelect) sortSelect.addEventListener('change', () => this.renderLedger());

        const editBtn = document.getElementById('edit-profile-btn');
        if (editBtn) editBtn.addEventListener('click', () => this.openEditProfile());

        // --- MOBILE SIDEBAR LOGIC ---
        const toggleSidebar = () => {
            document.getElementById('sidebar').classList.toggle('open');
            document.querySelector('.sidebar-overlay').classList.toggle('open');
        };

        const menuBtn = document.querySelector('.mobile-menu-btn');
        const closeBtn = document.querySelector('.close-sidebar-btn');
        const overlay = document.querySelector('.sidebar-overlay');

        if (menuBtn) menuBtn.addEventListener('click', toggleSidebar);
        if (closeBtn) closeBtn.addEventListener('click', toggleSidebar);
        if (overlay) overlay.addEventListener('click', toggleSidebar);
    },   
    
    showNotification(message, type = 'success') {
        if (type === 'success') {
            let pill = document.getElementById('global-success-pill');
            if (!pill) {
                pill = document.createElement('div');
                pill.id = 'global-success-pill';
                pill.className = 'success-pill';
                document.body.appendChild(pill);
            }
            pill.classList.remove('show');
            pill.innerText = message;
            setTimeout(() => pill.classList.add('show'), 50);
            setTimeout(() => pill.classList.remove('show'), 3000);
        } else {
            let errorDisplay = document.querySelector('.error-text');
            if (errorDisplay) {
                errorDisplay.innerText = message;
                errorDisplay.style.display = 'block';
                setTimeout(() => { errorDisplay.style.display = 'none'; }, 5000);
            } else {
                alert(message);
            }
        }
    },

     async updateGlobalUI() {
        // 1. Update the welcome text
        const display = document.getElementById('user-name-display');
        if (display && currentUserName) display.innerText = currentUserName;

        // 2. Update the new Top Nav profile name
        const topNavName = document.getElementById('top-nav-profile-name');
        if (topNavName && currentUserName) topNavName.innerText = currentUserName;

        // 3. Fetch the profile picture dynamically from Supabase
        if (currentUserEmail) {
            try {
                const { data: user } = await supabaseClient.from('tbl_users').select('profilePic').eq('email', currentUserEmail).single();
                const topNavPic = document.getElementById('top-nav-profile-pic');
                
                if (topNavPic) {
                    if (user && user.profilePic && user.profilePic !== "NULL") {
                        // If they uploaded a picture, use it!
                        topNavPic.src = user.profilePic;
                    } else {
                        // If no picture, generate a cool initial avatar based on their name
                        topNavPic.src = `https://ui-avatars.com/api/?name=${currentUserName}&background=009688&color=fff&bold=true`;
                    }
                }
            } catch (err) {
                console.error("Could not load top nav profile picture", err);
            }
        }
    },

    //Authentication

    async login(e) {
        const formData = new FormData(e.target);
        const email = formData.get('email').toLowerCase().trim();
        const password = formData.get('password');
        
        const btn = e.target.querySelector('button[type="submit"]');
        let originalText = btn.innerText;
        btn.innerText = "Authenticating...";
        btn.disabled = true;

        // 1. Authenticate with Supabase's secure Auth server
        const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
        
        if (error) {
            this.showNotification(error.message, 'error');
            btn.innerText = originalText;
            btn.disabled = false;
        } else {
            // 2. If successful, fetch the user's custom name from our tbl_users database
            const { data: userProfile } = await supabaseClient.from('tbl_users').select('name').eq('email', email).single();
            sessionStorage.setItem('loggedInEmail', email);
            sessionStorage.setItem('loggedInName', userProfile ? userProfile.name : "Ranger");
            window.location.href = 'dashboard.html';
        }
    },
        async signup(e) {
        const formData = new FormData(e.target);
        const name = formData.get('name');
        const email = formData.get('email').toLowerCase().trim();
        const password = formData.get('password');
        
        const btn = e.target.querySelector('button[type="submit"]');
        let originalText = btn.innerText;
        btn.innerText = "Registering...";
        btn.disabled = true;

        // 1. Create the secure login credentials
        const { data, error } = await supabaseClient.auth.signUp({ email, password });
        
        if (error) {
            this.showNotification(error.message, 'error');
            btn.innerText = originalText;
            btn.disabled = false;
            return;
        }

        // 2. Insert their profile information into our custom public table
        const { error: dbError } = await supabaseClient.from('tbl_users').insert([
            { email: email, name: name, rank: 'Volunteer' }
        ]);

        if (dbError) {
            this.showNotification("Error saving profile details.", 'error');
            btn.innerText = originalText;
            btn.disabled = false;
        } else {
            this.showNotification('Registration successful! Please login.', 'success');
            setTimeout(() => window.location.href = 'login.html', 1500);
        }
    },

    //Dashboard Logic
     async loadDash() {
        console.log("Fetching Cloud Dashboard Data...");
        const email = currentUserEmail;

        //inner join to get the user's name along with their reports
        try {
            const { data: reports, error } = await supabaseClient
                .from('tbl_reports')
                .select('*, tbl_users(name)') 
                .eq('userEmail', email)
                .order('id', { ascending: false });

                 if (error) throw error;
            this.allReports = reports || [];

            // Fetch Chart Data including Severity for our new Pie Chart
            let formattedChartData = [];
            let severityCounts = { 'High': 0, 'Medium': 0, 'Low': 0 }; 
            const reportIds = this.allReports.map(r => r.id);

            // Fetch pollution details ONLY for the reports this user has submitted
            if (reportIds.length > 0) {
                const { data: chartData } = await supabaseClient
                    .from('tbl_pollution')
                    .select('wasteType, severity') 
                    .in('reportId', reportIds);

                // Tally up the data for Chart.js
                if (chartData && chartData.length > 0) {
                    const wasteCounts = {};
                    chartData.forEach(item => {
                        wasteCounts[item.wasteType] = (wasteCounts[item.wasteType] || 0) + 1;
                        if(item.severity) {
                            severityCounts[item.severity] = (severityCounts[item.severity] || 0) + 1;
                        }
                    });
                    
                    formattedChartData = Object.keys(wasteCounts).map(key => ({
                        wasteType: key,
                        count: wasteCounts[key]
                    }));
                }
            }

            // Calculate simple stats for the top cards
            let pollutionCount = 0;
            let marineCount = 0;
            this.allReports.forEach(r => {
                if(r.type === 'pollution') pollutionCount++;
                if(r.type === 'marine') marineCount++;
            });

            // Package the data and send it to the UI and Charts
            let stats = {
                pollution: pollutionCount,
                marine: marineCount,
                recent: this.allReports,
                chart: formattedChartData,
                severity: severityCounts 
            };

            if(document.getElementById('stat-pollution')) document.getElementById('stat-pollution').innerText = stats.pollution;
            if(document.getElementById('stat-marine')) document.getElementById('stat-marine').innerText = stats.marine;

            this.renderLedger(); // Draw the table

            // Build the Recent Activity Feed dynamically
            const activityFeed = document.getElementById('activity-feed');
            if(activityFeed) {
                activityFeed.innerHTML = '';
                if(this.allReports.length === 0) {
                    activityFeed.innerHTML = '<p style="color:#9ca3af; text-align:center; padding:10px;">Coastline is clear.</p>';
                } else {
                    this.allReports.slice(0, 4).forEach(r => {
                        let iconClass = r.type === 'pollution' ? 'fa-triangle-exclamation' : 'fa-otter';
                        let iconColor = r.type === 'pollution' ? '#ef4444' : '#0ea5e9';
                        // Utilizing the joined data!
                        let rangerName = r.tbl_users ? r.tbl_users.name : currentUserName;
                        
                        activityFeed.innerHTML += `
                            <div style="display:flex; align-items:flex-start; gap:15px; margin-bottom:15px; border-bottom:1px solid #f1f5f9; padding-bottom:10px;">
                                <div style="background:${iconColor}20; width:40px; height:40px; border-radius:50%; display:flex; align-items:center; justify-content:center; flex-shrink:0;">
                                    <i class="fa-solid ${iconClass}" style="color:${iconColor};"></i>
                                </div>
                                <div>
                                    <p style="margin:0; font-weight:600;">${r.placeName}</p>
                                    <p style="margin:0; font-size:0.8rem; color:#64748b;">Reported by ${rangerName}</p>
                                </div>
                            </div>`;
                    });
                }
            }

            this.initCharts(stats);

        } catch (error) {
            console.error("Dashboard Sync Error:", error);
            this.showNotification("Error loading dashboard data.", "error");
        }
    },




















};
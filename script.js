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

    //Seaerch and sort logic for better ux on the dashboard.

     renderLedger() {
        const tbody = document.getElementById('joined-reports-body');
        if (!tbody) return;

        const searchTerm = (document.getElementById('search-ledger')?.value || "").toLowerCase();
        const sortValue = document.getElementById('sort-ledger')?.value || 'newest';

        // Filter the array based on user input
        let filtered = this.allReports.filter(r => 
            (r.placeName || "").toLowerCase().includes(searchTerm) || 
            (r.type || "").toLowerCase().includes(searchTerm) ||
            r.id.toString().includes(searchTerm)
        );

        // Sort the array based on user selection
        filtered.sort((a, b) => {
            if (sortValue === 'newest') return b.id - a.id;
            if (sortValue === 'oldest') return a.id - b.id;
            if (sortValue === 'pending') return a.status === 'Pending' ? -1 : 1;
            if (sortValue === 'completed') return a.status === 'Completed' ? -1 : 1;
            return 0;
        });

        // Inject the HTML
        tbody.innerHTML = '';
        if (filtered.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; padding: 20px; color:#9ca3af;">No reports found.</td></tr>';
        } else {
            filtered.forEach(r => {
                let statusColor = r.status === 'Completed' ? '#10b981' : '#f59e0b';
                let actionBtn = r.status === 'Pending' 
                    ? `<button onclick="app.markDone(${r.id})" style="background:#009688; color:white; border:none; padding:6px 12px; border-radius:5px; cursor:pointer;">Mark Done</button>` 
                    : `<span style="color:#10b981; font-weight:bold;"><i class="fa-solid fa-check-circle"></i> Done</span>`;
                let icon = r.type === 'pollution' ? 'fa-trash-can' : 'fa-fish-fins';
                let iconColor = r.type === 'pollution' ? '#ef4444' : '#0ea5e9';
                let rangerName = r.tbl_users ? r.tbl_users.name : currentUserName;

                tbody.innerHTML += `
                    <tr style="border-bottom: 1px solid #e2e8f0;">
                        <td style="padding: 15px; font-weight:600;">#${r.id}</td>
                        <td style="padding: 15px;"><b>${rangerName}</b></td>
                        <td style="padding: 15px; color:#475569;">${r.placeName}</td>
                        <td style="padding: 15px; color:#64748b;">${new Date(r.date).toLocaleDateString()}</td>
                        <td style="padding: 15px; text-transform:capitalize;"><i class="fa-solid ${icon}" style="color:${iconColor}; margin-right:5px;"></i> ${r.type}</td>
                        <td style="padding: 15px;"><span style="color:${statusColor}; font-weight:700; background:${statusColor}20; padding:4px 8px; border-radius:20px;">${r.status}</span></td>
                        <td style="padding: 15px;">${actionBtn}</td>
                    </tr>`;
            });
        }
    },

    //Chart logic
     initCharts(data) {
        if (typeof Chart === 'undefined') {
            console.error("Chart.js failed to load!");
            return; 
        }

        // 1. Waste Chart (Doughnut)
        const wasteCanvas = document.getElementById('wasteChart');
        if (wasteCanvas && data.chart) {
            if(this.wasteChartInstance) this.wasteChartInstance.destroy(); // Clear old chart
            const labels = data.chart.map(item => item.wasteType);
            const counts = data.chart.map(item => item.count);
            this.wasteChartInstance = new Chart(wasteCanvas, {
                type: 'doughnut',
                data: {
                    labels: labels.length > 0 ? labels : ['No Data'],
                    datasets: [{
                        data: counts.length > 0 ? counts : [1],
                        backgroundColor: counts.length > 0 ? ['#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6'] : ['#e2e8f0'],
                        borderWidth: 0
                    }]
                },
                options: { responsive: true, maintainAspectRatio: false }
            });
        }

        // 2. Severity Alert Chart (Pie)
        const severityCanvas = document.getElementById('severityChart');
        if (severityCanvas && data.severity) {
            if(this.severityChartInstance) this.severityChartInstance.destroy();
            this.severityChartInstance = new Chart(severityCanvas, {
                type: 'pie',
                data: {
                    labels: ['High Risk', 'Medium Risk', 'Low Risk'],
                    datasets: [{
                        data: [data.severity['High'] || 0, data.severity['Medium'] || 0, data.severity['Low'] || 0],
                        backgroundColor: ['#ef4444', '#f59e0b', '#10b981'], 
                        borderWidth: 0
                    }]
                },
                options: { 
                    responsive: true, 
                    maintainAspectRatio: false,
                    plugins: { legend: { position: 'bottom' } }
                }
            });
        }

        // 3. Status Chart (Bar)
        const statusCanvas = document.getElementById('reportsStatusChart');
        if (statusCanvas && data.recent) {
            if(this.statusChartInstance) this.statusChartInstance.destroy();
            let completed = data.recent.filter(r => r.status === 'Completed').length;
            let pending = data.recent.filter(r => r.status === 'Pending').length;
            this.statusChartInstance = new Chart(statusCanvas, {
                type: 'bar',
                data: {
                    labels: ['Pending', 'Completed'],
                    datasets: [{ label: 'Mission Status', data: [pending, completed], backgroundColor: ['#f59e0b', '#10b981'], borderRadius: 6 }]
                },
                options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }
            });
        }
    },

    //Map Logic
    async loadMap() {
        if(!this.map) {
            this.map = L.map('map').setView([8.37, 124.86], 11); // Centered on Bukidnon
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(this.map);
        }
        
        // Fetch ALL public reports to plot on the main map
        const { data, error } = await supabaseClient.from('tbl_reports').select('*');
        if (error || !data) return;

        this.markers.forEach(m => this.map.removeLayer(m));
        this.markers = [];
        data.forEach(report => {
            let color = report.type === 'pollution' ? '#ef4444' : '#009688';
            let img = report.image && report.image !== 'NULL' ? `<img src="${report.image}" style="width:100%; height:100px; object-fit:cover; border-radius:5px; margin-bottom:5px;">` : '';
            let marker = L.marker([parseFloat(report.lat), parseFloat(report.lng)], { icon: this.createPin(color) }).addTo(this.map);
            marker.bindPopup(`<div>${img}<h4>${report.placeName}</h4><p>Status: ${report.status}</p></div>`);
            this.markers.push(marker);
        });
    },

    // The map used purely for picking coordinates on the 'Submit Report' page
    loadPickerMap() {
        const pMap = L.map('picker-map').setView([8.37, 124.86], 13);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(pMap);
        pMap.on('click', (e) => {
            document.getElementById('input-location').value = `${e.latlng.lat.toFixed(6)}, ${e.latlng.lng.toFixed(6)}`;
            document.getElementById('hidden-lat').value = e.latlng.lat;
            document.getElementById('hidden-lng').value = e.latlng.lng;
            if (this.tempMarker) pMap.removeLayer(this.tempMarker);
            this.tempMarker = L.marker(e.latlng, {icon: this.createPin('#3b82f6')}).addTo(pMap);
        });
    },























};
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

    //Logic for Submitting data to the cloud and saving it to our database.
    async handleReport(e) {
        const formData = new FormData(e.target);
        const submitBtn = document.getElementById('btn-submit-report');
        let originalBtnText = "";
        
        if(submitBtn) {
            originalBtnText = submitBtn.innerText;
            submitBtn.innerText = "Submitting to Cloud...";
            submitBtn.disabled = true;
        }

        const email = currentUserEmail;
        const type = formData.get('reportType').toLowerCase().trim();
        const date = new Date().toISOString();
        const file = formData.get('reportImage');
        let base64Img = 'NULL';

        // Convert image file to a string format (Base64) so it can be saved in the database
        if (file && file.size > 0) {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            await new Promise(resolve => {
                reader.onload = () => { base64Img = reader.result; resolve(); };
            });
        }

        try {
            const { data: reportData, error: reportError } = await supabaseClient.from('tbl_reports').insert([
                { userEmail: email, date: date, lat: parseFloat(formData.get('lat')), lng: parseFloat(formData.get('lng')), placeName: formData.get('placeName'), type: type, image: base64Img, status: 'Pending' }
            ]).select();

            if (reportError) throw reportError;
            const newId = reportData[0].id; 

            if (type === 'pollution') {
                const { error: polError } = await supabaseClient.from('tbl_pollution').insert([
                    { reportId: newId, wasteType: formData.get('wasteType'), severity: formData.get('severity') }
                ]);
                if (polError) throw polError;
            } else if (type === 'marine') {
                const { error: marError } = await supabaseClient.from('tbl_marine').insert([
                    { reportId: newId, species: formData.get('species'), quantity: parseInt(formData.get('quantity')), condition: formData.get('condition') }
                ]);
                if (marError) throw marError;
            }

            this.showNotification('Mission Report Submitted!', 'success');
            setTimeout(() => window.location.href = 'dashboard.html', 1500);

        } catch (err) {
            console.error("Submission Error:", err);
            this.showNotification("Failed to submit report. Please try again.", 'error');
            if(submitBtn) {
                submitBtn.innerText = originalBtnText;
                submitBtn.disabled = false;
            }
        }
    },
//marking a report as completed by updating its status in the database.
     async markDone(id) {
        const { error } = await supabaseClient.from('tbl_reports').update({ status: 'Completed' }).eq('id', id);
        if (error) {
            this.showNotification("Error updating status.", "error");
        } else {
            this.showNotification('Status Updated!');
            this.loadDash(); 
        }
    },

    //Profile Management Logic
     async loadProfile() {
        const email = currentUserEmail;
        
        // Fetch user data and their specific history
        const { data: user } = await supabaseClient.from('tbl_users').select('*').eq('email', email).single();
        const { data: history } = await supabaseClient.from('tbl_reports').select('*').eq('userEmail', email).order('id', { ascending: false });
        
        if (user) {
            // Update UI with user data
            document.getElementById('profile-name').innerText = user.name;
            document.getElementById('display-bio').innerText = user.bio || "No bio set yet.";
            document.getElementById('display-birthday').innerText = user.birthday || "-";
            document.getElementById('display-age').innerText = user.age || "-";
            
            // Handle Profile Picture
            const initials = document.getElementById('profile-initials-large');
            const img = document.getElementById('profile-img-large');
            if (user.profilePic && user.profilePic !== "NULL") {
                img.src = user.profilePic;
                img.classList.remove('hidden-section');
                initials.classList.add('hidden-section');
            } else {
                initials.innerText = user.name.split(' ').map(n => n[0]).join('').toUpperCase();
                initials.classList.remove('hidden-section');
                img.classList.add('hidden-section');
            }
            
            // Render History Table
            const body = document.getElementById('history-table-body');
            if (body && history) {
                body.innerHTML = '';
                if (history.length === 0) {
                    document.getElementById('empty-history-msg').style.display = 'block';
                } else {
                    document.getElementById('empty-history-msg').style.display = 'none';
                    history.forEach(h => {
                        body.innerHTML += `
                            <tr style="border-bottom: 1px solid #e2e8f0;">
                                <td style="padding: 15px;">${new Date(h.date).toLocaleDateString()}</td>
                                <td style="padding: 15px;">${h.placeName}</td>
                                <td style="padding: 15px; text-transform:capitalize;">${h.type}</td>
                                <td style="padding: 15px;"><button onclick="app.deleteReport(${h.id})" style="background:#ef4444; color:white; border:none; padding:6px 12px; border-radius:5px; cursor:pointer;"><i class="fa-solid fa-trash"></i> Delete</button></td>
                            </tr>`;
                    });
                }
            }
        }
    },

    //Deletion  Logic
     deleteReport(id) {
        this.reportToDelete = id;
        document.getElementById('confirm-delete-modal')?.classList.remove('hidden-section');
    },

    closeDeleteModal() {
        this.reportToDelete = null;
        document.getElementById('confirm-delete-modal')?.classList.add('hidden-section');
    },

    async executeDelete() {
        if (!this.reportToDelete) return; 
        
        // 🚨 DEFENSE NOTE: CASCADE DELETION 🚨
        // Because we set up 'ON DELETE CASCADE' in PostgreSQL when creating the 
        // tbl_pollution and tbl_marine tables, deleting the main report here 
        // automatically deletes the linked rows in those sub-tables!
        const { error } = await supabaseClient.from('tbl_reports').delete().eq('id', this.reportToDelete);
        
        if (error) {
            this.showNotification("Error deleting report.", 'error');
        } else {
            this.closeDeleteModal(); 
            this.showNotification('Report Deleted!', 'success');
            this.loadProfile();
            if (currentPage === 'dashboard.html') this.loadDash(); 
        }
    },

    //Profile Editing Logic
    async openEditProfile() {
        const { data: user } = await supabaseClient.from('tbl_users').select('*').eq('email', currentUserEmail).single();
        if(user) {
            document.getElementById('edit-name').value = user.name;
            document.getElementById('edit-bio').value = user.bio || "";
            document.getElementById('edit-birthday').value = user.birthday || "";
            document.getElementById('edit-age').value = user.age || "";
            document.getElementById('edit-profile-modal')?.classList.remove('hidden-section');
        }
    },

    closeEditProfile() { document.getElementById('edit-profile-modal')?.classList.add('hidden-section'); },

    async saveProfile(e) {
        const formData = new FormData(e.target);
        const name = formData.get('name');
        const file = formData.get('profilePic');
        let base64Img = null;

        const btn = e.target.querySelector('button[type="submit"]');
        let originalText = btn.innerText;
        btn.innerText = "Saving...";
        btn.disabled = true;

        if (file && file.size > 0) {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            await new Promise(resolve => {
                reader.onload = () => { base64Img = reader.result; resolve(); };
            });
        }

        const updates = { name: name, bio: formData.get('bio'), birthday: formData.get('birthday'), age: formData.get('age') ? parseInt(formData.get('age')) : null };
        if (base64Img) updates.profilePic = base64Img;

        const { error } = await supabaseClient.from('tbl_users').update(updates).eq('email', currentUserEmail);
        
        btn.innerText = originalText;
        btn.disabled = false;

        if (error) {
            this.showNotification("Failed to update profile.", 'error');
        } else {
            sessionStorage.setItem("loggedInName", name);
            this.showNotification('Profile Updated!');
            this.closeEditProfile();
            this.loadProfile();
            this.updateGlobalUI();
        }
    },

 toggleFormFields() {
        const isPollution = document.querySelector('input[value="pollution"]').checked;
        const pollutionFields = document.getElementById('fields-pollution');
        const marineFields = document.getElementById('fields-marine');
        if (pollutionFields) pollutionFields.classList.toggle('hidden-section', !isPollution);
        if (marineFields) marineFields.classList.toggle('hidden-section', isPollution);
    },

    createPin(color) {
        return L.divIcon({ className: 'bg-transparent', html: `<i class="fa-solid fa-location-dot fa-3x" style="color: ${color};"></i>`, iconSize: [30, 42], iconAnchor: [15, 42], popupAnchor: [0, -40] });
    },

    fixLeafletIcons() {
        if(typeof L !== 'undefined' && L.Icon.Default) {
            L.Icon.Default.mergeOptions({
                iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
                iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
                shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
            });
        }
    },

     toggleFormFields() {
        const isPollution = document.querySelector('input[value="pollution"]').checked;
        const pollutionFields = document.getElementById('fields-pollution');
        const marineFields = document.getElementById('fields-marine');
        if (pollutionFields) pollutionFields.classList.toggle('hidden-section', !isPollution);
        if (marineFields) marineFields.classList.toggle('hidden-section', isPollution);
    },

    createPin(color) {
        return L.divIcon({ className: 'bg-transparent', html: `<i class="fa-solid fa-location-dot fa-3x" style="color: ${color};"></i>`, iconSize: [30, 42], iconAnchor: [15, 42], popupAnchor: [0, -40] });
    },

    fixLeafletIcons() {
        if(typeof L !== 'undefined' && L.Icon.Default) {
            L.Icon.Default.mergeOptions({
                iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
                iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
                shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
            });
        }
    },

    // Modal logic to show detailed breakdown of waste
    async openWasteDetails() {
        const listContainer = document.getElementById('waste-stats-list');
        document.getElementById('waste-modal')?.classList.remove('hidden-section');
        
        if (listContainer) listContainer.innerHTML = '<p style="text-align:center; color:#64748b;"><i class="fa-solid fa-spinner fa-spin"></i> Analyzing Data...</p>';

        const reportIds = this.allReports.map(r => r.id);
        if (reportIds.length === 0) {
            if (listContainer) listContainer.innerHTML = '<p style="text-align:center; color:#64748b;">No waste data available yet.</p>';
            return;
        }

        const { data: chartData } = await supabaseClient
            .from('tbl_pollution')
            .select('wasteType')
            .in('reportId', reportIds);

        if (listContainer && chartData) {
            const wasteCounts = {};
            chartData.forEach(item => {
                wasteCounts[item.wasteType] = (wasteCounts[item.wasteType] || 0) + 1;
            });
            
            listContainer.innerHTML = '';
            const keys = Object.keys(wasteCounts);
            
            if(keys.length === 0) {
                listContainer.innerHTML = '<p style="text-align:center; color:#64748b;">No pollution details found.</p>';
            } else {
                keys.forEach(key => {
                    listContainer.innerHTML += `
                        <div style="display:flex; justify-content:space-between; padding:12px 15px; background:#f8fafc; border-radius:8px; border: 1px solid #e2e8f0;">
                            <span style="font-weight:600; text-transform:capitalize; color:#334155;"><i class="fa-solid fa-trash-can" style="color:#94a3b8; margin-right:8px;"></i> ${key}</span>
                            <span style="font-weight:700; color:#009688; background:#00968820; padding:2px 10px; border-radius:20px;">${wasteCounts[key]}</span>
                        </div>
                    `;
                });
            }
        }
    },

    closeWasteModal() {
        document.getElementById('waste-modal')?.classList.add('hidden-section');
    },

    // Terminates secure session
    async logout() { 
        await supabaseClient.auth.signOut();
        sessionStorage.clear(); 
        window.location.href = "login.html"; 
    }
};
window.addEventListener('scroll', () => {
            const nav = document.getElementById('main-nav');
            const hero = document.querySelector('.hero-bg'); 
            if(nav) {
                let threshold = 50; 
                if (hero) threshold = hero.offsetHeight - 80; 
                if(window.scrollY > threshold) nav.classList.add('scrolled');
                else nav.classList.remove('scrolled');
            }
        });

window.onload = () => app.init();

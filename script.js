// =======================================================
// 1. SECURITY & SESSION MANAGEMENT
// =======================================================
const currentUserEmail = sessionStorage.getItem("loggedInEmail");
const currentUserName = sessionStorage.getItem("loggedInName");
const currentPage = window.location.pathname.split("/").pop();

const protectedPages = ["dashboard.html", "map.html", "report.html", "profile.html"];

if (protectedPages.includes(currentPage) && !currentUserEmail) {
    window.location.href = "login.html"; 
}

// =======================================================
// 2. CORE APP CONTROLLER
// =======================================================
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

    init() {
        console.log("AgosTrack Native PHP Engine Initialized...");
        this.fixLeafletIcons();
        this.updateGlobalUI();
        
        // --- PAGE ROUTER ---
        if (currentPage === 'dashboard.html' || currentPage === '') this.loadDash();
        if (currentPage === 'map.html') this.loadMap();
        if (currentPage === 'report.html') this.loadPickerMap();
        if (currentPage === 'profile.html') this.loadProfile();

        // --- FORM LISTENERS ---
        const loginForm = document.getElementById('login-form');
        if (loginForm) loginForm.addEventListener('submit', (e) => { e.preventDefault(); this.login(e); });

        const signupForm = document.getElementById('signup-form');
        if (signupForm) signupForm.addEventListener('submit', (e) => { e.preventDefault(); this.signup(e); });

        const reportForm = document.getElementById('report-form');
        if (reportForm) reportForm.addEventListener('submit', (e) => { e.preventDefault(); this.handleReport(e); });

        const editProfileForm = document.getElementById('edit-profile-form');
        if (editProfileForm) editProfileForm.addEventListener('submit', (e) => { e.preventDefault(); this.saveProfile(e); });

        // --- UI BUTTON LISTENERS ---
        const editBtn = document.getElementById('edit-profile-btn');
        if (editBtn) editBtn.addEventListener('click', () => this.openEditProfile());

        const searchInput = document.getElementById('search-ledger');
        if (searchInput) searchInput.addEventListener('input', () => this.renderLedger());

        const sortSelect = document.getElementById('sort-ledger');
        if (sortSelect) sortSelect.addEventListener('change', () => this.renderLedger());

        const menuBtn = document.querySelector('.mobile-menu-btn');
        const closeBtn = document.querySelector('.close-sidebar-btn');
        const overlay = document.querySelector('.sidebar-overlay');

        const toggleSidebar = () => {
            document.getElementById('sidebar').classList.toggle('open');
            document.querySelector('.sidebar-overlay').classList.toggle('open');
        };

        if (menuBtn) menuBtn.addEventListener('click', toggleSidebar);
        if (closeBtn) closeBtn.addEventListener('click', toggleSidebar);
        if (overlay) overlay.addEventListener('click', toggleSidebar);
    },

    toggleFormFields() {
        const isPollution = document.querySelector('input[value="pollution"]').checked;
        const pollutionFields = document.getElementById('fields-pollution');
        const marineFields = document.getElementById('fields-marine');
        
        if (pollutionFields) pollutionFields.classList.toggle('hidden-section', !isPollution);
        if (marineFields) marineFields.classList.toggle('hidden-section', isPollution);
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
            if (!errorDisplay) {
                const activeForm = document.querySelector('form');
                if (activeForm) {
                    errorDisplay = document.createElement('p');
                    errorDisplay.className = 'error-text';
                    errorDisplay.style.color = '#ef4444';
                    errorDisplay.style.textAlign = 'center';
                    errorDisplay.style.marginBottom = '15px';
                    errorDisplay.style.fontWeight = '500';
                    const submitBtn = activeForm.querySelector('button[type="submit"]');
                    if (submitBtn) activeForm.insertBefore(errorDisplay, submitBtn);
                    else activeForm.appendChild(errorDisplay);
                }
            }
            if (errorDisplay) {
                errorDisplay.innerText = message;
                errorDisplay.style.display = 'block';
                errorDisplay.classList.add('show');
                setTimeout(() => {
                    errorDisplay.classList.remove('show');
                    errorDisplay.style.display = 'none';
                }, 5000);
            } else {
                alert(message);
            }
        }
    },

    updateGlobalUI() {
        if(!currentUserEmail) return;
        const display = document.getElementById('user-name-display');
        const topNavName = document.getElementById('top-nav-profile-name');
        
        if(display) display.innerText = currentUserName || "Ranger";
        if(topNavName) topNavName.innerText = currentUserName || "Ranger";
    },

    // --- AUTHENTICATION ---
    login(e) {
        const formData = new FormData(e.target);
        const email = formData.get('email').toLowerCase().trim();
        
        const btn = e.target.querySelector('button[type="submit"]');
        let originalText = btn.innerText;
        btn.innerText = "Authenticating...";
        btn.disabled = true;

        fetch('php/login.php', { method: 'POST', body: formData })
            .then(res => res.json())
            .then(data => {
                if (data.status === 'success') {
                    sessionStorage.setItem('loggedInEmail', email);
                    sessionStorage.setItem('loggedInName', data.name);
                    window.location.href = 'dashboard.html';
                } else {
                    this.showNotification(data.message, 'error');
                    btn.innerText = originalText;
                    btn.disabled = false;
                }
            })
            .catch(err => {
                this.showNotification("Server connection failed.", 'error');
                btn.innerText = originalText;
                btn.disabled = false;
            });
    },

    signup(e) {
        const formData = new FormData(e.target);
        const btn = e.target.querySelector('button[type="submit"]');
        let originalText = btn.innerText;
        btn.innerText = "Registering...";
        btn.disabled = true;

        fetch('php/signup.php', { method: 'POST', body: formData })
            .then(res => res.json())
            .then(data => {
                if (data.status === 'success') {
                    this.showNotification('Registration successful! Please login.', 'success');
                    setTimeout(() => window.location.href = 'login.html', 1500);
                } else {
                    this.showNotification(data.message, 'error');
                    btn.innerText = originalText;
                    btn.disabled = false;
                }
            })
            .catch(err => {
                this.showNotification("Registration failed due to server error.", 'error');
                btn.innerText = originalText;
                btn.disabled = false;
            });
    },

    // --- DASHBOARD FUNCTIONS ---
    loadDash() {
        fetch(`php/get_stats.php?email=${currentUserEmail}`)
            .then(res => res.json())
            .then(data => {
                this.allReports = data.recent || [];
                
                if(document.getElementById('stat-pollution')) document.getElementById('stat-pollution').innerText = data.pollution || 0;
                if(document.getElementById('stat-marine')) document.getElementById('stat-marine').innerText = data.marine || 0;

                this.renderLedger();

                const activityFeed = document.getElementById('activity-feed');
                if(activityFeed) {
                    activityFeed.innerHTML = '';
                    if(this.allReports.length === 0) {
                        activityFeed.innerHTML = '<p style="color:#9ca3af; text-align:center; padding:10px;">Coastline is clear.</p>';
                    } else {
                        this.allReports.slice(0, 4).forEach(r => {
                            let iconClass = r.type === 'pollution' ? 'fa-triangle-exclamation' : 'fa-otter';
                            let iconColor = r.type === 'pollution' ? '#ef4444' : '#0ea5e9';
                            let rangerName = r.rangerName || currentUserName;
                            
                            activityFeed.innerHTML += `
                                <div style="display:flex; align-items:flex-start; gap:15px; margin-bottom:15px; border-bottom:1px solid #f1f5f9; padding-bottom:10px;">
                                    <div style="background:${iconColor}20; width:40px; height:40px; border-radius:50%; display:flex; align-items:center; justify-content:center; flex-shrink:0;">
                                        <i class="fa-solid ${iconClass}" style="color:${iconColor}; font-size:1.1rem;"></i>
                                    </div>
                                    <div>
                                        <p style="margin:0; font-size:0.9rem; font-weight:600; color:#1e293b;">${r.placeName}</p>
                                        <p style="margin:0; font-size:0.8rem; color:#64748b;">Reported by ${rangerName} • ${new Date(r.date).toLocaleDateString()}</p>
                                    </div>
                                </div>
                            `;
                        });
                    }
                }

                this.initCharts(data);
            })
            .catch(err => console.error("Dashboard error:", err));
    },

    renderLedger() {
        const tbody = document.getElementById('joined-reports-body');
        if (!tbody) return;

        const searchTerm = (document.getElementById('search-ledger')?.value || "").toLowerCase();
        const sortValue = document.getElementById('sort-ledger')?.value || 'newest';

        let filtered = this.allReports.filter(r => 
            (r.placeName || "").toLowerCase().includes(searchTerm) || 
            (r.type || "").toLowerCase().includes(searchTerm) ||
            r.id.toString().includes(searchTerm)
        );

        filtered.sort((a, b) => {
            if (sortValue === 'newest') return b.id - a.id;
            if (sortValue === 'oldest') return a.id - b.id;
            if (sortValue === 'pending') return a.status === 'Pending' ? -1 : 1;
            if (sortValue === 'completed') return a.status === 'Completed' ? -1 : 1;
            return 0;
        });

        tbody.innerHTML = '';
        if (filtered.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; padding: 20px; color:#9ca3af;">No reports found.</td></tr>';
        } else {
            filtered.forEach(r => {
                let statusColor = r.status === 'Completed' ? '#10b981' : '#f59e0b';
                let actionBtn = r.status === 'Pending' 
                    ? `<button onclick="app.markDone(${r.id})" style="background:#009688; color:white; border:none; padding:6px 12px; border-radius:5px; cursor:pointer; font-weight:600; font-size:0.8rem;">Mark Done</button>` 
                    : `<span style="color:#10b981; font-weight:bold;"><i class="fa-solid fa-check-circle"></i> Done</span>`;

                let typeIcon = r.type === 'pollution' ? '<i class="fa-solid fa-trash-can" style="color:#ef4444; margin-right:5px;"></i>' : '<i class="fa-solid fa-fish-fins" style="color:#0ea5e9; margin-right:5px;"></i>';
                let rangerName = r.rangerName || currentUserName;

                tbody.innerHTML += `
                    <tr style="border-bottom: 1px solid #e2e8f0; transition: background 0.2s;">
                        <td style="padding: 15px; font-weight:600;">#${r.id}</td>
                        <td style="padding: 15px;"><b>${rangerName}</b></td>
                        <td style="padding: 15px; color:#475569;">${r.placeName}</td>
                        <td style="padding: 15px; color:#64748b;">${new Date(r.date).toLocaleDateString()}</td>
                        <td style="padding: 15px; text-transform:capitalize;">${typeIcon} ${r.type}</td>
                        <td style="padding: 15px;"><span style="color:${statusColor}; font-weight:700; background:${statusColor}20; padding:4px 8px; border-radius:20px; font-size:0.85rem;">${r.status}</span></td>
                        <td style="padding: 15px;">${actionBtn}</td>
                    </tr>
                `;
            });
        }
    },

    initCharts(data) {
        if (typeof Chart === 'undefined') return; 

        // 1. Waste Chart (Doughnut)
        const wasteCanvas = document.getElementById('wasteChart');
        if (wasteCanvas && data.chart) {
            if(this.wasteChartInstance) this.wasteChartInstance.destroy();
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

        // 2. Severity Chart (Pie)
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
                options: { responsive: true, maintainAspectRatio: false }
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

    openWasteDetails() {
        document.getElementById('waste-modal').classList.remove('hidden-section');
        const list = document.getElementById('waste-stats-list');
        list.innerHTML = '';
        
        fetch(`php/get_waste_details.php?email=${currentUserEmail}`)
            .then(res => res.json())
            .then(data => {
                if(data.length > 0) {
                    data.forEach(item => {
                        list.innerHTML += `
                            <div style="display:flex; justify-content:space-between; padding:12px 15px; background:#f8fafc; border-radius:8px; border: 1px solid #e2e8f0;">
                                <span style="font-weight:600; text-transform:capitalize; color:#334155;"><i class="fa-solid fa-trash-can" style="color:#94a3b8; margin-right:8px;"></i> ${item.wasteType}</span>
                                <span style="font-weight:700; color:#009688; background:#00968820; padding:2px 10px; border-radius:20px;">${item.count}</span>
                            </div>
                        `;
                    });
                } else {
                    list.innerHTML = '<p style="text-align:center; color:#9ca3af;">No detailed statistics available.</p>';
                }
            });
    },

    closeWasteModal() {
        document.getElementById('waste-modal').classList.add('hidden-section');
    },

    markDone(id) {
        const formData = new FormData();
        formData.append('id', id);
        fetch('php/update_status.php', { method: 'POST', body: formData })
            .then(res => res.json())
            .then(data => {
                if(data.status === 'success') {
                    this.showNotification('Report Marked as Completed!', 'success');
                    this.loadDash(); 
                } else {
                    this.showNotification('Failed to update status.', 'error');
                }
            });
    },

    // --- PROFILE & PHOTO MANAGEMENT ---
    loadProfile() {
        fetch(`php/get_profile.php?email=${currentUserEmail}`)
            .then(res => res.json())
            .then(user => {
                if (!user.error) {
                    document.getElementById('profile-name').innerText = user.name;
                    document.getElementById('display-bio').innerText = user.bio || "No bio set yet.";
                    document.getElementById('display-birthday').innerText = user.birthday || "-";
                    document.getElementById('display-age').innerText = user.age || "-";
                    
                    const initialCircle = document.getElementById('profile-initials-large');
                    const imgTag = document.getElementById('profile-img-large');

                    if (user.profilePic && user.profilePic !== "NULL" && user.profilePic !== "") {
                        imgTag.src = user.profilePic;
                        imgTag.classList.remove('hidden-section');
                        initialCircle.classList.add('hidden-section');
                    } else {
                        const initials = user.name.split(' ').map(n => n[0]).join('').toUpperCase();
                        initialCircle.innerText = initials;
                        initialCircle.classList.remove('hidden-section');
                        imgTag.classList.add('hidden-section');
                    }

                    const historyTableBody = document.getElementById('history-table-body');
                    if (historyTableBody) {
                        historyTableBody.innerHTML = '';
                        if (!user.history || user.history.length === 0) {
                            document.getElementById('empty-history-msg').style.display = 'block';
                        } else {
                            document.getElementById('empty-history-msg').style.display = 'none';
                            user.history.forEach(h => {
                                historyTableBody.innerHTML += `
                                    <tr style="border-bottom: 1px solid #e2e8f0;">
                                        <td style="padding: 15px;">${new Date(h.date).toLocaleDateString()}</td>
                                        <td style="padding: 15px;">${h.placeName}</td>
                                        <td style="padding: 15px; text-transform:capitalize;">${h.type}</td>
                                        <td style="padding: 15px;"><button onclick="app.deleteReport(${h.id})" style="background:#ef4444; color:white; border:none; padding:6px 12px; border-radius:5px; cursor:pointer;"><i class="fa-solid fa-trash"></i> Delete</button></td>
                                    </tr>
                                `;
                            });
                        }
                    }
                    sessionStorage.setItem('loggedInName', user.name);
                    this.updateGlobalUI();
                }
            })
            .catch(err => console.error("Error loading profile:", err));
    },

    deleteReport(id) {
        this.reportToDelete = id;
        document.getElementById('confirm-delete-modal')?.classList.remove('hidden-section');
    },

    closeDeleteModal() {
        this.reportToDelete = null;
        document.getElementById('confirm-delete-modal')?.classList.add('hidden-section');
    },

    executeDelete() {
        if (!this.reportToDelete) return; 
        const formData = new FormData();
        formData.append('id', this.reportToDelete);
        
        fetch('php/delete_report.php', { method: 'POST', body: formData })
            .then(res => res.json())
            .then(data => {
                this.closeDeleteModal(); 
                if(data.status === 'success') {
                    this.showNotification('Report Deleted!', 'success');
                    this.loadProfile(); 
                    if (currentPage === 'dashboard.html') this.loadDash(); 
                } else {
                    this.showNotification('Failed to delete report.', 'error');
                }
            });
    },

    openEditProfile() {
        document.getElementById('edit-name').value = document.getElementById('profile-name').innerText;
        document.getElementById('edit-bio').value = document.getElementById('display-bio').innerText === "No bio set yet." ? "" : document.getElementById('display-bio').innerText;
        document.getElementById('edit-birthday').value = document.getElementById('display-birthday').innerText === "-" ? "" : document.getElementById('display-birthday').innerText;
        document.getElementById('edit-age').value = document.getElementById('display-age').innerText === "-" ? "" : document.getElementById('display-age').innerText;
        document.getElementById('edit-email').value = currentUserEmail;
        document.getElementById('edit-profile-modal').classList.remove('hidden-section');
    },

    closeEditProfile() { document.getElementById('edit-profile-modal')?.classList.add('hidden-section'); },

    async saveProfile(e) {
        const formData = new FormData(e.target);
        formData.append('emailKey', currentUserEmail);
        
        const file = formData.get('profilePic');
        if (file && file.size > 0) {
            let base64Img = await this.compressImage(file);
            formData.set('profilePicBase64', base64Img); // Send string instead of file
        }

        const btn = e.target.querySelector('button[type="submit"]');
        let originalText = btn.innerText;
        btn.innerText = "Saving...";
        btn.disabled = true;

        fetch('php/profile.php', { method: 'POST', body: formData })
            .then(res => res.json())
            .then(data => {
                if (data.status === 'success') {
                    this.showNotification('Profile Updated Successfully!');
                    this.closeEditProfile();
                    this.loadProfile();
                } else {
                    this.showNotification(data.message, 'error');
                }
                btn.innerText = originalText;
                btn.disabled = false;
            })
            .catch(err => {
                this.showNotification("Update failed.", 'error');
                btn.innerText = originalText;
                btn.disabled = false;
            });
    },

    // --- MAPS & REPORTING WITH POPUPS ---
    loadMap() {
        if(!this.map) {
            this.map = L.map('map').setView([8.37, 124.86], 11); 
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(this.map);
        }

        fetch('php/get_map_data.php')
            .then(res => res.json())
            .then(data => {
                if (!data.error) {
                    this.markers.forEach(m => this.map.removeLayer(m));
                    this.markers = [];

                    data.forEach(report => {
                        let markerColor = report.status === 'Completed' ? '#10b981' : (report.type === 'pollution' ? '#ef4444' : '#0ea5e9');
                        let statusColor = report.status === 'Completed' ? '#10b981' : '#f59e0b';
                        let rangerName = report.rangerName || 'Volunteer Ranger';
                        
                        let imageHtml = '';
                        if (report.image && report.image !== 'NULL' && report.image !== null) {
                            let cleanImgPath = report.image.replace(/['"]+/g, '');
                            imageHtml = `<img src="${cleanImgPath}" alt="Evidence" style="width:100%; height:120px; object-fit:cover; border-radius:8px; margin-bottom:10px;">`;
                        } else {
                            imageHtml = `<div style="width:100%; height:80px; background:#f1f5f9; border-radius:8px; display:flex; align-items:center; justify-content:center; margin-bottom:10px; color:#9ca3af;"><i class="fa-solid fa-image"></i> No Photo</div>`;
                        }

                        let popupContent = `
                            <div style="min-width: 200px; font-family: inherit;">
                                ${imageHtml}
                                <h4 style="margin:0 0 5px 0; color:#1f2937; font-size:1.1rem; font-weight:700; -webkit-text-stroke:0;">${report.placeName}</h4>
                                <p style="margin:0; color:#64748b; font-size:0.85rem;">
                                    Reported by: <strong style="color:#334155; -webkit-text-stroke:0;">${rangerName}</strong>
                                </p>
                                <p style="margin:5px 0 0 0; color:#64748b; font-size:0.9rem;">
                                    Status: <strong style="color:${statusColor}; -webkit-text-stroke:0;">${report.status}</strong>
                                </p>
                            </div>
                        `;

                        let marker = L.marker([parseFloat(report.lat), parseFloat(report.lng)], {
                            icon: this.createPin(markerColor)
                        }).addTo(this.map);

                        marker.bindPopup(popupContent);
                        this.markers.push(marker);
                    });
                }
            })
            .catch(err => console.error("Map Data Fetch Error:", err));

        setTimeout(() => this.map.invalidateSize(), 200);
    },

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
        setTimeout(() => pMap.invalidateSize(), 200);
    },

    async compressImage(file, maxWidth = 800) {
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = (event) => {
                const img = new Image();
                img.src = event.target.result;
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    const scaleFactor = maxWidth / img.width;
                    if (img.width > maxWidth) {
                        canvas.width = maxWidth;
                        canvas.height = img.height * scaleFactor;
                    } else {
                        canvas.width = img.width;
                        canvas.height = img.height;
                    }
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                    resolve(canvas.toDataURL('image/jpeg', 0.7));
                };
            };
        });
    },

    async handleReport(e) {
        const formData = new FormData(e.target);
        formData.append('userEmail', currentUserEmail);

        const submitBtn = document.getElementById('btn-submit-report');
        let originalBtnText = "";
        if(submitBtn) {
            originalBtnText = submitBtn.innerText;
            submitBtn.innerText = "Submitting to Server...";
            submitBtn.disabled = true;
        }

        const file = formData.get('reportImage');
        if (file && file.size > 0) {
            let base64Img = await this.compressImage(file);
            formData.set('reportImageBase64', base64Img); 
        }

        fetch('php/report.php', { method: 'POST', body: formData })
            .then(res => res.json())
            .then(data => {
                if (data.status === 'success') {
                    this.showNotification('Mission Report Submitted!', 'success');
                    setTimeout(() => { window.location.href = 'dashboard.html'; }, 1500);
                } else {
                    this.showNotification("Submission Failed: " + data.message, 'error');
                    if(submitBtn) { submitBtn.innerText = originalBtnText; submitBtn.disabled = false; }
                }
            })
            .catch(err => {
                console.error("Fetch Error:", err);
                this.showNotification("Failed to connect to server.", 'error');
                if(submitBtn) { submitBtn.innerText = originalBtnText; submitBtn.disabled = false; }
            });
    },

    // --- UTILITIES ---
    createPin(color) {
        return L.divIcon({
            className: 'bg-transparent',
            html: `<i class="fa-solid fa-location-dot fa-3x" style="color: ${color};"></i>`,
            iconSize: [30, 42], iconAnchor: [15, 42], popupAnchor: [0, -40]
        });
    },

    fixLeafletIcons() {
        if(typeof L !== 'undefined' && L.Icon.Default) {
            delete L.Icon.Default.prototype._getIconUrl;
            L.Icon.Default.mergeOptions({
                iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
                iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
                shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
            });
        }
    },

    logout() { 
        sessionStorage.clear(); 
        window.location.href = "login.html"; 
    }
};

window.onload = () => app.init();
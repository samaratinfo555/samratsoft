// State Management
let searchState = {
    source: "",
    destination: "",
    date: "",
    class: "3A"
};

let passengers = [
    { id: 1, name: "Samrat Sen", age: 34, gender: "Male", berth: "Lower" },
    { id: 2, name: "Kavita Sen", age: 32, gender: "Female", berth: "Side Lower" }
];

let selectedTrain = null;

// Initialize app when DOM is fully loaded
document.addEventListener("DOMContentLoaded", () => {
    initSelects();
    renderPassengers();
    setupEventListeners();
    setDefaultDate();
    loadCredentials();
    setupCredentialsListeners();
    
    // Set default search results
    searchState.source = "NDLS";
    searchState.destination = "CSMT";
    searchState.date = document.getElementById("travel-date").value;
    document.getElementById("from-station").value = "NDLS";
    document.getElementById("to-station").value = "CSMT";
    
    performSearch();
});

// Setup station selects
function initSelects() {
    const fromSelect = document.getElementById("from-station");
    const toSelect = document.getElementById("to-station");
    
    STATIONS.forEach(station => {
        const opt1 = new Option(`${station.name} (${station.code})`, station.code);
        const opt2 = new Option(`${station.name} (${station.code})`, station.code);
        fromSelect.add(opt1);
        toSelect.add(opt2);
    });
}

function setDefaultDate() {
    const dateInput = document.getElementById("travel-date");
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const yyyy = tomorrow.getFullYear();
    const mm = String(tomorrow.getMonth() + 1).padStart(2, '0');
    const dd = String(tomorrow.getDate()).padStart(2, '0');
    dateInput.value = `${yyyy}-${mm}-${dd}`;
    dateInput.min = `${yyyy}-${mm}-${dd}`;
}

// Setup event listeners
function setupEventListeners() {
    // Search form submit
    document.getElementById("search-form").addEventListener("submit", (e) => {
        e.preventDefault();
        searchState.source = document.getElementById("from-station").value;
        searchState.destination = document.getElementById("to-station").value;
        searchState.date = document.getElementById("travel-date").value;
        searchState.class = document.getElementById("class-select").value;
        
        if (searchState.source === searchState.destination) {
            showNotification("Source and Destination stations cannot be the same.", "error");
            return;
        }
        
        performSearch();
    });

    // Add passenger form
    document.getElementById("add-passenger-form").addEventListener("submit", (e) => {
        e.preventDefault();
        const name = document.getElementById("p-name").value.trim();
        const age = parseInt(document.getElementById("p-age").value);
        const gender = document.getElementById("p-gender").value;
        const berth = document.getElementById("p-berth").value;

        if (!name) {
            showNotification("Passenger name is required", "error");
            return;
        }
        if (isNaN(age) || age <= 0 || age > 120) {
            showNotification("Please enter a valid age", "error");
            return;
        }

        const newPassenger = {
            id: Date.now(),
            name,
            age,
            gender,
            berth
        };

        passengers.push(newPassenger);
        renderPassengers();
        
        // Reset form
        document.getElementById("add-passenger-form").reset();
        showNotification("Passenger added successfully", "success");
    });

    // Class select on train detail triggers recalculated fare
    document.getElementById("class-select").addEventListener("change", () => {
        searchState.class = document.getElementById("class-select").value;
        updateFareCalculation();
    });

    // Copy Autofill Scripts & Data buttons
    document.getElementById("btn-copy-payload").addEventListener("click", copyIRCTCPayload);
    document.getElementById("btn-copy-script").addEventListener("click", copyConsoleScript);
    document.getElementById("btn-simulate").addEventListener("click", runBookingSimulation);
    document.getElementById("btn-close-sim").addEventListener("click", () => {
        document.getElementById("simulation-overlay").classList.remove("active");
    });
}

// Perform train search
function performSearch() {
    const resultsContainer = document.getElementById("train-results");
    resultsContainer.innerHTML = "";
    
    const matchedTrains = TRAINS.filter(t => {
        // Simple route validation (must have both from/to in the route list)
        const fromIdx = t.route.indexOf(searchState.source);
        const toIdx = t.route.indexOf(searchState.destination);
        return fromIdx !== -1 && toIdx !== -1 && fromIdx < toIdx;
    });

    if (matchedTrains.length === 0) {
        resultsContainer.innerHTML = `
            <div class="no-results">
                <i class="fas fa-train-slash"></i>
                <p>No direct trains found between selected stations. Showing fallback Express route.</p>
            </div>
        `;
        // Create a fallback train
        createFallbackTrainCard(resultsContainer);
        return;
    }

    matchedTrains.forEach(train => {
        createTrainCard(train, resultsContainer);
    });

    // Auto-select first train
    selectTrain(matchedTrains[0]);
}

function createTrainCard(train, container) {
    const card = document.createElement("div");
    card.className = `train-card ${selectedTrain && selectedTrain.number === train.number ? 'selected' : ''}`;
    card.id = `train-${train.number}`;
    
    // Check classes support
    let classesHtml = train.classes.map(cls => `<span class="class-badge">${cls}</span>`).join("");
    
    card.innerHTML = `
        <div class="train-header">
            <span class="train-num">${train.number}</span>
            <h4 class="train-title">${train.name}</h4>
        </div>
        <div class="train-route-info">
            <div class="route-point">
                <span class="time">${train.departure}</span>
                <span class="station">${train.route[0]}</span>
            </div>
            <div class="route-line">
                <span class="duration">${train.duration}</span>
                <div class="line"></div>
            </div>
            <div class="route-point">
                <span class="time">${train.arrival}</span>
                <span class="station">${train.route[train.route.length - 1]}</span>
            </div>
        </div>
        <div class="train-footer">
            <div class="classes-container">${classesHtml}</div>
            <button class="btn-select-train" onclick="selectTrainByNum('${train.number}')">Select</button>
        </div>
    `;
    container.appendChild(card);
}

function createFallbackTrainCard(container) {
    const fallbackTrain = {
        number: "12839",
        name: "ANTIGRAVITY SF EXPRESS",
        route: [searchState.source, searchState.destination],
        distance: getDistance(searchState.source, searchState.destination),
        departure: "14:10",
        arrival: "07:30",
        duration: "17h 20m",
        runsOn: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
        classes: ["1A", "2A", "3A", "SL"]
    };
    
    createTrainCard(fallbackTrain, container);
    selectTrain(fallbackTrain);
}

function selectTrainByNum(num) {
    // Check in existing list or fallback
    let train = TRAINS.find(t => t.number === num);
    if (!train) {
        train = {
            number: num,
            name: "ANTIGRAVITY SF EXPRESS",
            route: [searchState.source, searchState.destination],
            distance: getDistance(searchState.source, searchState.destination),
            departure: "14:10",
            arrival: "07:30",
            duration: "17h 20m",
            runsOn: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
            classes: ["1A", "2A", "3A", "SL"]
        };
    }
    selectTrain(train);
}

function selectTrain(train) {
    selectedTrain = train;
    
    // Update active visual card
    document.querySelectorAll(".train-card").forEach(c => c.classList.remove("selected"));
    const selectedCard = document.getElementById(`train-${train.number}`);
    if (selectedCard) selectedCard.classList.add("selected");
    
    // Update booking summaries
    document.getElementById("summary-train-name").textContent = `${train.number} - ${train.name}`;
    document.getElementById("summary-train-route").textContent = `${searchState.source} → ${searchState.destination}`;
    
    // Re-populate class options based on train
    const classSelect = document.getElementById("class-select");
    classSelect.innerHTML = "";
    train.classes.forEach(cls => {
        const option = new Option(CLASSES[cls].name, cls);
        classSelect.add(option);
    });
    
    // Ensure currently selected class matches if supported, otherwise pick first available
    if (train.classes.includes(searchState.class)) {
        classSelect.value = searchState.class;
    } else {
        searchState.class = train.classes[0];
        classSelect.value = searchState.class;
    }
    
    updateFareCalculation();
}

// Render passenger list
function renderPassengers() {
    const listContainer = document.getElementById("passenger-list");
    listContainer.innerHTML = "";
    
    if (passengers.length === 0) {
        listContainer.innerHTML = `
            <div class="empty-passengers">
                <i class="fas fa-users-slash"></i>
                <p>No passengers added. Add passenger details below.</p>
            </div>
        `;
        updateFareCalculation();
        return;
    }

    passengers.forEach(p => {
        const card = document.createElement("div");
        card.className = "passenger-card animate-pop";
        card.innerHTML = `
            <div class="p-avatar">
                <i class="fas ${p.gender === 'Female' ? 'fa-female' : 'fa-male'}"></i>
            </div>
            <div class="p-details">
                <div class="p-row-main">
                    <span class="p-name">${p.name}</span>
                    <span class="p-age-gender">${p.age} Yrs | ${p.gender}</span>
                </div>
                <div class="p-row-sub">
                    <span class="p-pref"><i class="fas fa-chair"></i> Berth: ${p.berth}</span>
                </div>
            </div>
            <button class="btn-delete-passenger" onclick="deletePassenger(${p.id})">
                <i class="fas fa-trash-alt"></i>
            </button>
        `;
        listContainer.appendChild(card);
    });

    updateFareCalculation();
}

function deletePassenger(id) {
    passengers = passengers.filter(p => p.id !== id);
    renderPassengers();
    showNotification("Passenger removed", "info");
}

// Fare calculations
function updateFareCalculation() {
    if (!selectedTrain || passengers.length === 0) {
        document.getElementById("fare-breakdown").innerHTML = `
            <div class="fare-placeholder">
                <p>Add passengers to view dynamic fare calculation</p>
            </div>
        `;
        return;
    }

    const distance = getDistance(searchState.source, searchState.destination);
    const selectedClassCode = searchState.class;
    const classInfo = CLASSES[selectedClassCode];
    
    const baseRatePerKm = 0.85; // Indian Railways average superfast base rate
    const singleBaseFare = Math.round(distance * baseRatePerKm * classInfo.multiplier + classInfo.baseCharge);
    
    let totalBaseFare = 0;
    let passengerFares = [];
    
    passengers.forEach(p => {
        let ageMultiplier = 1.0;
        let concessionName = "None";
        
        // Age rules
        if (p.age < 5) {
            ageMultiplier = 0; // Under 5 is free
            concessionName = "Infant Concession (100% Off)";
        } else if (p.age >= 5 && p.age < 12) {
            ageMultiplier = 0.5; // Child rate
            concessionName = "Child Concession (50% Off)";
        } else if (p.age >= 60) {
            // Senior Citizen concessions
            if (p.gender === "Female") {
                ageMultiplier = 0.5; // Female senior 50%
                concessionName = "Sr. Citizen (Female 50% Off)";
            } else {
                ageMultiplier = 0.6; // Male senior 40%
                concessionName = "Sr. Citizen (Male 40% Off)";
            }
        }
        
        const fare = Math.round(singleBaseFare * ageMultiplier);
        totalBaseFare += fare;
        passengerFares.push({
            name: p.name,
            originalFare: singleBaseFare,
            calculatedFare: fare,
            concession: concessionName
        });
    });
    
    // Fees
    const isAC = ["1A", "2A", "3A", "CC"].includes(selectedClassCode);
    const irctcConvFee = isAC ? 30 : 15;
    const cateringFee = selectedTrain.name.includes("RAJDHANI") && isAC ? 140 * passengers.length : 0;
    const agentFee = 20; // Convenience of portal
    const gstRate = isAC ? 0.05 : 0; // 5% GST on AC classes
    const subtotal = totalBaseFare + irctcConvFee + cateringFee + agentFee;
    const gstValue = Math.round(subtotal * gstRate);
    const grandTotal = subtotal + gstValue;
    
    // Render breakdown HTML
    let passengerListHtml = passengerFares.map(pf => `
        <div class="fare-row">
            <span class="label">${pf.name} ${pf.concession !== 'None' ? `<span class="concession-tag">${pf.concession}</span>` : ''}</span>
            <span class="value">₹${pf.calculatedFare}</span>
        </div>
    `).join("");
    
    const breakdownContainer = document.getElementById("fare-breakdown");
    breakdownContainer.innerHTML = `
        <div class="fare-section">
            <h5>Passenger Fares</h5>
            ${passengerListHtml}
        </div>
        <hr class="fare-divider">
        <div class="fare-section">
            <h5>Charges & Taxes</h5>
            <div class="fare-row">
                <span class="label">IRCTC Convenience Fee</span>
                <span class="value">₹${irctcConvFee}</span>
            </div>
            ${cateringFee > 0 ? `
            <div class="fare-row">
                <span class="label">Catering Charges (Rajdhani)</span>
                <span class="value">₹${cateringFee}</span>
            </div>` : ''}
            <div class="fare-row">
                <span class="label">Portal Service Charge</span>
                <span class="value">₹${agentFee}</span>
            </div>
            ${isAC ? `
            <div class="fare-row">
                <span class="label">GST (5% AC Tax)</span>
                <span class="value">₹${gstValue}</span>
            </div>` : ''}
        </div>
        <hr class="fare-divider">
        <div class="fare-row grand-total-row">
            <span class="label">Total Ticket Price</span>
            <span class="value total-price">₹${grandTotal}</span>
        </div>
    `;
}

// Generate IRCTC JSON Payload for clipboard
function getBookingPayload() {
    const uid = document.getElementById("irctc-uid").value.trim();
    const pwd = document.getElementById("irctc-pwd").value;
    
    return JSON.stringify({
        username: uid,
        password: pwd,
        source: searchState.source,
        destination: searchState.destination,
        date: searchState.date,
        class: searchState.class,
        trainNum: selectedTrain ? selectedTrain.number : "",
        passengers: passengers.map(p => ({
            name: p.name,
            age: p.age,
            gender: p.gender,
            berth: p.berth
        }))
    }, null, 2);
}

function copyIRCTCPayload() {
    if (passengers.length === 0) {
        showNotification("Please add passengers to copy data.", "error");
        return;
    }
    const payload = getBookingPayload();
    navigator.clipboard.writeText(payload)
        .then(() => {
            showNotification("Passenger payload copied to clipboard!", "success");
        })
        .catch(() => {
            showNotification("Failed to copy clipboard payload.", "error");
        });
}

// Generate Single-line Console autofill script
function copyConsoleScript() {
    if (passengers.length === 0) {
        showNotification("Please add passengers to generate script.", "error");
        return;
    }
    
    const payload = getBookingPayload();
    
    // JavaScript code injection string
    const injectCode = `
(function() {
    const data = ${payload};
    console.log("Antigravity Direct Booking Autofill Started!");
    const passengers = data.passengers;
    for (let i = 0; i < passengers.length; i++) {
        const p = passengers[i];
        if (i > 0) {
            const addBtn = Array.from(document.querySelectorAll('span, a, button, div')).find(el => el.textContent && el.textContent.includes('+ Add Passenger'));
            if (addBtn) { addBtn.click(); }
        }
        setTimeout(() => {
            const nameInputs = document.querySelectorAll('input[formcontrolname="passengerName"], input[placeholder*="Name"], input.ui-autocomplete-input');
            const ageInputs = document.querySelectorAll('input[formcontrolname="passengerAge"], input[placeholder*="Age"]');
            const genderSelects = document.querySelectorAll('select[formcontrolname="passengerGender"], select');
            const berthSelects = document.querySelectorAll('select[formcontrolname="passengerBerthChoice"], select');
            
            if (nameInputs[i]) {
                nameInputs[i].value = p.name;
                nameInputs[i].dispatchEvent(new Event('input', { bubbles: true }));
            }
            if (ageInputs[i]) {
                ageInputs[i].value = p.age.toString();
                ageInputs[i].dispatchEvent(new Event('input', { bubbles: true }));
            }
            if (genderSelects[i]) {
                genderSelects[i].value = p.gender.startsWith('M') ? 'M' : p.gender.startsWith('F') ? 'F' : 'T';
                genderSelects[i].dispatchEvent(new Event('change', { bubbles: true }));
            }
            if (berthSelects[i]) {
                let code = "LB";
                if (p.berth === "Upper") code = "UB";
                if (p.berth === "Middle") code = "MB";
                if (p.berth === "Side Lower") code = "SL";
                if (p.berth === "Side Upper") code = "SU";
                berthSelects[i].value = code;
                berthSelects[i].dispatchEvent(new Event('change', { bubbles: true }));
            }
        }, i * 150);
    }
    console.log("Antigravity Injection Done!");
})();
`;

    navigator.clipboard.writeText(injectCode.trim())
        .then(() => {
            showNotification("Autofill console script copied! Paste in Chrome developer tools.", "success");
        })
        .catch(() => {
            showNotification("Failed to copy console script.", "error");
        });
}

// Redirect to official IRCTC
function openIRCTCWeb() {
    if (passengers.length === 0) {
        showNotification("Please add passengers first.", "error");
        return;
    }
    
    const payload = getBookingPayload();
    const parsed = JSON.parse(payload);
    
    navigator.clipboard.writeText(payload).then(() => {
        let redirectUrl = "https://www.irctc.co.in/nget/booking/train-list";
        let message = "Copied booking profile & redirecting to IRCTC Train Search!";
        
        if (parsed.username && parsed.password) {
            redirectUrl = "https://www.irctc.co.in/nget/profile/user-login";
            message = "Copied credentials & details! Redirecting to IRCTC Login...";
        }
        
        window.open(redirectUrl, "_blank");
        showNotification(message, "success");
    });
}

// Simulation Engine
function runBookingSimulation() {
    if (passengers.length === 0) {
        showNotification("Cannot simulate booking without passengers.", "error");
        return;
    }
    
    const overlay = document.getElementById("simulation-overlay");
    const logContainer = document.getElementById("sim-log");
    const progressBar = document.getElementById("sim-progress-bar");
    
    overlay.classList.add("active");
    logContainer.innerHTML = "";
    progressBar.style.width = "0%";
    
    const steps = [
        { text: "🛰️ Establishing secure bridge to IRCTC authentication servers...", delay: 600, progress: 15 },
        { text: "🔑 Authenticating credentials via third-party booking gateway...", delay: 500, progress: 30 },
        { text: "🧩 Analysing CAPTCHA token using neural net solver...", delay: 800, progress: 50 },
        { text: `🧬 Injecting ${passengers.length} passenger details to session memory...`, delay: 700, progress: 75 },
        { text: "🎟️ Reserving seats: " + passengers.map(p => p.berth).join(", ") + "...", delay: 500, progress: 90 },
        { text: "💳 Redirecting directly to NetBanking/UPI Payment Gateway...", delay: 600, progress: 100 }
    ];
    
    let currentStep = 0;
    
    function runNextStep() {
        if (currentStep >= steps.length) {
            // Simulation finished
            const successDiv = document.createElement("div");
            successDiv.className = "sim-success-msg animate-pop";
            successDiv.innerHTML = `
                <div class="sim-success-icon"><i class="fas fa-check-circle"></i></div>
                <h4>Connection established!</h4>
                <p>Auto-filler was successful in 3.2 seconds. Opening payment mode directly on IRCTC...</p>
                <button class="btn-sim-pay" onclick="openIRCTCWeb()">Proceed to IRCTC Portal</button>
            `;
            logContainer.appendChild(successDiv);
            logContainer.scrollTop = logContainer.scrollHeight;
            return;
        }
        
        const step = steps[currentStep];
        const logItem = document.createElement("div");
        logItem.className = "sim-log-item animate-pop";
        logItem.innerHTML = `<span class="time">[${new Date().toLocaleTimeString()}]</span> ${step.text}`;
        logContainer.appendChild(logItem);
        logContainer.scrollTop = logContainer.scrollHeight;
        
        progressBar.style.width = `${step.progress}%`;
        
        currentStep++;
        setTimeout(runNextStep, step.delay);
    }
    
    runNextStep();
}

// Modern Toast Notification
function showNotification(msg, type = "info") {
    const existing = document.querySelector(".toast-notification");
    if (existing) {
        existing.remove();
    }
    
    const toast = document.createElement("div");
    toast.className = `toast-notification ${type} animate-pop`;
    
    let icon = "fa-info-circle";
    if (type === "success") icon = "fa-check-circle";
    if (type === "error") icon = "fa-exclamation-circle";
    if (type === "warning") icon = "fa-exclamation-triangle";
    
    toast.innerHTML = `
        <i class="fas ${icon}"></i>
        <span>${msg}</span>
    `;
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.classList.add("fade-out");
        setTimeout(() => toast.remove(), 400);
    }, 3500);
}

// Credentials Local Storage helpers
function loadCredentials() {
    const uidInput = document.getElementById("irctc-uid");
    const pwdInput = document.getElementById("irctc-pwd");
    const saveCheck = document.getElementById("save-creds");
    
    if (!uidInput || !pwdInput || !saveCheck) return;
    
    const uid = localStorage.getItem("irctc_uid");
    const pwd = localStorage.getItem("irctc_pwd");
    const remember = localStorage.getItem("irctc_remember") !== "false";
    
    if (uid) uidInput.value = uid;
    if (pwd) pwdInput.value = pwd;
    saveCheck.checked = remember;
}

function setupCredentialsListeners() {
    const uidInput = document.getElementById("irctc-uid");
    const pwdInput = document.getElementById("irctc-pwd");
    const saveCheck = document.getElementById("save-creds");
    
    if (!uidInput || !pwdInput || !saveCheck) return;
    
    const save = () => {
        if (saveCheck.checked) {
            localStorage.setItem("irctc_uid", uidInput.value);
            localStorage.setItem("irctc_pwd", pwdInput.value);
            localStorage.setItem("irctc_remember", "true");
        } else {
            localStorage.removeItem("irctc_uid");
            localStorage.removeItem("irctc_pwd");
            localStorage.setItem("irctc_remember", "false");
        }
    };
    
    uidInput.addEventListener("input", save);
    pwdInput.addEventListener("input", save);
    saveCheck.addEventListener("change", save);
}


// Static Database of Indian Railway Stations and Trains
const STATIONS = [
    { code: "NDLS", name: "New Delhi", state: "Delhi" },
    { code: "CSMT", name: "Mumbai CSMT", state: "Maharashtra" },
    { code: "HWH", name: "Howrah Jn", state: "West Bengal" },
    { code: "SBC", name: "KSR Bengaluru", state: "Karnataka" },
    { code: "MAS", name: "MGR Chennai Central", state: "Tamil Nadu" },
    { code: "PNBE", name: "Patna Jn", state: "Bihar" },
    { code: "SC", name: "Secunderabad Jn", state: "Telangana" }
];

const CLASSES = {
    "1A": { name: "AC First Class (1A)", multiplier: 3.0, baseCharge: 500 },
    "2A": { name: "AC 2 Tier (2A)", multiplier: 1.8, baseCharge: 350 },
    "3A": { name: "AC 3 Tier (3A)", multiplier: 1.2, baseCharge: 250 },
    "CC": { name: "AC Chair Car (CC)", multiplier: 0.9, baseCharge: 180 },
    "SL": { name: "Sleeper Class (SL)", multiplier: 0.4, baseCharge: 100 }
};

const TRAINS = [
    {
        number: "12952",
        name: "MUMBAI RAJDHANI",
        route: ["NDLS", "CSMT"],
        distance: 1384, // km
        departure: "16:55",
        arrival: "08:35",
        duration: "15h 40m",
        runsOn: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
        classes: ["1A", "2A", "3A"]
    },
    {
        number: "12302",
        name: "HOWRAH RAJDHANI",
        route: ["NDLS", "HWH"],
        distance: 1451,
        departure: "16:50",
        arrival: "09:55",
        duration: "17h 05m",
        runsOn: ["Mon", "Tue", "Thu", "Fri", "Sat", "Sun"],
        classes: ["1A", "2A", "3A"]
    },
    {
        number: "22692",
        name: "SBC RAJDHANI",
        route: ["NDLS", "SBC"],
        distance: 2269,
        departure: "19:50",
        arrival: "05:20",
        duration: "33h 30m",
        runsOn: ["Mon", "Tue", "Wed", "Fri", "Sat"],
        classes: ["1A", "2A", "3A"]
    },
    {
        number: "12626",
        name: "KERALA EXPRESS",
        route: ["NDLS", "MAS"],
        distance: 2182,
        departure: "20:10",
        arrival: "04:15",
        duration: "32h 05m",
        runsOn: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
        classes: ["2A", "3A", "SL"]
    },
    {
        number: "12310",
        name: "PATNA RAJDHANI",
        route: ["NDLS", "PNBE"],
        distance: 1001,
        departure: "17:15",
        arrival: "04:40",
        duration: "11h 25m",
        runsOn: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
        classes: ["1A", "2A", "3A"]
    },
    {
        number: "12002",
        name: "NDLS BPL SHATABDI",
        route: ["NDLS", "CSMT"], // extends down
        distance: 708,
        departure: "06:00",
        arrival: "14:40",
        duration: "8h 40m",
        runsOn: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sun"],
        classes: ["1A", "CC"]
    },
    {
        number: "12296",
        name: "SANGHAMITRA EXP",
        route: ["PNBE", "SBC"],
        distance: 2690,
        departure: "20:15",
        arrival: "20:20",
        duration: "48h 05m",
        runsOn: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
        classes: ["2A", "3A", "SL"]
    },
    {
        number: "12841",
        name: "COROMANDEL EXP",
        route: ["HWH", "MAS"],
        distance: 1662,
        departure: "15:20",
        arrival: "17:00",
        duration: "25h 40m",
        runsOn: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
        classes: ["2A", "3A", "SL"]
    }
];

// Helper to calculate distance between any two stations dynamically
function getDistance(src, dest) {
    const directTrain = TRAINS.find(t => 
        (t.route[0] === src && t.route[1] === dest) || 
        (t.route[0] === dest && t.route[1] === src)
    );
    if (directTrain) return directTrain.distance;
    
    const coordinates = {
        "NDLS": { x: 77.2, y: 28.6 },
        "CSMT": { x: 72.8, y: 18.9 },
        "HWH":  { x: 88.3, y: 22.5 },
        "SBC":  { x: 77.5, y: 12.9 },
        "MAS":  { x: 80.2, y: 13.0 },
        "PNBE": { x: 85.1, y: 25.6 },
        "SC":   { x: 78.4, y: 17.4 }
    };
    
    const p1 = coordinates[src];
    const p2 = coordinates[dest];
    if (!p1 || !p2) return 1000;
    
    const dx = (p1.x - p2.x) * 100;
    const dy = (p1.y - p2.y) * 110;
    return Math.round(Math.sqrt(dx * dx + dy * dy));
}

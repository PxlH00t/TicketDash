
const raceDuration = 5000;

let racers = [];
let animationId = null;
let raceProgress = 0;

// Load racer data from JSON
async function loadRacers() {
    const response = await fetch("./racers.json", {
        cache: "no-store"
    });

    if (!response.ok) {
        throw new Error("Failed to load racers.json");
    }

    const data = await response.json();
    return data.racers;
}

// Create a lane for each racer using the HTML template
function createRaceLanes() {
    const container = document.getElementById("race-container");
    const template = document.getElementById("race-template");

    container.replaceChildren();

    racers.forEach(racer => {
        const lane = template.content.firstElementChild.cloneNode(true);

        const name = lane.querySelector(".name");
        const tickets = lane.querySelector(".tickets");
        const avatar = lane.querySelector(".racer-avatar");
        const progressBar = lane.querySelector(".race-progress");
        const track = lane.querySelector(".race-track");

        name.textContent = racer.name;
        tickets.textContent = "0 tickets closed";

        avatar.src = racer.image;
        avatar.alt = racer.name;

        // Store references to this racer's elements
        racer.elements = {
            lane,
            name,
            tickets,
            avatar,
            progressBar,
            track
        };

        container.appendChild(lane);
    });
}

// Initialize race progress
function setupRace() {
    const maxTickets = Math.max(
        ...racers.map(racer => racer.tickets)
    );

    racers.forEach(racer => {
        racer.progress = maxTickets > 0
            ? racer.tickets / maxTickets
            : 0;

        racer.elements.tickets.textContent = "0 tickets closed";
    });

    raceProgress = 0;
    updateRacerPositions();

    document.getElementById("race-results").textContent = "Calculating results...";
}

// Easing function for smooth movement
function easeOutCubic(t) {
    return 1 - Math.pow(1 - t, 3);
}

// Update progress bar widths based on track dimensions
function updateRacerPositions() {
    racers.forEach(racer => {
        const { progressBar, avatar, track } = racer.elements;

        const maxDistance = Math.max(
            0,
            track.clientWidth - avatar.offsetWidth
        );

        const position = maxDistance * racer.progress * raceProgress;

        // Retains your existing 30px adjustment
        progressBar.style.width =
            `${Math.max(105, position + avatar.offsetWidth - 30)}px`;
    });
}

// Animate the race
function animateRace() {
    if (animationId !== null) {
        cancelAnimationFrame(animationId);
    }

    const startTime = performance.now();

    function update(currentTime) {
        const elapsed = currentTime - startTime;

        const progress = Math.min(
            elapsed / raceDuration,
            1
        );

        raceProgress = easeOutCubic(progress);

        updateRacerPositions();

        racers.forEach(racer => {
            const currentTickets = Math.round(
                racer.tickets * raceProgress
            );

            racer.elements.tickets.textContent =
                `${currentTickets.toLocaleString()} tickets closed`;
        });

        if (progress < 1) {
            animationId = requestAnimationFrame(update);
        } else {
            animationId = null;
            showResults();
        }
    }

    animationId = requestAnimationFrame(update);
}

// Display race results
function showResults() {
    const results = document.getElementById("race-results");

    if (racers.length === 0) {
        results.textContent = "No racers available.";
        return;
    }

    const sortedRacers = [...racers].sort(
        (a, b) => b.tickets - a.tickets
    );

    const leader = sortedRacers[0];

    const tiedLeaders = sortedRacers.filter(
        racer => racer.tickets === leader.tickets
    );

    if (tiedLeaders.length > 1) {
        results.textContent = tiedLeaders.length === racers.length
            ? "It's a tie!"
            : `${tiedLeaders.map(r => r.name).join(" & ")} are tied for the lead!`;
        return;
    }

    if (racers.length === 1) {
        results.textContent = `${leader.name} is racing solo!`;
        return;
    }

    const runnerUp = sortedRacers[1];
    const difference = leader.tickets - runnerUp.tickets;

    results.textContent =
        `${leader.name} leads by ${difference.toLocaleString()} tickets!`;
}

// Start or replay the race
function startRace() {
    if (animationId !== null) {
        cancelAnimationFrame(animationId);
        animationId = null;
    }

    setupRace();
    animateRace();
}

// Initialize when the page loads
document.addEventListener("DOMContentLoaded", async () => {
    try {
        racers = await loadRacers();

        if (!Array.isArray(racers) || racers.length === 0) {
            throw new Error("Expected at least one racer.");
        }

        createRaceLanes();
        startRace();

        window.addEventListener("resize", updateRacerPositions);

    } catch (error) {
        console.error(error);

        document.getElementById("race-results").textContent =
            "Failed to load race data.";
    }
});

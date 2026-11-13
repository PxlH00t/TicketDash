
const raceDuration = 5000;

// Random speed settings
const speedSegments = 6;
const speedVariation = 0.55;

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
        const racerElement = lane.querySelector(".racer");

        name.textContent = racer.name;
        tickets.textContent = "0 tickets closed";

        avatar.src = racer.image;
        avatar.alt = racer.name;

        racer.elements = {
            lane,
            name,
            tickets,
            avatar,
            progressBar,
            track,
            racerElement
        };

        container.appendChild(lane);
    });
}

// Generate random speed checkpoints for a racer
function generateSpeedProfile() {
    const speeds = [];

    for (let i = 0; i < speedSegments; i++) {
        const randomSpeed =
            1 + (Math.random() * 2 - 1) * speedVariation;

        speeds.push(Math.max(0.1, randomSpeed));
    }

    const totalSpeed = speeds.reduce(
        (sum, speed) => sum + speed,
        0
    );

    const checkpoints = [0];
    let cumulativeProgress = 0;

    speeds.forEach(speed => {
        cumulativeProgress += speed / totalSpeed;
        checkpoints.push(cumulativeProgress);
    });

    // Guarantee an exact finish
    checkpoints[checkpoints.length - 1] = 1;

    return checkpoints;
}

// Smooth interpolation between checkpoints
function smoothstep(t) {
    return t * t * (3 - 2 * t);
}

// Calculate each racer's individual progress

function getRacerProgress(racer, timeProgress) {
    if (timeProgress <= 0) return 0;
    if (timeProgress >= 1) return 1;

    const points = racer.speedProfile;
    const segments = points.length - 1;

    const scaledTime = timeProgress * segments;
    const i = Math.min(Math.floor(scaledTime), segments - 1);
    const t = scaledTime - i;

    const p0 = points[i];
    const p1 = points[i + 1];

    // Calculate smooth velocities at each checkpoint
    const m0 = i === 0
        ? points[1] - points[0]
        : (points[i + 1] - points[i - 1]) / 2;

    const m1 = i === segments - 1
        ? points[segments] - points[segments - 1]
        : (points[i + 2] - points[i]) / 2;

    // Cubic Hermite interpolation
    const t2 = t * t;
    const t3 = t2 * t;

    const h00 = 2 * t3 - 3 * t2 + 1;
    const h10 = t3 - 2 * t2 + t;
    const h01 = -2 * t3 + 3 * t2;
    const h11 = t3 - t2;

    return h00 * p0 + h10 * m0 + h01 * p1 + h11 * m1;
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

        // Generate a new random race every time
        racer.speedProfile = generateSpeedProfile();
        racer.currentProgress = 0;

        racer.elements.tickets.textContent = "0 tickets closed";

        // Reset winner animation
        racer.elements.racerElement.classList.remove("winner");

        // Reset track height classes if present
        racer.elements.track.classList.remove(
            "track-winner",
            "track-loser"
        );
    });

    raceProgress = 0;
    updateRacerPositions();

    document.getElementById("race-results").textContent =
        "Calculating results...";
}

// Update progress bar widths based on track dimensions
function updateRacerPositions() {
    racers.forEach(racer => {
        const { progressBar, avatar, track } = racer.elements;

        const maxDistance = Math.max(
            0,
            track.clientWidth - avatar.offsetWidth
        );

        const position =
            maxDistance * racer.progress * racer.currentProgress;

        // Retains your 30px adjustment and 115px minimum
        progressBar.style.width =
            `${Math.max(115, position + avatar.offsetWidth - 30)}px`;
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

        const timeProgress = Math.min(
            elapsed / raceDuration,
            1
        );

        raceProgress = timeProgress;

        // Update each racer independently
        racers.forEach(racer => {
            racer.currentProgress = getRacerProgress(
                racer,
                timeProgress
            );

            const currentTickets = Math.round(
                racer.tickets * racer.currentProgress
            );

            racer.elements.tickets.textContent =
                `${currentTickets.toLocaleString()} tickets closed`;
        });

        updateRacerPositions();

        if (timeProgress < 1) {
            animationId = requestAnimationFrame(update);
        } else {
            animationId = null;
            showResults();
        }
    }

    animationId = requestAnimationFrame(update);
}

// Apply winner and loser styling
function updateTrackResults(leaders) {
    racers.forEach(racer => {
        const isWinner = leaders.includes(racer);

        racer.elements.track.classList.toggle(
            "track-winner",
            isWinner
        );

        racer.elements.track.classList.toggle(
            "track-loser",
            !isWinner
        );

        racer.elements.racerElement.classList.toggle(
            "winner",
            isWinner
        );
    });
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

    // Apply winner and loser effects
    updateTrackResults(tiedLeaders);

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

        const replayButton = document.getElementById("replay-button");

        if (replayButton) {
            replayButton.addEventListener("click", startRace);
        }

        window.addEventListener("resize", updateRacerPositions);

    } catch (error) {
        console.error(error);

        document.getElementById("race-results").textContent =
            "Failed to load race data.";
    }
});

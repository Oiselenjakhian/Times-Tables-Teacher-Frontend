const FREE_TABLES = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
const PREMIUM_TABLES = [13, 14, 15, 16, 17, 18, 19, 20];

window.selectedPracticeTables = new Set(FREE_TABLES);
window.premiumTablesUnlocked = false;

function renderTableOptions() {
    const freeContainer =
        document.getElementById("free-table-options");

    const premiumContainer =
        document.getElementById("premium-table-options");

    if (!freeContainer || !premiumContainer) return;

    freeContainer.replaceChildren();
    premiumContainer.replaceChildren();

    FREE_TABLES.forEach(table => {
        freeContainer.appendChild(createTableButton(table, false));
    });

    PREMIUM_TABLES.forEach(table => {
        premiumContainer.appendChild(
            createTableButton(table, !window.premiumTablesUnlocked)
        );
    });

    updateSelectionMessage();
}

function createTableButton(table, locked) {
    const button = document.createElement("button");

    button.type = "button";
    button.className = "table-option";
    button.textContent = locked ? `${table} 🔒` : table;
    button.setAttribute("aria-label",
        locked ? `Table ${table}, locked` : `Select table ${table}`
    );

    if (locked) {
        button.classList.add("locked");

        button.addEventListener("click", () => {
            requestAdvancedPackPurchase();
        });

        return button;
    }

    button.classList.toggle(
        "selected",
        window.selectedPracticeTables.has(table)
    );

    button.setAttribute(
        "aria-pressed",
        String(window.selectedPracticeTables.has(table))
    );

    button.addEventListener("click", () => {
        toggleTableSelection(table);
    });

    return button;
}

function toggleTableSelection(table) {
    const selected = window.selectedPracticeTables;

    if (selected.has(table)) {
        if (selected.size === 1) {
            document.getElementById("selection-message").textContent =
                "Select at least one table.";
            return;
        }

        selected.delete(table);
    } else {
        selected.add(table);
    }

    renderTableOptions();
}

function updateSelectionMessage() {
    const message = document.getElementById("selection-message");
    if (!message) return;

    const tables = [...window.selectedPracticeTables].sort((a, b) => a - b);

    message.textContent =
        `Selected ${tables.length} table(s): ${tables.join(", ")}`;
}

function requestAdvancedPackPurchase() {
    // Delegate to the Premium module
    if (window.Premium && typeof Premium.buy === "function") {
        Premium.buy();
    } else {
        alert("Purchase system is not ready yet.");
    }
}

// Call this only after the backend confirms the entitlement.
function setPremiumTablesUnlocked(unlocked) {
    window.premiumTablesUnlocked = unlocked === true;

    if (!window.premiumTablesUnlocked) {
        PREMIUM_TABLES.forEach(table => {
            window.selectedPracticeTables.delete(table);
        });
    }

    renderTableOptions();
}

// Variables to compute the time the user will spend playing a session
let gameStartTime = 0;
let gameEndTime = 0;
let gameTimeUsed = 0;

// Timer for questions
let questionTimeout = null;

// Access the input from the DOM
const textbox = document.getElementById("answer");
	
// Listen for key presses inside the textbox
textbox.addEventListener("keydown", function(event) {
	if (event.key === "Enter") {
		event.preventDefault();
		userAnswer = Number(textbox.value);
		checkAnswer(firstNumber, secondNumber, userAnswer);
	}
});

// ------------------------------------------------------------------
// Lagos Life / Vatar integration
// ------------------------------------------------------------------

// Pause the countdown when the game is backgrounded or a pay sheet opens
document.addEventListener("lagoslife:pause", () => {
	if (typeof clock1 !== "undefined" && clock1 && clock1.isRunning) {
		clock1.pause();
	}
});

// Resume the countdown when the game comes back
document.addEventListener("lagoslife:resume", () => {
	if (typeof clock1 !== "undefined" && clock1 && !clock1.isRunning && clock1.remaining > 0) {
		clock1.start();
	}
});

// Show the player's name on the intro screen
document.addEventListener("lagoslife:ready", (e) => {
	const player = e.detail && e.detail.player;
	const greetingEl = document.getElementById("player-greeting");

	if (player && player.name && greetingEl) {
		if (player.avatar) {
			greetingEl.innerHTML = `
				<img src="${player.avatar}" alt="" 
					 style="width:28px;height:28px;border-radius:50%;vertical-align:middle;margin-right:8px;">
				Hi ${player.name} 👋🏾
			`;
		} else {
			greetingEl.textContent = `Hi ${player.name} 👋🏾`;
		}
	}
});

// ------------------------------------------------------------------

class CountdownTimer {
	constructor(displayElement, timeforQuestions, onComplete = null) {
		this.displayElement = displayElement;
		this.duration = timeforQuestions * 1000;
		this.endTime = 0;
		this.interval = null;
		this.isRunning = false;
		this.onComplete = onComplete;
		this.remaining = this.duration;
	}
	
	formatTime(milliseconds) {
		const totalSeconds = Math.max(0, Math.ceil(milliseconds / 1000));
		const minutes = Math.floor((totalSeconds % 3600) / 60);
		const seconds = totalSeconds % 60;
		
		const pad = (value) => String(value).padStart(2, "0");
		return `${pad(minutes)}:${pad(seconds)}`;
	}
	
	updateDisplay() {
		this.remaining = Math.max(0, this.endTime - performance.now());
		this.displayElement.textContent = this.formatTime(this.remaining);
	}
	
	tick() {
		this.remaining = this.endTime - performance.now();

		if (this.remaining <= 0) {
			this.stop();
			this.displayElement.textContent = "00:00";
			this.updateDisplay();

			if (typeof this.onComplete === "function") {
				this.onComplete();
			}
		} else {
			this.updateDisplay();
		}
	}
	
	start() {
		if (this.isRunning) return;

		this.isRunning = true;
		this.endTime = performance.now() + this.duration;
		this.updateDisplay();

		this.interval = setInterval(() => {
			this.tick();
		}, 100);
	}
	
	pause() {
		if (!this.isRunning) return;
		this.isRunning = false;
		clearInterval(this.interval);
		this.interval = null;
		this.duration = Math.max(0, this.endTime - performance.now());
	}
	
	stop() {
		this.isRunning = false;
		clearInterval(this.interval);
		this.interval = null;
	}
	
	reset() {
		this.stop();
		this.remaining = this.duration;
		this.start();
		this.updateDisplay();
	}
}

function handleTimeUp() {
	const correctAnswer = firstNumber * secondNumber;
	document.getElementById("feedback").textContent = `Times up! ${firstNumber} × ${secondNumber} = ${correctAnswer}`;
	
	if (clock1.remaining == 0) {
		questionTimeout = setTimeout(() => {
			document.getElementById("feedback").textContent = "";
			document.getElementById("answer").value = "";
			
			generateNumbers();
			clock1.start();
			
			questionTracker = questionTracker + 1;
			document.getElementById("question-progress").textContent = `Question ${questionTracker} of ${questionNumber}`;
			updateProgressBar(questionTracker, questionNumber);
			
			if (questionTracker > questionNumber) {
				showResultsScreen();
			}
		}, 3000);
	}    
}

function showResultsScreen() {
	clock1.stop();
	
	gameEndTime = performance.now();
	gameTimeUsed = gameEndTime - gameStartTime;
	const timeUsedInSeconds = Math.floor(gameTimeUsed / 1000);
	
	document.getElementById("time-spent").textContent = formatTime(timeUsedInSeconds);
	document.getElementById("final-score").textContent = score + " / " + questionNumber;
	document.getElementById("correct-count").textContent = score;
	document.getElementById("incorrect-count").textContent = questionNumber - score;
	
	const accuracy = Math.round((score / questionNumber) * 100);
	document.getElementById("accuracy").textContent = accuracy + "%";

	// Submit score to Lagos Life
	if (window.LagosLife) {
		LagosLife.submitScore(score).catch(() => {});
	}
	
	document.getElementById("game-screen").classList.remove("active");
	document.getElementById("results-screen").classList.add("active");
}

function formatTime(timeInSeconds) {
	const milliseconds = timeInSeconds * 1000;
	const totalSeconds = Math.max(0, Math.floor(milliseconds / 1000));
	const minutes = Math.floor((totalSeconds % 3600) / 60);
	const seconds = totalSeconds % 60;
	
	const pad = (value) => String(value).padStart(2, "0");
	return `${pad(minutes)}:${pad(seconds)}`;
}

function showPanel(panelId) {
	document.querySelectorAll(".menu-panel").forEach(panel => {
		panel.classList.remove("active");
	});

	const selectedPanel = document.getElementById(panelId);
	if (selectedPanel) {
		selectedPanel.classList.add("active");
	}
}

function resetValues() {
	score = 0;
	textbox.value = "";
	document.getElementById("score").textContent = score;
	
	questionTracker = 1;
	
	const questionLimit = document.getElementById("questions");
	questionNumber = Number(questionLimit.value);
	
	updateProgressBar(questionTracker, questionNumber);
	document.getElementById("question-progress").textContent = `Question ${questionTracker} of ${questionNumber}`;
}

function showMainMenu() {
	resetValues();
	
	document.getElementById("intro-screen").classList.add("active");
	document.getElementById("game-screen").classList.remove("active");
	document.getElementById("results-screen").classList.remove("active");

	document.querySelectorAll(".menu-panel").forEach(panel => {
		panel.classList.remove("active");
	});
}

function backToMainMenu() {
	clock1.stop();
	
	if (questionTimeout !== null) {
		clearTimeout(questionTimeout);
		questionTimeout = null;
	}
	
	showMainMenu();
}

function getRandomIntInclusive(min, max) {
	const minCeiled = Math.ceil(min);
	const maxFloored = Math.floor(max);
	return Math.floor(Math.random() * (maxFloored - minCeiled + 1) + minCeiled); 
}


const unlockedPacks = new Set();

// Call this only after your backend confirms the player's entitlements.
function setUnlockedPacks(productIds) {
    unlockedPacks.clear();

    productIds.forEach(productId => {
        unlockedPacks.add(productId);
    });
}

function hasAdvancedTables() {
    return unlockedPacks.has("tables_13_20");
}


function generateNumbers() {
    const tables = [...window.selectedPracticeTables];

    if (tables.length === 0) {
        alert("Please select at least one multiplication table.");
        return;
    }

    const tableIndex = getRandomIntInclusive(0, tables.length - 1);

    firstNumber = tables[tableIndex];
    secondNumber = getRandomIntInclusive(1, 12);

    document.getElementById("number1").textContent = firstNumber;
    document.getElementById("number2").textContent = secondNumber;
}

function updateProgressBar(currentQuestion, totalQuestions) {
	const progressBar = document.getElementById("progress-bar");
	const percentage = (currentQuestion / totalQuestions) * 100;
	progressBar.style.width = percentage + "%";
}

function checkAnswer(firstNumber, secondNumber, userAnswer) {
	if ((firstNumber * secondNumber) == userAnswer) {
		document.getElementById("feedback").textContent = `Correct! ${firstNumber} × ${secondNumber} = ${userAnswer}`;
		score = score + 1;
		document.getElementById("score").textContent = score;
	} else {
		const correctAnswer = firstNumber * secondNumber;
		document.getElementById("feedback").textContent = `Wrong! ${firstNumber} × ${secondNumber} = ${correctAnswer}`;
	}
	
	clock1.stop();
	
	questionTimeout = setTimeout(() => {
		document.getElementById("feedback").textContent = "";
		document.getElementById("answer").value = "";
		
		generateNumbers();
		clock1.reset();
		
		questionTracker = questionTracker + 1;
		document.getElementById("question-progress").textContent = `Question ${questionTracker} of ${questionNumber}`;
		updateProgressBar(questionTracker, questionNumber);
		
		if (questionTracker > questionNumber) {
			showResultsScreen();
		}
	}, 2000);
}

function startGame() {
	document.getElementById("intro-screen").classList.remove("active");
	document.getElementById("game-screen").classList.add("active");
		
	gameStartTime = performance.now();
	score = 0;

	const timeforQuestions = Number(document.getElementById("time_limit").value);
	const paragraph = document.getElementById("timer");
	paragraph.textContent = formatTime(timeforQuestions);
	
	generateNumbers();
	
	questionTracker = 1;
	questionNumber = Number(document.getElementById("questions").value);
	
	updateProgressBar(questionTracker, questionNumber);
	
	clock1 = new CountdownTimer(
		paragraph,
		timeforQuestions,
		() => { handleTimeUp(); }
	);

	clock1.start();
	textbox.value = "";
}

function playAgain() {
	resetValues();
	
	document.getElementById("game-screen").classList.add("active");
	document.getElementById("results-screen").classList.remove("active");
		
	clock1.start();
	gameStartTime = performance.now();
}

document.addEventListener("DOMContentLoaded", () => {
    renderTableOptions();

    /* const unlockButton =
        document.getElementById("unlock-advanced-tables");

    unlockButton?.addEventListener("click", requestAdvancedPackPurchase); */

    const startButton =
        document.getElementById("start-mixed-practice");

    startButton?.addEventListener("click", () => {
        window.selectedPracticeTables = new Set(
            window.selectedPracticeTables
        );

        // Connect this to your existing game-start routine.
        if (typeof startGame === "function") {
            startGame();
        } else {
            alert("Connect this button to your game's start function.");
        }
    });
});
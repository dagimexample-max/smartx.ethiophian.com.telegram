/**
 * Telegram Mini App Quiz & AdsGram Integration (script.js)
 * --------------------------------------------------------
 * Senior Developer Best Practices Implemented:
 * 1. Safe Telegram SDK Initialization & Fallback
 * 2. Theme Adaptation (Dynamically binds styles based on light/dark modes)
 * 3. AdsGram Rewarded Video Ad SDK Integration with proper callback promises
 * 4. Haptic Feedback triggers for native UX feel in Telegram app
 * 5. State Management & dynamic UI routing
 */

// 1. TELEGRAM WEBAPP SDK INITIALIZATION
const tg = window.Telegram?.WebApp;

// Configure WebApp parameters if opened inside Telegram
if (tg) {
  tg.ready();       // Notifies Telegram that the app has fully loaded and is ready to display
  tg.expand();      // Expands the mini app to full height inside the chat window
  
  // Apply Telegram header color theme
  if (tg.setHeaderColor) {
    tg.setHeaderColor('secondary_bg_color');
  }
}

// 2. ADSGRAM SDK MONETIZATION CONFIGURATION
/**
 * TO INTEGRATE YOUR ADSGRAM REWARDED ADS:
 * 1. Sign up on AdsGram publisher platform (https://publisher.adsgram.ai).
 * 2. Create a new "Block" and choose "Rewarded Video" format.
 * 3. Copy your unique `blockId` (e.g. "2768" or "block-1234").
 * 4. Paste it in the config below!
 * 
 * DEVELOPMENT vs PRODUCTION:
 * - For sandbox testing outside Telegram or on desktop, AdsGram will load demo ads.
 * - Always use your valid live Block ID when launching on production inside Telegram.
 */
const ADSGRAM_BLOCK_ID = "YOUR_BLOCK_ID_HERE"; // <-- REPLACE WITH YOUR REAL ADSGRAM BLOCK ID

let adController = null;

// Initialize AdsGram safely only if the SDK is loaded
if (window.Adsgram) {
  adController = window.Adsgram.init({ 
    blockId: ADSGRAM_BLOCK_ID,
    debug: true // Set to false in production to disable verbose logs
  });
} else {
  console.warn("AdsGram SDK not loaded. Make sure you are online or check script import.");
}

// 3. QUIZ STATE & STATIC DATA
const QUIZ_QUESTIONS = [
  {
    question: "Which of the following is a key feature of a smart contract on blockchains like Ethereum?",
    options: [
      "It requires a central notary to execute",
      "It is self-executing and immutable",
      "It runs exclusively on local servers",
      "It can be altered by any node participant at any time"
    ],
    correctIndex: 1
  },
  {
    question: "What does the 'npm' command stand for in Node.js development?",
    options: [
      "Node Package Manager",
      "Network Protocol Modifier",
      "Network Packet Manager",
      "Node Progressive Module"
    ],
    correctIndex: 0
  },
  {
    question: "In CSS, what does the Flexbox property 'justify-content: space-between' do?",
    options: [
      "Distributes items evenly, with the first item at the start and the last at the end",
      "Centers all child elements horizontally",
      "Adds padding between the border and the text content",
      "Forces elements to wrap onto multiple vertical lines"
    ],
    correctIndex: 0
  },
  {
    question: "Which HTML tag is used to reference external JavaScript scripts?",
    options: [
      "<js>",
      "<javascript>",
      "<script>",
      "<link>"
    ],
    correctIndex: 2
  },
  {
    question: "What is the primary benefit of hosting a Telegram Mini App inside a Telegram client iframe?",
    options: [
      "It runs directly on Telegram's decentralized cloud database",
      "It completely bypasses traditional domain hosting requirements",
      "It utilizes Telegram user credentials, native payments, and theme variables seamlessly",
      "It automatically compiles JavaScript code to binary assembly"
    ],
    correctIndex: 2
  }
];

// App Variables
let currentQuestionIndex = 0;
let userCoins = 0;
let userLives = 3;
let adRewardType = ""; // Track reward reason: "life", "revive", "double"

// DOM Elements
const userAvatarEl = document.getElementById("user-avatar");
const userNameEl = document.getElementById("user-name");
const coinCountEl = document.getElementById("coin-count");
const liveCountEl = document.getElementById("live-count");

const startScreen = document.getElementById("start-screen");
const quizScreen = document.getElementById("quiz-screen");
const gameoverScreen = document.getElementById("gameover-screen");
const completedScreen = document.getElementById("completed-screen");

const progressBarEl = document.getElementById("progress-bar");
const questionNumberEl = document.getElementById("question-number");
const questionTextEl = document.getElementById("question-text");
const optionsContainer = document.getElementById("options-container");

const startQuizBtn = document.getElementById("start-quiz-btn");
const midQuizAdBtn = document.getElementById("mid-quiz-ad-btn");
const reviveAdBtn = document.getElementById("revive-ad-btn");
const gameoverRestartBtn = document.getElementById("gameover-restart-btn");
const doubleCoinsAdBtn = document.getElementById("double-coins-ad-btn");
const completeFinishBtn = document.getElementById("complete-finish-btn");

const rewardModal = document.getElementById("reward-modal");
const modalIcon = document.getElementById("modal-icon");
const modalTitle = document.getElementById("modal-title");
const modalMessage = document.getElementById("modal-message");
const modalCloseBtn = document.getElementById("modal-close-btn");

// 4. APP INITIALIZATION & TELEGRAM DATA SYNC
function initApp() {
  syncTelegramUserData();
  updateStatsUI();
  setupEventListeners();
}

function syncTelegramUserData() {
  if (tg && tg.initDataUnsafe && tg.initDataUnsafe.user) {
    const user = tg.initDataUnsafe.user;
    
    // Display actual Telegram username or full name
    const displayName = user.first_name + (user.last_name ? ` ${user.last_name}` : "");
    userNameEl.textContent = displayName;
    
    // Set first letter as avatar
    if (user.first_name) {
      userAvatarEl.textContent = user.first_name.charAt(0).toUpperCase();
    }
  } else {
    // Standard default placeholder if opened in general browser
    userNameEl.textContent = "Guest Player";
    userAvatarEl.textContent = "G";
  }
}

function updateStatsUI() {
  coinCountEl.textContent = userCoins;
  liveCountEl.textContent = userLives;
}

function setupEventListeners() {
  startQuizBtn.addEventListener("click", startQuiz);
  midQuizAdBtn.addEventListener("click", () => triggerAdsGramAd("life"));
  reviveAdBtn.addEventListener("click", () => triggerAdsGramAd("revive"));
  doubleCoinsAdBtn.addEventListener("click", () => triggerAdsGramAd("double"));
  
  gameoverRestartBtn.addEventListener("click", restartGame);
  completeFinishBtn.addEventListener("click", restartGame);
  modalCloseBtn.addEventListener("click", closeRewardModal);
}

// 5. SCREEN NAVIGATION HELPER
function showScreen(screenToShow) {
  const screens = [startScreen, quizScreen, gameoverScreen, completedScreen];
  screens.forEach(screen => {
    if (screen === screenToShow) {
      screen.classList.remove("hide");
    } else {
      screen.classList.add("hide");
    }
  });

  // Handle Telegram BackButton visibility
  if (tg && tg.BackButton) {
    if (screenToShow === quizScreen) {
      tg.BackButton.show();
      tg.BackButton.onClick(onTgBackClick);
    } else {
      tg.BackButton.hide();
    }
  }
}

function onTgBackClick() {
  triggerHaptic("medium");
  if (confirm("Are you sure you want to quit the quiz? Your progress will be lost.")) {
    restartGame();
  }
}

// 6. GAMEPLAY LOGIC
function startQuiz() {
  triggerHaptic("light");
  currentQuestionIndex = 0;
  userCoins = 0;
  userLives = 3;
  updateStatsUI();
  renderQuestion();
  showScreen(quizScreen);
}

function restartGame() {
  triggerHaptic("light");
  userCoins = 0;
  userLives = 3;
  currentQuestionIndex = 0;
  updateStatsUI();
  showScreen(startScreen);
}

function renderQuestion() {
  const questionData = QUIZ_QUESTIONS[currentQuestionIndex];
  
  // Progress Bar
  const progressPercent = (currentQuestionIndex / QUIZ_QUESTIONS.length) * 100;
  progressBarEl.style.width = `${progressPercent}%`;
  questionNumberEl.textContent = `Question ${currentQuestionIndex + 1}/${QUIZ_QUESTIONS.length}`;
  
  // Display text
  questionTextEl.textContent = questionData.question;
  
  // Display options
  optionsContainer.innerHTML = "";
  questionData.options.forEach((option, index) => {
    const btn = document.createElement("button");
    btn.className = "option-btn";
    btn.innerHTML = `<span>${option}</span> <span class="indicator"></span>`;
    btn.addEventListener("click", () => selectOption(index, btn));
    optionsContainer.appendChild(btn);
  });
}

function selectOption(selectedIndex, buttonEl) {
  const questionData = QUIZ_QUESTIONS[currentQuestionIndex];
  const allButtons = optionsContainer.querySelectorAll(".option-btn");
  
  // Lock options after selection
  allButtons.forEach(btn => btn.disabled = true);
  
  if (selectedIndex === questionData.correctIndex) {
    // CORRECT ANSWER
    buttonEl.classList.add("correct");
    buttonEl.querySelector(".indicator").innerHTML = "✅";
    userCoins += 10;
    triggerHaptic("success");
  } else {
    // WRONG ANSWER
    buttonEl.classList.add("wrong");
    buttonEl.querySelector(".indicator").innerHTML = "❌";
    userLives -= 1;
    triggerHaptic("error");
    
    // Highlight correct option too
    const correctBtn = allButtons[questionData.correctIndex];
    correctBtn.classList.add("correct");
    correctBtn.querySelector(".indicator").innerHTML = "✅";
  }
  
  updateStatsUI();
  
  // Wait 1.5 seconds to proceed so user can see feedback
  setTimeout(() => {
    if (userLives <= 0) {
      showGameOver();
    } else {
      goToNextQuestion();
    }
  }, 1500);
}

function goToNextQuestion() {
  currentQuestionIndex++;
  if (currentQuestionIndex >= QUIZ_QUESTIONS.length) {
    showQuizCompleted();
  } else {
    renderQuestion();
  }
}

function showGameOver() {
  triggerHaptic("error");
  document.getElementById("gameover-coins").textContent = userCoins;
  showScreen(gameoverScreen);
}

function showQuizCompleted() {
  triggerHaptic("success");
  document.getElementById("completed-coins").textContent = userCoins;
  showScreen(completedScreen);
}

// 7. ADSGRAM REWARDED VIDEO TRIGGERS & PROMISES
function triggerAdsGramAd(rewardType) {
  triggerHaptic("medium");
  adRewardType = rewardType;

  // Check if AdsGram SDK exists
  if (!adController) {
    // Simulated fallback in case the ad controller failed to initialize (e.g. offline, local dev, adblockers)
    console.warn("AdsGram AdController is missing. Simulating video ad callback...");
    simulateAdPlayback();
    return;
  }

  // Trigger real AdsGram video modal
  tg?.showProgress?.(); // Optional Telegram SDK progress spinner
  
  adController.show()
    .then((result) => {
      // PROMISE RESOLVED: Ad completed successfully
      tg?.hideProgress?.();
      handleAdRewardSuccess();
    })
    .catch((error) => {
      // PROMISE REJECTED: Ad skipped or failed to load
      tg?.hideProgress?.();
      console.error("AdsGram ad display error or skipped:", error);
      
      // Notify user via Telegram native dialog if possible, otherwise normal alert
      if (tg && tg.showAlert) {
        tg.showAlert("Ad not completed! Watch the sponsor video fully to claim your reward.");
      } else {
        alert("Ad not completed! Watch the sponsor video fully to claim your reward.");
      }
    });
}

// Simulated fallback for testing outside Telegram / sandbox with no ad blockers
function simulateAdPlayback() {
  alert("No active AdsGram Block ID. Simulating 3-second sponsored video playback...");
  
  setTimeout(() => {
    handleAdRewardSuccess();
  }, 3000);
}

// 8. GRANTING REWARDS TO USER
function handleAdRewardSuccess() {
  triggerHaptic("success");
  
  if (adRewardType === "life") {
    userLives += 1;
    updateStatsUI();
    showRewardModal("💖 Life Claimed", "You successfully earned +1 Extra Life! Resume the quiz and keep your streak alive.", "❤️");
  } else if (adRewardType === "revive") {
    userLives = 3;
    updateStatsUI();
    showRewardModal("⚡ Revived Successfully", "Your energy has been fully restored with 3 Lives! Resuming quiz progress...", "❤️");
    
    // Return them to where they died
    setTimeout(() => {
      showScreen(quizScreen);
      renderQuestion();
    }, 1000);
  } else if (adRewardType === "double") {
    userCoins *= 2;
    updateStatsUI();
    showRewardModal("🪙 Double Coins!", `Double rewards active! Your final score is now ${userCoins} coins!`, "🎉");
    doubleCoinsAdBtn.disabled = true;
    doubleCoinsAdBtn.style.opacity = "0.5";
    doubleCoinsAdBtn.textContent = "Coins Doubled!";
    document.getElementById("completed-coins").textContent = userCoins;
  }
}

// 9. REWARD MODAL & HAPTIC HELPERS
function showRewardModal(title, message, icon) {
  modalTitle.textContent = title;
  modalMessage.textContent = message;
  modalIcon.textContent = icon || "🎁";
  rewardModal.classList.remove("hide");
}

function closeRewardModal() {
  triggerHaptic("light");
  rewardModal.classList.add("hide");
}

function triggerHaptic(style) {
  // Safe execution of Telegram WebApp Haptic feedback api
  if (tg && tg.HapticFeedback) {
    if (style === "success") {
      tg.HapticFeedback.notificationOccurred("success");
    } else if (style === "error") {
      tg.HapticFeedback.notificationOccurred("error");
    } else if (style === "light") {
      tg.HapticFeedback.impactOccurred("light");
    } else if (style === "medium") {
      tg.HapticFeedback.impactOccurred("medium");
    }
  }
}

// Start application
window.addEventListener("DOMContentLoaded", initApp);

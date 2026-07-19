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
const ADSGRAM_BLOCK_ID = "38966"; // <-- Updated to active blockId provided by developer

let adController = null;
let sdkLoadError = null;

// Query the SDK script tag to monitor load issues
const sdkScriptTag = document.getElementById("adsgram-sdk");
if (sdkScriptTag) {
  sdkScriptTag.addEventListener("error", (e) => {
    sdkLoadError = e;
    console.error("AdsGram SDK Script failed to load. This is highly likely due to an active Ad-Blocker (like uBlock Origin, AdGuard), a blocked DNS, or a network failure.", e);
  });
}

// Helper to get or initialize the ad controller on the fly (lazy-init)
function getAdController() {
  if (adController) return adController;
  
  if (window.Adsgram) {
    try {
      adController = window.Adsgram.init({ 
        blockId: ADSGRAM_BLOCK_ID,
        debug: false // Set to false in production to optimize performance
      });
      console.log("AdsGram SDK successfully initialized with block ID: " + ADSGRAM_BLOCK_ID);
      return adController;
    } catch (err) {
      console.error("Failed to initialize AdsGram with block ID: " + ADSGRAM_BLOCK_ID, err);
      return null;
    }
  }
  return null;
}

// Initial attempt to initialize
getAdController();

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

  // Identify which button triggered the action for visual feedback
  let triggeringBtn = null;
  if (rewardType === "life") triggeringBtn = midQuizAdBtn;
  else if (rewardType === "revive") triggeringBtn = reviveAdBtn;
  else if (rewardType === "double") triggeringBtn = doubleCoinsAdBtn;

  const originalBtnHtml = triggeringBtn ? triggeringBtn.innerHTML : "";

  // 1. Explicitly check if AdsGram SDK is initialized or initialize it on-demand
  const controller = getAdController();

  if (!window.Adsgram || !controller) {
    console.error("AdsGram SDK is unavailable or failed initialization.");
    
    // Check if there was an explicit script error
    let specificCause = "Please check your network connection.";
    if (sdkLoadError) {
      specificCause = "The SDK script failed to load (likely blocked by an Ad-Blocker, privacy extension, or parental controls).";
      console.error("AdsGram Load Error Details: The adsgram-adbox.js script was explicitly blocked or failed to load. Check browser network tab for blocked requests.", sdkLoadError);
    } else if (!window.Adsgram) {
      specificCause = "The 'window.Adsgram' object is undefined. Check if sad.adsgram.ai is blocked in your environment or if you are running offline.";
      console.warn("AdsGram Reference Error: window.Adsgram is undefined. Please verify the script tag exists in index.html and is not blocked.");
    } else {
      specificCause = "The AdController failed to initialize with Block ID " + ADSGRAM_BLOCK_ID + ". Please check if the block ID is active and correctly configured.";
      console.error("AdsGram Initialization Error: window.Adsgram is defined but init() returned null or threw an error for Block ID: " + ADSGRAM_BLOCK_ID);
    }

    const errorMsg = "Monetization SDK is not ready. " + specificCause + " Ensure you are online, have disabled any active Ad-Blockers, and are viewing the app in a supported environment (Telegram App is recommended).";
    
    // Fallback custom friendly UI visual alert
    showRewardModal("⚠️ Monetization Offline", errorMsg, "❌");
    
    if (tg && tg.showAlert) {
      tg.showAlert("Monetization offline! " + specificCause);
    }
    return;
  }

  // 2. Provide clear visual feedback when ad is loading
  if (triggeringBtn) {
    triggeringBtn.disabled = true;
    triggeringBtn.innerHTML = "<span>⏳ Loading Sponsor Video...</span>";
    triggeringBtn.style.opacity = "0.75";
  }

  // Trigger optional Telegram header loading spinner
  tg?.showProgress?.(); 
  
  controller.show()
    .then((result) => {
      // PROMISE RESOLVED: Ad completed successfully
      tg?.hideProgress?.();
      
      // Restore button status
      if (triggeringBtn) {
        triggeringBtn.disabled = false;
        triggeringBtn.innerHTML = originalBtnHtml;
        triggeringBtn.style.opacity = "1";
      }

      handleAdRewardSuccess();
    })
    .catch((error) => {
      // PROMISE REJECTED: Ad skipped, closed early, or failed to load
      tg?.hideProgress?.();
      
      // Restore button status
      if (triggeringBtn) {
        triggeringBtn.disabled = false;
        triggeringBtn.innerHTML = originalBtnHtml;
        triggeringBtn.style.opacity = "1";
      }

      console.error("AdsGram ad display error or skipped:", error);
      
      // 3. User-friendly parsed error reporting
      let friendlyError = "The sponsored video could not be displayed. Please check your network, turn off ad-blockers, and try again!";
      
      if (error) {
        if (typeof error === 'object') {
          if (error.description) {
            friendlyError = "Ad Block Error: " + error.description + " (Check if block 38966 is live)";
          } else if (error.message) {
            friendlyError = "Failed to load: " + error.message;
          }
        } else if (typeof error === 'string') {
          if (error.toLowerCase().indexOf("user closed") !== -1 || error.toLowerCase().indexOf("closed") !== -1) {
            friendlyError = "You closed the sponsor video before it finished! Please watch the full video to claim your reward.";
          } else {
            friendlyError = "Sponsor feedback: " + error;
          }
        }
      }

      // Display in native Telegram alert if possible
      if (tg && tg.showAlert) {
        tg.showAlert(friendlyError);
      } else {
        // Fallback to custom in-app reward modal styled as error
        showRewardModal("⚠️ Ad Load Failed", friendlyError, "❌");
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

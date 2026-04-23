// ─── Config ─── //
const CONFIG = {
  monthlyFunMoney: 400,
  targetMonthlySavings: 225,
  targetSavingsGoal: 20000,
  startDate: '2026-05-01',
};

const ACHIEVEMENTS = [
  { id: 'first-day', name: 'First Step', icon: '👣', description: 'Log your first transaction' },
  { id: 'week-streak-5', name: '5-Day Streak', icon: '🔥', description: 'Stay under budget for 5 days' },
  { id: 'week-perfect', name: 'Perfect Week', icon: '✨', description: 'Stay under budget all 7 days' },
  { id: 'month-goal', name: 'Monthly Goal', icon: '🎯', description: 'Reach your monthly savings target' },
  { id: 'milestone-5k', name: '$5K Saved', icon: '💎', description: 'Reach $5,000 saved' },
  { id: 'milestone-10k', name: '$10K Saved', icon: '💰', description: 'Reach $10,000 saved' },
  { id: 'milestone-20k', name: '$20K Saved', icon: '🏆', description: 'Reach $20,000 saved' },
];

const MILESTONES = [
  { amount: 0, label: 'Start', emoji: '🔒', description: 'Begin your journey to save for the Stingray' },
  { amount: 5000, label: '$5,000', emoji: '🚗', description: 'You\'re making progress!' },
  { amount: 10000, label: '$10,000', emoji: '🏎️', description: 'Halfway to your goal!' },
  { amount: 15000, label: '$15,000', emoji: '⚡', description: 'Almost there!' },
  { amount: 20000, label: '$20,000', emoji: '🏆', description: 'You own the Stingray!' },
];

// ─── State Management ─── //
let appData = {
  config: CONFIG,
  transactions: [],
  subscriptions: [],
  xpData: {
    totalXP: 0,
    level: 1,
    xpForNextLevel: 1000,
    history: [],
  },
  achievementState: {
    unlockedDates: {},
    resetDate: null,
  },
};

// ─── Storage ─── //
function loadData() {
  const stored = localStorage.getItem('stingrayData');
  if (stored) {
    appData = JSON.parse(stored);
  }

  // Ensure xpData exists (for backward compatibility)
  if (!appData.xpData) {
    appData.xpData = {
      totalXP: 0,
      level: 1,
      xpForNextLevel: 1000,
      history: [],
    };
  }

  // Ensure achievementState exists (for backward compatibility)
  if (!appData.achievementState) {
    appData.achievementState = {
      unlockedDates: {},
      resetDate: null,
    };
  }

  // Ensure subscriptions have billingMonth for yearly subs (for backward compatibility)
  appData.subscriptions = appData.subscriptions.map(sub => {
    if (sub.billingCycle === 'yearly' && !sub.billingMonth) {
      return { ...sub, billingMonth: new Date().getMonth() + 1 };
    }
    return sub;
  });

  // Check if May 1st reset is needed
  const today = getTodayDate();
  const todayObj = new Date(today);
  if (todayObj.getMonth() === 4 && todayObj.getDate() === 1) {
    if (appData.achievementState?.resetDate !== today) {
      appData.xpData = { totalXP: 0, level: 1, xpForNextLevel: 1000, history: [] };
      appData.transactions = [];
      appData.achievementState.resetDate = today;
      saveData();
    }
  }
}

function saveData() {
  localStorage.setItem('stingrayData', JSON.stringify(appData));
  updateUI();
}

// ─── Calculations ─── //
function getTodayDate() {
  return new Date().toISOString().split('T')[0];
}

function getDaysInCurrentMonth() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
}

function getTodayTransactions() {
  const today = getTodayDate();
  return appData.transactions.filter(tx => tx.date === today);
}

function getTodaySpent() {
  return getTodayTransactions()
    .filter(tx => tx.category !== 'Extra Savings' && tx.category !== 'Withdrawal')
    .reduce((sum, tx) => sum + tx.amount, 0);
}

function getActiveSubscriptionsTotal() {
  const currentMonth = new Date().getMonth() + 1;
  return appData.subscriptions
    .filter(sub => sub.active)
    .reduce((sum, sub) => {
      if (sub.billingCycle === 'yearly') {
        if (sub.billingMonth === currentMonth) {
          return sum + (sub.amount / 12);
        }
        return sum;
      }
      return sum + sub.amount;
    }, 0);
}

function getSubscriptionsForMonth(monthIdx) {
  return appData.subscriptions
    .filter(sub => sub.active && (sub.billingCycle === 'monthly' || sub.billingMonth === monthIdx + 1));
}

function getDailyAllowance() {
  const subscriptionsTotal = getActiveSubscriptionsTotal();
  const daysInMonth = getDaysInCurrentMonth();
  const available = appData.config.monthlyFunMoney - appData.config.targetMonthlySavings - subscriptionsTotal;
  return Math.max(0, available / daysInMonth);
}

function getTotalSaved() {
  const extraSavings = appData.transactions
    .filter(tx => tx.category === 'Extra Savings')
    .reduce((sum, tx) => sum + tx.amount, 0);
  const withdrawals = appData.transactions
    .filter(tx => tx.category === 'Withdrawal')
    .reduce((sum, tx) => sum + tx.amount, 0);
  return Math.max(0, extraSavings - withdrawals);
}

function getMonthlyAdditionalSavings() {
  const today = new Date();
  const monthAdditional = appData.transactions
    .filter(tx => {
      const date = new Date(tx.date);
      return date.getFullYear() === today.getFullYear() && date.getMonth() === today.getMonth() &&
             tx.category === 'Extra Savings';
    })
    .reduce((sum, tx) => sum + tx.amount, 0);
  return monthAdditional;
}

function getAverageMonthlyAdditionalSavings() {
  const additionalSavingsTxs = appData.transactions.filter(tx => tx.category === 'Extra Savings');
  if (additionalSavingsTxs.length === 0) return 0;

  const monthlyTotals = {};
  additionalSavingsTxs.forEach(tx => {
    const date = new Date(tx.date);
    const key = `${date.getFullYear()}-${date.getMonth()}`;
    monthlyTotals[key] = (monthlyTotals[key] || 0) + tx.amount;
  });

  const months = Object.keys(monthlyTotals).length;
  const total = Object.values(monthlyTotals).reduce((sum, val) => sum + val, 0);
  return months > 0 ? total / months : 0;
}

function getCurrentMilestone() {
  const saved = getTotalSaved();
  return MILESTONES.reduce((prev, current) =>
    saved >= current.amount ? current : prev
  );
}

function getNextMilestone() {
  const saved = getTotalSaved();
  return MILESTONES.find(m => m.amount > saved) || MILESTONES[MILESTONES.length - 1];
}

function calculateStreak() {
  let currentStreak = 0;
  let longestStreak = 0;
  let tempStreak = 0;
  const dailyAllowance = getDailyAllowance();

  const checkDate = new Date();
  for (let i = 0; i < 365; i++) {
    const dateStr = checkDate.toISOString().split('T')[0];
    const daySpent = appData.transactions
      .filter(tx => tx.date === dateStr)
      .reduce((sum, tx) => sum + tx.amount, 0);

    if (daySpent <= dailyAllowance) {
      tempStreak++;
      if (i === 0) currentStreak = tempStreak;
    } else {
      longestStreak = Math.max(longestStreak, tempStreak);
      tempStreak = 0;
    }
    checkDate.setDate(checkDate.getDate() - 1);
  }

  longestStreak = Math.max(longestStreak, tempStreak);
  return { currentStreak, longestStreak };
}

function getWeeklyStats() {
  const today = new Date();
  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() - today.getDay());

  let weekUnderBudget = 0;
  let weekSpent = 0;
  const dailyAllowance = getDailyAllowance();

  for (let i = 0; i < 7; i++) {
    const date = new Date(weekStart);
    date.setDate(date.getDate() + i);
    const dateStr = date.toISOString().split('T')[0];

    const daySpent = appData.transactions
      .filter(tx => tx.date === dateStr && tx.category !== 'Extra Savings' && tx.category !== 'Withdrawal')
      .reduce((sum, tx) => sum + tx.amount, 0);

    weekSpent += daySpent;
    if (daySpent <= dailyAllowance) weekUnderBudget++;
  }

  return { weekUnderBudget, weekSpent };
}

function getDailyXPGain() {
  const dailyAllowance = getDailyAllowance();
  const spentToday = getTodaySpent();
  if (spentToday < dailyAllowance) {
    return Math.floor((dailyAllowance - spentToday) * 10);
  }
  return 0;
}

function addXP(amount, source) {
  appData.xpData.totalXP += amount;
  appData.xpData.history.push({
    date: getTodayDate(),
    source,
    xpGained: amount
  });
  checkLevelUp();
  saveData();
}

function checkLevelUp() {
  const xpNeeded = appData.xpData.level * 1000;
  if (appData.xpData.totalXP >= xpNeeded) {
    appData.xpData.level++;
  }
}

function getMonthlyStats() {
  const today = new Date();
  const monthSpent = appData.transactions
    .filter(tx => {
      const date = new Date(tx.date);
      return date.getFullYear() === today.getFullYear() && date.getMonth() === today.getMonth() &&
             tx.category !== 'Extra Savings' && tx.category !== 'Withdrawal';
    })
    .reduce((sum, tx) => sum + tx.amount, 0);

  const monthlySaved = appData.config.monthlyFunMoney - monthSpent;
  const metGoal = monthlySaved >= appData.config.targetMonthlySavings;

  return { monthSpent, monthlySaved, metGoal };
}

function getSpendingByCategory(year, month) {
  const categoryTotals = {};

  appData.transactions.forEach(tx => {
    const txDate = new Date(tx.date);
    if (txDate.getFullYear() === year && txDate.getMonth() === month &&
        tx.category !== 'Extra Savings' && tx.category !== 'Withdrawal') {
      categoryTotals[tx.category] = (categoryTotals[tx.category] || 0) + tx.amount;
    }
  });

  return Object.entries(categoryTotals).map(([category, amount]) => ({
    category,
    amount
  })).sort((a, b) => b.amount - a.amount);
}

function getUnlockedAchievements() {
  const unlocked = new Set();
  const saved = getTotalSaved();
  const dailyAllowance = getDailyAllowance();

  // First day
  if (appData.transactions.length > 0) unlocked.add('first-day');

  // Streaks
  const { currentStreak, longestStreak } = calculateStreak();
  if (currentStreak >= 5) unlocked.add('week-streak-5');

  // Weekly perfect
  const { weekUnderBudget } = getWeeklyStats();
  if (weekUnderBudget === 7) unlocked.add('week-perfect');

  // Monthly goal
  const { monthlySaved } = getMonthlyStats();
  if (monthlySaved >= appData.config.targetMonthlySavings) unlocked.add('month-goal');

  // Milestones
  if (saved >= 5000) unlocked.add('milestone-5k');
  if (saved >= 10000) unlocked.add('milestone-10k');
  if (saved >= 20000) unlocked.add('milestone-20k');

  return unlocked;
}

// ─── Event Listeners ─── //
document.addEventListener('DOMContentLoaded', () => {
  loadData();
  setupTabNavigation();
  setupFormHandlers();
  setupMonthDropdowns();
  updateUI();
});

function setupTabNavigation() {
  const tabBtns = document.querySelectorAll('.tabs__btn');
  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const tabId = btn.dataset.tab;
      switchTab(tabId);
    });
  });
}

function switchTab(tabId) {
  // Update buttons
  document.querySelectorAll('.tabs__btn').forEach(btn => {
    btn.classList.remove('active');
  });
  document.querySelector(`[data-tab="${tabId}"]`).classList.add('active');

  // Update panes
  document.querySelectorAll('.tab-pane').forEach(pane => {
    pane.classList.remove('active');
  });
  document.getElementById(`tab-${tabId}`).classList.add('active');
}

function setupFormHandlers() {
  // Spending form
  const toggleFormBtn = document.getElementById('toggleFormBtn');
  const spendingForm = document.getElementById('spendingForm');
  toggleFormBtn.addEventListener('click', () => {
    spendingForm.classList.toggle('hidden');
  });

  spendingForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const amount = parseFloat(document.getElementById('amount').value);
    const category = document.getElementById('category').value;
    const note = document.getElementById('note').value;

    if (amount > 0) {
      appData.transactions.push({
        id: Date.now().toString(),
        date: getTodayDate(),
        amount,
        category,
        note,
        timestamp: new Date().toISOString(),
      });
      saveData();

      // Check if spent under budget and award XP
      const dailyAllowance = getDailyAllowance();
      const newTodaySpent = getTodaySpent();
      if (newTodaySpent < dailyAllowance) {
        const xpGain = getDailyXPGain();
        if (xpGain > 0) {
          addXP(xpGain, 'daily-under');
        }
      }

      spendingForm.reset();
      spendingForm.classList.add('hidden');
    }
  });

  // Avoided Purchase form
  const toggleAvoidedBtn = document.getElementById('toggleAvoidedBtn');
  const avoidedForm = document.getElementById('avoidedForm');
  toggleAvoidedBtn.addEventListener('click', () => {
    avoidedForm.classList.toggle('hidden');
  });

  // Avoided Purchase submit button click handler
  const avoidedSubmitBtn = avoidedForm.querySelector('button[type="submit"]');
  avoidedSubmitBtn.addEventListener('click', (e) => {
    e.preventDefault();
    const item = document.getElementById('avoidedItem').value;
    const cost = parseFloat(document.getElementById('avoidedCost').value);

    if (item && cost > 0) {
      appData.transactions.push({
        id: Date.now().toString(),
        date: getTodayDate(),
        amount: 0,
        category: 'Avoided',
        note: `Avoided: ${item} ($${cost.toFixed(2)})`,
        timestamp: new Date().toISOString(),
      });

      avoidedForm.classList.add('hidden');
      avoidedForm.reset();
      addXP(10, 'avoided-purchase');
    }
  });

  // Extra Savings form
  const toggleExtraSavingsBtn = document.getElementById('toggleExtraSavingsBtn');
  const extraSavingsForm = document.getElementById('extraSavingsForm');
  toggleExtraSavingsBtn.addEventListener('click', () => {
    extraSavingsForm.classList.toggle('hidden');
  });

  // Extra Savings submit button click handler
  const extraSavingsSubmitBtn = extraSavingsForm.querySelector('button[type="submit"]');
  extraSavingsSubmitBtn.addEventListener('click', (e) => {
    e.preventDefault();
    const dollars = parseInt(document.getElementById('extraDollars').value) || 0;
    const cents = parseInt(document.getElementById('extraCents').value) || 0;

    if (dollars > 0 || cents > 0) {
      const totalAmount = dollars + (cents / 100);
      const xpGain = Math.floor(totalAmount);

      appData.transactions.push({
        id: Date.now().toString(),
        date: getTodayDate(),
        amount: totalAmount,
        category: 'Extra Savings',
        note: `+${xpGain} XP`,
        timestamp: new Date().toISOString(),
      });

      extraSavingsForm.classList.add('hidden');
      extraSavingsForm.reset();
      addXP(xpGain, 'extra-savings');
    }
  });

  // Withdrawal form
  const toggleWithdrawalBtn = document.getElementById('toggleWithdrawalBtn');
  const withdrawalForm = document.getElementById('withdrawalForm');
  toggleWithdrawalBtn.addEventListener('click', () => {
    withdrawalForm.classList.toggle('hidden');
  });

  // Withdrawal submit button click handler
  const withdrawalSubmitBtn = withdrawalForm.querySelector('button[type="submit"]');
  withdrawalSubmitBtn.addEventListener('click', (e) => {
    e.preventDefault();
    const amount = parseFloat(document.getElementById('withdrawalAmount').value);
    const reason = document.getElementById('withdrawalReason').value;

    if (amount > 0) {
      const xpLoss = Math.floor(amount);

      appData.transactions.push({
        id: Date.now().toString(),
        date: getTodayDate(),
        amount,
        category: 'Withdrawal',
        note: reason ? `Withdrawal: ${reason}` : 'Withdrawal from savings',
        timestamp: new Date().toISOString(),
      });

      withdrawalForm.classList.add('hidden');
      withdrawalForm.reset();
      addXP(-xpLoss, 'withdrawal');
    }
  });

  // Subscription form
  const toggleSubFormBtn = document.getElementById('toggleSubFormBtn');
  const subscriptionForm = document.getElementById('subscriptionForm');
  const billingCycleSelect = document.getElementById('subBillingCycle');
  const billingMonthGroup = document.getElementById('billingMonthGroup');

  toggleSubFormBtn.addEventListener('click', () => {
    subscriptionForm.classList.toggle('hidden');
  });

  billingCycleSelect.addEventListener('change', (e) => {
    if (e.target.value === 'yearly') {
      billingMonthGroup.style.display = 'block';
    } else {
      billingMonthGroup.style.display = 'none';
    }
  });

  // Subscription submit button click handler
  const subscriptionSubmitBtn = subscriptionForm.querySelector('button[type="submit"]');
  subscriptionSubmitBtn.addEventListener('click', (e) => {
    e.preventDefault();
    const name = document.getElementById('subName').value;
    const amount = parseFloat(document.getElementById('subAmount').value);
    const day = parseInt(document.getElementById('subDay').value);
    const category = document.getElementById('subCategory').value;
    const billingCycle = document.getElementById('subBillingCycle').value;
    const billingMonth = billingCycle === 'yearly' ? parseInt(document.getElementById('subBillingMonth').value) : null;
    const active = document.getElementById('subActive').checked;

    if (name && amount > 0) {
      appData.subscriptions.push({
        id: Date.now().toString(),
        name,
        amount,
        dayOfMonth: day,
        category,
        billingCycle,
        billingMonth,
        active,
      });
      subscriptionForm.classList.add('hidden');
      subscriptionForm.reset();
      billingMonthGroup.style.display = 'none';
      saveData();
      updateUI();
    }
  });

  // Data Reset button
  const resetDataBtn = document.getElementById('resetDataBtn');
  if (resetDataBtn) {
    resetDataBtn.addEventListener('click', () => {
      if (confirm('⚠️ Are you sure? This will DELETE ALL your data (transactions, subscriptions, achievements, XP) and cannot be undone.')) {
        localStorage.removeItem('stingrayData');
        location.reload();
      }
    });
  }
}

function setupMonthDropdowns() {
  const monthSelect = document.getElementById('reportMonth');
  const now = new Date();

  for (let i = 0; i < 12; i++) {
    const opt = document.createElement('option');
    opt.value = i;
    opt.textContent = new Date(2026, i).toLocaleString('default', { month: 'long' });
    if (i === now.getMonth()) opt.selected = true;
    monthSelect.appendChild(opt);
  }

  monthSelect.addEventListener('change', updateUI);
}

// ─── UI Updates ─── //
function updateUI() {
  updateHero();
  updateXP();
  updateDailySummary();
  updateWeeklyTracker();
  updateStats();
  updateSubscriptions();
  updateReports();
  updateAchievements();
}

function updateHero() {
  const saved = getTotalSaved();
  const progressPercent = Math.min((saved / CONFIG.targetSavingsGoal) * 100, 100);

  document.getElementById('totalSaved').textContent = `$${saved.toFixed(0)}`;
  document.getElementById('progressBarFill').style.width = `${progressPercent}%`;
  document.getElementById('progressPercent').textContent = `${progressPercent.toFixed(1)}%`;

  // Update journey stages
  document.querySelectorAll('.journey__stage').forEach(stage => {
    const stageAmount = parseInt(stage.dataset.stage);
    stage.classList.toggle('active', saved >= stageAmount);
  });

  // Update milestones
  const current = getCurrentMilestone();
  const next = getNextMilestone();
  document.getElementById('currentEmoji').textContent = current.emoji;
  document.getElementById('currentMilestone').textContent = current.label;
  document.getElementById('currentDesc').textContent = current.description;

  if (next.amount > saved) {
    document.getElementById('nextEmoji').textContent = next.emoji;
    document.getElementById('nextMilestone').textContent = next.label;
    document.getElementById('nextAmount').textContent = `$${(next.amount - saved).toFixed(0)} to go!`;
    document.getElementById('nextMilestoneCard').style.display = '';
  } else {
    document.getElementById('nextMilestoneCard').style.display = 'none';
  }
}

function getTodaySpentDailyOnly() {
  const today = getTodayDate();
  return appData.transactions
    .filter(tx => tx.date === today && tx.category !== 'Extra Savings' && tx.category !== 'Withdrawal')
    .reduce((sum, tx) => sum + tx.amount, 0);
}

function updateDailySummary() {
  const today = getTodayDate();
  const spent = getTodaySpentDailyOnly();
  const dailyAllowance = getDailyAllowance();
  const remaining = dailyAllowance - spent;
  const underBudget = spent <= dailyAllowance;
  const progressPercent = Math.max(0, 100 - (spent / dailyAllowance) * 100);

  // Status banner
  const statusBanner = document.getElementById('statusBanner');
  statusBanner.className = `status-banner ${underBudget ? '' : 'over-budget'}`;
  document.getElementById('statusTitle').textContent = underBudget ? '✅ You\'re on track!' : '⚠️ Over today\'s allowance';
  if (underBudget) {
    document.getElementById('statusText').textContent = 'Amazing! Stay focused and you\'ll crush today\'s goal.';
  } else {
    const overage = spent - dailyAllowance;
    document.getElementById('statusText').textContent = `You're $${overage.toFixed(2)} over your $${dailyAllowance.toFixed(2)} allowance. Keep trying tomorrow!`;
  }

  // Stats
  document.getElementById('dailyAllowance').textContent = `$${dailyAllowance.toFixed(2)}`;
  document.getElementById('spentToday').textContent = `$${spent.toFixed(2)}`;

  // Remaining with color coding
  const remainingEl = document.getElementById('remaining');
  if (remaining < 0) {
    remainingEl.textContent = `-$${Math.abs(remaining).toFixed(2)}`;
    remainingEl.style.color = '#ef4444';
  } else {
    remainingEl.textContent = `$${remaining.toFixed(2)}`;
    remainingEl.style.color = '#10b981';
  }

  document.getElementById('dailyProgress').textContent = `${progressPercent.toFixed(0)}%`;

  // Progress bar: right-to-left depletion (100% full, 0% empty)
  const dailyBarFill = document.getElementById('dailyBarFill');
  dailyBarFill.style.width = `${Math.max(0, progressPercent)}%`;

  // Color changes: green (50-100%), orange (25-50%), red (0-25%)
  if (progressPercent >= 50) {
    dailyBarFill.style.background = 'rgb(16, 185, 129)'; // Green
  } else if (progressPercent >= 25) {
    const orange = Math.round(165 + ((progressPercent - 25) / 25) * 90); // 165 to 255
    dailyBarFill.style.background = `rgb(249, 115, 22, ${orange})`; // Orange gradient
  } else {
    dailyBarFill.style.background = 'rgb(248, 113, 113)'; // Red
  }

  // Warning text
  const warningEl = document.getElementById('warningText');
  if (remaining > 0 && remaining <= dailyAllowance * 0.1) {
    warningEl.textContent = 'You\'re almost at your limit—be mindful with your next purchase!';
  } else {
    warningEl.textContent = '';
  }

  // Transactions list - show all transactions
  const transactions = getTodayTransactions();
  const listEl = document.getElementById('transactionsList');

  if (transactions.length === 0) {
    listEl.innerHTML = '<p class="empty-state">✨ No transactions logged yet</p>';
  } else {
    listEl.innerHTML = transactions.map(tx => {
      const time = new Date(tx.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      let amountClass = 'transaction__amount--spending';
      let amountDisplay = `-$${tx.amount.toFixed(2)}`;

      if (tx.category === 'Avoided') {
        amountClass = 'transaction__amount--avoided';
        amountDisplay = '$0.00';
      } else if (tx.category === 'Extra Savings') {
        amountClass = 'transaction__amount--savings';
        amountDisplay = `+$${tx.amount.toFixed(2)}`;
      } else if (tx.category === 'Withdrawal') {
        amountClass = 'transaction__amount--withdrawal';
        amountDisplay = `-$${tx.amount.toFixed(2)}`;
      }

      return `
        <div class="transaction">
          <div class="transaction__info">
            <div>
              <span class="transaction__tag">${tx.category}</span>
              ${tx.note ? `<span class="transaction__note">${tx.note}</span>` : ''}
            </div>
            <p class="transaction__time">${time}</p>
          </div>
          <p class="transaction__amount ${amountClass}">${amountDisplay}</p>
          <button class="btn btn--danger transaction__delete" onclick="deleteTransaction('${tx.id}')">✕</button>
        </div>
      `;
    }).join('');
  }
}

function updateXP() {
  const currentLevel = appData.xpData.level;
  const nextLevelXP = currentLevel * 1000;
  const currentXP = appData.xpData.totalXP % nextLevelXP;
  const percentage = (currentXP / nextLevelXP) * 100;

  document.getElementById('currentLevel').textContent = currentLevel;
  document.getElementById('totalXP').textContent = `${appData.xpData.totalXP} XP`;
  document.getElementById('xpPercent').textContent = `${Math.round(percentage)}%`;
  document.getElementById('xpBarFill').style.width = `${percentage}%`;
  document.getElementById('nextXPLevel').textContent = `${nextLevelXP - currentXP} XP to next level`;
}

function updateWeeklyTracker() {
  const dailyAllowance = getDailyAllowance();
  const weeklyAllocation = dailyAllowance * 7;
  const { weekSpent } = getWeeklyStats();
  const remaining = weeklyAllocation - weekSpent;
  const percentage = Math.min(100, (weekSpent / weeklyAllocation) * 100);

  document.getElementById('weeklyAllocation').textContent = `$${weeklyAllocation.toFixed(2)}`;
  document.getElementById('weeklySpent').textContent = `$${weekSpent.toFixed(2)}`;

  // Weekly remaining with color coding
  const weeklyRemainingEl = document.getElementById('weeklyRemaining');
  if (remaining < 0) {
    weeklyRemainingEl.textContent = `-$${Math.abs(remaining).toFixed(2)}`;
    weeklyRemainingEl.style.color = '#ef4444';
  } else {
    weeklyRemainingEl.textContent = `$${remaining.toFixed(2)}`;
    weeklyRemainingEl.style.color = '#10b981';
  }

  document.getElementById('weeklyBarFill').style.width = `${percentage}%`;
  document.getElementById('weeklyPercent').textContent = `${Math.round(percentage)}%`;
}

function updateStats() {
  const { currentStreak, longestStreak } = calculateStreak();
  const { weekUnderBudget, weekSpent } = getWeeklyStats();
  const { monthSpent, monthlySaved, metGoal } = getMonthlyStats();
  const dailyAllowance = getDailyAllowance();
  const weeklyAllocation = dailyAllowance * 7;

  // Streaks
  const currentStreakEl = document.getElementById('currentStreak');
  if (currentStreakEl) currentStreakEl.textContent = currentStreak;
  const longestStreakEl = document.getElementById('longestStreak');
  if (longestStreakEl) longestStreakEl.textContent = longestStreak;

  // Weekly - show both daily success and weekly total
  const weekUnderBudgetEl = document.getElementById('weekUnderBudget');
  if (weekUnderBudgetEl) weekUnderBudgetEl.textContent = `${weekUnderBudget}/7 days`;
  const weekSpentEl = document.getElementById('weekSpent');
  if (weekSpentEl) weekSpentEl.textContent = `$${weekSpent.toFixed(2)}`;
  const weekAvgEl = document.getElementById('weekAvg');
  if (weekAvgEl) weekAvgEl.textContent = `$${(weekSpent / 7).toFixed(2)} avg/day`;

  // Weekly status: check if total is under allocation, not just daily count
  const weeklyUnderBudget = weekSpent <= weeklyAllocation;
  const weekStatusEl = document.getElementById('weekStatus');
  if (weekStatusEl) weekStatusEl.textContent = weeklyUnderBudget ? '✅' : '⚠️';

  // Monthly
  const monthSpentEl = document.getElementById('monthSpent');
  if (monthSpentEl) monthSpentEl.textContent = `$${monthSpent.toFixed(2)}`;

  // Monthly saved with color coding
  const monthSavedEl = document.getElementById('monthSaved');
  if (monthSavedEl) {
    if (monthlySaved < 0) {
      monthSavedEl.textContent = `-$${Math.abs(monthlySaved).toFixed(2)}`;
      monthSavedEl.style.color = '#ef4444';
    } else {
      monthSavedEl.textContent = `$${monthlySaved.toFixed(2)}`;
      monthSavedEl.style.color = '#10b981';
    }
  }

  // Additional Savings
  const monthAdditionalSavings = getMonthlyAdditionalSavings();
  const monthAddEl = document.getElementById('monthAdditionalSavings');
  if (monthAddEl) monthAddEl.textContent = `$${monthAdditionalSavings.toFixed(2)}`;

  const monthStatusEl = document.getElementById('monthStatus');
  if (monthStatusEl) monthStatusEl.textContent = metGoal ? '✅' : '📈';

  // Budget breakdown
  const subTotal = getActiveSubscriptionsTotal();
  const daysInMonth = getDaysInCurrentMonth();
  const available = CONFIG.monthlyFunMoney - CONFIG.targetMonthlySavings - subTotal;
  const monthlyBudgetEl = document.getElementById('monthlyBudget');
  if (monthlyBudgetEl) monthlyBudgetEl.textContent = `$${CONFIG.monthlyFunMoney.toFixed(2)}`;
  const targetMonthlyEl = document.getElementById('targetMonthly');
  if (targetMonthlyEl) targetMonthlyEl.textContent = `-$${CONFIG.targetMonthlySavings.toFixed(2)}`;
  const subTotalEl = document.getElementById('subTotal');
  if (subTotalEl) subTotalEl.textContent = `-$${subTotal.toFixed(2)}`;

  // Available with color coding
  const availableEl = document.getElementById('availableSpending');
  if (availableEl) {
    if (available < 0) {
      availableEl.textContent = `-$${Math.abs(available).toFixed(2)}`;
      availableEl.style.color = '#ef4444';
    } else {
      availableEl.textContent = `$${available.toFixed(2)}`;
      availableEl.style.color = '#10b981';
    }
  }

  const dailyAllowanceBreakdownEl = document.getElementById('dailyAllowanceBreakdown');
  if (dailyAllowanceBreakdownEl) dailyAllowanceBreakdownEl.textContent = `$${dailyAllowance.toFixed(2)}`;
}

function updateSubscriptions() {
  const activeTotal = getActiveSubscriptionsTotal();
  document.getElementById('subMonthlyTotal').textContent = `$${activeTotal.toFixed(2)}`;
  document.getElementById('subDailyImpact').textContent = `$${(activeTotal / 30).toFixed(2)}`;

  const listEl = document.getElementById('subscriptionsList');
  if (appData.subscriptions.length === 0) {
    listEl.innerHTML = '<p class="empty-state">No subscriptions added yet</p>';
  } else {
    listEl.innerHTML = appData.subscriptions.map(sub => `
      <div class="subscription-item">
        <div class="subscription-item__info">
          <p class="subscription-item__name">${sub.name}</p>
          <div class="subscription-item__details">
            <strong>$${sub.amount.toFixed(2)}</strong> ${sub.billingCycle === 'yearly' ? '/ year' : ''} on day ${sub.dayOfMonth} • ${sub.category}
            ${!sub.active ? '<span class="subscription-item__badge">Inactive</span>' : ''}
          </div>
        </div>
        <button class="btn btn--danger" onclick="deleteSubscription('${sub.id}')">Remove</button>
      </div>
    `).join('');
  }
}

function updateReports() {
  const now = new Date();
  const monthIdx = parseInt(document.getElementById('reportMonth').value) ?? now.getMonth();
  const yearVal = parseInt(document.getElementById('reportYear').value) ?? now.getFullYear();

  // Update subscriptions for selected month
  const monthSubscriptions = getSubscriptionsForMonth(monthIdx);
  const subscriptionsEl = document.getElementById('monthSubscriptions');
  if (monthSubscriptions.length > 0) {
    subscriptionsEl.innerHTML = `
      <h3 style="margin-top: 1.5rem; margin-bottom: 0.5rem;">Active Subscriptions</h3>
      ${monthSubscriptions.map(sub => `
        <div style="padding: 0.75rem; border-left: 2px solid #3b82f6; background: rgba(59, 130, 246, 0.1); margin-bottom: 0.5rem;">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <span><strong>${sub.name}</strong> • ${sub.category}</span>
            <span>$${sub.amount.toFixed(2)}/${sub.billingCycle === 'yearly' ? 'year' : 'mo'}</span>
          </div>
        </div>
      `).join('')}
    `;
  } else {
    subscriptionsEl.innerHTML = '';
  }

  const categoryData = getSpendingByCategory(yearVal, monthIdx);
  const totalSpent = categoryData.reduce((sum, item) => sum + item.amount, 0);

  const colors = ['#3b82f6', '#a855f7', '#ec4899', '#f97316', '#22c55e', '#ef4444', '#6366f1'];
  const breakdownEl = document.getElementById('categoryBreakdown');

  if (categoryData.length === 0) {
    breakdownEl.innerHTML = '<p class="empty-state">No spending data yet</p>';
  } else {
    breakdownEl.innerHTML = categoryData.map((item, idx) => {
      const percent = (item.amount / totalSpent) * 100;
      const color = colors[idx % colors.length];
      return `
        <div class="category-item">
          <div class="category-item__header">
            <span class="category-item__label">${item.category}</span>
            <span class="category-item__value">$${item.amount.toFixed(2)} (${percent.toFixed(1)}%)</span>
          </div>
          <div class="category-item__bar">
            <div class="category-item__fill" style="width: ${percent}%; background: ${color};"></div>
          </div>
        </div>
      `;
    }).join('');
  }

  // Monthly average (excluding Extra Savings and Withdrawal)
  const spendingTxs = appData.transactions.filter(tx =>
    tx.category !== 'Extra Savings' && tx.category !== 'Withdrawal'
  );
  const months = new Set(spendingTxs.map(tx => {
    const date = new Date(tx.date);
    return `${date.getFullYear()}-${date.getMonth()}`;
  })).size;

  const allSpent = spendingTxs.reduce((sum, tx) => sum + tx.amount, 0);
  const monthlyAvg = months > 0 ? allSpent / months : 0;
  const projectedSavings = CONFIG.monthlyFunMoney - monthlyAvg;

  document.getElementById('monthlyAvg').textContent = `$${monthlyAvg.toFixed(2)}`;
  document.getElementById('monthsOfData').textContent = `Based on ${months} month${months !== 1 ? 's' : ''}`;
  document.getElementById('projectedSavings').textContent = `$${projectedSavings.toFixed(2)}`;

  // Additional Savings
  const avgAdditional = getAverageMonthlyAdditionalSavings();
  const totalAdditional = getTotalSaved();
  document.getElementById('avgAdditionalSavings').textContent = `$${avgAdditional.toFixed(2)}`;
  document.getElementById('totalAdditionalSavings').textContent = `$${totalAdditional.toFixed(2)}`;

  // Projection
  const saved = getTotalSaved();
  if (projectedSavings > 0) {
    const monthsToGoal = (CONFIG.targetSavingsGoal - saved) / projectedSavings;
    const projDate = new Date();
    projDate.setMonth(projDate.getMonth() + monthsToGoal);

    document.getElementById('projectedDate').textContent = projDate.toLocaleDateString('default', { year: 'numeric', month: 'long' });
    document.getElementById('monthsUntil').textContent = `~${Math.max(0, Math.ceil(monthsToGoal))} months`;
    document.getElementById('projectionCard').style.display = '';
  } else {
    document.getElementById('projectionCard').style.display = 'none';
  }
}

function updateAchievements() {
  const unlocked = getUnlockedAchievements();
  const saved = getTotalSaved();

  // Stats
  document.getElementById('achievementCount').textContent = `${unlocked.size}/${ACHIEVEMENTS.length}`;
  document.getElementById('milestoneCount').textContent = `${MILESTONES.filter(m => saved >= m.amount).length}/${MILESTONES.length}`;
  document.getElementById('achievementTotal').textContent = `$${saved.toFixed(0)}`;

  // Badges
  const achievementsEl = document.getElementById('achievementsList');
  achievementsEl.innerHTML = ACHIEVEMENTS.map(achievement => `
    <div class="achievement-item ${unlocked.has(achievement.id) ? 'unlocked' : ''}">
      <div class="achievement-item__content">
        <div class="achievement-item__emoji">${achievement.icon}</div>
        <div class="achievement-item__text">
          <p class="achievement-item__name">${achievement.name}</p>
          <p class="achievement-item__desc">${achievement.description}</p>
          ${unlocked.has(achievement.id) ? '<span class="achievement-item__badge">✓ Unlocked</span>' : ''}
        </div>
      </div>
    </div>
  `).join('');

  // Milestones
  const milestonesEl = document.getElementById('milestonesList');
  milestonesEl.innerHTML = MILESTONES.map((milestone, idx) => {
    const reached = saved >= milestone.amount;
    const isNext = !reached && (idx === 0 || saved >= MILESTONES[idx - 1].amount);
    const progressPercent = reached ? 100 : Math.max(0, ((saved - (idx > 0 ? MILESTONES[idx - 1].amount : 0)) / (milestone.amount - (idx > 0 ? MILESTONES[idx - 1].amount : milestone.amount))) * 100);

    return `
      <div class="milestone-item ${reached ? 'reached' : ''}">
        <div class="milestone-item__header">
          <div class="milestone-item__left">
            <span class="milestone-item__emoji">${milestone.emoji}</span>
            <div class="milestone-item__info">
              <h4>${milestone.label}</h4>
              <p>${milestone.description}</p>
            </div>
          </div>
          <div class="milestone-item__right">
            <p class="milestone-item__amount">$${milestone.amount.toLocaleString()}</p>
            ${reached ? '<span class="milestone-item__badge">✓ Reached</span>' : ''}
          </div>
        </div>
        ${!reached ? `
          <div class="milestone-item__progress">
            <div class="milestone-item__bar">
              <div class="milestone-item__fill" style="width: ${progressPercent}%"></div>
            </div>
            <p class="milestone-item__remaining">$${Math.max(0, milestone.amount - saved).toFixed(2)} away</p>
          </div>
        ` : ''}
      </div>
    `;
  }).join('');
}

// ─── Delete Functions ─── //
function deleteTransaction(id) {
  appData.transactions = appData.transactions.filter(tx => tx.id !== id);
  saveData();
}

function deleteSubscription(id) {
  appData.subscriptions = appData.subscriptions.filter(sub => sub.id !== id);
  saveData();
}

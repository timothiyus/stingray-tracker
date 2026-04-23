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
};

// ─── Storage ─── //
function loadData() {
  const stored = localStorage.getItem('stingrayData');
  if (stored) {
    appData = JSON.parse(stored);
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

function getTodayTransactions() {
  const today = getTodayDate();
  return appData.transactions.filter(tx => tx.date === today);
}

function getTodaySpent() {
  return getTodayTransactions().reduce((sum, tx) => sum + tx.amount, 0);
}

function getActiveSubscriptionsTotal() {
  return appData.subscriptions
    .filter(sub => sub.active)
    .reduce((sum, sub) => sum + sub.amount, 0);
}

function getDailyAllowance() {
  const subscriptionsTotal = getActiveSubscriptionsTotal();
  return (appData.config.monthlyFunMoney - subscriptionsTotal) / 30;
}

function getTotalSaved() {
  const now = new Date();
  const start = new Date(appData.config.startDate);
  const monthsElapsed = Math.ceil((now - start) / (1000 * 60 * 60 * 24 * 30));
  const potentialSavings = appData.config.monthlyFunMoney * monthsElapsed;
  const totalSpent = appData.transactions.reduce((sum, tx) => sum + tx.amount, 0);
  return Math.max(0, potentialSavings - totalSpent);
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
      .filter(tx => tx.date === dateStr)
      .reduce((sum, tx) => sum + tx.amount, 0);

    weekSpent += daySpent;
    if (daySpent <= dailyAllowance) weekUnderBudget++;
  }

  return { weekUnderBudget, weekSpent };
}

function getMonthlyStats() {
  const today = new Date();
  const monthSpent = appData.transactions
    .filter(tx => {
      const date = new Date(tx.date);
      return date.getFullYear() === today.getFullYear() && date.getMonth() === today.getMonth();
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
    if (txDate.getFullYear() === year && txDate.getMonth() === month) {
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
      spendingForm.reset();
      spendingForm.classList.add('hidden');
    }
  });

  // Subscription form
  const toggleSubFormBtn = document.getElementById('toggleSubFormBtn');
  const subscriptionForm = document.getElementById('subscriptionForm');
  toggleSubFormBtn.addEventListener('click', () => {
    subscriptionForm.classList.toggle('hidden');
  });

  subscriptionForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = document.getElementById('subName').value;
    const amount = parseFloat(document.getElementById('subAmount').value);
    const day = parseInt(document.getElementById('subDay').value);
    const category = document.getElementById('subCategory').value;
    const active = document.getElementById('subActive').checked;

    if (name && amount > 0) {
      appData.subscriptions.push({
        id: Date.now().toString(),
        name,
        amount,
        dayOfMonth: day,
        category,
        active,
      });
      saveData();
      subscriptionForm.reset();
      subscriptionForm.classList.add('hidden');
    }
  });
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
  updateDailySummary();
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

function updateDailySummary() {
  const today = getTodayDate();
  const spent = getTodaySpent();
  const dailyAllowance = getDailyAllowance();
  const remaining = dailyAllowance - spent;
  const underBudget = spent <= dailyAllowance;
  const progressPercent = (spent / dailyAllowance) * 100;

  // Status banner
  const statusBanner = document.getElementById('statusBanner');
  statusBanner.className = `status-banner ${underBudget ? '' : 'over-budget'}`;
  document.getElementById('statusTitle').textContent = underBudget ? '✅ You\'re on track!' : '⚠️ Over budget';
  document.getElementById('statusText').textContent = underBudget
    ? 'Amazing! Stay focused and you\'ll crush today\'s goal.'
    : 'You\'ve exceeded today\'s budget. No worries—keep trying tomorrow!';

  // Stats
  document.getElementById('dailyAllowance').textContent = `$${dailyAllowance.toFixed(2)}`;
  document.getElementById('spentToday').textContent = `$${spent.toFixed(2)}`;
  document.getElementById('remaining').textContent = `$${Math.max(remaining, 0).toFixed(2)}`;
  document.getElementById('dailyProgress').textContent = `${progressPercent.toFixed(0)}%`;

  // Progress bar
  document.getElementById('dailyBarFill').style.width = `${Math.min(progressPercent, 100)}%`;

  // Warning text
  const warningEl = document.getElementById('warningText');
  if (remaining > 0 && remaining <= dailyAllowance * 0.1) {
    warningEl.textContent = 'You\'re almost at your limit—be mindful with your next purchase!';
  } else {
    warningEl.textContent = '';
  }

  // Transactions list
  const transactions = getTodayTransactions();
  const listEl = document.getElementById('transactionsList');

  if (transactions.length === 0) {
    listEl.innerHTML = '<p class="empty-state">✨ No transactions logged yet</p>';
  } else {
    listEl.innerHTML = transactions.map(tx => {
      const time = new Date(tx.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      return `
        <div class="transaction">
          <div class="transaction__info">
            <div>
              <span class="transaction__tag">${tx.category}</span>
              ${tx.note ? `<span class="transaction__note">${tx.note}</span>` : ''}
            </div>
            <p class="transaction__time">${time}</p>
          </div>
          <p class="transaction__amount">-$${tx.amount.toFixed(2)}</p>
          <button class="btn btn--danger transaction__delete" onclick="deleteTransaction('${tx.id}')">✕</button>
        </div>
      `;
    }).join('');
  }
}

function updateStats() {
  const { currentStreak, longestStreak } = calculateStreak();
  const { weekUnderBudget, weekSpent } = getWeeklyStats();
  const { monthSpent, monthlySaved, metGoal } = getMonthlyStats();
  const dailyAllowance = getDailyAllowance();

  // Streaks
  document.getElementById('currentStreak').textContent = currentStreak;
  document.getElementById('longestStreak').textContent = longestStreak;

  // Weekly
  document.getElementById('weekUnderBudget').textContent = `${weekUnderBudget}/7`;
  document.getElementById('weekSpent').textContent = `$${weekSpent.toFixed(2)}`;
  document.getElementById('weekAvg').textContent = `$${(weekSpent / 7).toFixed(2)}`;
  document.getElementById('weekStatus').textContent = weekUnderBudget >= 5 ? '✅' : '⚠️';

  // Monthly
  document.getElementById('monthSpent').textContent = `$${monthSpent.toFixed(2)}`;
  document.getElementById('monthSaved').textContent = `$${monthlySaved.toFixed(2)}`;
  document.getElementById('monthStatus').textContent = metGoal ? '✅' : '📈';

  // Budget breakdown
  const subTotal = getActiveSubscriptionsTotal();
  document.getElementById('monthlyBudget').textContent = `$${CONFIG.monthlyFunMoney.toFixed(2)}`;
  document.getElementById('subTotal').textContent = `-$${subTotal.toFixed(2)}`;
  document.getElementById('availableSpending').textContent = `$${(CONFIG.monthlyFunMoney - subTotal).toFixed(2)}`;
  document.getElementById('dailyAllowanceBreakdown').textContent = `$${dailyAllowance.toFixed(2)}`;
  document.getElementById('targetMonthly').textContent = `$${CONFIG.targetMonthlySavings.toFixed(2)}`;
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
            <strong>$${sub.amount.toFixed(2)}</strong> on day ${sub.dayOfMonth} • ${sub.category}
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

  // Monthly average
  const months = new Set(appData.transactions.map(tx => {
    const date = new Date(tx.date);
    return `${date.getFullYear()}-${date.getMonth()}`;
  })).size;

  const allSpent = appData.transactions.reduce((sum, tx) => sum + tx.amount, 0);
  const monthlyAvg = months > 0 ? allSpent / months : 0;
  const projectedSavings = CONFIG.monthlyFunMoney - monthlyAvg;

  document.getElementById('monthlyAvg').textContent = `$${monthlyAvg.toFixed(2)}`;
  document.getElementById('monthsOfData').textContent = `Based on ${months} month${months !== 1 ? 's' : ''}`;
  document.getElementById('projectedSavings').textContent = `$${projectedSavings.toFixed(2)}`;

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

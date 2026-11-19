"use strict";

// Application data
const STORAGE_KEY = "pocketwise_student_manager_v1";

const categories = [
  "Food", "Transport", "Study", "Shopping", "Other"
];

const money = value =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2
  }).format(value || 0);

const today = new Date();

const monthKey =
  `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,"0")}`;

const dateInput = document.getElementById("expenseDate");
dateInput.value = today.toISOString().slice(0,10);

// Load saved data
function loadData() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));

    if (saved && typeof saved === "object" &&
        saved.month === monthKey) {
      return {
        month: monthKey,
        budget: Number(saved.budget) || 0,
        goal: Number(saved.goal) || 0,
        expenses: Array.isArray(saved.expenses)
          ? saved.expenses : []
      };
    }
  } catch (error) {
    console.warn("Could not read saved data:", error);
  }

  return {
    month: monthKey,
    budget: 0,
    goal: 0,
    expenses: []
  };
}

let data = loadData();

// Save data in browser Local Storage
function saveData() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (error) {
    console.warn("Could not save data:", error);
  }
}

// Calculate total expenses
function totalSpent() {
  return data.expenses.reduce(
    (sum, item) => sum + Number(item.amount), 0
  );
}

// Calculate remaining days
function daysRemaining() {
  const lastDay = new Date(
    today.getFullYear(),
    today.getMonth() + 1,
    0
  ).getDate();

  return Math.max(1, lastDay - today.getDate() + 1);
}

// Update dashboard
function render() {
  const spent = totalSpent();
  const balance = data.budget - spent;
  const daily = Math.max(0, balance) / daysRemaining();

  const percent = data.budget > 0
    ? Math.min(100, (spent / data.budget) * 100)
    : 0;

  document.getElementById("monthLabel").textContent =
    today.toLocaleDateString("en-IN", {
      month: "long", year: "numeric"
    });

  document.getElementById("budgetStat").textContent =
    money(data.budget);

  document.getElementById("spentStat").textContent =
    money(spent);

  document.getElementById("spentNote").textContent =
    `${data.expenses.length} expenses recorded`;

  document.getElementById("balanceStat").textContent =
    money(balance);

  document.getElementById("balanceStat").className =
    `stat-value ${balance < 0 ? "negative" : "positive"}`;

  document.getElementById("balanceNote").textContent =
    balance < 0 ? "You are over your budget" :
    "Money available this month";

  document.getElementById("dailyStat").textContent =
    money(daily);

  document.getElementById("daysNote").textContent =
    `${daysRemaining()} days left in this month`;

  document.getElementById("usagePercent").textContent =
    `${Math.round(percent)}%`;

  document.getElementById("usageFill").style.width =
    `${percent}%`;

  document.getElementById("usageBar")
    .setAttribute("aria-valuenow", String(Math.round(percent)));

  document.getElementById("usageSpent").textContent =
    `${money(spent)} spent`;

  document.getElementById("usageTotal").textContent =
    `${money(data.budget)} budget`;

  // Budget warning
  const warning = document.getElementById("budgetWarning");

  if (!data.budget) {
    warning.className = "notice";
    warning.textContent =
      "Set your monthly budget to get started.";
  } else if (spent > data.budget) {
    warning.className = "notice danger";
    warning.textContent =
      `You exceeded your budget by ${money(spent-data.budget)}.`;
  } else if (percent >= 80) {
    warning.className = "notice warning";
    warning.textContent =
      "Careful! You have used at least 80% of your budget.";
  } else {
    warning.className = "notice";
    warning.textContent =
      `You are within budget. Try to spend near ${money(daily)} per day.`;
  }

  renderCategories();
  renderGoal();
  renderExpenses();
}

// Display category-wise spending
function renderCategories() {
  const container = document.getElementById("categoryList");
  const total = totalSpent();

  container.innerHTML = "";

  categories.forEach(category => {
    const amount = data.expenses
      .filter(item => item.category === category)
      .reduce((sum,item) => sum + Number(item.amount), 0);

    const percent = total ? (amount / total) * 100 : 0;

    const row = document.createElement("div");

    const top = document.createElement("div");
    top.className = "category-top";

    const name = document.createElement("strong");
    name.textContent = category;

    const value = document.createElement("span");
    value.textContent =
      `${money(amount)} · ${Math.round(percent)}%`;

    top.append(name, value);

    const track = document.createElement("div");
    track.className = "track";

    const fill = document.createElement("span");
    fill.style.width = `${percent}%`;

    track.appendChild(fill);
    row.append(top, track);
    container.appendChild(row);
  });

  const highest = categories.map(category => ({
    category,
    amount: data.expenses
      .filter(item => item.category === category)
      .reduce((sum,item) => sum + Number(item.amount), 0)
  })).sort((a,b) => b.amount-a.amount)[0];

  document.getElementById("spendingTip").textContent =
    total
      ? `Your highest spending category is ${highest.category}. Review it if you want to save more.`
      : "Add expenses to see your spending pattern.";
}

// Savings goal progress
function renderGoal() {
  const saved = Math.max(0, data.budget-totalSpent());

  const progress = data.goal
    ? Math.min(100, (saved/data.goal)*100)
    : 0;

  document.getElementById("goalProgress").textContent =
    `${money(saved)} / ${money(data.goal)}`;

  document.getElementById("goalCaption").textContent =
    data.goal
      ? `${Math.round(progress)}% of your target covered · ${money(Math.max(0,data.goal-saved))} to go`
      : "Set a goal to track your progress.";

  document.getElementById("goalFill").style.width =
    `${progress}%`;
}

// Display expense records
function renderExpenses() {
  const body = document.getElementById("expenseRows");
  body.innerHTML = "";

  const sorted = [...data.expenses].sort(
    (a,b) => b.date.localeCompare(a.date) || b.id-a.id
  );

  document.getElementById("expenseCount").textContent =
    `${sorted.length} entries`;

  document.getElementById("emptyState").hidden =
    sorted.length > 0;

  sorted.forEach(item => {
    const tr = document.createElement("tr");

    const name = document.createElement("td");
    name.textContent = item.name;

    const cat = document.createElement("td");
    const pill = document.createElement("span");
    pill.className = "pill";
    pill.textContent = item.category;
    cat.appendChild(pill);

    const date = document.createElement("td");
    date.textContent = new Date(
      `${item.date}T00:00:00`
    ).toLocaleDateString("en-IN");

    const amount = document.createElement("td");
    amount.className = "amount";
    amount.textContent = money(item.amount);

    const action = document.createElement("td");
    const del = document.createElement("button");

    del.className = "delete";
    del.textContent = "Delete";
    del.setAttribute("aria-label", `Delete ${item.name}`);

    del.addEventListener("click", () => deleteExpense(item.id));

    action.appendChild(del);
    tr.append(name,cat,date,amount,action);
    body.appendChild(tr);
  });
}

// Delete an expense
function deleteExpense(id) {
  data.expenses = data.expenses.filter(
    item => item.id !== id
  );

  saveData();
  render();
}

// Monthly budget form
document.getElementById("budgetForm")
.addEventListener("submit", event => {
  event.preventDefault();

  const value = Number(
    document.getElementById("budgetInput").value
  );

  if (!Number.isFinite(value) || value <= 0) {
    alert("Please enter a valid budget greater than zero.");
    return;
  }

  data.budget = value;
  saveData();
  render();
  event.target.reset();
});

// Savings goal form
document.getElementById("goalForm")
.addEventListener("submit", event => {
  event.preventDefault();

  const value = Number(
    document.getElementById("goalInput").value
  );

  if (!Number.isFinite(value) || value <= 0) {
    alert("Please enter a valid savings goal.");
    return;
  }

  data.goal = value;
  saveData();
  render();
  event.target.reset();
});

// Add expense form
document.getElementById("expenseForm")
.addEventListener("submit", event => {
  event.preventDefault();

  const name =
    document.getElementById("expenseName").value.trim();

  const amount =
    Number(document.getElementById("expenseAmount").value);

  const category =
    document.getElementById("expenseCategory").value;

  const date =
    document.getElementById("expenseDate").value;

  if (!name || !Number.isFinite(amount) || amount <= 0 ||
      !categories.includes(category) || !date) {
    alert("Please enter valid expense details.");
    return;
  }

  if (date.slice(0,7) !== monthKey) {
    alert("Please add expenses dated in the current month.");
    return;
  }

  data.expenses.push({
    id: Date.now(),
    name,
    amount,
    category,
    date
  });

  saveData();
  render();

  event.target.reset();
  dateInput.value = today.toISOString().slice(0,10);
});

// Check planned purchase affordability
document.getElementById("affordForm")
.addEventListener("submit", event => {
  event.preventDefault();

  const name =
    document.getElementById("purchaseName").value.trim();

  const amount =
    Number(document.getElementById("purchaseAmount").value);

  if (!name || !Number.isFinite(amount) || amount <= 0) {
    alert("Enter a purchase name and a valid amount.");
    return;
  }

  const balance = data.budget-totalSpent();
  const after = balance-amount;

  const result = document.getElementById("affordResult");

  if (data.budget > 0 && amount <= balance) {
    result.textContent =
      `It fits your current balance! If you buy ${name}, you will have ${money(after)} left.`;
    result.className = "afford-result positive";
  } else {
    result.textContent =
      `This purchase is not within your current budget. You would be short by ${money(Math.max(0,amount-balance))}.`;
    result.className = "afford-result negative";
  }
});

// Show the application
render();

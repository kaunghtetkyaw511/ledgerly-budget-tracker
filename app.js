const STORAGE_KEY = "ledgerly-budget-data-v1";

const CURRENCIES = {
  USD: { symbol: "$", locale: "en-US", decimals: 2 },
  EUR: { symbol: "€", locale: "de-DE", decimals: 2 },
  GBP: { symbol: "£", locale: "en-GB", decimals: 2 },
  THB: { symbol: "฿", locale: "th-TH", decimals: 2 },
  MMK: { symbol: "K", locale: "en-US", decimals: 0 },
  JPY: { symbol: "¥", locale: "ja-JP", decimals: 0 },
};

const CATEGORY_CONFIG = {
  income: [
    { id: "salary", name: "Salary", icon: "briefcase-business", color: "#2e6658" },
    { id: "freelance", name: "Freelance", icon: "laptop", color: "#5e91aa" },
    { id: "investment", name: "Investment", icon: "chart-line", color: "#8a79a8" },
    { id: "gift", name: "Gift", icon: "gift", color: "#e6b85c" },
    { id: "other-income", name: "Other income", icon: "circle-dollar-sign", color: "#6f827b" },
  ],
  expense: [
    { id: "housing", name: "Housing", icon: "house", color: "#2e6658", budgetShare: 0.32 },
    { id: "food", name: "Food", icon: "utensils", color: "#df6c55", budgetShare: 0.2 },
    { id: "transport", name: "Transport", icon: "car-front", color: "#5e91aa", budgetShare: 0.12 },
    { id: "shopping", name: "Shopping", icon: "shopping-bag", color: "#8a79a8", budgetShare: 0.12 },
    { id: "bills", name: "Bills", icon: "receipt-text", color: "#e6b85c", budgetShare: 0.12 },
    { id: "health", name: "Health", icon: "heart-pulse", color: "#d7758a", budgetShare: 0.06 },
    { id: "entertainment", name: "Entertainment", icon: "popcorn", color: "#749978", budgetShare: 0.06 },
    { id: "other-expense", name: "Other expense", icon: "ellipsis", color: "#78817d", budgetShare: 0 },
  ],
};

const state = {
  data: loadData(),
  selectedMonth: startOfMonth(new Date()),
  periodFilter: "month",
  search: "",
  typeFilter: "all",
  categoryFilter: "all",
  formType: "expense",
  charts: { cashflow: null, category: null },
  toastTimer: null,
};

const elements = {};

document.addEventListener("DOMContentLoaded", init);

function init() {
  cacheElements();
  bindEvents();
  populateCategoryFilters();
  renderAll();
  refreshIcons();
  window.setTimeout(() => elements.loadingScreen.classList.add("hidden"), 480);
}

function cacheElements() {
  const ids = [
    "currency-select", "open-add-modal", "mobile-add", "floating-add", "data-menu-button",
    "previous-month", "next-month", "month-label", "period-summary", "balance-value",
    "balance-note", "income-value", "income-note", "expense-value", "expense-note",
    "savings-value", "savings-note", "cashflow-chart", "cashflow-empty", "category-chart",
    "category-empty", "category-legend", "category-total", "budget-message", "edit-budget",
    "budget-spent", "budget-remaining", "budget-progress", "budget-percent", "category-budgets",
    "export-csv", "transaction-search", "type-filter", "category-filter", "transaction-list",
    "transaction-empty", "result-count", "filtered-total", "modal-backdrop", "transaction-modal",
    "transaction-form", "transaction-modal-title", "transaction-id", "description-input",
    "amount-input", "date-input", "category-input", "note-input", "currency-symbol",
    "budget-modal", "budget-form", "budget-input", "budget-currency-symbol", "data-modal",
    "export-json", "import-json", "reset-demo", "toast", "loading-screen",
  ];
  ids.forEach((id) => {
    elements[toCamel(id)] = document.getElementById(id);
  });
  elements.periodButtons = document.querySelectorAll("[data-period]");
  elements.formTypeButtons = document.querySelectorAll("[data-form-type]");
  elements.navItems = document.querySelectorAll("[data-scroll]");
  elements.closeModalButtons = document.querySelectorAll("[data-close-modal]");
  elements.openAddButtons = document.querySelectorAll("[data-open-add]");
}

function bindEvents() {
  elements.openAddModal.addEventListener("click", () => openTransactionModal());
  elements.mobileAdd.addEventListener("click", () => openTransactionModal());
  elements.floatingAdd.addEventListener("click", () => openTransactionModal());
  elements.openAddButtons.forEach((button) => button.addEventListener("click", () => openTransactionModal()));
  elements.editBudget.addEventListener("click", openBudgetModal);
  elements.dataMenuButton.addEventListener("click", () => openModal(elements.dataModal));
  elements.closeModalButtons.forEach((button) => button.addEventListener("click", closeModals));
  elements.modalBackdrop.addEventListener("click", closeModals);
  elements.transactionForm.addEventListener("submit", saveTransaction);
  elements.budgetForm.addEventListener("submit", saveBudget);
  elements.currencySelect.addEventListener("change", changeCurrency);
  elements.previousMonth.addEventListener("click", () => shiftMonth(-1));
  elements.nextMonth.addEventListener("click", () => shiftMonth(1));
  elements.monthLabel.addEventListener("click", () => {
    state.selectedMonth = startOfMonth(new Date());
    renderAll();
  });
  elements.transactionSearch.addEventListener("input", (event) => {
    state.search = event.target.value.trim().toLowerCase();
    renderTransactions();
  });
  elements.typeFilter.addEventListener("change", (event) => {
    state.typeFilter = event.target.value;
    renderTransactions();
  });
  elements.categoryFilter.addEventListener("change", (event) => {
    state.categoryFilter = event.target.value;
    renderTransactions();
  });
  elements.periodButtons.forEach((button) => {
    button.addEventListener("click", () => {
      state.periodFilter = button.dataset.period;
      elements.periodButtons.forEach((item) => item.classList.toggle("active", item === button));
      renderTransactions();
    });
  });
  elements.formTypeButtons.forEach((button) => {
    button.addEventListener("click", () => setFormType(button.dataset.formType));
  });
  elements.navItems.forEach((button) => {
    button.addEventListener("click", () => {
      document.getElementById(button.dataset.scroll).scrollIntoView({ behavior: "smooth" });
      elements.navItems.forEach((item) => item.classList.toggle("active", item === button));
    });
  });
  elements.exportCsv.addEventListener("click", exportCsv);
  elements.exportJson.addEventListener("click", exportJson);
  elements.importJson.addEventListener("change", importJson);
  elements.resetDemo.addEventListener("click", resetDemoData);
  document.addEventListener("click", handleDocumentClick);
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeModals();
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
      event.preventDefault();
      elements.transactionSearch.focus();
    }
  });
}

function loadData() {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (stored?.transactions && Array.isArray(stored.transactions)) {
      return {
        currency: stored.currency || "USD",
        monthlyBudget: Number(stored.monthlyBudget) || 3200,
        transactions: stored.transactions,
      };
    }
  } catch {
    // Invalid storage falls through to a clean demo dataset.
  }
  return createDemoData();
}

function createDemoData() {
  const now = new Date();
  const transactions = [];
  const templates = [
    { type: "income", category: "salary", description: "Monthly salary", note: "Main income", amount: 4600, day: 1 },
    { type: "income", category: "freelance", description: "Brand identity project", note: "Final client payment", amount: 1250, day: 7 },
    { type: "expense", category: "housing", description: "Apartment rent", note: "Monthly rent", amount: 1450, day: 2 },
    { type: "expense", category: "food", description: "Fresh market", note: "Weekly groceries", amount: 148.5, day: 5 },
    { type: "expense", category: "bills", description: "Utilities", note: "Electricity and internet", amount: 184.2, day: 6 },
    { type: "expense", category: "transport", description: "Transit pass", note: "Monthly travel", amount: 95, day: 8 },
    { type: "expense", category: "shopping", description: "Studio supplies", note: "Paper and ink", amount: 126.4, day: 10 },
    { type: "expense", category: "food", description: "Lunch with client", note: "Project meeting", amount: 42.75, day: 11 },
    { type: "expense", category: "health", description: "Fitness membership", note: "Monthly plan", amount: 58, day: 12 },
    { type: "expense", category: "entertainment", description: "Cinema tickets", note: "Weekend", amount: 31.5, day: 13 },
  ];

  for (let monthOffset = -5; monthOffset <= 0; monthOffset += 1) {
    const monthDate = new Date(now.getFullYear(), now.getMonth() + monthOffset, 1);
    templates.forEach((template, index) => {
      if (monthOffset < 0 && index > 6 + ((monthOffset + 5) % 3)) return;
      const variation = monthOffset === 0 ? 1 : 0.88 + ((index + monthOffset + 8) % 5) * 0.04;
      const date = new Date(monthDate.getFullYear(), monthDate.getMonth(), Math.min(template.day, 25));
      transactions.push({
        id: crypto.randomUUID(),
        type: template.type,
        category: template.category,
        description: template.description,
        note: template.note,
        amount: Number((template.amount * variation).toFixed(2)),
        date: toDateInput(date),
        createdAt: date.toISOString(),
      });
    });
  }

  return { currency: "USD", monthlyBudget: 3200, transactions };
}

function saveData() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.data));
}

function renderAll() {
  elements.currencySelect.value = state.data.currency;
  updateCurrencySymbols();
  renderMonth();
  renderSummary();
  renderCharts();
  renderBudget();
  renderTransactions();
  refreshIcons();
}

function renderMonth() {
  elements.monthLabel.textContent = state.selectedMonth.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
  const isCurrent = isSameMonth(state.selectedMonth, new Date());
  elements.periodSummary.textContent = isCurrent
    ? "A clear view of this month's cash flow."
    : `Reviewing ${elements.monthLabel.textContent}.`;
}

function getMonthTransactions(date = state.selectedMonth) {
  return state.data.transactions.filter((transaction) => {
    const transactionDate = parseLocalDate(transaction.date);
    return isSameMonth(transactionDate, date);
  });
}

function renderSummary() {
  const transactions = getMonthTransactions();
  const incomeItems = transactions.filter((item) => item.type === "income");
  const expenseItems = transactions.filter((item) => item.type === "expense");
  const income = sumAmounts(incomeItems);
  const expenses = sumAmounts(expenseItems);
  const balance = income - expenses;
  const savingsRate = income > 0 ? ((income - expenses) / income) * 100 : 0;

  elements.balanceValue.textContent = formatMoney(balance);
  elements.incomeValue.textContent = formatMoney(income);
  elements.expenseValue.textContent = formatMoney(expenses);
  elements.savingsValue.textContent = `${Math.round(savingsRate)}%`;
  elements.incomeNote.textContent = `${incomeItems.length} income ${pluralize(incomeItems.length, "transaction")}`;
  elements.expenseNote.textContent = `${expenseItems.length} expense ${pluralize(expenseItems.length, "transaction")}`;
  elements.balanceNote.textContent = balance >= 0 ? "Positive cash flow this month" : "Expenses are above income";
  elements.savingsNote.textContent =
    savingsRate >= 20 ? "Healthy monthly savings" : savingsRate > 0 ? "Room to grow your buffer" : "Focus on a positive margin";
}

function renderCharts() {
  renderCashflowChart();
  renderCategoryChart();
}

function renderCashflowChart() {
  const months = [];
  const incomes = [];
  const expenses = [];
  for (let offset = -5; offset <= 0; offset += 1) {
    const date = new Date(state.selectedMonth.getFullYear(), state.selectedMonth.getMonth() + offset, 1);
    const transactions = getMonthTransactions(date);
    months.push(date.toLocaleDateString("en-US", { month: "short" }));
    incomes.push(sumAmounts(transactions.filter((item) => item.type === "income")));
    expenses.push(sumAmounts(transactions.filter((item) => item.type === "expense")));
  }

  const hasData = [...incomes, ...expenses].some((value) => value > 0);
  elements.cashflowEmpty.hidden = hasData;
  elements.cashflowChart.hidden = !hasData;
  state.charts.cashflow?.destroy();
  if (!hasData || !window.Chart) return;

  state.charts.cashflow = new Chart(elements.cashflowChart, {
    type: "bar",
    data: {
      labels: months,
      datasets: [
        {
          label: "Income",
          data: incomes,
          backgroundColor: "#2e6658",
          borderRadius: 3,
          borderSkipped: false,
          maxBarThickness: 20,
        },
        {
          label: "Expenses",
          data: expenses,
          backgroundColor: "#df6c55",
          borderRadius: 3,
          borderSkipped: false,
          maxBarThickness: 20,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: "index", intersect: false },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: "#17201d",
          padding: 11,
          cornerRadius: 5,
          callbacks: { label: (context) => `${context.dataset.label}: ${formatMoney(context.raw)}` },
        },
      },
      scales: {
        x: { grid: { display: false }, border: { display: false }, ticks: { color: "#7b8581", font: { size: 10 } } },
        y: {
          beginAtZero: true,
          border: { display: false },
          grid: { color: "#ecece8" },
          ticks: {
            color: "#7b8581",
            font: { size: 9 },
            callback: (value) => compactMoney(value),
          },
        },
      },
    },
  });
}

function renderCategoryChart() {
  const expenses = getMonthTransactions().filter((item) => item.type === "expense");
  const totals = CATEGORY_CONFIG.expense
    .map((category) => ({
      ...category,
      total: sumAmounts(expenses.filter((item) => item.category === category.id)),
    }))
    .filter((category) => category.total > 0)
    .sort((a, b) => b.total - a.total);
  const total = totals.reduce((sum, item) => sum + item.total, 0);

  elements.categoryTotal.textContent = formatMoney(total);
  elements.categoryEmpty.hidden = totals.length > 0;
  elements.categoryChart.hidden = totals.length === 0;
  state.charts.category?.destroy();

  elements.categoryLegend.innerHTML = totals
    .slice(0, 5)
    .map(
      (category) => `
        <div class="category-legend-row">
          <i style="background:${category.color}"></i>
          <span>${escapeHtml(category.name)}</span>
          <strong>${Math.round((category.total / total) * 100)}%</strong>
        </div>
      `,
    )
    .join("");

  if (!totals.length || !window.Chart) return;
  state.charts.category = new Chart(elements.categoryChart, {
    type: "doughnut",
    data: {
      labels: totals.map((item) => item.name),
      datasets: [
        {
          data: totals.map((item) => item.total),
          backgroundColor: totals.map((item) => item.color),
          borderColor: "#ffffff",
          borderWidth: 3,
          hoverOffset: 4,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: "69%",
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: "#17201d",
          padding: 10,
          cornerRadius: 5,
          callbacks: { label: (context) => `${context.label}: ${formatMoney(context.raw)}` },
        },
      },
    },
  });
}

function renderBudget() {
  const budget = Number(state.data.monthlyBudget) || 0;
  const expenses = getMonthTransactions().filter((item) => item.type === "expense");
  const spent = sumAmounts(expenses);
  const remaining = budget - spent;
  const percent = budget > 0 ? (spent / budget) * 100 : 0;

  elements.budgetSpent.textContent = formatMoney(spent);
  elements.budgetRemaining.textContent = formatMoney(remaining);
  elements.budgetPercent.textContent = `${Math.round(percent)}% used`;
  elements.budgetProgress.style.width = `${Math.min(percent, 100)}%`;
  elements.budgetProgress.classList.toggle("warning", percent >= 85);
  elements.budgetMessage.textContent =
    budget <= 0
      ? "Set a monthly budget to track your spending pace."
      : percent > 100
        ? `You are ${formatMoney(Math.abs(remaining))} over budget this month.`
        : percent >= 85
          ? `You have ${formatMoney(remaining)} left. Keep an eye on upcoming expenses.`
          : `You have ${formatMoney(remaining)} available for the rest of the month.`;

  const categories = CATEGORY_CONFIG.expense.filter((category) => category.budgetShare > 0);
  elements.categoryBudgets.innerHTML = categories
    .slice(0, 4)
    .map((category) => {
      const limit = budget * category.budgetShare;
      const categorySpent = sumAmounts(expenses.filter((item) => item.category === category.id));
      const categoryPercent = limit > 0 ? (categorySpent / limit) * 100 : 0;
      return `
        <article class="category-budget-card">
          <div class="category-budget-heading">
            <span class="category-budget-name">
              <i style="background:${category.color}"></i>
              <strong>${category.name}</strong>
            </span>
            <span>${Math.round(categoryPercent)}%</span>
          </div>
          <div class="category-progress"><span style="width:${Math.min(categoryPercent, 100)}%;background:${category.color}"></span></div>
          <p><span>${formatMoney(categorySpent)} spent</span><span>${formatMoney(limit)} limit</span></p>
        </article>
      `;
    })
    .join("");
}

function getFilteredTransactions() {
  const today = toDateInput(new Date());
  return [...state.data.transactions]
    .filter((transaction) => {
      if (state.periodFilter === "month" && !isSameMonth(parseLocalDate(transaction.date), state.selectedMonth)) return false;
      if (state.periodFilter === "today" && transaction.date !== today) return false;
      if (state.typeFilter !== "all" && transaction.type !== state.typeFilter) return false;
      if (state.categoryFilter !== "all" && transaction.category !== state.categoryFilter) return false;
      if (state.search) {
        const haystack = `${transaction.description} ${transaction.note || ""} ${getCategory(transaction.category)?.name || ""}`.toLowerCase();
        if (!haystack.includes(state.search)) return false;
      }
      return true;
    })
    .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt));
}

function renderTransactions() {
  const transactions = getFilteredTransactions();
  elements.transactionList.innerHTML = transactions
    .map((transaction) => {
      const category = getCategory(transaction.category);
      const signedAmount = `${transaction.type === "income" ? "+" : "-"}${formatMoney(transaction.amount)}`;
      return `
        <tr>
          <td>
            <div class="transaction-main">
              <span class="transaction-icon" style="color:${category.color};background:${hexToRgba(category.color, 0.12)}">
                <i data-lucide="${category.icon}"></i>
              </span>
              <span>
                <strong>${escapeHtml(transaction.description)}</strong>
                <span>${escapeHtml(transaction.note || (transaction.type === "income" ? "Money received" : "Money spent"))}</span>
              </span>
            </div>
          </td>
          <td><span class="category-tag"><i style="background:${category.color}"></i>${escapeHtml(category.name)}</span></td>
          <td><span class="transaction-date">${formatDate(transaction.date)}</span></td>
          <td><span class="amount ${transaction.type}">${signedAmount}</span></td>
          <td>
            <span class="row-actions">
              <button class="icon-button" type="button" data-menu-id="${transaction.id}" aria-label="Transaction actions">
                <i data-lucide="ellipsis"></i>
              </button>
              <span class="row-menu" data-row-menu="${transaction.id}" hidden>
                <button type="button" data-edit-id="${transaction.id}"><i data-lucide="pencil"></i>Edit</button>
                <button type="button" data-delete-id="${transaction.id}"><i data-lucide="trash-2"></i>Delete</button>
              </span>
            </span>
          </td>
        </tr>
      `;
    })
    .join("");

  elements.transactionEmpty.hidden = transactions.length > 0;
  elements.transactionList.closest("table").hidden = transactions.length === 0;
  elements.resultCount.textContent = `${transactions.length} ${pluralize(transactions.length, "transaction")}`;
  const net = transactions.reduce(
    (sum, transaction) => sum + (transaction.type === "income" ? transaction.amount : -transaction.amount),
    0,
  );
  elements.filteredTotal.textContent = `Net ${formatMoney(net)}`;
  refreshIcons();
}

function populateCategoryFilters() {
  const categories = [...CATEGORY_CONFIG.income, ...CATEGORY_CONFIG.expense];
  elements.categoryFilter.innerHTML = `<option value="all">All categories</option>${categories
    .map((category) => `<option value="${category.id}">${category.name}</option>`)
    .join("")}`;
  populateFormCategories();
}

function populateFormCategories(selectedValue = "") {
  const categories = CATEGORY_CONFIG[state.formType];
  elements.categoryInput.innerHTML = categories
    .map((category) => `<option value="${category.id}">${category.name}</option>`)
    .join("");
  if (selectedValue && categories.some((category) => category.id === selectedValue)) {
    elements.categoryInput.value = selectedValue;
  }
}

function setFormType(type, selectedCategory = "") {
  state.formType = type;
  elements.formTypeButtons.forEach((button) => button.classList.toggle("active", button.dataset.formType === type));
  populateFormCategories(selectedCategory);
}

function openTransactionModal(transaction = null) {
  elements.transactionForm.reset();
  elements.transactionId.value = transaction?.id || "";
  elements.transactionModalTitle.textContent = transaction ? "Edit transaction" : "Add transaction";
  setFormType(transaction?.type || "expense", transaction?.category);
  elements.descriptionInput.value = transaction?.description || "";
  elements.amountInput.value = transaction?.amount || "";
  elements.dateInput.value = transaction?.date || toDateInput(new Date());
  elements.noteInput.value = transaction?.note || "";
  openModal(elements.transactionModal);
  window.setTimeout(() => elements.descriptionInput.focus(), 80);
}

function openBudgetModal() {
  elements.budgetInput.value = state.data.monthlyBudget || 0;
  openModal(elements.budgetModal);
  window.setTimeout(() => elements.budgetInput.select(), 80);
}

function openModal(modal) {
  closeRowMenus();
  elements.modalBackdrop.hidden = false;
  modal.hidden = false;
  document.body.classList.add("modal-open");
  refreshIcons();
}

function closeModals() {
  elements.modalBackdrop.hidden = true;
  [elements.transactionModal, elements.budgetModal, elements.dataModal].forEach((modal) => {
    modal.hidden = true;
  });
  document.body.classList.remove("modal-open");
}

function saveTransaction(event) {
  event.preventDefault();
  const amount = Number(elements.amountInput.value);
  if (!Number.isFinite(amount) || amount <= 0) {
    showToast("Enter a valid amount", "circle-alert");
    return;
  }
  const id = elements.transactionId.value;
  const existing = state.data.transactions.find((item) => item.id === id);
  const transaction = {
    id: id || crypto.randomUUID(),
    type: state.formType,
    category: elements.categoryInput.value,
    description: elements.descriptionInput.value.trim(),
    amount,
    date: elements.dateInput.value,
    note: elements.noteInput.value.trim(),
    createdAt: existing?.createdAt || new Date().toISOString(),
  };

  if (existing) {
    Object.assign(existing, transaction);
  } else {
    state.data.transactions.push(transaction);
  }
  saveData();
  closeModals();
  renderAll();
  showToast(existing ? "Transaction updated" : "Transaction added");
}

function saveBudget(event) {
  event.preventDefault();
  state.data.monthlyBudget = Math.max(Number(elements.budgetInput.value) || 0, 0);
  saveData();
  closeModals();
  renderBudget();
  showToast("Monthly budget updated");
}

function changeCurrency(event) {
  state.data.currency = event.target.value;
  saveData();
  renderAll();
  showToast(`Currency changed to ${state.data.currency}`);
}

function updateCurrencySymbols() {
  const symbol = CURRENCIES[state.data.currency]?.symbol || "$";
  elements.currencySymbol.textContent = symbol;
  elements.budgetCurrencySymbol.textContent = symbol;
}

function shiftMonth(offset) {
  state.selectedMonth = new Date(state.selectedMonth.getFullYear(), state.selectedMonth.getMonth() + offset, 1);
  renderAll();
}

function handleDocumentClick(event) {
  const menuButton = event.target.closest("[data-menu-id]");
  const editButton = event.target.closest("[data-edit-id]");
  const deleteButton = event.target.closest("[data-delete-id]");

  if (menuButton) {
    const menu = document.querySelector(`[data-row-menu="${menuButton.dataset.menuId}"]`);
    const shouldOpen = menu.hidden;
    closeRowMenus();
    menu.hidden = !shouldOpen;
    return;
  }
  if (editButton) {
    const transaction = state.data.transactions.find((item) => item.id === editButton.dataset.editId);
    if (transaction) openTransactionModal(transaction);
    return;
  }
  if (deleteButton) {
    deleteTransaction(deleteButton.dataset.deleteId);
    return;
  }
  if (!event.target.closest(".row-actions")) closeRowMenus();
}

function closeRowMenus() {
  document.querySelectorAll("[data-row-menu]").forEach((menu) => {
    menu.hidden = true;
  });
}

function deleteTransaction(id) {
  const transaction = state.data.transactions.find((item) => item.id === id);
  if (!transaction) return;
  const confirmed = window.confirm(`Delete "${transaction.description}"?`);
  if (!confirmed) return;
  state.data.transactions = state.data.transactions.filter((item) => item.id !== id);
  saveData();
  renderAll();
  showToast("Transaction deleted", "trash-2");
}

function exportCsv() {
  const rows = [["Date", "Type", "Category", "Description", "Note", "Amount", "Currency"]];
  getFilteredTransactions().forEach((transaction) => {
    rows.push([
      transaction.date,
      transaction.type,
      getCategory(transaction.category).name,
      transaction.description,
      transaction.note || "",
      transaction.amount,
      state.data.currency,
    ]);
  });
  const csv = rows.map((row) => row.map(csvCell).join(",")).join("\n");
  downloadFile(`ledgerly-${toDateInput(new Date())}.csv`, csv, "text/csv;charset=utf-8");
  showToast("CSV exported", "download");
}

function exportJson() {
  downloadFile(
    `ledgerly-backup-${toDateInput(new Date())}.json`,
    JSON.stringify(state.data, null, 2),
    "application/json",
  );
  showToast("Backup exported", "file-down");
}

async function importJson(event) {
  const [file] = event.target.files;
  if (!file) return;
  try {
    const imported = JSON.parse(await file.text());
    if (!Array.isArray(imported.transactions)) throw new Error("Invalid Ledgerly backup.");
    state.data = {
      currency: CURRENCIES[imported.currency] ? imported.currency : "USD",
      monthlyBudget: Number(imported.monthlyBudget) || 0,
      transactions: imported.transactions.filter(isValidTransaction),
    };
    saveData();
    closeModals();
    renderAll();
    showToast("Backup imported", "file-up");
  } catch {
    showToast("Could not import this file", "circle-alert");
  } finally {
    event.target.value = "";
  }
}

function resetDemoData() {
  if (!window.confirm("Replace your current data with fresh demo data?")) return;
  state.data = createDemoData();
  state.selectedMonth = startOfMonth(new Date());
  saveData();
  closeModals();
  renderAll();
  showToast("Demo data restored", "rotate-ccw");
}

function isValidTransaction(transaction) {
  return (
    transaction &&
    ["income", "expense"].includes(transaction.type) &&
    typeof transaction.description === "string" &&
    Number(transaction.amount) > 0 &&
    /^\d{4}-\d{2}-\d{2}$/.test(transaction.date)
  );
}

function showToast(message, icon = "circle-check") {
  window.clearTimeout(state.toastTimer);
  elements.toast.innerHTML = `<i data-lucide="${icon}"></i><span>${escapeHtml(message)}</span>`;
  elements.toast.classList.add("visible");
  refreshIcons();
  state.toastTimer = window.setTimeout(() => elements.toast.classList.remove("visible"), 2600);
}

function formatMoney(amount) {
  const currency = CURRENCIES[state.data.currency] || CURRENCIES.USD;
  return new Intl.NumberFormat(currency.locale, {
    style: "currency",
    currency: state.data.currency,
    minimumFractionDigits: currency.decimals,
    maximumFractionDigits: currency.decimals,
  }).format(amount);
}

function compactMoney(amount) {
  const symbol = CURRENCIES[state.data.currency]?.symbol || "";
  if (Math.abs(amount) >= 1_000_000) return `${symbol}${(amount / 1_000_000).toFixed(1)}m`;
  if (Math.abs(amount) >= 1000) return `${symbol}${(amount / 1000).toFixed(0)}k`;
  return `${symbol}${Math.round(amount)}`;
}

function getCategory(id) {
  return [...CATEGORY_CONFIG.income, ...CATEGORY_CONFIG.expense].find((category) => category.id === id) || {
    id: "unknown",
    name: "Other",
    icon: "circle",
    color: "#78817d",
  };
}

function sumAmounts(items) {
  return items.reduce((sum, item) => sum + Number(item.amount || 0), 0);
}

function startOfMonth(date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function isSameMonth(first, second) {
  return first.getFullYear() === second.getFullYear() && first.getMonth() === second.getMonth();
}

function parseLocalDate(value) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function toDateInput(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatDate(value) {
  return parseLocalDate(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function pluralize(count, word) {
  return count === 1 ? word : `${word}s`;
}

function csvCell(value) {
  return `"${String(value ?? "").replaceAll('"', '""')}"`;
}

function downloadFile(filename, content, type) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function hexToRgba(hex, alpha) {
  const value = hex.replace("#", "");
  const number = Number.parseInt(value, 16);
  const red = (number >> 16) & 255;
  const green = (number >> 8) & 255;
  const blue = number & 255;
  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function toCamel(value) {
  return value.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
}

function refreshIcons() {
  if (window.lucide) window.lucide.createIcons();
}

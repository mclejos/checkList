const STORAGE_KEY = "clearlist.tasks";
const THEME_KEY = "clearlist.theme";
const API_URL = window.location.protocol === "http:" || window.location.protocol === "https:" ? "/api/tasks" : null;

const state = {
  tasks: loadTasks(),
  route: getRoute(),
  filter: "all",
  category: "all",
  calendarDate: new Date(),
  editingTaskId: null,
  selectedDate: null,
  dateTaskSearch: "",
  theme: localStorage.getItem(THEME_KEY) || "sage",
};

const elements = {
  dateStamp: document.querySelector("#date-stamp"),
  taskForm: document.querySelector("#task-form"),
  taskInput: document.querySelector("#task-input"),
  categoryInput: document.querySelector("#category-input"),
  dateInput: document.querySelector("#date-input"),
  taskList: document.querySelector("#task-list"),
  emptyState: document.querySelector("#empty-state"),
  emptyTitle: document.querySelector("#empty-title"),
  emptyCopy: document.querySelector("#empty-copy"),
  viewKicker: document.querySelector("#view-kicker"),
  viewTitle: document.querySelector("#view-title"),
  viewSubtitle: document.querySelector("#view-subtitle"),
  progressRing: document.querySelector("#progress-ring"),
  progressValue: document.querySelector("#progress-value"),
  modalTitle: document.querySelector("#modal-title"),
  modalSubmit: document.querySelector("#modal-submit"),
  calendarPanel: document.querySelector("#calendar-panel"),
  calendarTitle: document.querySelector("#calendar-title"),
  calendarGrid: document.querySelector("#calendar-grid"),
  taskModal: document.querySelector("#task-modal"),
  dateTaskModal: document.querySelector("#date-task-modal"),
  dateTaskTitle: document.querySelector("#date-task-title"),
  dateTaskSearch: document.querySelector("#date-task-search"),
  dateTaskList: document.querySelector("#date-task-list"),
  sidebar: document.querySelector(".sidebar"),
  themePicker: document.querySelector("#theme-picker"),
};

function applyTheme(theme) {
  const availableThemes = ["sage", "sky", "plum"];
  state.theme = availableThemes.includes(theme) ? theme : "sage";
  document.documentElement.dataset.theme = state.theme;
  elements.themePicker.value = state.theme;
  localStorage.setItem(THEME_KEY, state.theme);
}

function loadTasks() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch {
    return [];
  }
}

function saveTasks() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.tasks));
  if (API_URL) {
    fetch(API_URL, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(state.tasks),
    }).catch(() => undefined);
  }
}

async function syncTasksFromApi() {
  if (!API_URL) return;
  try {
    const response = await fetch(API_URL);
    if (!response.ok) throw new Error("Unable to load tasks");
    const tasks = await response.json();
    state.tasks = Array.isArray(tasks) ? tasks : [];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state.tasks));
    render();
  } catch {
    // Keep the locally cached tasks if the API is unavailable.
  }
}

function getRoute() {
  return window.location.hash.replace("#/", "") || "all";
}

function getVisibleTasks() {
  const today = new Date().toISOString().slice(0, 10);
  let visibleTasks = state.tasks;

  if (state.route === "today") visibleTasks = visibleTasks.filter((task) => task.dueDate === today);
  if (state.route === "upcoming") visibleTasks = visibleTasks.filter((task) => task.dueDate > today);
  if (state.route === "completed") visibleTasks = visibleTasks.filter((task) => task.completed);
  if (state.filter === "active") visibleTasks = visibleTasks.filter((task) => !task.completed);
  if (state.filter === "completed") visibleTasks = visibleTasks.filter((task) => task.completed);
  if (state.category !== "all") visibleTasks = visibleTasks.filter((task) => (task.category || "personal") === state.category);

  return [...visibleTasks].sort((firstTask, secondTask) => {
    if (!firstTask.dueDate && !secondTask.dueDate) return secondTask.createdAt - firstTask.createdAt;
    if (!firstTask.dueDate) return 1;
    if (!secondTask.dueDate) return -1;
    return firstTask.dueDate.localeCompare(secondTask.dueDate) || secondTask.createdAt - firstTask.createdAt;
  });
}

function createTask(text, category, dueDate) {
  const task = {
    id: crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`,
    text: text.trim(),
    completed: false,
    createdAt: Date.now(),
    dueDate,
    category,
  };
  state.tasks.unshift(task);
  saveTasks();
  render();
}

function render() {
  updateHeader();
  updateNavigation();
  updateProgress();
  renderCalendar();
  renderTasks();
}

function updateHeader() {
  const views = {
    all: ["Overview", "A clear mind starts here.", "Capture the little things, then get back to the good stuff."],
    today: ["Today", "Make today count.", "A short list is a kind list."],
    upcoming: ["Looking ahead", "Keep future-you in the loop.", "Your upcoming tasks, all in one calm place."],
    completed: ["Archive", "Look at you go.", "Everything you have already made space for."],
  };
  const [kicker, title, subtitle] = views[state.route] || views.all;
  elements.viewKicker.textContent = kicker;
  elements.viewTitle.textContent = title;
  elements.viewSubtitle.textContent = subtitle;
  const now = new Date();
  elements.dateStamp.innerHTML = `<strong>${new Intl.DateTimeFormat("en-US", { weekday: "long", month: "short", day: "numeric" }).format(now)}</strong><span>${new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit" }).format(now)}</span>`;
}

function updateNavigation() {
  document.querySelectorAll("[data-route]").forEach((link) => link.classList.toggle("is-active", link.dataset.route === state.route));
  document.querySelector("#all-count").textContent = state.tasks.filter((task) => !task.completed).length;
  document.querySelector("#today-count").textContent = state.tasks.filter((task) => task.dueDate === new Date().toISOString().slice(0, 10) && !task.completed).length;
}

function updateProgress() {
  const today = new Date().toISOString().slice(0, 10);
  const todaysTasks = state.tasks.filter((task) => task.dueDate === today);
  const total = todaysTasks.length;
  const completed = todaysTasks.filter((task) => task.completed).length;
  const percent = total ? Math.round((completed / total) * 100) : 0;
  elements.progressValue.textContent = `${percent}%`;
  elements.progressRing.style.background = `conic-gradient(var(--sage) ${percent * 3.6}deg, #e5e9e1 0deg)`;
  elements.progressRing.setAttribute("aria-label", `${percent} percent complete`);
}

function dateKey(year, month, day) {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function renderCalendar() {
  const isAllView = state.route === "all";
  elements.calendarPanel.hidden = !isAllView;
  if (!isAllView) return;

  const year = state.calendarDate.getFullYear();
  const month = state.calendarDate.getMonth();
  const monthName = new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric" }).format(state.calendarDate);
  const today = new Date().toISOString().slice(0, 10);
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const tasksByDate = state.tasks.reduce((dates, task) => {
    if (task.dueDate) dates[task.dueDate] = [...(dates[task.dueDate] || []), task];
    return dates;
  }, {});

  elements.calendarTitle.textContent = monthName;
  elements.calendarGrid.innerHTML = Array.from({ length: firstDay + daysInMonth }, (_, index) => {
    if (index < firstDay) return '<span class="calendar-day is-blank" aria-hidden="true"></span>';
    const day = index - firstDay + 1;
    const key = dateKey(year, month, day);
    const tasks = tasksByDate[key] || [];
    const taskMarkers = tasks.slice(0, 3).map((task) => `<span class="calendar-task ${task.completed ? "is-complete" : ""}" title="${escapeHtml(task.text)}" aria-label="${escapeHtml(task.text)}"></span>`).join("");
    const taskSummary = tasks.length ? `<span class="calendar-summary"><span class="calendar-dots">${taskMarkers}</span><span>${tasks.length} ${tasks.length === 1 ? "task" : "tasks"}</span></span>` : "";
    return `<div class="calendar-day ${key === today ? "is-today" : ""}" data-date="${key}"><span class="calendar-number">${day}</span>${taskSummary}</div>`;
  }).join("");
}

function renderTasks() {
  const tasks = getVisibleTasks();
  const categoryLabels = { personal: "Personal", work: "Work", health: "Health", learning: "Learning" };
  elements.taskList.innerHTML = tasks.map((task, index) => `
    <article class="task-item ${task.completed ? "is-complete" : ""}" data-id="${task.id}" style="animation-delay: ${index * 35}ms">
      <button class="task-check" type="button" data-action="toggle" aria-label="Mark task ${task.completed ? "active" : "complete"}">${task.completed ? "✓" : ""}</button>
      <span class="task-copy">${escapeHtml(task.text)}</span>
      <span class="task-meta"><span class="category-pill category-${task.category || "personal"}">${categoryLabels[task.category || "personal"]}</span><span class="due-date">${formatDueDate(task.dueDate)}</span></span>
      <div class="task-actions">
        <button class="task-action" type="button" data-action="edit" title="Edit task" aria-label="Edit task">✎</button>
        <button class="task-action" type="button" data-action="delete" title="Delete task" aria-label="Delete task">×</button>
      </div>
    </article>
  `).join("");

  const hasTasks = tasks.length > 0;
  elements.emptyState.hidden = hasTasks;
  if (!hasTasks) {
    elements.emptyTitle.textContent = state.route === "completed" || state.filter === "completed" ? "Nothing completed yet." : "Nothing here yet.";
    elements.emptyCopy.textContent = state.route === "today" ? "A clear day is a beautiful thing." : "Add your first task above and give it a place to land.";
  }
}

function formatDueDate(dateValue) {
  if (!dateValue) return "No date";
  const today = new Date().toISOString().slice(0, 10);
  if (dateValue === today) return "Today";
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(new Date(`${dateValue}T00:00:00`));
}

function escapeHtml(value) {
  return value.replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[character]));
}

function renderDateTaskList() {
  const categoryLabels = { personal: "Personal", work: "Work", health: "Health", learning: "Learning" };
  const searchTerm = state.dateTaskSearch.trim().toLowerCase();
  const tasks = state.tasks
    .filter((task) => task.dueDate === state.selectedDate)
    .filter((task) => !searchTerm || `${task.text} ${task.category || "personal"}`.toLowerCase().includes(searchTerm))
    .sort((firstTask, secondTask) => secondTask.createdAt - firstTask.createdAt);

  elements.dateTaskList.innerHTML = tasks.length ? tasks.map((task) => `
    <button class="date-task-item ${task.completed ? "is-complete" : ""}" type="button" data-id="${task.id}">
      <span class="date-task-check">${task.completed ? "✓" : ""}</span>
      <span class="date-task-copy"><strong>${escapeHtml(task.text)}</strong><small>${categoryLabels[task.category || "personal"]}</small></span>
    </button>
  `).join("") : `<p class="date-task-empty">${searchTerm ? "No matching tasks." : "No tasks planned for this date."}</p>`;
}

function closeDateTaskModal() {
  elements.dateTaskModal.hidden = true;
  state.selectedDate = null;
  state.dateTaskSearch = "";
}

function openDateTaskModal(dateValue) {
  state.selectedDate = dateValue;
  state.dateTaskSearch = "";
  elements.dateTaskTitle.textContent = new Intl.DateTimeFormat("en-US", { weekday: "long", month: "long", day: "numeric" }).format(new Date(`${dateValue}T00:00:00`));
  elements.dateTaskSearch.value = "";
  renderDateTaskList();
  elements.dateTaskModal.hidden = false;
  elements.dateTaskSearch.focus();
}

function closeTaskModal() {
  elements.taskModal.hidden = true;
  document.body.classList.remove("modal-open");
  state.editingTaskId = null;
}

function openTaskModal(task = null, dueDate = null) {
  elements.taskModal.hidden = false;
  document.body.classList.add("modal-open");
  state.editingTaskId = task?.id || null;
  elements.modalTitle.textContent = task ? "Update the details." : "Put it on the list.";
  elements.modalSubmit.firstChild.textContent = task ? "Save changes " : "Add task ";
  elements.taskInput.value = task?.text || "";
  elements.categoryInput.value = task?.category || "personal";
  elements.dateInput.value = task?.dueDate || dueDate || new Date().toISOString().slice(0, 10);
  elements.taskInput.focus();
}

elements.taskForm.addEventListener("submit", (event) => {
  event.preventDefault();
  if (elements.taskInput.value.trim()) {
    const dueDate = elements.dateInput.value || new Date().toISOString().slice(0, 10);
    if (state.editingTaskId) {
      const task = state.tasks.find((entry) => entry.id === state.editingTaskId);
      if (task) {
        task.text = elements.taskInput.value.trim();
        task.category = elements.categoryInput.value;
        task.dueDate = dueDate;
        saveTasks();
        render();
      }
    } else {
      createTask(elements.taskInput.value, elements.categoryInput.value, dueDate);
    }
    elements.taskInput.value = "";
    closeTaskModal();
  }
});

elements.taskList.addEventListener("click", (event) => {
  const action = event.target.closest("[data-action]")?.dataset.action;
  const item = event.target.closest("[data-id]");
  if (!action || !item) return;
  const task = state.tasks.find((entry) => entry.id === item.dataset.id);
  if (!task) return;
  if (action === "toggle") task.completed = !task.completed;
  if (action === "delete") state.tasks = state.tasks.filter((entry) => entry.id !== task.id);
  if (action === "edit") return openTaskModal(task);
  saveTasks();
  render();
});

document.querySelectorAll(".filter-tab").forEach((tab) => tab.addEventListener("click", () => {
  state.filter = tab.dataset.filter;
  document.querySelectorAll(".filter-tab").forEach((button) => button.classList.toggle("is-active", button === tab));
  renderTasks();
}));

document.querySelector("#category-filter").addEventListener("change", (event) => {
  state.category = event.target.value;
  renderTasks();
});

elements.themePicker.addEventListener("change", (event) => applyTheme(event.target.value));

document.querySelector("#clear-completed").addEventListener("click", () => {
  state.tasks = state.tasks.filter((task) => !task.completed);
  saveTasks();
  render();
});

document.querySelector("#previous-month").addEventListener("click", () => {
  state.calendarDate = new Date(state.calendarDate.getFullYear(), state.calendarDate.getMonth() - 1, 1);
  renderCalendar();
});
document.querySelector("#next-month").addEventListener("click", () => {
  state.calendarDate = new Date(state.calendarDate.getFullYear(), state.calendarDate.getMonth() + 1, 1);
  renderCalendar();
});
elements.calendarGrid.addEventListener("click", (event) => {
  const day = event.target.closest("[data-date]");
  if (day) openDateTaskModal(day.dataset.date);
});

document.querySelector("#add-task-trigger").addEventListener("click", () => openTaskModal());
document.querySelector("#modal-close").addEventListener("click", closeTaskModal);
document.querySelector("#modal-cancel").addEventListener("click", closeTaskModal);
document.querySelector("#date-task-close").addEventListener("click", closeDateTaskModal);
document.querySelector("#date-task-add").addEventListener("click", () => {
  const selectedDate = state.selectedDate;
  closeDateTaskModal();
  openTaskModal(null, selectedDate);
});
elements.dateTaskSearch.addEventListener("input", (event) => {
  state.dateTaskSearch = event.target.value;
  renderDateTaskList();
});
elements.dateTaskList.addEventListener("click", (event) => {
  const task = state.tasks.find((entry) => entry.id === event.target.closest("[data-id]")?.dataset.id);
  if (!task) return;
  closeDateTaskModal();
  openTaskModal(task);
});
elements.taskModal.addEventListener("click", (event) => {
  if (event.target === elements.taskModal) closeTaskModal();
});
elements.dateTaskModal.addEventListener("click", (event) => {
  if (event.target === elements.dateTaskModal) closeDateTaskModal();
});
document.querySelector("#sidebar-toggle").addEventListener("click", () => {
  const collapsed = elements.sidebar.classList.toggle("is-collapsed");
  document.querySelector("#sidebar-toggle").textContent = collapsed ? "›" : "‹";
  document.querySelector("#sidebar-toggle").setAttribute("aria-label", collapsed ? "Expand sidebar" : "Collapse sidebar");
});
window.addEventListener("hashchange", () => {
  state.route = getRoute();
  state.filter = "all";
  state.category = "all";
  document.querySelector("#category-filter").value = "all";
  document.querySelectorAll(".filter-tab").forEach((button) => button.classList.toggle("is-active", button.dataset.filter === "all"));
  render();
});
document.addEventListener("keydown", (event) => {
  if (event.key.toLowerCase() === "n" && document.activeElement.tagName !== "INPUT") {
    event.preventDefault();
    openTaskModal();
  }
  if (event.key === "Escape" && !elements.taskModal.hidden) closeTaskModal();
  if (event.key === "Escape" && !elements.dateTaskModal.hidden) closeDateTaskModal();
});

applyTheme(state.theme);
render();
elements.dateInput.value = new Date().toISOString().slice(0, 10);
syncTasksFromApi();
setInterval(updateHeader, 30000);

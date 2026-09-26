// Find the HTML elements
const taskForm = document.querySelector("#taskForm");
const taskInput = document.querySelector("#taskInput");
const dueDateInput = document.querySelector("#dueDateInput");
const taskList = document.querySelector("#taskList");
const message = document.querySelector("#message");
const filters = document.querySelector("#filters");
const totalCount = document.querySelector("#totalCount");
const completedCount = document.querySelector("#completedCount");
const remainingCount = document.querySelector("#remainingCount");
const progressText = document.querySelector("#progressText");
const progressBar = document.querySelector("#progressBar");

// Time constants in milliseconds
const ONE_MINUTE = 60 * 1000;
const ONE_DAY = 24 * 60 * ONE_MINUTE;

// Load saved tasks when the page opens
let tasks = loadTasks();

let currentFilter = "all";

function loadTasks() {
  const savedTasks = localStorage.getItem("tasks");

  // On the first visit, localStorage is empty
  if (savedTasks === null) {
    return [];
  }

  try {
    const parsedTasks = JSON.parse(savedTasks);
    if (!Array.isArray(parsedTasks)) {
      return [];
    }
    // Ignore broken items so for example [null] becomes an empty list and nothing crashes. 
    return parsedTasks.filter((task) => task && typeof task.text === "string");
  } catch (error) {
    return [];
  }
}

function saveTasks() {
  const tasksJSON = JSON.stringify(tasks);
  localStorage.setItem("tasks", tasksJSON);
}

function showMessage(text, type) {
  message.textContent = text;
  message.classList.toggle("error", type === "error");
  message.classList.toggle("success", type === "success");
}

function addTask(event) {
  // Prevent the form from refreshing the page
  event.preventDefault();

  // trim() removes spaces from the beginning and end
  const taskText = taskInput.value.trim();

  // The date is optional, so an empty value becomes null
  const dueDate = dueDateInput.value || null;

  // Reject empty or whitespace-only input
  if (taskText === "") {
    showMessage("Please enter a task before continuing.", "error");
    return;
  }

  // A new deadline cannot already be in the past
  if (dueDate && new Date(dueDate).getTime() < Date.now() - ONE_MINUTE) {
    showMessage("That due date has already passed, pick a future time.", "error");
    return;
  }

  const newTask = {
    id: Date.now(),
    text: taskText,
    completed: false,
    dueDate: dueDate
  };

  tasks.push(newTask);

  saveTasks();
  setFilter("all");

  // Clear the inputs and show encouraging feedback
  taskForm.reset();
  showMessage("Task added", "success");

  taskInput.focus();
}

// Describes where a task stands in time
function getDueStatus(task) {
  if (!task.dueDate) {
    return "none";
  }

  if (task.completed) {
    return "done";
  }

  const timeLeft = new Date(task.dueDate).getTime() - Date.now();

  if (timeLeft < 0) {
    return "overdue";
  }

  if (timeLeft <= ONE_DAY) {
    return "soon";
  }

  return "upcoming";
}

// Turns milliseconds into short text like "2d 5h", "3h 20m" or "45m"
function formatDuration(milliseconds) {
  const totalMinutes = Math.floor(Math.abs(milliseconds) / ONE_MINUTE);
  const days = Math.floor(totalMinutes / (24 * 60));
  const hours = Math.floor((totalMinutes % (24 * 60)) / 60);
  const minutes = totalMinutes % 60;

  if (days > 0) {
    return `${days}d ${hours}h`;
  }

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }

  return minutes > 0 ? `${minutes}m` : "under 1m";
}

// Builds the small line under a task, for example "Sep 26, 2:00 PM · 5h 12m left"
function getDueText(task) {
  const due = new Date(task.dueDate);
  const dateText = due.toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  });

  const status = getDueStatus(task);
  const timeLeft = due.getTime() - Date.now();

  if (status === "done") {
    return `Due ${dateText} · Done`;
  }

  if (status === "overdue") {
    return `Due ${dateText} · Overdue by ${formatDuration(timeLeft)}`;
  }

  return `Due ${dateText} · ${formatDuration(timeLeft)} left`;
}

// Decides if a task should be visible under the selected filter
function matchesFilter(task, filter) {
  const status = getDueStatus(task);

  if (filter === "active") {
    return !task.completed;
  }

  if (filter === "completed") {
    return task.completed;
  }

  if (filter === "soon") {
    return status === "soon";
  }

  if (filter === "overdue") {
    return status === "overdue";
  }

  // "all"
  return true;
}

// animate is false for the automatic timer refresh,
// so tasks don't replay their entrance animation every minute
function renderTasks(animate = true) {
  // Clear the old list before drawing it again
  taskList.innerHTML = "";
  taskList.classList.toggle("no-animate", !animate);
  updateDashboard();
  updateFilterCounts();

  if (tasks.length === 0) {
    showEmptyMessage("Your next move starts here.");
    return;
  }

  const visibleTasks = tasks.filter((task) => matchesFilter(task, currentFilter));

  if (visibleTasks.length === 0) {
    showEmptyMessage("No tasks match this filter.");
    return;
  }

  visibleTasks.forEach((task) => {
    const listItem = document.createElement("li");
    const taskButton = document.createElement("button");
    const taskBody = document.createElement("span");
    const taskTitle = document.createElement("span");
    const deleteButton = document.createElement("button");

    listItem.classList.add("task-item");
    listItem.dataset.id = task.id;

    if (task.completed) {
      listItem.classList.add("completed");
    }

    // Adds a class like "due-overdue" or "due-soon" for colouring
    listItem.classList.add(`due-${getDueStatus(task)}`);

    taskButton.classList.add("task-text");
    taskButton.dataset.action = "toggle";
    taskButton.type = "button";
    taskButton.setAttribute("aria-pressed", task.completed);

    taskBody.classList.add("task-body");
    taskTitle.classList.add("task-title");
    taskTitle.textContent = task.text;
    taskBody.append(taskTitle);

    // Only tasks with a date get the countdown line
    if (task.dueDate) {
      const dueLabel = document.createElement("span");

      dueLabel.classList.add("due-label");
      dueLabel.textContent = getDueText(task);
      taskBody.append(dueLabel);
    }

    taskButton.append(taskBody);

    deleteButton.classList.add("delete-button");
    deleteButton.dataset.action = "delete";
    deleteButton.type = "button";
    deleteButton.textContent = "Delete";

    listItem.append(taskButton, deleteButton);
    taskList.append(listItem);
  });
}

function showEmptyMessage(text) {
  const emptyMessage = document.createElement("li");

  emptyMessage.classList.add("empty-message");
  emptyMessage.textContent = text;

  taskList.append(emptyMessage);
}

function updateDashboard() {
  const completedTasks = tasks.filter((task) => task.completed).length;
  const remainingTasks = tasks.length - completedTasks;
  const progress = tasks.length === 0
    ? 0
    : Math.round((completedTasks / tasks.length) * 100);

  totalCount.textContent = tasks.length;
  completedCount.textContent = completedTasks;
  remainingCount.textContent = remainingTasks;
  progressText.textContent = `${progress}%`;
  progressBar.style.width = `${progress}%`;
}

// Shows how many tasks each filter button would display
function updateFilterCounts() {
  const countLabels = document.querySelectorAll("[data-count]");

  countLabels.forEach((label) => {
    const filter = label.dataset.count;
    label.textContent = tasks.filter((task) => matchesFilter(task, filter)).length;
  });
}

function setFilter(filter) {
  currentFilter = filter;

  const filterButtons = document.querySelectorAll(".filter-button");

  filterButtons.forEach((button) => {
    const isSelected = button.dataset.filter === filter;

    button.classList.toggle("active", isSelected);
    button.setAttribute("aria-pressed", isSelected);
  });

  renderTasks();
}

function toggleTask(taskId) {
  const selectedTask = tasks.find((task) => task.id === taskId);

  if (!selectedTask) {
    return;
  }

  selectedTask.completed = !selectedTask.completed;

  saveTasks();
  renderTasks();
}

function deleteTask(taskId) {
  // filter() creates a new array without the deleted task
  tasks = tasks.filter((task) => task.id !== taskId);

  saveTasks();
  renderTasks();
}

// Clicking the button or pressing Enter submits the form
taskForm.addEventListener("submit", addTask);

taskInput.addEventListener("input", () => showMessage("", ""));

filters.addEventListener("click", (event) => {
  const clickedButton = event.target.closest(".filter-button");

  if (clickedButton) {
    setFilter(clickedButton.dataset.filter);
  }
});

// one event listener controls every task
taskList.addEventListener("click", (event) => {
  const clickedButton = event.target.closest("button");

  if (!clickedButton) {
    return;
  }

  const listItem = clickedButton.closest(".task-item");

  if (!listItem) {
    return;
  }

  const taskId = Number(listItem.dataset.id);
  const action = clickedButton.dataset.action;

  if (action === "toggle") {
    toggleTask(taskId);
  }

  if (action === "delete") {
    deleteTask(taskId);
  }
});

// Refresh the countdowns every 30 seconds so the time left stays accurate
setInterval(() => renderTasks(false), 30 * 1000);

// Display saved tasks when the page first opens
renderTasks();

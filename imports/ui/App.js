import { Meteor } from 'meteor/meteor';
import { Template } from 'meteor/templating';
import { ReactiveDict } from 'meteor/reactive-dict';
import { ReactiveVar } from 'meteor/reactive-var';
import { TasksCollection } from '../api/TasksCollection';
import Sortable from 'sortablejs';
import './App.html';
import './Task.js';
import './Login.js';

const HIDE_COMPLETED_STRING = 'hideCompleted';
const SELECTED_CATEGORY_STRING = 'selectedCategory';
const SEARCH_QUERY_STRING = 'searchQuery';

const getUser = () => Meteor.user();
const isUserLogged = () => !!getUser();

/* ===================================================
   Toast notification system
   =================================================== */
const toastList = new ReactiveVar([]);
let toastIdCounter = 0;

/**
 * Show a toast notification.
 * @param {'success'|'error'|'info'} type
 * @param {string} message
 * @param {number} durationMs — auto-dismiss in ms (default 3000)
 */
function showToast(type, message, durationMs = 3000) {
  const id = ++toastIdCounter;
  const current = toastList.get();
  toastList.set([...current, { id, type, message, removing: false }]);

  // Auto-dismiss
  setTimeout(() => {
    // Set removing flag for exit animation
    const items = toastList.get().map(t =>
      t.id === id ? { ...t, removing: true } : t
    );
    toastList.set(items);

    // Remove from DOM after exit animation
    setTimeout(() => {
      toastList.set(toastList.get().filter(t => t.id !== id));
    }, 260);
  }, durationMs);
}

/* ===================================================
   Theme management
   =================================================== */
const currentTheme = new ReactiveVar('dark');

function initTheme() {
  const saved = localStorage.getItem('taskflow-theme');
  if (saved) {
    currentTheme.set(saved);
  } else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) {
    currentTheme.set('light');
  }
  applyTheme(currentTheme.get());
}

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
}

function toggleTheme() {
  const next = currentTheme.get() === 'dark' ? 'light' : 'dark';
  currentTheme.set(next);
  localStorage.setItem('taskflow-theme', next);
  applyTheme(next);
}

/* ===================================================
   Query & filter helpers
   =================================================== */

/**
 * Build the MongoDB query filter based on current UI state.
 */
const getTasksFilter = (instance) => {
  const user = getUser();
  if (!user) return {};

  const filter = { userId: user._id };

  // Category filter
  const selectedCategory = instance.state.get(SELECTED_CATEGORY_STRING);
  if (selectedCategory && selectedCategory !== 'all') {
    filter.category = selectedCategory;
  }

  // Hide completed filter
  const hideCompleted = instance.state.get(HIDE_COMPLETED_STRING);
  if (hideCompleted) {
    filter.isChecked = { $ne: true };
  }

  // Search filter
  const searchQuery = instance.state.get(SEARCH_QUERY_STRING);
  if (searchQuery && searchQuery.trim()) {
    const escaped = searchQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    filter.text = { $regex: escaped, $options: 'i' };
  }

  return filter;
};

// Keep a reference to the Sortable instance for cleanup
let sortableInstance = null;

/* ===================================================
   Template: mainContainer
   =================================================== */
Template.mainContainer.onCreated(function mainContainerOnCreated() {
  this.state = new ReactiveDict();
  this.state.set(SELECTED_CATEGORY_STRING, 'all');
  this.state.set(SEARCH_QUERY_STRING, '');

  // Subscribe to the tasks publication
  Meteor.subscribe('tasks');

  // Initialize theme
  initTheme();
});

Template.mainContainer.onRendered(function mainContainerOnRendered() {
  // We use autorun so that when the reactive data changes and the list
  // re-renders, we re-attach Sortable
  this.autorun(() => {
    // Access reactive data so autorun re-runs when tasks change
    const filter = getTasksFilter(this);
    TasksCollection.find(filter).fetch();

    // Use Meteor.defer to wait for DOM update after reactive re-render
    Meteor.defer(() => {
      const taskList = document.getElementById('task-list');
      if (taskList) {
        // Destroy existing instance before creating a new one
        if (sortableInstance) {
          sortableInstance.destroy();
        }

        sortableInstance = Sortable.create(taskList, {
          animation: 250,
          easing: 'cubic-bezier(0.25, 1, 0.5, 1)',
          handle: '.drag-handle',
          ghostClass: 'sortable-ghost',
          chosenClass: 'sortable-chosen',
          dragClass: 'sortable-drag',
          onEnd(evt) {
            // Get all task list items in their new order
            const items = taskList.querySelectorAll('.task');
            const taskOrders = Array.from(items).map((item, index) => ({
              _id: item.dataset.id,
              order: index,
            }));

            // Persist the new order to the database
            Meteor.call('tasks.updateOrder', taskOrders, (error) => {
              if (error) {
                console.error('Error updating task order:', error);
                showToast('error', 'Failed to reorder tasks');
              }
            });
          },
        });
      }
    });
  });
});

Template.mainContainer.onDestroyed(function mainContainerOnDestroyed() {
  if (sortableInstance) {
    sortableInstance.destroy();
    sortableInstance = null;
  }
});

/* ===================================================
   Events
   =================================================== */
Template.mainContainer.events({
  /**
   * Submit the task creation form.
   */
  'submit .task-form'(event, instance) {
    event.preventDefault();

    const text = event.target.text.value.trim();
    const category = event.target.category.value;

    if (!text) return;

    Meteor.call('tasks.insert', text, category, (error) => {
      if (error) {
        console.error('Error inserting task:', error);
        showToast('error', 'Failed to create task');
        return;
      }
      showToast('success', 'Task created successfully');
      // Clear the form
      event.target.text.value = '';
    });
  },

  /**
   * Toggle the hide-completed filter.
   */
  'click #hide-completed-button'(event, instance) {
    const currentState = instance.state.get(HIDE_COMPLETED_STRING);
    instance.state.set(HIDE_COMPLETED_STRING, !currentState);
  },

  /**
   * Filter tasks by category.
   */
  'click .nav-item'(event, instance) {
    const category = event.currentTarget.dataset.category;
    instance.state.set(SELECTED_CATEGORY_STRING, category);
  },

  /**
   * Log out the current user.
   */
  'click #logout-button'() {
    Meteor.logout();
  },

  /**
   * Toggle the theme.
   */
  'click #theme-toggle-button'() {
    toggleTheme();
  },

  /**
   * Search input handler.
   */
  'input #search-input'(event, instance) {
    instance.state.set(SEARCH_QUERY_STRING, event.target.value);
  },

  /**
   * Clear search with Escape key.
   */
  'keydown #search-input'(event, instance) {
    if (event.key === 'Escape') {
      event.target.value = '';
      instance.state.set(SEARCH_QUERY_STRING, '');
      event.target.blur();
    }
  },

  /**
   * Clear search button.
   */
  'click #search-clear-button'(event, instance) {
    const searchInput = document.getElementById('search-input');
    if (searchInput) {
      searchInput.value = '';
      searchInput.focus();
    }
    instance.state.set(SEARCH_QUERY_STRING, '');
  },
});

/* ===================================================
   Helpers
   =================================================== */
Template.mainContainer.helpers({
  /**
   * Return the filtered and sorted tasks cursor.
   */
  tasks() {
    const instance = Template.instance();
    const filter = getTasksFilter(instance);
    return TasksCollection.find(filter, { sort: { order: 1, createdAt: -1 } });
  },

  /**
   * Count of incomplete tasks.
   */
  incompleteCount() {
    const user = getUser();
    if (!user) return 0;
    return TasksCollection.find({
      userId: user._id,
      isChecked: { $ne: true },
    }).count();
  },

  /**
   * Total count of all tasks (for sidebar).
   */
  totalCount() {
    const user = getUser();
    if (!user) return 0;
    return TasksCollection.find({ userId: user._id }).count();
  },

  /**
   * Count of tasks in a given category.
   */
  categoryCount(category) {
    const user = getUser();
    if (!user) return 0;
    return TasksCollection.find({ userId: user._id, category }).count();
  },

  /**
   * The title to display based on the selected category.
   */
  currentCategoryTitle() {
    const selected = Template.instance().state.get(SELECTED_CATEGORY_STRING);
    if (!selected || selected === 'all') return 'All Tasks';
    return selected;
  },

  /**
   * Whether the current user is logged in.
   */
  isUserLogged() {
    return isUserLogged();
  },

  /**
   * Return the current user object.
   */
  getUser() {
    return getUser();
  },

  /**
   * First letter of the username as an avatar.
   */
  userInitial() {
    const user = getUser();
    if (!user || !user.username) return '?';
    return user.username.charAt(0).toUpperCase();
  },

  /**
   * Whether the hide-completed filter is active.
   */
  hideCompleted() {
    return Template.instance().state.get(HIDE_COMPLETED_STRING);
  },

  /**
   * Check if a given category matches the currently selected filter.
   */
  isSelectedCategory(category) {
    const selected = Template.instance().state.get(SELECTED_CATEGORY_STRING);
    if (!selected && category === 'all') return true;
    return selected === category;
  },

  /**
   * Whether the current theme is dark.
   */
  isDarkTheme() {
    return currentTheme.get() === 'dark';
  },

  /**
   * Whether a search query is active.
   */
  hasSearchQuery() {
    const query = Template.instance().state.get(SEARCH_QUERY_STRING);
    return query && query.trim().length > 0;
  },

  /**
   * Get the list of active toasts.
   */
  toasts() {
    return toastList.get();
  },

  /* --- Progress ring helpers --- */

  /**
   * The SVG circumference of the progress ring (2 * PI * r, r=14).
   */
  progressCircumference() {
    return (2 * Math.PI * 14).toFixed(2);
  },

  /**
   * The stroke-dashoffset for the progress ring.
   */
  progressOffset() {
    const user = getUser();
    if (!user) return (2 * Math.PI * 14).toFixed(2);

    const total = TasksCollection.find({ userId: user._id }).count();
    const completed = TasksCollection.find({ userId: user._id, isChecked: true }).count();

    if (total === 0) return (2 * Math.PI * 14).toFixed(2);

    const circumference = 2 * Math.PI * 14;
    const ratio = completed / total;
    return (circumference * (1 - ratio)).toFixed(2);
  },

  /**
   * The completion percentage as a whole number.
   */
  progressPercent() {
    const user = getUser();
    if (!user) return 0;

    const total = TasksCollection.find({ userId: user._id }).count();
    const completed = TasksCollection.find({ userId: user._id, isChecked: true }).count();

    if (total === 0) return 0;
    return Math.round((completed / total) * 100);
  },
});

// Register global helpers for toast type checks
Template.registerHelper('isSuccess', function () {
  return this.type === 'success';
});

Template.registerHelper('isError', function () {
  return this.type === 'error';
});

Template.registerHelper('isInfo', function () {
  return this.type === 'info';
});

/* ===================================================
   Export showToast so Task.js can use it
   =================================================== */
export { showToast };

import { Meteor } from 'meteor/meteor';
import { Template } from 'meteor/templating';
import { ReactiveDict } from 'meteor/reactive-dict';
import { TasksCollection } from '../api/TasksCollection';
import Sortable from 'sortablejs';
import './App.html';
import './Task.js';
import './Login.js';

const HIDE_COMPLETED_STRING = 'hideCompleted';
const SELECTED_CATEGORY_STRING = 'selectedCategory';

const getUser = () => Meteor.user();
const isUserLogged = () => !!getUser();

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

  return filter;
};

// Keep a reference to the Sortable instance for cleanup
let sortableInstance = null;

Template.mainContainer.onCreated(function mainContainerOnCreated() {
  this.state = new ReactiveDict();
  this.state.set(SELECTED_CATEGORY_STRING, 'all');

  // Subscribe to the tasks publication
  Meteor.subscribe('tasks');
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
        return;
      }
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
});

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
});

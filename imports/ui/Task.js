import { Meteor } from 'meteor/meteor';
import { Template } from 'meteor/templating';
import { ReactiveVar } from 'meteor/reactive-var';
import { showToast } from './App.js';
import './Task.html';

Template.task.onCreated(function taskOnCreated() {
  this.isEditing = new ReactiveVar(false);
});

Template.task.onRendered(function taskOnRendered() {
  // When editing state changes, focus the input
  this.autorun(() => {
    if (this.isEditing.get()) {
      Meteor.defer(() => {
        const input = this.find('.task-edit-input');
        if (input) {
          input.focus();
          input.select();
        }
      });
    }
  });
});

Template.task.events({
  /**
   * Toggle the checked state when the checkbox is clicked.
   * We use preventDefault to stop the browser's native checkbox toggle,
   * letting Blaze's reactive rendering handle the visual state instead.
   */
  'click .checkbox-wrapper'(event, instance) {
    event.preventDefault();
    const newState = !this.isChecked;
    Meteor.call('tasks.setIsChecked', this._id, newState, (error) => {
      if (error) {
        showToast('error', 'Failed to update task');
      } else {
        showToast('success', newState ? 'Task completed' : 'Task reopened');
      }
    });
  },

  /**
   * Delete the task when the delete button is clicked.
   */
  'click .delete-btn'(event, instance) {
    const taskText = this.text;
    Meteor.call('tasks.remove', this._id, (error) => {
      if (error) {
        showToast('error', 'Failed to delete task');
      } else {
        showToast('info', `"${taskText.substring(0, 30)}${taskText.length > 30 ? '...' : ''}" deleted`);
      }
    });
  },

  /**
   * Start editing when the edit button is clicked.
   */
  'click .edit-btn'(event, instance) {
    instance.isEditing.set(true);
  },

  /**
   * Start editing on double-click of the task text.
   */
  'dblclick .task-text'(event, instance) {
    if (!this.isChecked) {
      instance.isEditing.set(true);
    }
  },

  /**
   * Save edit on Enter, cancel on Escape.
   */
  'keydown .task-edit-input'(event, instance) {
    if (event.key === 'Enter') {
      event.preventDefault();
      const newText = event.target.value.trim();
      if (newText && newText !== this.text) {
        Meteor.call('tasks.updateText', this._id, newText, (error) => {
          if (error) {
            showToast('error', 'Failed to update task');
          } else {
            showToast('info', 'Task updated');
          }
        });
      }
      instance.isEditing.set(false);
    } else if (event.key === 'Escape') {
      instance.isEditing.set(false);
    }
  },

  /**
   * Save edit on blur (clicking away).
   */
  'blur .task-edit-input'(event, instance) {
    const newText = event.target.value.trim();
    if (newText && newText !== this.text) {
      Meteor.call('tasks.updateText', this._id, newText, (error) => {
        if (error) {
          showToast('error', 'Failed to update task');
        } else {
          showToast('info', 'Task updated');
        }
      });
    }
    instance.isEditing.set(false);
  },
});

Template.task.helpers({
  /**
   * Return a lowercase CSS class name based on the task's category.
   */
  categoryClass() {
    return this.category ? this.category.toLowerCase() : 'personal';
  },

  /**
   * Whether this task is currently being edited.
   */
  isEditing() {
    return Template.instance().isEditing.get();
  },
});

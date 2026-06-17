import { Meteor } from 'meteor/meteor';
import { Template } from 'meteor/templating';
import './Task.html';

Template.task.events({
  /**
   * Toggle the checked state when the checkbox is clicked.
   * We use preventDefault to stop the browser's native checkbox toggle,
   * letting Blaze's reactive rendering handle the visual state instead.
   */
  'click .checkbox-wrapper'(event) {
    event.preventDefault();
    Meteor.call('tasks.setIsChecked', this._id, !this.isChecked);
  },

  /**
   * Delete the task when the delete button is clicked.
   */
  'click .delete-btn'() {
    Meteor.call('tasks.remove', this._id);
  },
});

Template.task.helpers({
  /**
   * Return a lowercase CSS class name based on the task's category.
   */
  categoryClass() {
    return this.category ? this.category.toLowerCase() : 'personal';
  },
});

import { Meteor } from 'meteor/meteor';
import { check, Match } from 'meteor/check';
import { TasksCollection } from './TasksCollection';

const VALID_CATEGORIES = ['Work', 'Personal', 'Urgent'];

Meteor.methods({
  /**
   * Insert a new task with text, category, and order.
   */
  async 'tasks.insert'(text, category) {
    check(text, String);
    check(category, Match.Where((cat) => VALID_CATEGORIES.includes(cat)));

    if (!this.userId) {
      throw new Meteor.Error('Not authorized.');
    }

    // New tasks get the highest order value so they appear at the bottom
    const lastTask = await TasksCollection.findOneAsync(
      { userId: this.userId },
      { sort: { order: -1 } }
    );
    const nextOrder = lastTask ? (lastTask.order || 0) + 1 : 0;

    return TasksCollection.insertAsync({
      text,
      category,
      order: nextOrder,
      isChecked: false,
      createdAt: new Date(),
      userId: this.userId,
    });
  },

  /**
   * Remove a task by its ID.
   */
  async 'tasks.remove'(taskId) {
    check(taskId, String);

    if (!this.userId) {
      throw new Meteor.Error('Not authorized.');
    }

    const task = await TasksCollection.findOneAsync({ _id: taskId, userId: this.userId });
    if (!task) {
      throw new Meteor.Error('Task not found.');
    }

    return TasksCollection.removeAsync(taskId);
  },

  /**
   * Toggle the checked state of a task.
   */
  async 'tasks.setIsChecked'(taskId, isChecked) {
    check(taskId, String);
    check(isChecked, Boolean);

    if (!this.userId) {
      throw new Meteor.Error('Not authorized.');
    }

    const task = await TasksCollection.findOneAsync({ _id: taskId, userId: this.userId });
    if (!task) {
      throw new Meteor.Error('Task not found.');
    }

    return TasksCollection.updateAsync(taskId, {
      $set: { isChecked },
    });
  },

  /**
   * Update the order of tasks after a drag-and-drop reorder.
   * Receives an array of { _id, order } objects.
   */
  async 'tasks.updateOrder'(taskOrders) {
    check(taskOrders, [{ _id: String, order: Number }]);

    if (!this.userId) {
      throw new Meteor.Error('Not authorized.');
    }

    // Update each task's order
    const updates = taskOrders.map(({ _id, order }) =>
      TasksCollection.updateAsync(
        { _id, userId: this.userId },
        { $set: { order } }
      )
    );

    return Promise.all(updates);
  },

  /**
   * Update the text of a task (inline editing).
   */
  async 'tasks.updateText'(taskId, text) {
    check(taskId, String);
    check(text, String);

    if (!this.userId) {
      throw new Meteor.Error('Not authorized.');
    }

    const trimmed = text.trim();
    if (!trimmed) {
      throw new Meteor.Error('Task text cannot be empty.');
    }

    const task = await TasksCollection.findOneAsync({ _id: taskId, userId: this.userId });
    if (!task) {
      throw new Meteor.Error('Task not found.');
    }

    return TasksCollection.updateAsync(taskId, {
      $set: { text: trimmed },
    });
  },
});

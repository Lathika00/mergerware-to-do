import { Meteor } from 'meteor/meteor';
import { TasksCollection } from './TasksCollection';

/**
 * Publish tasks belonging to the logged-in user, sorted by order.
 */
Meteor.publish('tasks', function publishTasks() {
  if (!this.userId) {
    return this.ready();
  }

  return TasksCollection.find(
    { userId: this.userId },
    { sort: { order: 1, createdAt: -1 } }
  );
});

import { Meteor } from 'meteor/meteor';
import { Accounts } from 'meteor/accounts-base';
import { TasksCollection } from '/imports/api/TasksCollection';
import '/imports/api/tasksMethods';
import '/imports/api/tasksPublications';

const SEED_USERNAME = 'meteorite';
const SEED_PASSWORD = 'password';

/**
 * Insert a seed task for the given user.
 */
const insertTask = async (text, category, order, user) => {
  await TasksCollection.insertAsync({
    text,
    category,
    order,
    isChecked: false,
    createdAt: new Date(),
    userId: user._id,
  });
};

Meteor.startup(async () => {
  // Create a default user if none exists
  if (!(await Accounts.findUserByUsername(SEED_USERNAME))) {
    await Accounts.createUser({
      username: SEED_USERNAME,
      password: SEED_PASSWORD,
    });
  }

  const user = await Accounts.findUserByUsername(SEED_USERNAME);

  // Seed some sample tasks if the collection is empty
  if ((await TasksCollection.find().countAsync()) === 0) {
    const sampleTasks = [
      { text: 'Complete project proposal', category: 'Work', order: 0 },
      { text: 'Buy groceries', category: 'Personal', order: 1 },
      { text: 'Fix critical bug in production', category: 'Urgent', order: 2 },
      { text: 'Review pull requests', category: 'Work', order: 3 },
      { text: 'Schedule dentist appointment', category: 'Personal', order: 4 },
      { text: 'Deploy hotfix by EOD', category: 'Urgent', order: 5 },
      { text: 'Update documentation', category: 'Work', order: 6 },
    ];

    for (const task of sampleTasks) {
      await insertTask(task.text, task.category, task.order, user);
    }
  }
});

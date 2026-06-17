import { Meteor } from 'meteor/meteor';
import { Template } from 'meteor/templating';
import './Login.html';

Template.login.events({
  /**
   * Handle the login form submission.
   */
  'submit .login-form'(event) {
    event.preventDefault();

    const { target } = event;
    const username = target.username.value.trim();
    const password = target.password.value;

    Meteor.loginWithPassword(username, password, (error) => {
      if (error) {
        alert(`Login failed: ${error.reason}`);
      }
    });
  },
});

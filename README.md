# Taskflow — Meteor.js To-Do App

A to-do application built with **Meteor.js** and **Blaze**, featuring task categories and drag-and-drop reordering.

## Prerequisites

Make sure you have the following installed:

- **Node.js** (v20 or higher) — [Download here](https://nodejs.org/)

You can verify by running:

```bash
node -v
```

## Setup & Run

### 1. Install Meteor

```bash
npm install -g meteor --foreground-scripts
```

> **Note:** If you get a certificate error, run this instead:
> ```bash
> NODE_TLS_REJECT_UNAUTHORIZED=0 npm install -g meteor --foreground-scripts
> ```

After installation, add Meteor to your PATH (if not already):

```bash
export PATH=$HOME/.meteor:$PATH
```

To make this permanent, add the line above to your `~/.zshrc` (Mac) or `~/.bashrc` (Linux).

### 2. Install dependencies

Navigate to the project folder and install npm packages:

```bash
cd simple-todos-blaze
npm install
```

### 3. Start the app

```bash
meteor
```

The first run takes a bit longer as Meteor downloads core packages. Once ready, you'll see:

```
=> App running at http://localhost:3000/
```

### 4. Open in browser

Go to **http://localhost:3000/**

### 5. Login

Use the default credentials:

- **Username:** `meteorite`
- **Password:** `password`

## Features

- **Task Management** — Add, complete, and delete tasks
- **Task Categories** — Organize tasks as Work, Personal, or Urgent
- **Category Filtering** — Filter tasks by category using the sidebar
- **Drag-and-Drop Reordering** — Reorder tasks by dragging the grip handle (appears on hover)
- **Hide Completed** — Toggle visibility of completed tasks
- **User Accounts** — Login/logout with Meteor's accounts system

## Project Structure

```
simple-todos-blaze/
├── client/
│   ├── main.html          # HTML head (meta tags, fonts)
│   ├── main.js            # Client entry point
│   └── main.css           # All styles
├── imports/
│   ├── api/
│   │   ├── TasksCollection.js   # MongoDB collection
│   │   ├── tasksMethods.js      # Meteor methods (CRUD + reorder)
│   │   └── tasksPublications.js # Data publications
│   └── ui/
│       ├── App.html        # Main app template
│       ├── App.js          # App logic (helpers, events, SortableJS)
│       ├── Task.html       # Individual task template
│       ├── Task.js         # Task events and helpers
│       ├── Login.html      # Login form template
│       └── Login.js        # Login event handler
├── server/
│   └── main.js             # Server entry (seed data, imports)
└── package.json
```

## Tech Stack

- **Meteor.js 3.x** — Full-stack framework
- **Blaze** — Reactive templating engine
- **MongoDB** — Database (bundled with Meteor)
- **SortableJS** — Drag-and-drop library

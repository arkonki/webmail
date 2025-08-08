# Modern Webmail Client

This project is a complete, full-stack modern webmail client built with React, TypeScript, and a Node.js/Express backend. It is designed to emulate the usability and functionality of services like Gmail, providing a clean interface for managing emails, contacts, and settings. The application is architected to run as a single, unified server process, making deployment straightforward.

## Features

- **Full Email Functionality**: Send, receive, reply, and forward emails.
- **Conversation View**: Emails are grouped into conversation threads.
- **Rich Text Composer**: A WYSIWYG editor for composing emails with formatting, links, and embedded images.
- **Drag & Drop**: Easily move emails to folders or apply labels.
- **Real-time Actions**: Move, delete, star, and mark emails as read/unread.
- **Labels & Folders**: Organize mail with custom, colored labels and user-created folders.
- **Advanced Search**: Filter mail with search operators like `from:`, `is:starred`, etc.
- **Contacts Management**: A full contacts book with support for creating contacts and groups.
- **Persistent Settings**: Configure signatures, auto-responders, send-delay, and filtering rules.
- **Live Backend API**: A Node.js/Express backend that serves a REST API.
- **Persistent Database**: Uses SQLite for persistent storage of contacts, settings, labels, and folders.
- **Real Mail Server Integration**: Connects to any standard IMAP/SMTP server for mail operations.
- **Dark Mode**: A sleek dark theme that respects system preferences.

## Tech Stack

- **Frontend**: React, TypeScript, Tailwind CSS, Vite
- **Backend**: Node.js, Express.js, `sanitize-html`, `helmet`
- **Database**: SQLite (for persistent local storage)
- **Mail Protocols**: `node-imap` for IMAP, `nodemailer` for SMTP

---

## Getting Started

Follow these instructions to get the project running on your local machine for development and testing.

### Prerequisites

You need to have [Node.js](https://nodejs.org/) (version 18 or later) and `npm` installed on your machine.

### Installation & Setup

1.  **Clone the repository:**
    ```bash
    git clone <repository-url>
    cd <repository-directory>
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```
    
3.  **Configure the Mail Server:**
    This is the most important setup step.
    - Open the file `server/mailService.ts`.
    - Find the `TODO` comments inside the `getImapConfig` and `getSmtpConfig` functions.
    - Replace the placeholder `host` and `port` details with the actual server details for your mail provider (e.g., `mail.veebimajutus.ee`).

### Running the Application

There are two primary ways to run this application:

#### 1. Development Mode (Hot-Reloading Enabled)

For development, you run the frontend and backend in two separate terminals. This allows the frontend to instantly update in your browser as you make code changes.

-   **Terminal 1: Start the Backend API Server**
    ```bash
    npm run serve
    ```
    This starts the Node.js/Express server on `http://localhost:3001`.

-   **Terminal 2: Start the Frontend Dev Server**
    ```bash
    npm run dev
    ```
    This starts the Vite development server, usually on `http://localhost:5173`. It is configured to proxy all `/api` requests to your backend server.

-   **Access the App:** Open your browser to the address provided by Vite (e.g., `http://localhost:5173`).

#### 2. Production Mode (Locally)

This method mimics how your application would run on a production server. It's the best way to test the final, built version of the app.

-   **Build and Start the Application**
    ```bash
    npm start
    ```
    This single command first builds the optimized frontend and then starts the Express server. The server will handle both the API requests and serve the built frontend files.

-   **Access the App:** Open your browser to `http://localhost:3001`.

---

## Deployment (Single Private Server)

This project is configured to be deployed as a single, self-contained application on one server.

### Build and Run for Production

1.  **Install Dependencies**: Make sure all dependencies are installed on your server:
    ```bash
    npm install
    ```
    
2.  **Build and Start the Server**: Use the `start` script.
    ```bash
    npm start
    ```

3.  **Access Your Application**: Your webmail client will now be running on the port specified in `server/index.ts` (default is `3001`). You can access it at `http://your_server_ip:3001`.

### Production Considerations

- **Database**: This project uses **SQLite**, which is a file-based database (`data/app.db`). This is fine for many private server setups. However, if your host has an **ephemeral filesystem** (common in serverless or containerized environments), the database file will be **DELETED** on restart. For those environments, you **MUST** replace SQLite with a managed database service like PostgreSQL or MySQL. The backend logic in `server/databaseService.ts` is structured to make this switch straightforward.

- **Process Management**: For a robust production deployment, you should use a process manager like `pm2` to run the application. This will ensure it restarts automatically if it crashes.
    ```bash
    # Install pm2 globally
    npm install pm2 -g
    # Start the app with pm2
    pm2 start "npm run start" --name webmail-client
    ```

- **HTTPS**: You **must** run this application over HTTPS in production to protect data in transit. Use a reverse proxy like Nginx or Caddy to handle SSL termination (getting a free certificate from Let's Encrypt) and forward requests to your Node.js application.

---

## Security Considerations

Security is a critical aspect of this application, especially since it handles user credentials. The following measures have been implemented:

- **Data Isolation**: The backend architecture is now fully multi-tenant. All data (contacts, labels, settings, etc.) is scoped by a `userId`. The API enforces that a logged-in user can **only** access or modify their own data. This is a critical protection against Insecure Direct Object Reference (IDOR) vulnerabilities.

- **Stateless Password Handling**: User passwords are **never** stored on the server. They are used only once during the initial login to establish persistent, authenticated IMAP and SMTP connections for the user's session. The password is then immediately discarded.

- **HTTP Security Headers**: The `helmet` library is used to set various HTTP headers that protect against common web vulnerabilities like clickjacking, MIME-sniffing, and certain types of XSS attacks.

- **Cross-Site Scripting (XSS) Prevention**: All incoming email content is sanitized on the server-side using `sanitize-html`. This strips any potentially malicious HTML tags (like `<script>`) and attributes before the content is ever sent to the frontend, preventing stored XSS attacks.

- **Information Leakage**: Login error messages are generalized to prevent attackers from determining whether a username is valid or not.

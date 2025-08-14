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
- **Stateless Backend API**: A Node.js/Express backend serves a REST API using a stateless architecture for high scalability.
- **Persistent Database**: Uses **PostgreSQL** for robust, persistent storage of contacts, settings, labels, and folders.
- **Persistent Sessions**: Database-backed sessions with encrypted credentials allow users to stay logged in across browser and server restarts.
- **Real Mail Server Integration**: Connects to any standard IMAP/SMTP server for mail operations.
- **Dark Mode**: A sleek dark theme that respects system preferences.
- **Internationalization (i18n)**: Supports multiple languages (English, Spanish, Estonian) with a flexible translation system.

## Tech Stack

- **Frontend**: React, TypeScript, Tailwind CSS, Vite, `i18next`
- **Backend**: Node.js, Express.js, `sanitize-html`, `helmet`
- **Database**: PostgreSQL (via `pg` client)
- **Mail Protocols**: `imapflow` for IMAP, `nodemailer` for SMTP
- **Real-time**: WebSockets (via `ws`)

---

## Local Development

Follow these instructions to get the project running on your local machine for development and testing.

### Prerequisites

- You need to have [Node.js](https://nodejs.org/) (version 18 or later) and `npm` installed.
- You must have **PostgreSQL** installed and running on your local machine.

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

3.  **Set up the PostgreSQL Database:**
    - Connect to your PostgreSQL instance (e.g., using `psql`).
    - Create a new database for the application.
      ```sql
      CREATE DATABASE webmail;
      ```

4.  **Configure Environment Variables:**
    - Create a file named `.env` in the root of the project directory.
    - Add the connection string for your new database to this file. Replace the username, password, and database name as needed.
    - **Crucially**, you must also add a secret encryption key. This should be a 64-character hexadecimal string. You can generate one with `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`.
      ```
      # .env
      DATABASE_URL="postgresql://YOUR_USER:YOUR_PASSWORD@localhost:5432/webmail"
      ENCRYPTION_KEY="YOUR_GENERATED_64_CHARACTER_HEX_STRING"
      ```

### Running the Application

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

---

## Deployment

This application is designed to be deployed as a single Node.js process. The frontend is built into static files, which are served by the same Express server that provides the API and WebSocket connections.

### Recommended: Deploying on Render

Render is a modern cloud platform that makes it easy to build and run applications.

1.  **Fork this repository** to your own GitHub account.

2.  **Create a new PostgreSQL Database** on Render.
    -   Go to your Render Dashboard and click "New" -> "PostgreSQL".
    -   Give it a name (e.g., `webmail-db`) and choose a region.
    -   Once created, copy the **"Internal Connection String"**. You will use this as your `DATABASE_URL`.

3.  **Create a new Web Service** on Render.
    -   Click "New" -> "Web Service".
    -   Connect the repository you forked.
    -   Configure the service settings:
        -   **Name**: `webmail-client` (or your choice)
        -   **Region**: Choose the same region as your database.
        -   **Build Command**: `npm install && npm run build`
        -   **Start Command**: `npm start`

4.  **Add Environment Variables**.
    -   Under the "Environment" tab for your new Web Service, add two "Secret Files" or "Environment Variables":
    -   `DATABASE_URL`: Paste the internal connection string from your Render PostgreSQL database.
    -   `ENCRYPTION_KEY`: This is a critical secret. Generate a new 64-character hex string by running this command in your local terminal:
        ```bash
        node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
        ```
        Paste the generated key as the value for `ENCRYPTION_KEY`.

5.  **Deploy**.
    -   Click "Create Web Service". Render will automatically build and deploy your application. Your webmail client will be live at the URL provided by Render.

### Alternative: VPS / Dedicated Server (with Nginx)

For users who prefer to manage their own infrastructure, Nginx is a highly recommended reverse proxy.

1.  **Build the Application**
    -   On your server, after pulling the latest code, run the build command:
        ```bash
        # Install dependencies
        npm install
        # Build the client and server code
        npm run build
        ```
    -   This creates an optimized version of the entire application in the `dist/` directory.

2.  **Run the Application**
    -   It's highly recommended to use a process manager like `pm2` to keep your app running.
        ```bash
        # Install pm2 globally if you haven't already
        npm install pm2 -g
        
        # Start the application using pm2
        pm2 start "npm run start" --name webmail-client
        ```

3.  **Configure Nginx**
    -   Your Node.js app will be running on a port (default 3001). Configure Nginx to act as a reverse proxy, forwarding public traffic to your app. **This is critical for WebSockets to function correctly.**
    -   Edit your site's configuration file (e.g., in `/etc/nginx/sites-available/yourdomain.com`).
        ```nginx
        server {
            listen 80;
            server_name yourdomain.com;
            # Redirect all HTTP traffic to HTTPS
            return 301 https://$host$request_uri;
        }

        server {
            listen 443 ssl http2;
            server_name yourdomain.com;
            
            # SSL Configuration (e.g., using Let's Encrypt)
            ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
            ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;

            # Serve the static frontend files
            root /path/to/your/webmail/dist;
            index index.html;

            location / {
                try_files $uri /index.html;
            }
            
            # Proxy API Traffic
            location /api/ {
                proxy_pass http://127.0.0.1:3001;
                proxy_set_header Host $host;
                proxy_set_header X-Real-IP $remote_addr;
                proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
                proxy_set_header X-Forwarded-Proto $scheme;
            }
            
            # Proxy WebSocket Traffic
            location /ws {
                proxy_pass http://127.0.0.1:3001;
                proxy_http_version 1.1;
                proxy_set_header Upgrade $http_upgrade;
                proxy_set_header Connection "upgrade";
                proxy_set_header Host $host;
            }
        }
        ```

4.  **Zero-Downtime Updates with `pm2`**
    -   After you've deployed new code files to your server and run `npm run build`, you can reload the application without any interruption:
        ```bash
        pm2 reload webmail-client
        ```

---

## Security Considerations

- **Data Isolation**: The backend is multi-tenant; all data is scoped by `userId`, preventing users from accessing each other's data.
- **Stateless Architecture**: The server is stateless. Each API request is self-contained, using a session token to retrieve encrypted credentials from the database for the duration of the request only.
- **Encrypted Credentials at Rest**: User mail server passwords are **never** stored in plaintext. They are encrypted with AES-256-GCM and stored in the session table, protected by a secret `ENCRYPTION_KEY`.
- **HTTP Security Headers**: Uses `helmet` to protect against common web vulnerabilities.
- **Cross-Site Scripting (XSS) Prevention**: Incoming email content is sanitized on the server-side using `sanitize-html` to strip potentially malicious code.
- **Rate Limiting**: The login endpoint is rate-limited to prevent brute-force attacks.
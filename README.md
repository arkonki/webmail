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
- **Mail Protocols**: `node-imap` for IMAP, `nodemailer` for SMTP

---

## Getting Started

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

5.  **Configure the Mail Server:**
    - Open the file `server/mailService.ts`.
    - Find the `TODO` comments inside the `getImapConfig` and `getSmtpConfig` functions.
    - Replace the placeholder `host` and `port` details with the actual server details for your mail provider.

### Running the Application

There are two primary ways to run this application:

#### 1. Development Mode (Hot-Reloading Enabled)

For development, you run the frontend and backend in two separate terminals.

-   **Terminal 1: Start the Backend API Server**
    ```bash
    npm run serve
    ```
    This starts the Node.js/Express server on `http://localhost:3001`, which will connect to your PostgreSQL database.

-   **Terminal 2: Start the Frontend Dev Server**
    ```bash
    npm run dev
    ```
    This starts the Vite development server, usually on `http://localhost:5173`. It is configured to proxy all `/api` requests to your backend server.

-   **Access the App:** Open your browser to the address provided by Vite (e.g., `http://localhost:5173`).

#### 2. Production Mode (Locally)

This method mimics how your application would run on a production server.

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
    
2.  **Configure Environment**: Ensure the `DATABASE_URL` and `ENCRYPTION_KEY` environment variables are set on your server, pointing to your production PostgreSQL database and your secret key.

3.  **Build and Start the Server**: Use the `start` script. For production, it's highly recommended to use a process manager like `pm2` and a UNIX socket (see below).
    ```bash
    npm start
    ```

4.  **Access Your Application**: Your webmail client will now be running. It is recommended to put it behind a reverse proxy like Apache or Nginx.

### Production Considerations

- **Process Management & Reverse Proxy (Recommended)**: For a robust, secure, and performant production deployment, you should run the application with a process manager like `pm2` and use a reverse proxy (Apache, Nginx) to handle incoming traffic and SSL. The server is configured to listen on a more secure **UNIX socket** when the `SOCKET_PATH` environment variable is provided.
    
    1.  **Start the App with `pm2` using a Socket**:
        ```bash
        # Install pm2 globally if you haven't already
        npm install pm2 -g
        
        # Start the app, pointing to a socket file.
        # Ensure the directory exists and your user has permissions to write to it.
        # The DATABASE_URL and ENCRYPTION_KEY must also be available in the environment.
        SOCKET_PATH="/var/run/webmail.socket" pm2 start "npm run start" --name webmail-client
        ```
    
    2.  **Configure File Permissions**: The application's user needs to share a group with the web server so it can access the socket. For Debian/Ubuntu systems with Apache/Nginx, this is typically the `www-data` group.
        ```bash
        # Add your application user to the www-data group
        sudo usermod -aG www-data your_user_name
        
        # You may need to log out and log back in for the group change to take effect.
        ```
        The Node.js application will automatically set the correct `660` permissions on the socket file, allowing the user and group members to read/write.
    
    3.  **Configure Your Reverse Proxy**:
        
        **Apache2 Example (`<VirtualHost>` block):**
        This configuration serves the frontend and forwards all API and WebSocket traffic to the Node.js app via the socket. It requires `mod_proxy`, `mod_proxy_http`, `mod_proxy_wstunnel`, and `mod_rewrite`.
        ```apache
        # Enable required modules:
        # sudo a2enmod proxy proxy_http proxy_wstunnel rewrite
        
        <VirtualHost *:443>
            ServerName yourdomain.com
            DocumentRoot "/path/to/your/webmail/dist"

            # SSL Configuration (recommended with Let's Encrypt)...
            SSLEngine on
            SSLCertificateFile /etc/letsencrypt/live/yourdomain.com/fullchain.pem
            SSLCertificateKeyFile /etc/letsencrypt/live/yourdomain.com/privkey.pem
            
            # WebSocket Proxying for /ws
            # This rule handles the protocol upgrade for real-time communication
            RewriteEngine On
            RewriteCond %{HTTP:Upgrade} websocket [NC]
            RewriteCond %{HTTP:Connection} upgrade [NC]
            RewriteRule "^/?ws(.*)" "ws://unix:/var/run/webmail.socket/ws$1" [P,L]

            # HTTP API Proxying for /api
            ProxyPass "/api/" "http://unix:/var/run/webmail.socket/api/"
            ProxyPassReverse "/api/" "http://unix:/var/run/webmail.socket/api/"
            
            # Serve frontend files, with a fallback to index.html for client-side routing
            <Directory "/path/to/your/webmail/dist">
                AllowOverride All
                Require all granted
                FallbackResource /index.html
            </Directory>
        </VirtualHost>
        ```
        
        **Nginx Example (`server` block):**
        ```nginx
        server {
            listen 443 ssl http2; # Use http2 for better performance
            server_name yourdomain.com;
            
            # SSL Configuration...
            ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
            ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;

            root /path/to/your/webmail/dist;
            index index.html;

            # Serve static files and fallback to index.html for React Router
            location / {
                try_files $uri /index.html;
            }
            
            # API Traffic
            location /api/ {
                proxy_pass http://unix:/var/run/webmail.socket;
                proxy_set_header Host $host;
                proxy_set_header X-Real-IP $remote_addr;
                proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
                proxy_set_header X-Forwarded-Proto $scheme;
            }

            # WebSocket Traffic
            location /ws {
                proxy_pass http://unix:/var/run/webmail.socket;
                proxy_http_version 1.1;
                proxy_set_header Upgrade $http_upgrade;
                proxy_set_header Connection "upgrade";
                proxy_set_header Host $host;
                proxy_read_timeout 86400s; # Keep connection open
            }
        }
        ```

- **Zero-Downtime Updates**: With `pm2`, you can update the application without any interruption. After you've deployed the new code files to your server, simply run:
    ```bash
    # After updating files, reload the app for zero downtime
    pm2 reload webmail-client
    ```

- **Automated Deployments (CI/CD)**: For a professional workflow that avoids manual updates, it is highly recommended to set up a CI/CD (Continuous Integration/Continuous Deployment) pipeline using services like **GitHub Actions**. This automates the entire process:
  1.  **Push Code**: You push your changes to your Git repository.
  2.  **Build & Test**: The pipeline automatically installs dependencies, runs tests, and builds the production version of your app.
  3.  **Deploy**: The new files are securely copied to your server, and the `pm2 reload` command is executed to update the live application with zero downtime.
  This approach significantly improves reliability and efficiency.

- **HTTPS**: You **must** run this application over HTTPS in production to protect data in transit. The reverse proxy examples above show where to add SSL configuration, which can be obtained for free from Let's Encrypt.

---

## Security Considerations

Security is a critical aspect of this application, especially since it handles user credentials. The following measures have been implemented:

- **Data Isolation**: The backend architecture is fully multi-tenant. All data (contacts, labels, settings, etc.) is scoped by a `userId`. The API enforces that a logged-in user can **only** access or modify their own data. This is a critical protection against Insecure Direct Object Reference (IDOR) vulnerabilities.

- **Stateless Architecture**: The server does not maintain persistent connections or state for users between requests. Each API request is self-contained, using a session token to retrieve encrypted credentials from the database, perform the mail server operation, and then immediately discard the credentials and connection. This model is highly scalable and robust against server restarts.

- **Encrypted Credentials at Rest**: User mail server passwords are **never** stored in plaintext. Upon login, the password is encrypted with AES-256-GCM and stored in the session table in the database. It is decrypted only in memory for the brief duration of an API call that requires it. This is protected by a secret `ENCRYPTION_KEY` that must be set in your server environment.

- **HTTP Security Headers**: The `helmet` library is used to set various HTTP headers that protect against common web vulnerabilities like clickjacking, MIME-sniffing, and certain types of XSS attacks.

- **Cross-Site Scripting (XSS) Prevention**: All incoming email content is sanitized on the server-side using `sanitize-html`. This strips any potentially malicious HTML tags (like `<script>`) and attributes before the content is ever sent to the frontend, preventing stored XSS attacks.

- **Information Leakage**: Login error messages are generalized to prevent attackers from determining whether a username is valid or not.

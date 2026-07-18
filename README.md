# CodeSync Chrome Extension (v0.6.0)

This is the Chrome Extension Foundation for CodeSync, establishing Manifest V3 architecture and communication with the backend API.

---

## Folder Structure

```
extension/
├── manifest.json       # Manifest V3 Configuration
├── background/
│   └── background.js   # Extension Service Worker
├── scripts/
│   ├── api.js          # Shared Client API Wrapper
│   ├── storage.js      # Shared Client Storage Wrapper
│   └── state.js        # State Manager Abstraction
├── popup/
│   ├── popup.html      # Popup layout
│   ├── popup.css       # Premium dark styles
│   └── popup.js        # Popup controllers & bindings
└── options/
    ├── options.html    # Advanced settings layout
    ├── options.css     # Settings page styles
    └── options.js      # Settings controllers & bindings
```

---

## Installation & Setup Instructions

To load the extension in Google Chrome locally:

1. Open Google Chrome and navigate to the extensions management page by entering `chrome://extensions/` in the address bar.
2. In the top-right corner of the Extensions page, toggle the **Developer mode** switch to **ON**.
3. In the top-left corner, click the **Load unpacked** button.
4. Select the `extension/` folder located inside your CodeSync project directory (`d:\CodeSync\CodeSync\extension`).
5. The extension will install instantly and show up as **CodeSync** under your active extensions list. Pin it to your toolbar for easy access.

---

## Local Development Instructions

### 1. Launch the Backend API Server
Before testing, make sure your CodeSync backend server is running and connected to Neon/PostgreSQL:

```bash
cd backend
.venv\Scripts\activate
# Start backend server
.venv\Scripts\uvicorn app.main:app --reload
```

Verify that the backend is running at `http://127.0.0.1:8000` by opening the Swagger UI at `http://127.0.0.1:8000/docs`.

### 2. Manual JWT Authentication Setup
Since GitHub OAuth login requires a live registered application callback matching your Chrome Extension ID, you can use the **Manual JWT Input** field included for local development testing.

1. Go to `http://127.0.0.1:8000/docs` in your browser.
2. If you do not have an existing user, create one or trigger the authorization flow using the auth endpoints.
3. Obtain a valid JWT access token from the response headers/bodies.
4. Open the CodeSync Extension Popup, paste the JWT into the **Developer JWT Token** input field, and click **Save Dev Token**.
5. The popup will automatically validate the token with the backend `/auth/me` endpoint, store it, and render the authenticated profile screen.

---

## Manual Verification Checklist

Verify the following flows to confirm correctness of the extension:

1. **Popup Rendering**: Click the CodeSync icon in your toolbar. Verify the popup loads in a premium dark mode theme with clean fonts.
2. **Developer Mode UI**: Ensure the manual token text field is visible when `DEV_MODE = true` in `popup/popup.js`.
3. **Save Token & Auth Validation**: Paste your JWT access token and save. Verify the popup transitions to the authenticated view displaying your avatar, username, and email.
4. **Fetch Repositories**: Verify that the repository select dropdown fetches and displays your provisioned repositories.
5. **Selection Persistence**: Select a repository from the dropdown. Close the popup and reopen it. Verify your selection persists.
6. **Options Page Redirect**: Click the **Settings** button in the popup. Verify it redirects you to the options page in a new browser tab.
7. **Options URL Preference**: In the Options page, change the API Base URL to an invalid URL (e.g. `http://localhost:9999/api/v1`) and save. Reopen the popup and verify it fails gracefully showing a connection error. Reset it back to `http://localhost:8000/api/v1` to verify recovery.
8. **Options Repo Persistence**: Modify the target repository select dropdown in the Options page. Verify the selection updates and is reflected back in the extension popup.
9. **Logout Operation**: Click the **Logout** button. Verify the extension session is wiped clean, storage is cleared, and both popup and options pages return to the unauthenticated login state.

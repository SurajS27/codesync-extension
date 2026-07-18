(async function() {
  try {
    const text = document.body.textContent.trim();
    if (!text.startsWith("{") || !text.endsWith("}")) {
      return; // Not a JSON callback page
    }
    
    const data = JSON.parse(text);
    if (!data.access_token || !data.user) {
      return; // Not our OAuth callback JSON
    }

    // Save token and user info
    await chrome.storage.local.set({
      token: data.access_token,
      user: data.user
    });

    const avatarUrl = data.user.github_avatar_url || "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100' fill='%236366f1'><circle cx='50' cy='50' r='50'/></svg>";
    const username = data.user.github_username || "User";

    // Setup head elements
    const fontLink = document.createElement("link");
    fontLink.href = "https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&display=swap";
    fontLink.rel = "stylesheet";
    document.head.appendChild(fontLink);

    const style = document.createElement("style");
    style.textContent = `
      body {
        background-color: #0b0f19 !important;
        color: #f3f4f6 !important;
        font-family: 'Outfit', sans-serif !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        min-height: 100vh !important;
        margin: 0 !important;
        padding: 20px !important;
        box-sizing: border-box !important;
      }
      .card {
        background: rgba(22, 27, 38, 0.7) !important;
        border: 1px solid rgba(255, 255, 255, 0.08) !important;
        border-radius: 16px !important;
        padding: 40px !important;
        text-align: center !important;
        max-width: 400px !important;
        width: 100% !important;
        box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.37) !important;
        backdrop-filter: blur(8px) !important;
        display: flex !important;
        flex-direction: column !important;
        align-items: center !important;
        gap: 24px !important;
      }
      .success-indicator {
        width: 64px !important;
        height: 64px !important;
        background: rgba(16, 185, 129, 0.12) !important;
        color: #10b981 !important;
        border-radius: 50% !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        font-size: 32px !important;
        font-weight: bold !important;
        box-shadow: 0 0 16px rgba(16, 185, 129, 0.2) !important;
      }
      .avatar {
        width: 80px !important;
        height: 80px !important;
        border-radius: 50% !important;
        border: 3px solid #6366f1 !important;
        box-shadow: 0 0 20px rgba(99, 102, 241, 0.4) !important;
        object-fit: cover !important;
      }
      .username {
        font-size: 20px !important;
        font-weight: 600 !important;
        color: #f3f4f6 !important;
        margin-top: -8px !important;
      }
      h1 {
        font-size: 24px !important;
        font-weight: 700 !important;
        margin: 0 !important;
        color: #f3f4f6 !important;
      }
      p {
        font-size: 14px !important;
        color: #9ca3af !important;
        line-height: 1.5 !important;
        margin: 0 !important;
      }
      .btn {
        background-color: #6366f1 !important;
        color: #ffffff !important;
        border: none !important;
        border-radius: 8px !important;
        padding: 12px 24px !important;
        font-size: 15px !important;
        font-weight: 600 !important;
        cursor: pointer !important;
        transition: all 0.2s ease !important;
        box-shadow: 0 4px 12px rgba(99, 102, 241, 0.3) !important;
        text-decoration: none !important;
        width: 100% !important;
      }
      .btn:hover {
        background-color: #4f46e5 !important;
        transform: translateY(-1px) !important;
        box-shadow: 0 6px 16px rgba(99, 102, 241, 0.4) !important;
      }
    `;
    document.head.appendChild(style);

    document.body.innerHTML = `
      <div class="card">
        <div class="success-indicator">✓</div>
        <h1>Login Successful</h1>
        <img class="avatar" src="${avatarUrl}" alt="Avatar">
        <div class="username">@${username}</div>
        <p>GitHub account connected. You may now close this tab and return to CodeSync.</p>
        <button id="return-btn" class="btn">Return to Extension</button>
      </div>
    `;

    document.getElementById("return-btn").addEventListener("click", () => {
      chrome.runtime.sendMessage({ type: "FOCUS_POPUP" });
    });

  } catch (err) {
    console.error("Failed to intercept and parse OAuth response:", err);
  }
})();

# CodeSync 🚀

CodeSync is a lightweight Chrome Extension that automatically syncs your accepted coding submissions (like LeetCode) directly to your GitHub repository in real time. Build your programming portfolio effortlessly as you solve coding challenges!

---

## ✨ Features

* **Instant Auto-Sync**: Pushes your accepted code to GitHub seconds after you hit submit.
* **LeetCode Question Prepending**: Automatically organizes folders with question numbers (e.g., `175-combine-two-tables/`) for clean, chronological sorting.
* **Performance Metrics**: Captures and documents your solution's runtime and memory usage in the commit and problem description.
* **Offline Queue Support**: Working offline or have a spotty connection? CodeSync queues your submissions and syncs them automatically when you're back online.
* **Premium Dark Mode UI**: A gorgeous, modern user interface to manage your settings, select repositories, and monitor sync status.

---

## 📦 Installation & Setup

Since the extension is in beta/development, you can install it using Chrome's Developer Mode:

1. **Download the Extension**: Clone or download this repository, and make sure you have the `extension/` folder on your computer.
2. **Open Extensions Page**: Open Google Chrome and navigate to `chrome://extensions/`.
3. **Enable Developer Mode**: In the top-right corner, toggle the **Developer mode** switch to **ON**.
4. **Load Unpacked**: In the top-left corner, click the **Load unpacked** button.
5. **Select Folder**: Choose the `extension` folder you downloaded.
6. **Pin CodeSync**: Click the puzzle piece icon in your Chrome toolbar and pin **CodeSync** for quick access!

---

## 🚀 How to Use

### 1. Authenticate with GitHub
* Click on the CodeSync extension icon.
* Click **Login with GitHub** and authorize the extension.

### 2. Choose Your Repository
* Once logged in, select the repository from the dropdown menu where you want your solutions saved.
* (If you don't have a repository dedicated to coding solutions, you can create one on GitHub and it will show up in the list).

### 3. Start Coding!
* Head over to [LeetCode](https://leetcode.com/) and solve any challenge.
* Submit your solution. Once you get the green **"Accepted"** status, CodeSync automatically gets to work, creating folders, writing README files with descriptions, and committing your code to GitHub.

---

## 🛠️ Troubleshooting & FAQ

#### The extension isn't syncing my code!
* **Refresh the tab**: If you just installed or reloaded the extension, refresh any open LeetCode tabs for the script to load.
* **Check authentication**: Click the extension popup and verify you are still logged in.
* **Verify Repository**: Ensure you have selected a target repository in the extension popup.

#### Can I sync multiple languages for the same problem?
* Yes! CodeSync detects the programming language you used and saves the file with the appropriate extension (e.g. `.py`, `.cpp`, `.java`, `.sql`). If you submit the same problem in different languages, they will all be organized under the same problem folder.

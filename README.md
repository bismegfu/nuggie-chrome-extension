# Nuggie Break Reminder

A Chrome extension that sends a cute cat to remind you to take a break after an hour of browsing.

## Installation

This extension is installed locally as an unpacked extension — it is not on the Chrome Web Store.

### Prerequisites

- Google Chrome (or any Chromium-based browser)
- Node.js (only needed if you want to run tests)

### Steps

1. **Clone or download this repository**

2. **Open Chrome Extensions**

   Navigate to `chrome://extensions` in your browser, or go to **Menu → More Tools → Extensions**.

3. **Enable Developer Mode**

   Toggle the **Developer mode** switch in the top-right corner of the Extensions page.

4. **Load the extension**

   Click **Load unpacked** and select the root folder of this repository (the folder containing `manifest.json`).

5. **Done!**

   The Nuggie paw icon will appear in your Chrome toolbar. Click it to see how long until your next cat visit.

## Configuration

Click the Nuggie icon in the toolbar and then **Settings** to open the options page. From there you can:

- Set your **work interval** (default: 60 minutes)
- Set your **break duration** (default: 1 minute)
- Choose **random or sequential** photo order
- **Upload or remove** cat photos

## How it works

- Nuggie tracks your active Chrome usage time. The timer pauses automatically after 5 minutes of inactivity.
- When your work interval is up, a cat walks onto your screen from a random side.
- A full-screen overlay follows you across tabs until your break is complete.
- A **Skip** button unlocks after 15 seconds if you need to bail early (or press **Enter**).
- Once dismissed, the timer resets for another full work interval.

## Running Tests

```bash
npm install
npm test
```

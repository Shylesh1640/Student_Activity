# 🎓 Student Activity Monitoring System

A comprehensive, full-stack educational tool designed to help teachers monitor and guide student browsing activity on school-issued devices in real time.

> **Live Demo** — [student-activity-two.vercel.app](https://student-activity-two.vercel.app/login)

---

## Overview

The system consists of three parts:

| Component | Stack | Description |
|---|---|---|
| **Chrome Extension** | Manifest V3 | Installed on student browsers to track tab activity, classify URLs, detect social media usage, and provide WebRTC-based screen & camera sharing. |
| **Backend Server** | Node.js · Express · MongoDB · Socket.IO | Manages real-time WebSocket connections, relays WebRTC signaling, processes activity logs, triggers alerts, and generates PDF reports. |
| **Admin Dashboard** | React 19 · Vite · Tailwind CSS v4 | Web app for teachers to view live activity feeds, manage alerts, request live screen/camera views, and download analytics reports. |

---

## ✨ Features

- 🔄 **Real-time Activity Stream** — Live feed of URLs and window titles visited by each student.
- 🏷️ **Auto-Classification** — Automatically tags activity as Educational, Productivity, Social Media, or Other.
- 🚨 **Alert Engine** — Instantly flags customizable blocklist violations (e.g., social media access).
- 📸 **Snapshot Capture** — Throttled screen and camera snapshots (1 per 10 s) with image compression.
- 📹 **Live View** — WebRTC-powered remote view of the student's screen or webcam via offscreen document API.
- 📊 **PDF Reports** — Generate detailed, per-student historical activity reports with embedded snapshots.
- 🔔 **Real-time Alerts** — Camera permission changes and other events broadcast instantly to the admin dashboard.
- 🔒 **Authentication** — JWT-based admin login with cookie-based sessions.
- 🚫 **404 Page** — Custom "Page not found" screen for unknown routes with navigation helpers.

---

## ⚠️ Privacy & Legal Notice

> [!CAUTION]
> **THIS SOFTWARE MUST BE DEPLOYED WITH EXPLICIT CONSENT AND IN STRICT COMPLIANCE WITH LOCAL LAWS.**

This system monitors and records browsing activity, screen captures, and camera feeds. It is intended **strictly for deployment on school-owned or managed devices**.

Before deployment, ensure you comply with:

- 🇺🇸 **United States** — Family Educational Rights and Privacy Act (FERPA) & Children's Online Privacy Protection Act (COPPA).
- 🇪🇺 **European Union** — General Data Protection Regulation (GDPR).
- 🇮🇳 **India** — Digital Personal Data Protection Act (DPDP).
- **Any other relevant local or regional data protection laws.**

You **must** obtain explicit, documented consent from both the student and their parents/guardians before installing this monitoring extension.

---

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) LTS (v18+)
- [MongoDB](https://www.mongodb.com/) (local or Atlas)
- [Google Chrome](https://www.google.com/chrome/)

### 1. Backend Server

```bash
cd server
cp .env.example .env   # then edit with your values
npm install
npm run dev
```

The server starts on `http://localhost:3000` by default.

### 2. Admin Dashboard

```bash
cd dashboard
cp .env.example .env   # point VITE_SERVER_URL at your backend
npm install
npm run dev
```

The dashboard will be available at `http://localhost:5173`.

### 3. Chrome Extension

1. Open Google Chrome → `chrome://extensions/`.
2. Enable **Developer mode** (top-right toggle).
3. Click **Load unpacked** and select the `/extension` directory.
4. The extension auto-assigns a student ID and connects to the backend WebSocket server.

---

## ⚙️ Environment Variables

### Server (`/server/.env`)

| Variable | Description | Default |
|---|---|---|
| `PORT` | API & WebSocket port | `3000` |
| `MONGODB_URI` | MongoDB connection string | `mongodb://localhost:27017/student_activity` |
| `JWT_SECRET` | Secret for signing admin JWT tokens | — |
| `CORS_ORIGIN` | Dashboard URL for CORS policy | `http://localhost:5173` |
| `REPORT_OUTPUT_DIR` | Directory to save generated PDF reports | `./reports` |
| `STUN_SERVER` | WebRTC STUN server | `stun:stun.l.google.com:19302` |
| `ADMIN_EMAIL` | Initial admin login email | `admin@school.edu` |
| `ADMIN_PASSWORD` | Initial admin login password | `admin123` |

### Dashboard (`/dashboard/.env`)

| Variable | Description | Default |
|---|---|---|
| `VITE_SERVER_URL` | Public URL of the backend server | `http://localhost:3000` |

---

## 🏗️ Project Structure

```
Student_Activity/
├── extension/              # Chrome Extension (Manifest V3)
│   ├── manifest.json       # Extension manifest
│   ├── background.js       # Service worker
│   ├── content.js          # Content script
│   ├── offscreen.html/js   # Offscreen document for WebRTC media
│   ├── camera.html/js      # Camera capture page
│   ├── popup.html/js       # Extension popup UI
│   └── icons/              # Extension icons
├── server/                 # Node.js Backend
│   ├── index.js            # Express + Socket.IO entry point
│   ├── controllers/        # Route handlers
│   ├── middleware/          # Auth & other middleware
│   ├── models/             # Mongoose schemas
│   ├── routes/             # API routes
│   ├── services/           # PDF generation & other services
│   └── reports/            # Generated PDF output
└── dashboard/              # React Admin Dashboard
    ├── src/
    │   ├── pages/          # Dashboard, Students, Alerts, Reports, Settings, Login, NotFound (404)
    │   ├── components/     # Layout, Sidebar, StudentCard, AlertCard, ActivityFeed
    │   ├── hooks/          # useSocket, useWebRTC
    │   └── store/          # Zustand stores (alertStore, studentStore)
    └── vercel.json         # Vercel SPA rewrite rules
```

---

## 🏛️ Architecture Notes

- **WebRTC & Manifest V3** — Due to MV3 service worker limitations, media capture (`getDisplayMedia` / `getUserMedia`) cannot be called from `background.js`. This solution routes WebRTC streams through the [Offscreen Document API](https://developer.chrome.com/docs/extensions/reference/api/offscreen).
- **WebSocket Relay** — The Node.js server acts as an intelligent router and signaling server, relaying ICE candidates and SDP offers/answers between the React dashboard and Chrome extension.
- **Snapshot Pipeline** — Screen and camera frames are throttled (1 per 10 s), compressed via `sharp`, and stored for inclusion in PDF reports.

---

## 🌐 Deployment

| Service | Platform | Notes |
|---|---|---|
| **Dashboard** | [Vercel](https://vercel.com) | SPA routing handled via `vercel.json` rewrites. |
| **Backend** | [Render](https://render.com) | Set environment variables in Render dashboard. |

> [!IMPORTANT]
> After deploying, update `CORS_ORIGIN` on the server to match your Vercel dashboard URL,
> and update `VITE_SERVER_URL` on the dashboard to match your Render backend URL.

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).

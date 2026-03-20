# Student Activity Monitoring System

A comprehensive, full-stack educational tool designed to help teachers monitor and guide student browsing activity on school-issued devices in real time. 

The system consists of three parts:
1. **Chrome Extension (Manifest V3)**: Installed on student browsers to monitor tab activity, classify URLs, detect social media usage, and provide WebRTC-based screen and camera sharing.
2. **Node.js Backend Server**: Manages real-time WebSocket connections, relays WebRTC signaling, processes activity logs, triggers alerts, and generates PDF reports.
3. **React Admin Dashboard**: A Vite + Tailwind web app for teachers to view live activity feeds, manage alerts, request live screen/camera views, and download analytics reports.

## Features
- 🔄 **Real-time Activity Stream**: Live feed of URLs and window titles visited by students.
- 🏷️ **Auto-Classification**: Automatically tags URLs as Educational, Productivity, Social Media, or Other.
- 🚨 **Alert Engine**: Instantly flags customized blocklist violations (e.g., social media).
- 📹 **Live View**: WebRTC-powered remote view of the student's screen or webcam.
- 📊 **PDF Reports**: Generate detailed, per-student historical activity reports.

---

## ⚠️ Privacy & Legal Notice

**THIS SOFTWARE MUST BE DEPLOYED WITH EXPLICIT CONSENT AND IN STRICT COMPLIANCE WITH LOCAL LAWS.**

This system monitors and records browsing activity, screen captures, and camera feeds. It is intended **strictly for deployment on school-owned or managed devices**. 

Before deployment, ensure you comply with:
- **United States**: Family Educational Rights and Privacy Act (FERPA) and Children's Online Privacy Protection Act (COPPA).
- **European Union**: General Data Protection Regulation (GDPR).
- **India**: Digital Personal Data Protection Act (DPDP).
- **Any other relevant local or regional data protection laws.**

You **MUST** obtain explicit, documented consent from both the student and their parents/guardians before installing this monitoring extension.

---

## Installation & Setup

### Requirements
- Node.js LTS (v18+)
- MongoDB (Local or Atlas)
- Google Chrome

### 1. Backend Server
```bash
cd server
npm install
npm run dev
```
*Note: The server requires environment variables defined in `.env`. See `.env.example` for required keys (e.g., MongoDB URI, JWT Secret).*

### 2. Admin Dashboard
```bash
cd dashboard
npm install
npm run dev
```
*The dashboard will be available at `http://localhost:5173`. Default admin login is `admin@school.edu / admin123` (configurable in `.env`).*

### 3. Chrome Extension
1. Open Google Chrome and navigate to `chrome://extensions/`
2. Enable **Developer mode** in the top right corner.
3. Click **Load unpacked** and select the `/extension` directory from this repository.
4. The extension will automatically initialize, assign a student ID, and connect to the backend WebSocket server.

---

## Environment Variables

### Server (`/server/.env`)
- `PORT` - API & WebSocket port (default: 3000)
- `MONGODB_URI` - MongoDB connection string
- `JWT_SECRET` - Secret for signing admin authentication tokens
- `CORS_ORIGIN` - Dashboard URL for CORS policy
- `REPORT_OUTPUT_DIR` - Directory to save generated PDFs
- `STUN_SERVER` - WebRTC STUN server string
- `ADMIN_EMAIL` - Initial admin dashboard login email
- `ADMIN_PASSWORD` - Initial admin dashboard password

## Architecture Notes
- **WebRTC & Manifest V3**: Due to Manifest V3 service worker limitations, media capture (`getDisplayMedia` / `getUserMedia`) cannot be called directly from `background.js`. This solution securely routes WebRTC streams through an **offscreen document** API.
- **WebSocket Relay**: The Node.js server acts as an intelligent router and signaling server, natively relaying ICE candidates and SDP offers/answers between the React dashboard and the Chrome extension.

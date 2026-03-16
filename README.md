# Yoma Chat MVP

A WebRTC-based random video chat application that connects strangers through peer-to-peer video and text chat with smart interest-based matching.

---

## Table of Contents

- [Overview](#overview)
- [MVP Features](#mvp-features)
- [UI/UX Functionalities](#uiux-functionalities)
- [Technology Stack](#technology-stack)
- [Getting Started](#getting-started)
- [API Reference](#api-reference)
- [Project Structure](#project-structure)

---

## Overview

Yoma Chat MVP is a proof-of-concept (POC) for a real-time random video chat platform. Users register with a profile (username, gender, country, and interests), then are matched with other online users for live video and text conversations. The matching algorithm prioritises shared interests before falling back to random pairing after a short wait.

---

## MVP Features

### Authentication & User Management

| Feature | Details |
|---|---|
| **Register** | Username (3–30 chars), password (6+ chars), display name, gender, country, up to 10 interests |
| **Login** | Session-based authentication with MongoDB persistence |
| **View / Edit Profile** | Update display name, gender, country, and interest tags at any time |
| **Logout** | Destroys the server session and cleans up all socket state |
| **Offline Mode** | If MongoDB is unavailable the app falls back to an in-memory mock store so all features still work |

### Smart Matching

| Feature | Details |
|---|---|
| **Interest-based matching** | Primary algorithm — pairs the user with the partner who shares the most interests |
| **Random fallback** | After 5 seconds in the queue, any available (non-blocked) user is accepted |
| **Block list** | Blocking a user prevents all future re-matches within the current session |

### Video Chat (WebRTC)

| Feature | Details |
|---|---|
| **Peer-to-peer video/audio** | Direct `RTCPeerConnection` between browsers — no media server relay |
| **ICE/TURN negotiation** | Google STUN servers + Metered TURN relay servers for NAT traversal |
| **Mic toggle** | Mute/unmute microphone with a visible indicator |
| **Camera toggle** | Enable/disable local camera feed |
| **Draggable Picture-in-Picture** | Local video overlay is draggable and snaps to any corner of the screen |

### Text Chat

| Feature | Details |
|---|---|
| **Real-time messaging** | Socket.IO-based instant delivery (messages capped at 500 characters) |
| **Typing indicator** | Animated "Stranger is typing…" dots shown to the other participant |
| **Session history** | In-session message log displayed in a collapsible sidebar |
| **System messages** | Connection events, matched interests, and disconnection notices appear inline |

### Safety & Moderation

| Feature | Details |
|---|---|
| **Report** | 7 selectable categories: Inappropriate behaviour, Nudity/Sexual content, Harassment/Bullying, Hate speech, Spam/Advertising, Appears underage, Other |
| **Auto-block on report** | Reporting a user also blocks them from future matches in the same session |
| **Report logging** | Reports are written to `reports.json` on the server for moderator review |

---

## UI/UX Functionalities

### Themes & Visuals

- **Dark / Light mode** — toggleable at any time; preference is persisted in `localStorage`
- **Aurora background animations** — animated gradient blob effects during the matching/search state
- **Ripple effects** — Material Design-style click feedback on interactive elements
- **Toast notifications** — brief, non-intrusive popups for confirmations and errors

### Layout & Responsiveness

- **Responsive design** — optimised for desktop, tablet, and mobile viewports
- **Collapsible chat sidebar** — on small screens, the text-chat panel can be shown or hidden to maximise the video area
- **Connection status badge** — always-visible indicator showing _Searching_, _Connected_, or _Disconnected_
- **Status overlay** — full-screen visual feedback for the _Searching_, _Connecting_, _Connected_, and _Error_ states

### Real-time Feedback

- **Online counter** — live count of users currently connected, broadcast by the server to all clients
- **Peer profile badge** — when paired, a floating card shows the stranger's display name, country flag, gender, and shared interests highlighted
- **Sound effects** — procedural audio synthesis (Web Audio API) for:
  - Match notification (ascending musical chord)
  - New incoming message (notification beep)
  - Peer disconnection (descending tone)

### Keyboard Shortcuts

| Key | Action |
|---|---|
| `Esc` | Skip current partner and find the next match |
| `M` | Toggle microphone mute |
| `Enter` | Send the typed chat message |

### Interest Selection

40+ predefined interest tags with emoji icons, including: Gaming, Music, Movies, Reading, Travel, Cooking, Photography, Art, Sports, Fitness, Yoga, Dancing, Coding, Design, Writing, Fashion, Nature, Pets, Cars, Science, History, Languages, Anime, Comics, Podcasts, Investing, Crypto, Startups, Meditation, Volunteering, Theater, Hiking, Cycling, Swimming, Chess, Board Games, DIY, Gardening, Astrology, Streaming.

### Country Selection

~195 countries with ISO codes and flag emojis, provided via `public/countries.js`.

---

## Technology Stack

**Backend**

| Component | Library / Version |
|---|---|
| Server framework | Express 4.18.2 |
| Real-time transport | Socket.IO 4.7.2 |
| Database ORM | Mongoose 9.3.0 |
| Password hashing | bcryptjs 3.0.3 |
| Session management | express-session 1.19.0 + connect-mongo 6.0.0 |

**Frontend**

- Vanilla JavaScript (no framework)
- WebRTC (`RTCPeerConnection`, `getUserMedia`)
- Custom CSS with CSS variables for theming

**Deployment**

- Vercel (configured via `vercel.json`)
- MongoDB Atlas (or any MongoDB instance via `MONGO_URI`)

---

## Getting Started

### Prerequisites

- Node.js v14+
- npm
- MongoDB (local or Atlas; optional — offline mode activates automatically)

### Installation

```bash
npm install
```

### Environment Variables

Create a `.env` file in the project root:

```env
MONGO_URI=mongodb://localhost:27017/yomachat
SESSION_SECRET=your-secret-key
PORT=3000
```

`MONGO_URI` and `SESSION_SECRET` are optional; the app runs fully in offline/mock mode without them.

### Running

```bash
npm start
# Server starts on http://localhost:3000
```

### Deployment (Vercel)

```bash
vercel deploy
```

---

## API Reference

### REST Endpoints

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/register` | Create a new account |
| `POST` | `/api/login` | Log in and start a session |
| `GET` | `/api/me` | Return the current authenticated user |
| `PUT` | `/api/profile` | Update display name, gender, country, or interests |
| `POST` | `/api/logout` | Destroy the current session |

### Socket.IO Events

**Client → Server**

| Event | Payload | Description |
|---|---|---|
| `auth-profile` | `{ displayName, gender, country, interests }` | Authenticate and enter the matching queue |
| `signal` | WebRTC offer/answer/ICE candidate | Forward signalling data to the paired peer |
| `next` | — | Skip the current partner |
| `typing` | `boolean` | Notify the partner of typing state |
| `chat-message` | `string` | Send a text message (max 500 chars) |
| `report` | `{ reason, details }` | Report the current partner |
| `block` | — | Block the current partner and skip |

**Server → Client**

| Event | Payload | Description |
|---|---|---|
| `waiting` | — | User has been placed in the matching queue |
| `online-count` | `number` | Current number of connected users |
| `paired` | `{ isInitiator, peerId, peerProfile, commonInterests }` | Successful match found |
| `signal` | WebRTC data | Forward signalling from the other peer |
| `peer-disconnected` | `{ reason }` | Partner left or was skipped |
| `chat-message` | `{ text, senderId, timestamp }` | Incoming text message |
| `typing` | `boolean` | Partner's typing state |
| `report-confirmed` | — | Report has been logged |

---

## Project Structure

```
yoma-chat-mvp/
├── server.js          # Express server, REST endpoints, Socket.IO handlers, matching logic
├── db.js              # MongoDB connection with offline fallback
├── vercel.json        # Vercel deployment configuration
├── package.json
├── models/
│   └── User.js        # Mongoose User schema with bcrypt password hashing
└── public/            # Frontend static assets (served by Express)
    ├── index.html     # HTML structure for all screens and modals
    ├── app.js         # Client-side application logic (auth, WebRTC, chat, UI)
    ├── style.css      # Full stylesheet including themes and animations
    └── countries.js   # Country list with ISO codes and flag emojis
```

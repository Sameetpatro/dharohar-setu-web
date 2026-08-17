# 🏛️ Dharohar Setu (धरोहर सेतु)

<div align="center">
  <img src="public/assets/dharohar-logo.png" alt="Dharohar Setu Logo" width="160" />
  <br />
  <strong>Discover India's Heritage. Experience it Differently.</strong>
  <p>An intelligent heritage discovery platform featuring interactive QR monument check-ins, AI-powered contextual audio guides, and an enterprise-grade Curator Admin Portal.</p>
</div>

---

## 📋 Table of Contents

- [Overview](#-overview)
- [Key Features](#-key-features)
  - [Public Visitor Experience](#1-public-visitor-experience)
  - [Curator & Site Admin Portal](#2-curator--site-admin-portal)
- [Technology Stack](#-technology-stack)
- [Project Architecture](#-project-architecture)
- [Getting Started](#-getting-started)
  - [Prerequisites](#prerequisites)
  - [Environment Configuration](#environment-configuration)
  - [Installation & Admin Seeding](#installation--admin-seeding)
  - [Running the Dev Server](#running-the-dev-server)
- [Default Admin Credentials](#-default-admin-credentials)
- [API Reference](#-api-reference)
- [Testing & Verification](#-testing--verification)

---

## 🌟 Overview

**Dharohar Setu** bridges historical antiquity and modern spatial technology. The platform provides:
1. **A public marketing and discovery portal** highlighting India's iconic monuments, dynamic tour tracking, and audio guide previews.
2. **An enterprise Admin Portal (`/admin`)** powered by Express and MongoDB Atlas, allowing archaeological curators and site leads to map monuments, create sequential tour nodes, generate physical printable QR markers, and configure commercial restaurant/hotel tie-up weightages.

---

## ✨ Key Features

### 1. Public Visitor Experience
- **Interactive Monument Showcase**: Proximity-based monument discovery with high-res galleries, timelines, and architectural trivia.
- **Physical QR Navigation**: Instant camera scan flow to check in at monument King entry gates and waypoint nodes.
- **Audio & Visual Storytelling**: AI-generated multilingual narrative guides (English & Hindi active).
- **Nearby Recommendations**: Contextual dining, cafes, and lodging suggestions for visiting tourists.

### 2. Curator & Site Admin Portal
Strictly protected under `/admin-login` and `/admin` with role-based JWT authentication:

- **🔒 Enterprise Security & Auth**:
  - Secure bcrypt password hashing and token-based admin session verification.
  - 15-minute single-use password reset workflow via secure token dispatch.
  - No public signup: only pre-authorized admin accounts can access the portal.

- **🏛️ Monument & Interactive Node Builder**:
  - **Auto-Incremented Site IDs**: Consecutively assigned (`SITE-001`, `SITE-002`, `SITE-003`...).
  - **Dynamic King QR Generator**: Automatically creates unique scan codes from site name initials (e.g. `Abc Def Ghi` $\rightarrow$ `ADG-0`).
  - **Multi-Image URL Manager**: Dynamic "+ Add More" image gallery manager with live preview thumbnails.
  - **Rich Storytelling Metadata**: Detailed Overview, Cultural History Timeline, and Fun Facts & Architectural Secrets.

- **📍 Tour Node Configuration**:
  - **Strict King Node Rule**: Node #1 is designated as the primary King Entry Node (`ADG-0`), with subsequent nodes mapped to tour stops (`ADG-1`, `ADG-2`...).
  - **Node AI Guide Persona Prompt**: Custom instruction prompts for the AI audio guide when speaking at each specific waypoint.
  - **Dynamic "Add More" Amenities**: Add node amenities with one-click presets (`💧 Drinking Water`, `🚻 Restrooms`, `♿ Wheelchair Ramp`, `🎫 Ticket Counter`, `👟 Shoe Stand`, `🚑 First Aid Post`, etc.).
  - **Node Video Links**: Custom YouTube or documentary video embeds for individual checkpoints.

- **🍽️ Partner Recommendations & Flash Weightage**:
  - Add nearby restaurants, cafes, hotels, and craft stores with GPS coordinates (`Latitude`, `Longitude`).
  - **Tie-up / Promotion Weightage (0–100%)**: Set custom weightage for partner establishments to flash and prioritize them at the top of visitor feeds.

- **📱 Physical QR Signage Badge Generator**:
  - Built-in vector QR canvas renderer for all King entry markers and tour nodes.
  - **1-Click High-Res PNG Download**: Generates an 800×1000 branded, printable signage card with the Monument Name, Node Title, Type Badge, and QR code ready for laminate installation.

- **📊 Analytics & Administration**:
  - **Operations Dashboard**: Real-time telemetry, active guided trips, rating breakdown, and visitor circulation charts.
  - **Trips Registry**: Complete logs of completed tours, checkpoints visited, and tour durations.
  - **Reviews & Feedback Analytics**: 3-question survey ratings and aggregate visitor sentiment.
  - **System Settings & Diagnostics**: Database latency metrics, uptime telemetry, and admin account management.

---

## 🛠️ Technology Stack

| Layer | Technologies |
|---|---|
| **Frontend** | React 18, Vite 7, Vanilla CSS Design System, Canvas QR Renderer (`qrcode`), Lucide Icons |
| **Backend API** | Node.js, Express 4, Mongoose 8 |
| **Database** | MongoDB Atlas (Cluster with automated TTL indexing) |
| **Authentication** | JSON Web Tokens (JWT), bcryptjs password hashing |
| **Dev Environment** | Vite Dev Server with integrated Express middleware plugin |
| **External Integration** | Remote FastAPI Backend (`https://humsafar-backend-5u74.onrender.com`) |

---

## 📁 Project Architecture

```
dharohar-setu/
├── index.html                   # HTML entry point with Dharohar Setu favicon
├── package.json                 # Project dependencies and lifecycle scripts
├── vite.config.js               # Vite 7 config with embedded Express API middleware
├── public/
│   ├── favicon.png              # Official Dharohar Setu browser favicon
│   └── assets/                  # High-res logos and UI assets
├── server/
│   ├── config.js                # Environment configuration loader
│   ├── index.js                 # Express server bootstrap & route mounting
│   ├── db/
│   │   └── mongodb.js           # MongoDB Atlas Mongoose connection manager
│   ├── middleware/
│   │   └── auth.js              # JWT verification & ADMIN role guard
│   ├── models/                  # Mongoose Schema Models
│   │   ├── User.js              # Admin & User accounts with role validation
│   │   ├── PasswordReset.js     # 15-minute TTL single-use reset tokens
│   │   ├── Site.js              # Monument model with images, story & King QR
│   │   ├── Node.js              # Node waypoints with prompt, amenities & video
│   │   ├── Recommendation.js    # Nearby places with promotion weightage %
│   │   ├── Trip.js              # Tour tracking sessions
│   │   ├── Review.js            # 3-Question tourist review surveys
│   │   └── AiPrompt.js          # AI system prompts
│   ├── routes/                  # Express API Endpoints
│   │   ├── auth.js              # Login, me, password reset dispatch & verification
│   │   ├── sites.js             # Sites, nodes, QR preview & recommendations CRUD
│   │   ├── trips.js             # Trip session management
│   │   ├── reviews.js           # Visitor feedback ratings
│   │   ├── dashboard.js         # Operations telemetry & charts
│   │   ├── users.js             # User registry management
│   │   └── settings.js          # System diagnostics & admin directory
│   └── scripts/
│       ├── seed-admin.js        # MongoDB admin account provisioning utility
│       └── test-api.js          # Automated 26-test API validation suite
└── src/
    ├── main.jsx                 # React root bootstrap
    ├── App.jsx                  # Single Page Application router
    ├── context/
    │   ├── AuthContext.jsx      # Safe JSON auth state & token persistence
    │   └── ToastContext.jsx     # Floating notifications context
    ├── components/              # UI Components
    │   ├── Navbar.jsx           # Public consumer navigation
    │   ├── Footer.jsx           # Public footer
    │   └── admin/               # Admin Portal Components
    │       ├── AdminLayout.jsx  # Admin sidebar & header layout
    │       ├── AdminRoute.jsx   # Client-side protected route guard
    │       ├── Modal.jsx        # Reusable modal container
    │       ├── Pagination.jsx   # Table pagination
    │       ├── QrCodeCard.jsx   # Vector QR code & PNG badge downloader
    │       └── StatCard.jsx     # Dashboard metric card
    ├── pages/
    │   ├── Home.jsx             # Public landing page
    │   ├── AdminLogin.jsx       # Admin portal sign-in
    │   ├── AdminForgotPassword.jsx # Password reset link request
    │   ├── AdminResetPassword.jsx  # New password setup with token verification
    │   └── admin/               # Protected Admin Views
    │       ├── DashboardView.jsx# Telemetry, circulation charts & stats
    │       ├── SitesView.jsx    # 3-step Site builder, QR gallery & Inspector
    │       ├── TripsView.jsx    # Guided journeys & checkpoint registry
    │       ├── UsersView.jsx    # User directory & demographic metrics
    │       ├── ReviewsView.jsx  # Feedback analytics & question breakdown
    │       └── SettingsView.jsx # Admin accounts & system diagnostics
    └── styles/
        ├── global.css           # Public design system & responsive styling
        └── admin.css            # Admin portal theme, toolbars & badges
```

---

## 🚀 Getting Started

### Prerequisites
- **Node.js**: v18.0.0 or later
- **npm**: v9.0.0 or later

### Environment Configuration
Create a `.env` file in the root directory based on `.env.example`:

```env
PORT=5173
NODE_ENV=development
JWT_SECRET=your_super_secret_jwt_key_here_change_in_production
MONGODB_URI=mongodb+srv://<db_user>:<db_password>@<cluster>.mongodb.net/<database_name>?retryWrites=true&w=majority
REMOTE_BACKEND_URL=https://your-remote-heritage-backend.onrender.com
```

### Installation & Admin Seeding

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Seed baseline admin accounts in MongoDB**:
   ```bash
   node server/scripts/seed-admin.js --batch
   ```

### Running the Dev Server

Start the integrated Vite development server (handling both React HMR and Express API routes concurrently):

```bash
npm run dev
```

- **Public Site**: [http://localhost:5173](http://localhost:5173)
- **Admin Portal Sign In**: [http://localhost:5173/admin-login](http://localhost:5173/admin-login)
- **Admin Dashboard**: [http://localhost:5173/admin](http://localhost:5173/admin)

---

## 📡 API Reference

### Authentication (`/api/auth`)
- `POST /api/auth/login` — Authenticate admin credentials and issue JWT.
- `GET /api/auth/me` — Verify authenticated admin session.
- `POST /api/auth/forgot-password` — Generate single-use password reset token.
- `POST /api/auth/reset-password` — Reset password using verified token.

### Heritage Sites & Nodes (`/api/admin/sites`, `/sites`)
- `GET /sites/nearby?lat=&lng=&max_range_km=` — Proximity search for heritage monuments.
- `GET /sites/scan/:qr_value` — Validate physical QR markers (King entry or node stops).
- `GET /sites/:site_id` — Fetch complete monument details, tour nodes, and recommendations.
- `GET /sites/:site_id/nodes` — Fetch sequential node list.
- `GET /sites/:site_id/recommendations` — Fetch sorted partner recommendations.
- `GET /api/admin/sites/preview-qr?name=` — Live preview of initials-based QR marker.
- `GET /api/admin/sites` — Admin sites registry with node counts and search filter.
- `POST /api/admin/sites` — Create site with nodes (enforces $\ge 1$ Node & strictly 1 King node).
- `PUT /api/admin/sites/:id` — Update monument metadata, images, and recommendations.
- `DELETE /api/admin/sites/:id` — Cascade delete monument, nodes, and recommendations.
- `POST /api/admin/sites/:site_id/nodes` — Add standalone node to an existing monument.
- `PUT /api/admin/sites/:site_id/nodes/:node_id` — Update standalone node.
- `DELETE /api/admin/sites/:site_id/nodes/:node_id` — Remove standalone node.

### Tours & Feedback (`/trips`, `/reviews`)
- `POST /trips/start` — Begin guided monument tour.
- `POST /trips/end` — Conclude tour and log duration.
- `POST /reviews/submit` — Submit 3-question visitor survey.
- `GET /reviews/sites/:site_id/summary` — Aggregate review metrics and survey breakdown.

---

## 🧪 Testing & Verification

Run the full automated test suite (verifying all 26 backend routes and MongoDB integration):

```bash
node server/scripts/test-api.js
```

Build production distribution bundle:

```bash
npm run build
```

---

<div align="center">
  <sub>Built with ❤️ for Indian Cultural Heritage Preservation • Dharohar Setu © 2026</sub>
</div>

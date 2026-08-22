# 🏛️ Dharohar Setu (धरोहर सेतु)

<div align="center">
  <img src="public/favicon.png" alt="Dharohar Setu Logo" width="100" style="border-radius: 16px;" />
  <br />
  <h3><strong>Discover India's Heritage. Experience it Differently.</strong></h3>
  <p>An intelligent, spatial heritage discovery platform featuring interactive QR monument check-ins, AI-driven contextual audio storytelling, and digital cultural preservation.</p>

  [![Vite](https://img.shields.io/badge/Vite-7.x-646CFF?logo=vite&logoColor=white)](https://vitejs.dev/)
  [![React](https://img.shields.io/badge/React-19.x-61DAFB?logo=react&logoColor=black)](https://react.dev/)
  [![Node.js](https://img.shields.io/badge/Node.js-18+-339933?logo=nodedotjs&logoColor=white)](https://nodejs.org/)
  [![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1?logo=postgresql&logoColor=white)](https://www.postgresql.org/)
  [![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
</div>

---

## 🌟 Overview

**Dharohar Setu** bridges historical antiquity and modern spatial technology. The platform enables tourists, students, and culture enthusiasts to explore India's historical monuments through immersive digital waypoints, curated storytelling, and interactive spatial checkpoints.

Whether exploring on-site with physical QR markers or discovering heritage sites virtually, Dharohar Setu provides rich historical narratives, architectural secrets, and contextual travel recommendations.

---

## ✨ Key Features

### 🏛️ Interactive Monument Discovery
- **Rich Heritage Catalog**: Explore curated information, historical timelines, and architectural trivia for mapped monuments across India.
- **Geographic Exploration**: Discover heritage destinations, coordinates, and nearby cultural sites.

### 📍 QR Spatial Waypoints
- **Waypoint Navigation**: Scan physical QR markers placed at monument entry gates and key checkpoints.
- **Node-by-Node Progression**: Follow structured visitor circuits designed to showcase historical progression and architectural highlights.

### 🎧 Multilingual Audio Storytelling
- **Contextual Audio Guides**: Listen to narration tailored to each specific viewpoint and monument feature.
- **Bilingual Experience**: Available in English and Hindi to make cultural heritage accessible to everyone.

### 🗺️ Visitor Companion & Recommendations
- **Nearby Exploration**: Contextual recommendations for local cuisine, traditional crafts, cafes, and amenities near each heritage site.
- **Visitor Feedback & Ratings**: Submit ratings and reviews to help continuously improve visitor amenities and preservation efforts.

---

## 🛠️ Technology Stack

| Layer | Technologies |
|---|---|
| **Frontend** | React 19, Vite 7, Vanilla CSS Design System |
| **Backend API** | Node.js, Express 5 |
| **Database & ORM** | PostgreSQL, Prisma ORM |
| **Tooling & Build** | Rollup (Optimized Vendor Chunk Splitting), Dotenv |

---

## 📁 Project Structure

```
dharohar-setu/
├── public/                      # Static assets, icons, and branding
├── prisma/
│   └── schema.prisma            # Database schema definitions
├── server/
│   ├── index.js                 # Express API server entry point
│   ├── config.js                # Environment configuration loader
│   ├── routes/                  # Application API endpoints
│   ├── middleware/              # Authentication and error handling
│   └── db/                      # Database client instances
├── src/
│   ├── components/              # UI components (Hero, Features, Sites, Navbar, Footer)
│   ├── pages/                   # Application views
│   ├── context/                 # Application state providers
│   ├── styles/                  # Global CSS design system
│   ├── App.jsx                  # Main React application router
│   └── main.jsx                 # Client entry point
├── package.json                 # Project dependencies and scripts
└── vite.config.js               # Vite configuration and build optimizations
```

---

## 🚀 Getting Started

### Prerequisites
- **Node.js**: v18.0.0 or higher
- **npm**: v9.0.0 or higher

### 1. Clone the Repository
```bash
git clone https://github.com/constertine/dharohar-setu.git
cd dharohar-setu
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Configure Environment Variables
Create a `.env` file in the root directory:
```env
PORT=5000
NODE_ENV=development
DATABASE_URL="your_postgresql_database_url"
```

### 4. Run the Development Server
```bash
npm run dev
```

Visit **[http://localhost:5173](http://localhost:5173)** in your browser to explore the platform.

### 5. Build for Production
```bash
npm run build
```

The optimized production bundle will be generated in the `dist/` directory.

---

## 📱 Mobile App

To experience real-time GPS geofencing, QR scanner validation, and offline audio guides on-site at mapped monuments, download the companion **Dharohar Setu Android App**:

- **Latest Release**: [Download APK on GitHub](https://github.com/constertine/dharohar-setu/releases)

---

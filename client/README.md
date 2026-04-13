# Logistics OS - Fleet Intelligence Dashboard

A modern, high-performance logistics monitoring dashboard built with **React 19**, **Tailwind CSS 4.2**, and **Leaflet**.

![Dashboard Preview](https://via.placeholder.com/800x450?text=Logistics+OS+Dashboard)

## 🚀 Features

- **Live Fleet Map**: Real-time tracking of shipments across India using Leaflet.
- **Disruption Feed**: Dynamic alert system for heavy rain, traffic, and driver status.
- **Intelligence Stats**: At-a-glance metrics for Active Shipments, At-Risk parcels, and Average Delay.
- **AI Re-routing**: Simulated AI optimization button for fleet management.
- **Responsive Layout**: "Dense but clean" UI designed for logistics operations centers.

## 🛠️ Tech Stack

- **Framework**: [React 19](https://react.dev/)
- **Build Tool**: [Vite 8](https://vitejs.dev/)
- **Styling**: [Tailwind CSS 4.2](https://tailwindcss.com/)
- **Mapping**: [Leaflet](https://leafletjs.com/) & [React-Leaflet](https://react-leaflet.js.org/)
- **Icons**: [Lucide React](https://lucide.dev/)

## 📦 Getting Started

### 1. Clone the repository
```bash
git clone <your-repo-url>
cd client
```

### 2. Install dependencies
```bash
npm install
```

### 3. Run development server
```bash
npm run dev
```

## 🏗️ Project Structure

- `src/components/Sidebar.tsx`: Dashboard controls, stats, and alert feed.
- `src/components/Map.tsx`: Leaflet map integration with shipment markers.
- `src/data/shipments.json`: Mock data for fleet tracking.
- `src/App.tsx`: Main layout shell.

## 📄 License

MIT

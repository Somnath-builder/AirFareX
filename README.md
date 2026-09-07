# AirfareX - Real-time Airfare Price Index for India

![AirfareX Dashboard preview (placeholder)](https://via.placeholder.com/1200x600/07111F/FFFFFF?text=AirfareX+Dashboard)

**AirfareX** is a sophisticated, data-driven frontend application developed for **MoSPI Hackathon Problem Statement 26056**. It serves as an automated economic data platform designed to monitor and analyze domestic airfare movements across major Indian corridors, ultimately supporting the augmentation of the Consumer Price Index (CPI).

## ✈️ Overview

The platform provides government analysts and economic researchers with a comprehensive suite of tools to track aviation economics in real-time. 

### Key Features
- **Airfare Index Dashboard**: High-level KPI tracking (Current Index, Monthly Change, Active Routes).
- **Interactive Routes Map**: Visualizes price movements across critical domestic air corridors.
- **Lead Time Analysis**: Tracks how prices fluctuate as the departure date approaches.
- **Airlines Breakdown**: Comparative analysis of pricing strategies across different domestic carriers.
- **Deep Navy Aesthetic**: A bespoke "Government Analytics + Aviation Tech" dark mode theme designed for prolonged, fatigue-free data analysis.
- **Custom Orbital SVG Logo**: A mathematically precise, animated 3D SVG logo featuring a commercial jet orbiting a static 'A' with a tricolour (Saffron, White, Green) swoosh representing the Indian flag.

## 🛠 Tech Stack

- **Framework**: React 18
- **Build Tool**: Vite
- **Language**: TypeScript
- **Styling**: Tailwind CSS v4 (Custom Deep Navy color system)
- **Icons**: Lucide React
- **Routing**: React Router DOM

## 🚀 Getting Started

### Prerequisites
Make sure you have Node.js (v18+) installed on your machine.

### Installation

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd AirfareX
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

4. Open your browser and navigate to `http://localhost:5173`.

## 🎨 Design System

AirfareX uses a heavily customized CSS variable system configured in `src/index.css` to achieve its distinctive Deep Navy look:
- **Backgrounds**: `#07111F` (Deepest Navy)
- **Secondary / Navbars**: `#0B1728`
- **Surfaces / Cards**: `#101D30` (Elevated) and `#14243A` (Hover States)
- **Borders**: `#24344A` (Cool Slate/Blue)
- **Accents**: Indigo (`#4F46E5`), Emerald (`#10B981`) for positive trends, Rose (`#F43F5E`) for negative trends.

## 🧩 Project Structure

```
src/
├── components/
│   ├── layout/        # Sidebar, TopBar, and Main Layout wrappers
│   └── ui/            # Reusable UI components (Cards, DataTable, AirfareXLogo)
├── pages/             # Page components (Home, Dashboard Overview, Routes, etc.)
├── index.css          # Tailwind configurations and Deep Navy CSS variables
└── main.tsx           # Application entry point
```

## 📜 Problem Statement Context
**MoSPI (Ministry of Statistics and Programme Implementation)**  
*Problem Statement 26056: Development of a Real-time Airfare Price Index for India.*

Currently, the application runs on a mock data environment specifically tailored to demonstrate the frontend architecture, UI/UX, and data visualization capabilities required for the MoSPI hackathon submission.

---
*Built with ❤️ for India's economic intelligence infrastructure.*

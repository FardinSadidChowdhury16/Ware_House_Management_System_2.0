# Warehouse Management System (WMS)

A full-stack, enterprise-ready Warehouse Management System (WMS) featuring real-time stock control, serialized unit tracking, barcode scanning, stock-in / stock-out approval workflows, multi-warehouse transfers, warranty & claims, and granular role-based access control (RBAC).

---

## 🏗️ Architecture & Tech Stack

### Backend (`/ware_house_management_system`)
- **Framework:** FastAPI (Python 3.12+)
- **ORM & DB:** SQLAlchemy with PostgreSQL 16
- **Migrations:** Alembic
- **Authentication & Security:** JWT tokens (python-jose), Passlib (bcrypt)
- **Containerization:** Docker & Docker Compose

### Frontend (`/wms-dashboard`)
- **Framework:** React 19 + Vite
- **Styling:** Tailwind CSS
- **State & Server Cache:** TanStack React Query
- **Icons:** Lucide React
- **HTTP Client:** Axios

---

## 🚀 Quick Start Guide

### 1. Prerequisites
- Docker & Docker Compose
- Node.js (v20+ recommended)

---

### 2. Backend Setup (via Docker Compose)

1. Navigate to the backend directory:
   ```bash
   cd ware_house_management_system
   ```

2. Copy the sample environment file:
   ```bash
   cp .env.example .env
   ```

3. Build and launch the containers:
   ```bash
   docker compose up -d --build
   ```

4. The backend API will be live at:
   - **API Base:** `http://localhost:8000/api/v1`
   - **Interactive API Docs (Swagger UI):** `http://localhost:8000/docs`
   - **Alternative Docs (ReDoc):** `http://localhost:8000/redoc`

---

### 3. Frontend Setup

1. Navigate to the frontend directory:
   ```bash
   cd wms-dashboard
   ```

2. Copy the sample environment file:
   ```bash
   cp .env.example .env
   ```

3. Install dependencies:
   ```bash
   npm install
   ```

4. Start the development server:
   ```bash
   npm run dev
   ```

5. Access the dashboard at `http://localhost:5173`.

---

## 🔑 Default Credentials

- **Admin Account:**
  - **Email:** `admin@admin.com`
  - **Password:** `admin123`

---

## 📦 Key Features

- **Inventory Tracking:** Real-time visibility across serialized and bulk stock items.
- **Stock Movements (In / Out):** Multi-step approval workflows for inventory adjustments.
- **Inter-Warehouse Transfers:** Request, track, and approve transfers between different warehouse facilities with origin/destination filters.
- **Barcode & Serial Lookup:** Instant scanning and unit-level validation.
- **Role-Based Access Control (RBAC):** Granular permissions per module (users, products, inventory, approvals, warehouses, reports).
- **Reports & Export:** Filtered data view and CSV export for movements, stock, transfers, and user audits.

---

## 📄 License
This project is private and proprietary.


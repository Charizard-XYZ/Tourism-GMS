# Tourism Grievance Management System (Tourism-GMS)
### Administrative & Tourist Dispute Resolution Portal
**Automated Load-Balanced Grievance Redressal Platform**  
*Department of Tourism & Civil Aviation, Government of Sikkim*

---

This repository constitutes the official implementation of the **Tourism Grievance Management System (Tourism-GMS)** — a centralized, digital dispute resolution and complaint management platform deployed on behalf of the **Department of Tourism & Civil Aviation, Government of Sikkim**.

---

## 📑 Table of Contents
- [Purpose & Scope](#purpose--scope)
- [Features & Capabilities](#features--capabilities)
- [Architecture](#architecture)
- [Requirements & Prerequisites](#requirements--prerequisites)
- [Quick Start](#quick-start)
- [Configuration](#configuration)
- [Production Deployment & Handover](#production-deployment--handover)
- [Admin & Officer Operations](#admin--officer-operations)
- [Database Schema & Data Persistence](#database-schema--data-persistence)
- [API Summary](#api-summary)
- [Security Controls & Validation](#security-controls--validation)
- [Quality Assurance & Verification](#quality-assurance--verification)
- [Project Structure](#project-structure)
- [Governance & Support](#governance--support)

---

## Purpose & Scope

The **Tourism Grievance Management System (Tourism-GMS)** serves as the authoritative, direct point of contact between the Department of Tourism & Civil Aviation and visitors across Sikkim.

Upon deployment, the system:
- **Protects Visitor Rights**: Responds to and resolves tourist disputes regarding prepaid taxi rates, hotel tariffs, tour guide licensing, municipal sanitation, and public safety;
- **Automates Officer Allocation**: Automatically routes newly submitted grievances to active departmental Nodal Officers based on a minimum workload load-balancing algorithm;
- **Enforces Directorate Oversight**: Provides Directorate Administrators with a secure portal to manage departmental structures, onboard officers, monitor SLA progress, and review real-time audit logs; and
- **Ensures Session & Data Persistence**: Hydrates session state and complaint rosters across browser refreshes (**F5 / Ctrl+R**) and persists all data to a Node.js REST API database engine.

All configuration, role guards, and data ingestion pathways described in this document are designed for official single-department usage in Sikkim.

---

## Features & Capabilities

| Capability | Description |
| :--- | :--- |
| **Tourist Grievance Lodging** | Tourists can submit complaints with category selection, detailed descriptions, exact location details, and evidence file attachments. |
| **Automated Load-Balancing** | Complaints are auto-assigned to the active Nodal Officer with the lowest current workload within the targeted department. |
| **Officer Redressal Queue** | Nodal Officers can review assigned cases, update status (`Assigned` → `In Progress` → `Resolved`), attach PDF inspection reports, and post public comments. |
| **Administrator Console** | Directorate Admins can create/delete departments, onboard officers, reassign complaints, and review audit logs. |
| **Session Persistence** | Uses `AuthService` state rehydration and `localStorage` caching to preserve active logins and data across browser refreshes. |
| **100% Data Persistence** | Operates on a Node.js Express REST API backend connected to a JSON file database (`server/db_data.json`) that survives server restarts. |
| **Responsive SPA Interface** | Built with Angular 19 and Tailwind CSS for fast, modern, mobile-friendly rendering across desktop computers, tablets, and smartphones. |

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                 Angular 19 SPA Frontend                 │
│         (Tourist, Officer & Admin Web Interfaces)       │
└────────────────────────────┬────────────────────────────┘
                             │
                             │ HTTP REST API / JSON
                             ▼
┌─────────────────────────────────────────────────────────┐
│               Node.js + Express REST API                │
│                     (Port 5000)                         │
│ ├─ Workload Load-Balancing Engine                       │
│ ├─ Department & Officer Roster Controllers              │
│ ├─ Citizen Registration & Profile Controllers           │
│ └─ Grievance & Comment Data Engine                      │
└────────────────────────────┬────────────────────────────┘
                             │
                             │ File I/O Persistence
                             ▼
┌─────────────────────────────────────────────────────────┐
│            Persistent File DB (server/db_data.json)      │
│  (departments, officers, citizens, grievances, logs)    │
└─────────────────────────────────────────────────────────┘
```

During local development, the Angular SPA frontend runs at `http://localhost:4200` and communicates with the Node.js Express REST API running at `http://localhost:5000/api`.

---

## Requirements & Prerequisites

The following software environments are required to build and run the project:

- **Node.js**: v18.0.0 or higher (v20+ recommended)
- **npm**: v9.0.0 or higher
- **Angular CLI**: v19.0.0+ (`npm install -g @angular/cli`)

---

## Quick Start

### 1. Repository Setup & Dependency Installation

```bash
# Clone the repository
git clone https://github.com/Tourism-GMS.git
cd Tourism-GMS

# Install frontend dependencies
npm install
```

### 2. Run Backend REST API Server

```bash
# Terminal 1 — Start Node.js Express Server
node server/server.js
```
*The backend REST API server will start on `http://localhost:5000`.*

### 3. Run Frontend Angular Application

```bash
# Terminal 2 — Start Angular Development Server
npm start
```
*The visitor and administrative website will be reachable at `http://localhost:4200`.*

---

## Configuration

The Node.js backend server utilizes internal environment settings and JSON persistence pathways.

| Area | Variable / Property | Notes |
| :--- | :--- | :--- |
| **Backend Server Port** | `PORT` | Defaults to `5000` (`http://localhost:5000`). |
| **Database File** | `DATA_FILE` | Persistent file location: `server/db_data.json`. |
| **Frontend REST API** | `apiUrl` | Configured in `src/app/core/services/firebase.service.ts` to `http://localhost:5000/api`. |
| **CORS Access** | `cors()` | Enabled for local development and explicit deployment domains. |

---

## Production Deployment & Handover

The recommended deployment topology is:
- **Frontend**: Deployed to Vercel or Netlify (`dist/Tourism-GMS`).
- **Backend**: Deployed to Railway, Render, or AWS EC2 (`node server/server.js`).

### Build Command (Frontend Production)
```bash
npm run build
```

---

## Admin & Officer Operations

### Administrator Credentials & Privileges
- **Default Admin Account**: `admin@gmail.com`
- **Password**: `admin`
- **Capabilities**: Create departments, register Nodal Officers, reassign complaints, view audit logs.

### Nodal Officer Privileges
- **Capabilities**: View assigned grievance queue, update resolution progress, upload inspection PDFs, post public updates.

### Citizen / Tourist Accounts
- **Capabilities**: Register account, file new grievances, track progress, edit profile details, post comments, rate resolution quality.

---

## Database Schema & Data Persistence

All application data is persistently saved in `server/db_data.json` across six core collections:

```json
{
  "citizens": [],
  "departments": [],
  "officers": [],
  "grievances": [],
  "comments": [],
  "auditLogs": []
}
```

---

## API Summary

| Method | Endpoint | Purpose |
| :--- | :--- | :--- |
| `GET` | `/api/health` | Service healthcheck & server diagnostics |
| `GET` | `/api/departments` | List all active departments |
| `POST` | `/api/departments` | Create new department |
| `DELETE` | `/api/departments/:id` | Remove department |
| `GET` | `/api/officers` | List all registered Nodal Officers |
| `POST` | `/api/officers` | Register new Nodal Officer |
| `DELETE` | `/api/officers/:id` | Revoke officer access |
| `GET` | `/api/citizens` | List all registered tourist accounts |
| `POST` | `/api/citizens` | Register new citizen/tourist account |
| `PUT` | `/api/citizens/:id` | Update citizen account profile |
| `GET` | `/api/grievances` | List all submitted grievances |
| `POST` | `/api/grievances` | Submit new grievance (Triggers auto-assignment) |
| `PUT` | `/api/grievances/:id` | Update grievance status / details |
| `GET` | `/api/comments` | List complaint comments |
| `POST` | `/api/comments` | Post new public comment / internal note |

---

## Security Controls & Validation

1. **Role-Based Guards**: `roleGuard` (Admin, Officer, Citizen) and `guestGuard` enforce route permissions.
2. **Phone Number Sanitization**: Automatically normalizes inputs to `+91 XXXXX XXXXX`.
3. **Unique Email Enforcement**: Prevents duplicate email registrations across all user roles.
4. **Password Masking**: Includes web text security font masking and show/hide toggles.
5. **No-Emoji Standard**: Enforces clean professional typography across all pages.

---

## Quality Assurance & Verification

| Check | Result | Description |
| :--- | :--- | :--- |
| **Angular Frontend Build** | `PASS` | `npm run build` completes with **0 errors and 0 warnings**. |
| **Node.js Express Syntax** | `PASS` | `node --check server/server.js` exits with **code 0**. |
| **JSON Database Audit** | `PASS` | `server/db_data.json` verified as **valid JSON**. |

---

## Project Structure

```
Tourism-GMS/
├── server/                      # Node.js Express Backend REST API
│   ├── server.js               # Main REST API Server (Port 5000)
│   └── db_data.json            # Persistent File Database
├── src/                         # Angular 19 SPA Source Code
│   ├── app/
│   │   ├── common/             # Shared Components (Navbar, Footer, Toast)
│   │   ├── core/               # Guards, Models, Services
│   │   │   ├── guards/         # Role-based async route guards
│   │   │   ├── models/         # TypeScript Interfaces & Phone Formatters
│   │   │   └── services/       # AuthService, GrievanceService, etc.
│   │   └── pages/              # Portal Page Views
│   │       ├── admin/          # Admin Dashboard & Management Pages
│   │       ├── auth/           # Login & Registration Pages
│   │       ├── citizen/        # Tourist Dashboard & Submission Pages
│   │       ├── home/           # Hero Section & Overview Components
│   │       └── officer/        # Officer Queue & Processing Pages
│   ├── app.routes.ts           # SPA Route Definitions
│   └── main.ts                 # Angular Application Entry Point
├── angular.json                 # Angular Workspace Configuration
├── package.json                 # Node Dependencies & Scripts
└── README.md                    # System Documentation
```

---

## Governance & Support

This system has been developed for the exclusive use of the **Department of Tourism & Civil Aviation, Government of Sikkim**, and is maintained under its official authority.

*Department of Tourism & Civil Aviation · Government of Sikkim*

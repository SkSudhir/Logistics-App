# 🚚 Logistics Dispatch Planner MVP

A React-based dispatch planning application built as a prototype assignment. This app demonstrates core logistics operations like trip planning, driver and vehicle allocation, route optimization, and admin-level analytics.

---
## 🧠 Product Rationale

Traditional dispatch planning tools often rely on manual assignment or static logic, which leads to inefficiencies, underutilized capacity, and delays.

This tool demonstrates how a data-driven approach — using driver performance, load-based vehicle matching, and route risk scoring — can create a scalable and intelligent dispatch workflow that logistics companies can trust and control.

---
## ✨ Features

- 🔁 **Trip Planning Workflow**  
  Plan trips with intelligent suggestions based on delivery goals.

- 👷 **Driver Allocation (AI-Enhanced)**  
  Ranks drivers using proximity, fatigue risk, and performance scores.

- 🚚 **Vehicle Allotment**  
  Recommends vehicles based on load fit, fuel efficiency, and maintenance.

- 📍 **Route Suggestions**  
  Includes optimal and alternate route planning with cost and risk.

- 🧠 **AI Logic Layer (Mocked)**  
  Mock scoring functions demonstrate how predictive logic can drive decisions.

- 📊 **Admin Dashboard**  
  Tracks performance, on-time delivery, and trip status across roles.

- ⚙️ **Role-Based Access**  
  Dispatcher, Admin, and Viewer roles with custom permissions.

- 🛠️ **Settings Panel**  
  Configure fuel prices, fatigue thresholds, and AI settings.

---
## 🧩 Logic Flow

![Dispatch Logic Flow](./docs/dispatch-logic-flow.png)

---

## 🧠 Architecture & Stack

- **Frontend**: React + TailwindCSS
- **State**: React Hooks
- **Backend**: Firebase Firestore & Auth (anonymous)
- **AI Logic**: In-code scoring functions (driver & vehicle)

---

## 🔍 AI-Driven Decision Logic

- **Driver Score** = Performance + Hours Worked + Proximity
- **Vehicle Score** = Fuel Efficiency + Utilization - Maintenance Penalty

> All scoring functions are mocked for demo purposes but show scalable design.

---
## 🔭 What’s Next (Post-MVP)

- Live traffic rerouting with Google Maps API
- Predictive driver fatigue alerts (using past behavior)
- Cost vs. time simulation for route trade-offs
- Automated insurance check integration
- API-ready data layer for 3rd-party logistics systems

---
You’ll need a Firebase config to run it locally. The live version is hosted via Netlify.
---

## 🚀 Getting Started Locally

```bash
git clone https://github.com/SkSudhir/Logistics-App.git
cd Logistics-App
npm install
npm start

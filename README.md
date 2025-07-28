# 🚚 Logistics Dispatch Planner MVP

A React-based dispatch planning application built as a prototype assignment for Lynkit.io®'s Transport Management System. This app demonstrates core logistics operations like trip planning, driver and vehicle allocation, route optimization, and admin-level analytics.

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

## 🚀 Getting Started Locally

```bash
git clone https://github.com/SkSudhir/Logistics-App.git
cd Logistics-App
npm install
npm start

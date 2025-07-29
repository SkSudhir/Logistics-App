# 🚚 Logistics Dispatch Planner MVP

A React-based dispatch planning application built as a prototype assignment. This app demonstrates core logistics operations like trip planning, driver and vehicle allocation, route optimization, and admin-level analytics.

---

## 🔗 Quick Access

- 🚀 **Live Demo**: [https://dispatch-mvp.netlify.app/](https://dispatch-mvp.netlify.app/)
- 💻 **GitHub Repo**: [https://github.com/SkSudhir/Logistics-App](https://github.com/SkSudhir/Logistics-App)
- 🧠 **Logic Flow Diagram**: See below

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

<img width="3560" height="2216" alt="image" src="https://github.com/user-attachments/assets/61de4164-ee01-40b1-a1fa-99340c4a6b8a" />

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
## 🎥 Prototype Preview (Screenshots)

<img width="350" height="400" alt="image" src="https://github.com/user-attachments/assets/772d43e1-5dd1-4f3e-bdb9-bb065fd6bfe7" /> 
<img width="350" height="400" alt="image" src="https://github.com/user-attachments/assets/8f045697-752c-41d6-bc46-bb216b368ea1" />
<img width="350" height="449" alt="image" src="https://github.com/user-attachments/assets/4cf69616-faa6-423d-a204-0ea41d8dd58a" />
<img width="350" height="449" alt="image" src="https://github.com/user-attachments/assets/ad0c3d77-1b8a-462b-865d-f0611035c50b" />
<img width="350" height="400" alt="image" src="https://github.com/user-attachments/assets/009cccf0-5899-481d-8600-b4fe76f3654b" />
<img width="350" height="400" alt="image" src="https://github.com/user-attachments/assets/40193edd-fefd-4b12-9430-b139614b9e2e" />


---

---

## ✅ Assignment Requirements vs. Delivery

| Requirement                           | Delivered | Notes |
|---------------------------------------|-----------|-------|
| Route / Load / Driver / Vehicle logic | ✅        | All components implemented |
| Role-based permissions                | ✅        | Admin, Dispatcher, Viewer roles |
| AI-enhanced logic                     | ✅ (mocked)| Clear scoring functions |
| Inputs / outputs / UI clarity         | ✅        | Step-by-step flow with overrides |
| Settings vs. per-trip inputs          | ✅        | Global settings panel |
| Product-thinking and future vision    | ✅        | Rationale + roadmap added |

---

You’ll need a Firebase config to run it locally. The live version is hosted via Netlify.
---

## 🚀 Getting Started Locally

```bash
git clone https://github.com/SkSudhir/Logistics-App.git
cd Logistics-App
npm install
npm start

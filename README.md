# Sandlot Picks Analytics

## 🧠 Overview

**Sandlot Picks Analytics** is a data-driven baseball analytics platform powered by AI and machine learning.  
This web application provides an overview of the **Sandlot Picks API**, a predictive engine built to forecast baseball player performance metrics — specifically **batter** and **pitcher props**.

By leveraging historical data, rolling metrics, and advanced ML algorithms, the system delivers insights to help identify edges in player matchups and betting markets.

The frontend React application serves as a modern, responsive website introducing users to the Sandlot Picks Analytics product, its features, and use cases.

---

## ⚙️ Features

### 🔹 Current Functionality

#### 🧢 Batter Props
- **Total Bases** – Predicts the number of total bases a batter will record in a game.  
- **RBIs (Runs Batted In)** – Estimates the number of RBIs expected for a batter.  
- **Hits** – Forecasts the number of hits a batter will achieve.  
- **Home Runs** – Calculates the likelihood of a batter hitting a home run.

#### ⚾ Pitcher Props
- **Strikeouts** – Predicts the total strikeouts for a pitcher in a given game.  
- **Earned Runs** – Estimates how many earned runs a pitcher is likely to allow.  
- **Pitcher Outs** – Projects the number of outs a pitcher will record.  
- **Opponent Stats Integration** – Incorporates advanced opponent data such as:
  - WHIP (Walks + Hits per Inning Pitched)
  - OPS (On-base Plus Slugging)
  - Team batting average
  - Opponent strikeout rate  
  This multi-layered approach helps identify actionable predictive edges.

---

### 🧮 Feature Engineering

Sandlot Picks leverages engineered datasets to enhance model accuracy:
- Rolling metrics (e.g., averages over the last 3 games)
- Season-level statistics (e.g., batting average, slugging percentage)
- Opponent-specific performance indicators (e.g., team pitching metrics, probable pitcher stats)

---

### 🤖 Model Training

Machine learning models power the core prediction engine:
- **Random Forest** and **XGBoost** models are trained on extensive historical datasets.
- Model accuracy and reliability are measured using:
  - **RMSE (Root Mean Squared Error)**
  - **R² (Coefficient of Determination)**

---

### 📈 Prediction Engine

- Dynamically generates matchup-based features in real time.  
- Produces accurate predictions for batter and pitcher prop outcomes.  
- Supports modular scaling — easily adaptable for new prop types and additional sports in the future.

---

## 🧩 Tech Stack

### Frontend
- **React.js** – Core UI framework  
- **JavaScript (ES6)** – Logic and interactivity  
- **CSS3 / Tailwind** – Styling and layout  
- **Chart.js / Recharts** – Data visualization for analytics components

---

## 🧑‍💻 Author

**Christian Cedeno**  
Founder & Developer – *Sandlot Picks Analytics*  
📍 New York City  
💼 Full Stack Developer | Machine Learning 

---

## 📜 License

This project is proprietary and owned by **Sandlot Picks Analytics**.  
Unauthorized reproduction or distribution is prohibited.

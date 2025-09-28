# 🔐 Krypteon — Smart Contract Security Analyzer

Krypteon is a full-stack application that allows developers to **analyze, audit, and visualize vulnerabilities in Solidity smart contracts**.  
It combines a **Next.js frontend** for an intuitive UI with a **FastAPI backend** for AI-driven vulnerability detection and analysis.



## 🚀 Features

- Upload Solidity contracts for **automated security scanning**  
- Real-time **code analysis and audit reports**  
- **Security score** & risk visualization  
- **Shareable reports** for collaboration  
- Powered by **AI + FAISS index** of known vulnerabilities  
- Modern **UI with Tailwind + shadcn/ui**  

---

## ⚡ Tech Stack

- **Frontend:** Next.js 14, React, TypeScript, TailwindCSS, shadcn/ui  
- **Backend:** FastAPI, Python 3.10+, FAISS, JSON-based vulnerability DB  
- **Smart Contracts:** Solidity (test examples included)  

---

## 🛠️ Setup Instructions

### 1️⃣ Clone the Repository
```bash
git clone https://github.com/your-username/Krypteon_Hack404.git
cd Krypteon_Hack404-main
```

---

### 2️⃣ Backend Setup (FastAPI)
```bash
cd fastapi_server
python -m venv venv
source venv/bin/activate   # On Windows: venv\Scripts\activate

pip install -r requirements.txt
uvicorn app:app --reload
```
Backend will start on: **http://127.0.0.1:8000**

---

### 3️⃣ Frontend Setup (Next.js)
```bash
cd krypteon
npm install
npm run dev
```
Frontend will start on: **http://localhost:3000**

---

### 4️⃣ Run Full Stack
1. Start **backend** (FastAPI)  
2. Start **frontend** (Next.js)  
3. Open `http://localhost:3000` in your browser 🚀  

---

## 📖 Usage
1. Upload a Solidity contract in the frontend.  
2. Wait for analysis results from backend AI engine.  
3. View **security score, vulnerabilities, and audit report**.  
4. Download/share report as needed.  

---


## 📜 License
This project is licensed under the **MIT License**.

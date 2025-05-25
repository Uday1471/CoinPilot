CoinPilot
Introduction
CoinPilot is a personal finance tracking web app designed to help users monitor their income, expenses, and remaining balance in a simple and intuitive way. The application allows users to add transactions, view transaction history, and track their financial health over time. With real-time updates and Firebase integration, CoinPilot offers a seamless and secure experience.

Project Type
Frontend | Backend | Fullstack

Deployed App
Frontend: https://coinpilot.netlify.app/

Backend/Database: Firebase Console (Private) (Firebase used for authentication & database)

Directory Structure
pgsql
Copy
Edit
coinpilot/
├─ frontend/
│  ├─ index.html
│  ├─ dashboard.html
│  ├─ log.html
│  ├─ style.css
│  ├─ login.js
│  ├─ dashboard.js
│  ├─ log.js
│  └─ firebase-config.js
Video Walkthrough of the Project
👉 https://youtu.be/9f_abHfJM0U


Features
🔐 Firebase-based user authentication (signup/login/logout)

📊 Real-time balance update based on transactions

📝 Log page to view all transaction history with date and details

➕ Add income or expense directly from the dashboard

💾 Data stored securely in Firebase Firestore

🧮 Automatic balance recalculation after each transaction

Design Decisions or Assumptions
Used Firebase for ease of authentication and real-time data sync.

Separated pages for dashboard and transaction logs for better clarity.

Used simple and clean UI to prioritize functionality over aesthetics.

Did not implement expense categories or graphs in MVP version due to timeline.

Assumed single-user system (multi-user only by Firebase auth, not multi-role).

Installation & Getting Started
Note: This is a frontend + Firebase project. No separate backend server is needed.

Clone the repository

Open the project in any live server environment (e.g., VS Code + Live Server)

Add your Firebase config in firebase-config.js

Replace Firestore rules and setup authentication in Firebase console

bash
Copy
Edit
git clone https://github.com/Uday1471/Personal-Finance-Tracker.git
cd coinpilot
# Open index.html with Live Server or simply drag and drop into a browser
Usage
Example Steps:
Register/Login via the homepage.

Add your monthly income.

Add expenses or additional income via dashboard.

View all transactions in the Log page.


APIs Used
Firebase Authentication: For login/signup

Firebase Firestore: For storing user balance and transaction logs

API Endpoints
Firebase handles backend operations using Firestore SDK; however, logical API equivalents:


Endpoint	Method	Description
/users/{uid}	GET	Fetch user balance and income
/users/{uid}	PUT	Update user balance
/users/{uid}/transactions	POST	Add a new transaction
/users/{uid}/transactions	GET	Fetch all transactions for a user
Technology Stack
Frontend:

HTML5, CSS3

JavaScript (Vanilla)

Backend/Database:

Firebase Authentication

Firebase Firestore (NoSQL database)

Deployment:

Netlify

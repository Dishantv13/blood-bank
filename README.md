<div align="center">

# 🩸 RaktSarthi

### Real-Time Blood Management System

CI=false npm run build

*Modernizing blood donation and connecting donors with those in need*


[![React](https://img.shields.io/badge/React-18.2.0-blue.svg)](https://reactjs.org/)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)
[![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-brightgreen.svg)](https://www.mongodb.com/)

[Features](#-features) • [Tech Stack](#-tech-stack) • [Setup](#-installation--setup) • [Usage](#-usage) • [Contributing](#-contributing)

</div>

---

## 🎯 Project Motive

**RaktSarthi** (रक्त सारथी - Blood Companion) aims to revolutionize the blood donation ecosystem by bridging the gap between blood donors and recipients. In critical situations where every second counts, our platform ensures:

- 🚑 **Instant Connection**: Find available blood donors in your area within seconds
- 📍 **Real-Time Tracking**: Live blood bank inventory and donor availability
- 🏥 **Smart Matching**: Intelligent blood group matching and urgency-based prioritization
- 🎯 **Community Building**: Create and manage blood donation camps and events
- 📱 **User-Friendly**: Intuitive interface for donors, patients, and blood banks
- 🔔 **Instant Notifications**: Real-time toast notifications for all actions
- 📊 **Comprehensive Dashboard**: Track donations, requests, and health information

**Our Mission**: *No one should suffer due to blood unavailability. Every drop counts, every donor matters.*

---

## ✨ Features

### For Blood Donors 🩸
- ✅ Easy registration with health questionnaire
- ✅ Donor eligibility assessment
- ✅ Profile management with photo upload
- ✅ Track donation history and statistics
- ✅ Register for blood donation camps and events
- ✅ Toggle between donor and patient modes
- ✅ Real-time notifications for requests

### For Blood Recipients 🏥
- ✅ Create urgent blood requests
- ✅ Search donors by blood group and location
- ✅ Direct contact with available donors
- ✅ Track request status in real-time
- ✅ View blood bank inventories
- ✅ Access to nearby blood banks

### For Blood Banks 🏢
- ✅ Dedicated blood bank dashboard
- ✅ Manage inventory (add/update blood units)
- ✅ Create and manage blood donation camps
- ✅ View camp registrations
- ✅ Export reports (CSV/Excel)
- ✅ Real-time inventory tracking

### General Features 🌟
- ✅ Google OAuth authentication
- ✅ Beautiful toast notifications for all actions
- ✅ Responsive design (mobile & desktop)
- ✅ Interactive maps for locations
- ✅ Secure JWT-based authentication
- ✅ Profile photo upload with localStorage
- ✅ Modern, gradient-based UI design

---

## 🛠 Tech Stack

### Frontend
```
React 18.2.0          - UI Library
React Router 6.20.1   - Navigation
Axios 1.6.2          - HTTP Client
Firebase 12.6.0      - Authentication
Framer Motion        - Animations
GSAP 3.13.0         - Advanced Animations
Custom Toast System  - Notifications
```

### Backend
```
Node.js 18+          - Runtime
Express 4.18.2       - Web Framework
MongoDB Atlas        - Database
JWT                  - Authentication
Bcrypt.js           - Password Hashing
Helmet              - Security
Express Rate Limit  - Rate Limiting
CORS                - Cross-Origin Resource Sharing
```

### Security & Performance
```
✓ Helmet.js for security headers
✓ Rate limiting (100 requests/15min)
✓ MongoDB sanitization
✓ Password hashing with bcrypt
✓ JWT token authentication
✓ CORS configuration
✓ Input validation
```

---

## 📁 Project Structure

```
RaktSarthi/
│
├── backend/                          # Node.js Backend
│   ├── config/
│   │   └── db.js                    # MongoDB connection
│   ├── middleware/
│   │   └── auth.js                  # JWT authentication middleware
│   ├── models/
│   │   ├── User.js                  # User schema
│   │   ├── BloodBank.js             # Blood bank schema
│   │   ├── BloodRequest.js          # Blood request schema
│   │   ├── BloodCamp.js             # Blood camp schema
│   │   ├── Event.js                 # Event schema
│   │   └── DonorHealth.js           # Donor health schema
│   ├── routes/
│   │   ├── auth.js                  # Authentication routes
│   │   ├── users.js                 # User routes
│   │   ├── bloodbanks.js            # Blood bank routes
│   │   ├── requests.js              # Blood request routes
│   │   ├── bloodCamps.js            # Blood camp routes
│   │   ├── events.js                # Event routes
│   │   ├── donorHealth.js           # Donor health routes
│   │   └── admin.js                 # Admin routes
│   ├── server.js                    # Express app entry point
│   └── package.json
│
├── frontend/                         # React Frontend
│   ├── public/
│   │   └── index.html
│   ├── src/
│   │   ├── components/              # Reusable components
│   │   │   ├── Navbar.jsx
│   │   │   ├── PrivateRoute.jsx
│   │   │   ├── Modal.jsx
│   │   │   ├── SignupModal.jsx
│   │   │   ├── ImageSlider.jsx
│   │   │   ├── ImageTrail.jsx
│   │   │   ├── HoverImage.jsx
│   │   │   ├── Toast.jsx            # Toast notification component
│   │   │   └── ToastContainer.jsx   # Toast context provider
│   │   ├── pages/                   # Page components
│   │   │   ├── Login.jsx
│   │   │   ├── Signup.jsx
│   │   │   ├── Dashboard.jsx
│   │   │   ├── Profile.jsx
│   │   │   ├── Donors.jsx
│   │   │   ├── BloodBanks.jsx
│   │   │   ├── Events.jsx
│   │   │   ├── CreateRequest.jsx
│   │   │   ├── DonorHealthForm.jsx
│   │   │   ├── BloodBankLogin.jsx
│   │   │   ├── BloodBankRegister.jsx
│   │   │   └── BloodBankDashboard.jsx
│   │   ├── context/
│   │   │   └── AuthContext.jsx      # Authentication context
│   │   ├── services/
│   │   │   └── api.js               # API service layer
│   │   ├── config/
│   │   │   └── firebase.jsx         # Firebase configuration
│   │   ├── data/
│   │   │   └── bloodBankData.js     # Static data
│   │   ├── App.jsx                  # Main app component
│   │   ├── App.css                  # Global styles
│   │   └── index.js                 # React entry point
│   ├── .env                         # Environment variables
│   └── package.json
│
├── README.md                         # Project documentation
└── LICENSE                          # MIT License
```

---

## 🚀 Installation & Setup

### Prerequisites
- Node.js (v18 or higher)
- npm or yarn
- MongoDB Atlas account
- Firebase account
- Git

### 1️⃣ Clone the Repository

```bash
git clone https://github.com/yourusername/RaktSarthi.git
cd RaktSarthi
```

### 2️⃣ Backend Setup

```bash
# Navigate to backend directory
cd backend

# Install dependencies
npm install

# Create .env file
touch .env
```

Add the following to `backend/.env`:

```env
# Server Configuration
PORT=5001
NODE_ENV=development

# MongoDB Atlas
MONGODB_URI=mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/rtbms?retryWrites=true&w=majority

# JWT Secret (Generate a strong random string)
JWT_SECRET=your_super_secret_jwt_key_here_use_strong_random_string

# JWT Expiration
JWT_EXPIRE=7d

# CORS Origin
CORS_ORIGIN=http://localhost:3000
```

**To generate a strong JWT secret:**
```bash
# On Linux/Mac
openssl rand -base64 32

# On Windows (PowerShell)
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Minimum 0 -Maximum 256 }))
```

```bash
# Start the backend server
npm start

# Or use nodemon for development
npm run dev
```

Backend will run on **http://localhost:5001**

### 3️⃣ Frontend Setup

```bash
# Navigate to frontend directory (from root)
cd ../frontend

# Install dependencies
npm install

# Create .env file
touch .env
```

Add the following to `frontend/.env`:

```env
# API Configuration
REACT_APP_API_URL=http://localhost:5001/api

# Suppress WebSocket warnings
WDS_SOCKET_PORT=0
```

### 4️⃣ Firebase Configuration

1. **Create a Firebase Project**
   - Go to [Firebase Console](https://console.firebase.google.com/)
   - Click "Add Project"
   - Enter project name (e.g., "RaktSarthi")
   - Follow the setup wizard

2. **Enable Authentication**
   - In Firebase Console, go to **Authentication** → **Sign-in method**
   - Enable **Email/Password**
   - Enable **Google** sign-in
   - Add authorized domain: `localhost`

3. **Get Firebase Configuration**
   - Go to **Project Settings** (gear icon)
   - Scroll to "Your apps" section
   - Click on **Web** icon (`</>`)
   - Register your app and copy the config

4. **Update Firebase Config**
   
   Open `frontend/src/config/firebase.jsx` and replace with your credentials:

```javascript
const firebaseConfig = {
  apiKey: "AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.firebasestorage.app",
  messagingSenderId: "123456789012",
  appId: "1:123456789012:web:abcdef123456",
  measurementId: "G-XXXXXXXXXX"
};
```

5. **Configure OAuth Consent Screen** (for Google Sign-in)
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Select your Firebase project
   - Navigate to **APIs & Services** → **OAuth consent screen**
   - Configure consent screen with your app details

```bash
# Start the frontend server
npm start
```

Frontend will run on **http://localhost:3000**

### 5️⃣ MongoDB Atlas Setup

1. **Create MongoDB Atlas Account**
   - Sign up at [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
   - Create a free cluster

2. **Configure Database Access**
   - Go to **Database Access** → **Add New Database User**
   - Create username and password
   - Save credentials securely

3. **Configure Network Access**
   - Go to **Network Access** → **Add IP Address**
   - Add `0.0.0.0/0` (Allow access from anywhere) for development
   - For production, add specific IP addresses

4. **Get Connection String**
   - Go to **Clusters** → **Connect**
   - Choose "Connect your application"
   - Copy the connection string
   - Replace `<password>` with your database user password
   - Add to `backend/.env` as `MONGODB_URI`

---

## 🎮 Usage

### Starting the Application

**Option 1: Run Both Servers Simultaneously**

In separate terminal windows:

```bash
# Terminal 1 - Backend
cd backend
npm start

# Terminal 2 - Frontend
cd frontend
npm start
```

**Option 2: Using Concurrently (Optional)**

Install concurrently in root:
```bash
npm install -g concurrently
```

Then run:
```bash
concurrently "cd backend && npm start" "cd frontend && npm start"
```

### Access the Application

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:5001
- **API Documentation**: http://localhost:5001/api

### Default Accounts for Testing

**Test User Account:**
```
Email: donor@test.com
Password: test123
```

**Blood Bank Account:**
```
Email: bloodbank@test.com
Password: bloodbank123
```

*(Create these accounts through the signup process)*

---

## 📱 Features Demo

### User Registration
1. Visit http://localhost:3000/signup
2. Fill in your details
3. Choose if you want to register as a donor
4. Complete health questionnaire (if donor)
5. Get instant toast notification on success

### Creating a Blood Request
1. Login to your account
2. Navigate to **Create Request**
3. Fill in patient details, blood group, and urgency
4. Submit request
5. Request appears in dashboard immediately

### Finding Donors
1. Go to **Find Donors**
2. Filter by blood group
3. View donor profiles with photos
4. Click "Contact" to get donor details
5. Call or email the donor directly

### Blood Bank Features
1. Login as blood bank
2. Manage inventory (add/update units)
3. Create blood donation camps
4. View camp registrations
5. Export reports as CSV/Excel

---

## 🎨 Key Features Implemented

### Toast Notification System
Beautiful, lightweight notifications for all user actions:
- ✅ Success messages (green gradient)
- ❌ Error messages (red gradient)
- ℹ️ Info messages (blue gradient)
- ⚠️ Warning messages (orange gradient)

### Photo Upload System
- Profile pictures stored in localStorage
- Automatic loading on profile page
- Full image display in donor cards
- Circular avatars in modals

### Authentication Flow
- JWT-based authentication
- Firebase Google OAuth
- Protected routes
- Persistent sessions

### Real-Time Updates
- Live blood request status
- Instant inventory updates
- Real-time donor availability

---

## 🔒 Security Features

- ✅ JWT authentication tokens
- ✅ Password hashing with bcrypt
- ✅ Rate limiting (100 req/15min)
- ✅ Helmet.js security headers
- ✅ MongoDB sanitization
- ✅ CORS protection
- ✅ Input validation
- ✅ XSS protection

---

## 🐛 Known Issues & Limitations

1. **Photo Storage**: Currently using localStorage (limited to 5-10MB)
   - Solution: Backend API endpoint for image upload (planned)

2. **WebSocket Warnings**: React dev server shows WebSocket errors
   - Status: Harmless, suppressed in .env

3. **Google OAuth**: Cross-Origin-Opener-Policy warnings
   - Status: Expected behavior, doesn't affect functionality

---

## 🗺️ Roadmap

- [ ] Backend API for profile picture upload
- [ ] Real-time chat between donors and recipients
- [ ] Push notifications
- [ ] Mobile app (React Native)
- [ ] Blood donation certificate generation
- [ ] Donation reminder system
- [ ] Multi-language support
- [ ] Advanced analytics dashboard
- [ ] Payment integration for blood camps

---

### Coding Standards
- Follow ESLint rules
- Write meaningful commit messages
- Add comments for complex logic
- Test before submitting PR

---


## 🙏 Acknowledgments

- MongoDB Atlas for database hosting
- Firebase for authentication services
- All open-source contributors
- Blood donation community

---

<div align="center">

### ⭐ Star this repo if you find it helpful!

Made with ❤️ and ☕ for a noble cause

**Save Lives, Donate Blood** 🩸

</div>


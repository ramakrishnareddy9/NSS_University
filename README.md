# NSS University Activity Portal

A comprehensive web-based platform for managing National Service Scheme (NSS) activities, events, and student participation at the university level.

## 📋 Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Recent Enhancements](#recent-enhancements)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Configuration](#configuration)
- [Running the Application](#running-the-application)
- [API Documentation](#api-documentation)
- [Frontend Routes](#frontend-routes)
- [Database Models](#database-models)
- [Contributing](#contributing)
- [License](#license)

## 🎯 Overview

NSS University Activity Portal is a full-stack application designed to streamline NSS activities management, student participation tracking, event organization, and volunteer coordination at the university level. The platform includes AI-powered writing assistance, real-time notifications, certificate generation, and comprehensive reporting features.

## ✨ Features

### Core Functionality
- **Event Management**: Create, manage, and track NSS events
- **Student Participation**: Track student involvement in NSS activities
- **User Roles**: Admin, Faculty, Student role-based access control
- **Notifications**: Real-time push notifications via Firebase Cloud Messaging (FCM)
- **Contributions**: Log and track student contributions to NSS activities

### Advanced Features
- **AI Writing Assistant**: Powered by Google Gemini API for writing suggestions
- **Certificate Generation**: Automated certificate creation with PDF generation
- **Reporting & Analytics**: Comprehensive statistics and activity reports
- **Email Notifications**: Automated email notifications via Brevo
- **File Upload**: Cloud-based file storage with Cloudinary integration
- **Real-time Updates**: WebSocket integration using Socket.io

### Administrative Features
- **Period Configuration**: Manage NSS activity periods
- **Report Designer**: Customizable report templates
- **User Management**: Admin controls for user roles and permissions
- **Participation Tracking**: Monitor student participation metrics
- **OD List Management**: Role-protected attendance-duty lists for faculty and admins
- **OD Letter PDFs**: Department-wise OD letters with faculty countersign fields
- **Semester Period Config UI**: Academic-year schedule management for semester-level periods

## 🆕 Recent Enhancements

### OD List, PDF Letters, and Period Config Updates
- OD List routes are now role-protected so only admin and faculty users can access attendance-duty data.
- Period configuration now validates every stored time in `HH:MM` format.
- Department-wise OD letter PDFs can be generated for faculty countersignature.
- A semester-level period configuration UI has been added for creating, editing, and deleting academic-year schedules.
- The existing OD list Excel download remains available to authorized users.

### Key API Additions
- `GET /api/od-list/event/:eventId/letter-pdf/:department` - Download a department-specific OD letter PDF.
- `GET /api/od-list/event/:eventId/departments` - Get participant counts by department for an event.
- `POST /api/period-config/validate/time` - Validate a time value in `HH:MM` format.

### Access Control Summary
- OD List routes require `admin` or `faculty`.
- Period config create, update, and delete routes require `admin`.
- Period config listing and lookup routes require authentication, with admin/faculty access for the full list.

## 🛠 Tech Stack

### Backend
- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: MongoDB (Mongoose ODM)
- **Authentication**: JWT (jsonwebtoken)
- **Email Service**: Brevo (formerly Sendinblue)
- **AI Service**: Google Generative AI (Gemini)
- **Cloud Storage**: Cloudinary
- **Real-time Communication**: Socket.io
- **Notifications**: Firebase Cloud Messaging (FCM)
- **PDF Generation**: jsPDF, pdf-lib, canvas
- **Security**: bcryptjs, helmet, hpp, express-rate-limit

### Frontend
- **Library**: React 18
- **Router**: React Router v6
- **UI Framework**: Material-UI (MUI) v5
- **Form Handling**: React Hook Form
- **HTTP Client**: Axios
- **Styling**: Tailwind CSS, PostCSS
- **Real-time**: Socket.io-client
- **Toast Notifications**: React Toastify, React Hot Toast
- **Spreadsheet**: XLSX
- **PDF Viewing**: pdfjs-worker

## 📁 Project Structure

```
NSS_University/
├── Backend/
│   ├── config/              # Configuration files (Firebase, Cloudinary)
│   ├── controllers/         # Request handlers
│   ├── middleware/          # Express middleware
│   ├── models/              # Mongoose schemas
│   ├── routes/              # API routes
│   ├── services/            # Business logic services
│   ├── scripts/             # Utility scripts
│   ├── uploads/             # Local file uploads
│   ├── utils/               # Helper utilities
│   ├── server.js            # Express app entry point
│   └── package.json         # Backend dependencies
│
├── Frontend/
│   ├── public/              # Static assets
│   ├── src/
│   │   ├── components/      # React components
│   │   ├── context/         # React context providers
│   │   ├── hooks/           # Custom React hooks
│   │   ├── pages/           # Page components
│   │   ├── styles/          # CSS styles
│   │   ├── utils/           # Helper functions
│   │   ├── App.js           # Main App component
│   │   └── index.js         # React entry point
│   ├── tailwind.config.js   # Tailwind CSS config
│   └── package.json         # Frontend dependencies
│
├── package.json             # Root package configuration
└── README.md                # This file
```

## 📋 Prerequisites

- **Node.js**: v14 or higher
- **npm**: v6 or higher
- **MongoDB**: Local or cloud instance
- **Firebase Project**: For FCM and real-time features
- **Cloudinary Account**: For image uploads
- **Brevo Account**: For email service
- **Google Cloud Project**: For Gemini AI service

## 🚀 Installation

### 1. Clone the Repository

```bash
git clone https://github.com/ramakrishnareddy9/NSS_University.git
cd NSS_University
```

### 2. Install Dependencies

```bash
# Install root dependencies
npm install

# Install all dependencies (root + frontend + backend)
npm run install-all
```

Or install separately:

```bash
# Backend dependencies
cd Backend && npm install

# Frontend dependencies
cd ../Frontend && npm install
```

## ⚙️ Configuration

### Backend Configuration

Create a `.env` file in the `Backend/` directory:

```env
# Server
PORT=5000
NODE_ENV=development

# MongoDB
MONGODB_URI=mongodb://localhost:27017/nss-portal
# or for cloud: mongodb+srv://username:password@cluster.mongodb.net/nss-portal

# JWT
JWT_SECRET=your_jwt_secret_key_here
JWT_EXPIRE=7d

# Firebase Admin SDK
FIREBASE_PROJECT_ID=your_firebase_project_id
FIREBASE_PRIVATE_KEY_ID=your_firebase_key_id
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=your_firebase_client_email
FIREBASE_CLIENT_ID=your_firebase_client_id
FIREBASE_AUTH_URI=https://accounts.google.com/o/oauth2/auth
FIREBASE_TOKEN_URI=https://oauth2.googleapis.com/token

# Cloudinary
CLOUDINARY_CLOUD_NAME=your_cloudinary_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret

# Google Gemini API
GEMINI_API_KEY=your_gemini_api_key

# Brevo (Email Service)
BREVO_API_KEY=your_brevo_api_key
ADMIN_EMAIL=admin@university.edu

# Email Configuration
EMAIL_FROM=noreply@university.edu
EMAIL_HOST=smtp.brevo.com
EMAIL_PORT=587

# Frontend URL (for CORS)
CLIENT_URL=http://localhost:3000
```

### Frontend Configuration

Create a `.env` file in the `Frontend/` directory (optional):

```env
REACT_APP_API_URL=http://localhost:5000
REACT_APP_SOCKET_URL=http://localhost:5000
```

## 🎮 Running the Application

### Development Mode (Concurrent)

From the root directory:

```bash
npm run dev
```

This will start both backend and frontend with hot-reload.

### Backend Only

```bash
npm run server
```

Runs on `http://localhost:5000`

### Frontend Only

```bash
npm run client
```

Runs on `http://localhost:3000`

### Seed Demo Data

```bash
npm run seed-demo-users
```

This will populate the database with demo users for testing.

## 📚 API Documentation

### Base URL
```
http://localhost:5000/api
```

### Key Endpoints

#### Authentication
- `POST /auth/register` - User registration
- `POST /auth/login` - User login
- `POST /auth/logout` - User logout
- `POST /auth/refresh-token` - Refresh JWT token
- `POST /auth/forgot-password` - Request password reset
- `POST /auth/reset-password` - Reset password with OTP

#### Events
- `GET /events` - List all events
- `POST /events` - Create event (Admin)
- `GET /events/:id` - Get event details
- `PUT /events/:id` - Update event
- `DELETE /events/:id` - Delete event

#### Participations
- `GET /participations` - List participations
- `POST /participations` - Register for event
- `PUT /participations/:id` - Update participation status

#### Contributions
- `GET /contributions` - List contributions
- `POST /contributions` - Create contribution
- `PUT /contributions/:id` - Update contribution

#### Users
- `GET /users` - List users (Admin)
- `GET /users/:id` - Get user profile
- `PUT /users/:id` - Update user profile

#### Notifications
- `GET /notifications` - Get user notifications
- `POST /notifications/mark-read` - Mark notifications as read

#### Reports
- `GET /reports` - Generate reports
- `POST /reports` - Create custom report

#### Certificates
- `GET /certificates/generate` - Generate certificate

#### OD List and Period Configuration
- `GET /od-list/event/:eventId` - Get OD list for an event (Admin/Faculty)
- `GET /od-list/event/:eventId/download` - Download OD list as Excel (Admin/Faculty)
- `GET /od-list/event/:eventId/letter-pdf/:department` - Download department-wise OD letter PDF (Admin/Faculty)
- `GET /od-list/event/:eventId/departments` - Get department-wise participant counts (Admin/Faculty)
- `GET /period-config` - List period configurations (Admin/Faculty)
- `POST /period-config` - Create period configuration (Admin)
- `PUT /period-config/:id` - Update period configuration (Admin)
- `DELETE /period-config/:id` - Delete period configuration (Admin)
- `POST /period-config/validate/time` - Validate HH:MM time format

### Authentication
All protected routes require a Bearer token in the Authorization header:
```
Authorization: Bearer <jwt_token>
```

## 🗂 Database Models

### User
- Email, password, name, role (Admin/Faculty/Student)
- Department, contact information
- Profile picture URL
- Account status and timestamps

### Event
- Title, description, date, time, location
- Organizer (Faculty)
- Participation status tracking
- Event image/banner

### Participation
- User ID, Event ID
- Participation status (Joined, Completed, Pending)
- Attendance hours
- Timestamps

### Contribution
- User ID, title, description
- Category, status (Submitted, Approved, Rejected)
- Attached files/media

### Notification
- User ID, title, content
- Type (email, push, in-app)
- Read status, timestamp

### Certificate
- User ID, event reference
- Issue date, certificate number
- PDF URL

### Report
- Title, content
- Report type, period
- Generated timestamp

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the ISC License - see the LICENSE file for details.

## 📧 Support

For support, issues, or feature requests, please create an issue in the GitHub repository.

---

**Made with ❤️ for NSS Activity Management**
 
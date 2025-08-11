# Library Book Reservation App

## Setup Instructions

### 1. Create a MongoDB Connection
- Open **MongoDB Compass**
- Create a new connection to your local MongoDB instance (e.g., `mongodb://127.0.0.1:27017`)

---

### 2. Create `.env` File
Create a `.env` file in the **project root** with the following content:

---

### 3. Install Dependencies and Seed the Database
Navigate to the backend folder and install required packages:

```
cd backend
npm install
node seed.js```

Alternatively, from root:
```
node backend/seed.js
---

### 4. Start the Server
```
node server.js
```

Alternatively, from root:
```
node server.js
```
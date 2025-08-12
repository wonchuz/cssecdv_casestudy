# Library Book Reservation App

## Setup Instructions

### 1. Create a MongoDB Connection
- Open **MongoDB Compass**
- Create a new connection to your local MongoDB instance (e.g., `mongodb://127.0.0.1:27017`)

---

### 2. Create `.env` File
Create a `.env` file in the **project root** with the following content:
```
PORT=3000
MONGO_URI=mongodb://127.0.0.1:27017/library
```
---

### 3. Install Dependencies and Seed the Database
Install required packages (root folder):

```
npm install
```

### 4. Seed then start the server

```
cd backend
node seed.js
node server.js
```

Alternatively, from root:

```
node backend/seed.js
node backend/server.js
```
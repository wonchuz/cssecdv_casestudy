Start by creating a new connection on MongoDB Compass

create your .env file to match
example content for .env:
PORT=3000
MONGO_URI=mongodb://127.0.0.1:27017/library

navigate to backend
cd backend

Install dependencies:
npm install

seed the database:
node seed.js

Start the server:
node server.js


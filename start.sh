#!/bin/sh

# Start script for Test Analytics Platform
# Runs both frontend and backend servers

echo "Starting Test Analytics Platform..."

# Start backend server in background
echo "Starting backend server on port 5000..."
cd /app
node server/index.js &
BACKEND_PID=$!

# Start frontend development server in background
echo "Starting frontend development server on port 3000..."
cd /app/client
npm start &
FRONTEND_PID=$!

echo "Backend PID: $BACKEND_PID"
echo "Frontend PID: $FRONTEND_PID"
echo "Backend running on http://localhost:5000"
echo "Frontend running on http://localhost:3000"

# Wait for both processes
wait $BACKEND_PID $FRONTEND_PID

# Made with Bob

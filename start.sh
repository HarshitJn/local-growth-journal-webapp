#!/bin/bash

# Move to the directory where this script is located
cd "$(dirname "$0")"

echo "🍃 Launching Quiet Space - AI Journal..."
echo "----------------------------------------"

# Check if Node.js is installed
if ! command -v node &> /dev/null
then
    echo "⚠️ Node.js is NOT installed on your system!"
    echo "Quiet Space requires Node.js to run locally."
    echo "Please download and install Node.js from: https://nodejs.org"
    echo ""
    read -p "Press Enter to exit..."
    exit 1
fi

# Install dependencies if node_modules folder is missing
if [ ! -d "node_modules" ]; then
    echo "📦 First time setup: Installing local packages (this may take a minute)..."
    npm install
fi

echo "🚀 Starting local web server..."

# Open browser to the local address after a short delay
(
  sleep 1.5
  if command -v open &> /dev/null; then
    open -a "Google Chrome" http://localhost:5173 || open http://localhost:5173
  elif command -v xdg-open &> /dev/null; then
    google-chrome http://localhost:5173 || xdg-open http://localhost:5173 || sensible-browser http://localhost:5173
  else
    echo "Please open http://localhost:5173 in your browser."
  fi
) &

# Launch Vite dev server
npm run dev

#!/bin/bash

# Move to the directory where this script is located
cd "$(dirname "$0")"

echo "🍃 Launching Quiet Space - AI Journal..."
echo "----------------------------------------"

# Check if Node.js is installed
if ! command -v node &> /dev/null
then
    echo "❌ Node.js is NOT installed on your Mac!"
    echo "Quiet Space requires Node.js to run locally."
    echo "Please download and install Node.js from: https://nodejs.org"
    echo "After installing, double-click this start.command script again."
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

# Open Google Chrome to the local address after a short delay
# Falls back to default browser if Chrome is not installed
(sleep 1.5 && open -a "Google Chrome" http://localhost:5173 || open http://localhost:5173) &

# Launch Vite dev server
npm run dev

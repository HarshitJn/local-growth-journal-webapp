#!/bin/bash

# Move to the directory where this script is located
cd "$(dirname "$0")"

echo "🍃 Launching Quiet Space - AI Journal..."
echo "----------------------------------------"

# Check if Node.js is installed
if ! command -v node &> /dev/null
then
    echo "⚠️ Node.js is NOT installed on your Mac!"
    echo "Quiet Space requires Node.js to run locally. Attempting to assist with installation..."
    echo "----------------------------------------"

    # Option 1: Use Homebrew if available
    if command -v brew &> /dev/null
    then
        echo "🍺 Found Homebrew! Installing Node.js via Homebrew..."
        brew install node
        
        # Verify if installation succeeded
        if command -v node &> /dev/null
        then
            echo "✅ Node.js installed successfully via Homebrew!"
        else
            echo "❌ Homebrew installation failed. Trying official installer download..."
        fi
    fi

    # Option 2: Fallback to downloading official .pkg installer and launching it
    if ! command -v node &> /dev/null
    then
        INSTALLER_URL="https://nodejs.org/dist/v20.11.0/node-v20.11.0.pkg"
        TEMP_PKG="/tmp/node-installer.pkg"
        
        echo "🌐 Downloading the official Node.js installer..."
        echo "Source: $INSTALLER_URL"
        
        curl -L -o "$TEMP_PKG" "$INSTALLER_URL"
        
        if [ -f "$TEMP_PKG" ]; then
            echo "📦 Opening the Node.js installation wizard..."
            echo "Please follow the setup screens in the Installer window."
            open "$TEMP_PKG"
        else
            echo "❌ Download failed. Please download Node.js manually from: https://nodejs.org"
        fi
        
        echo ""
        read -p "Once you complete the installation, press [Enter] to exit. Then run this script again!"
        exit 1
    fi
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

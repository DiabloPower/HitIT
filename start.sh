#!/bin/bash
# HitIT Development Server (Spotify OAuth kompatibel)

echo "🎵 HitIT Server starting up..."
echo ""

# stops old instances
pkill -f "start_server.py" 2>/dev/null
pkill -f "python3 -m http.server" 2>/dev/null

# change to script directory
cd "$(dirname "$0")"

# start server
python3 start_server.py

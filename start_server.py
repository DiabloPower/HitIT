#!/usr/bin/env python3
"""
Einfacher HTTP-Server für lokale Entwicklung (Spotify OAuth kompatibel)
Startet Server explizit auf 127.0.0.1 und Port 8080.
Hinweis: Für Spotify muss die App unter http://127.0.0.1:8080 laufen.
"""
import http.server
import socketserver
import os

# Standard-Port für die App
PORT = 8080
HOST = "127.0.0.1"

# Wechsel ins Script-Verzeichnis
os.chdir(os.path.dirname(os.path.abspath(__file__)))

Handler = http.server.SimpleHTTPRequestHandler

print("🎵 HitIT Server startet…")
print(f"📍 Öffne im Browser: http://127.0.0.1:{PORT}/")
print("⚠️  WICHTIG: Spotify Redirect URI muss exakt http://127.0.0.1:8080/ sein.")
print("🛑 Zum Stoppen: Strg+C\n")

with socketserver.TCPServer((HOST, PORT), Handler) as httpd:
    print(f"✅ Server läuft auf http://127.0.0.1:{PORT}/")
    httpd.serve_forever()
# Mista King Kitchen — Node.js Web App

## Overview
Full-stack restaurant website with:
- Express.js server with contact form (SendGrid email)
- PocketBase backend (admin panel, database)
- Static landing page with full menu, branches, social links

## Admin Access
- **Email:** info@nenifix.com
- **Password:** nenifix2mkk
- **Admin URL:** `http://yourdomain.com/_/pb` or `http://yourdomain.com:8090/_/`

## Prerequisites
- Node.js 18+
- PocketBase binary (auto-downloaded via setup script)

## Quick Start

### 1. Install dependencies
```bash
npm install
```

### 2. Setup PocketBase (download binary + create admin)

**Linux/Mac:**
```bash
bash setup-pb.sh
```

**Windows:**
```cmd
setup-pb.bat
```

Or manually:
```bash
# Download PocketBase from https://pocketbase.io/docs/
# Place binary in this directory as `pocketbase` (or `pocketbase.exe` on Windows)

# Start PocketBase
./pocketbase serve --http 127.0.0.1:8090

# Create admin (in another terminal)
curl -X POST http://127.0.0.1:8090/api/admins \
  -H "Content-Type: application/json" \
  -d '{"email":"info@nenifix.com","password":"nenifix2mkk","passwordConfirm":"nenifix2mkk"}'
```

### 3. Create .env
```bash
cp .env.example .env
# Edit .env with your values
```

### 4. Start the app
```bash
npm start
```

The server starts on port 3000 (or `PORT` env var).
PocketBase runs on port 8090.

## Deployment on Hostinger

### Option A: Git Deployment
1. Upload this folder to Hostinger via Git/FTP/File Manager
2. In hPanel → Advanced → Node.js:
   - Root: `hostinger/`
   - Startup file: `server.js`
   - Node version: 18+
3. In hPanel → Terminal:
   ```bash
   cd ~/public_html/hostinger
   npm install --production
   bash setup-pb.sh
   ```
4. Restart Node.js app in hPanel

### Option B: Zip Upload
1. Create a zip of this directory
2. Upload via hPanel → File Manager
3. Extract and follow steps 2-4 above

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/health` | GET | Health check |
| `/api/contact` | POST | Submit contact form → sends email via SendGrid |
| `/api/pb/*` | ANY | PocketBase API proxy |
| `/_/pb/*` | ANY | PocketBase Admin UI proxy |
| `/*` | GET | Static landing page |

## Contact Form
POST `/api/contact` with JSON body:
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "phone": "053 046 0039",
  "message": "Hello, I'd like to order..."
}
```

## PocketBase Admin
Access the admin panel at `/_/pb` to:
- View contact form submissions (create a `messages` collection)
- Manage menu items, branches, content
- View analytics

## File Structure
```
hosterin/
├── server.js           # Express server + PocketBase launcher
├── package.json        # Node.js dependencies
├── .env.example        # Environment template
├── setup-pb.sh         # PocketBase setup (Linux/Mac)
├── setup-pb.bat        # PocketBase setup (Windows)
├── pocketbase/         # PocketBase binary + data (created on setup)
│   ├── pocketbase      # Binary
│   └── pb_data/        # Database files
├── public/
│   └── index.html      # Landing page
└── README.md
```

## Support
- Mista King Kitchen: godwintext@gmail.com
- Instagram: @MISTA_KING_SHAWARMA
- Phone: 053 046 0039 | 055 171 3849

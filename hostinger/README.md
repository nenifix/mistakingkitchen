# Mista King Kitchen — Hostinger Deployment Guide

## Overview
This is a Node.js/Express web application for the Mista King Kitchen restaurant website.
It serves the static HTML landing page and includes a contact form API endpoint.

## Prerequisites
- Hostinger hosting plan that supports Node.js (Business Web Hosting or higher)
- Node.js 18+ installed on the server
- Git installed locally

## Deployment Steps

### Option 1: Deploy via Hostinger Git Deployment (Recommended)

1. **Enable Git in Hostinger hPanel:**
   - Log in to hPanel → Advanced → Git
   - Configure repository settings
   - Set deployment path to `public_html` or a subdirectory

2. **Set up the repository:**
   ```bash
   cd C:\Users\ai9\Desktop\mistakingkitchen-app
   git init
   git add .
   git commit -m "Mista King Kitchen Node.js app"
   git remote add origin https://github.com/nenifix/mistakingkitchen.git
   git push -u origin main
   ```

3. **In Hostinger hPanel → Node.js:**
   - Select Node.js version 18+
   - Set application root: `public_html/mistakingkitchen-app`
   - Set application startup file: `server.js`
   - Set application URL to your domain
   - Click "Enable" and "Save"

4. **Install dependencies on Hostinger:**
   - Go to hPanel → Terminal (or SSH)
   ```bash
   cd ~/public_html/mistakingkitchen-app
   npm install --production
   ```

5. **Restart the app:**
   - In hPanel → Node.js → click "Restart"

### Option 2: Deploy via FTP/SFTP

1. **Install dependencies locally first:**
   ```bash
   cd C:\Users\ai9\Desktop\mistakingkitchen-app
   npm install --production
   ```

2. **Upload via FileZilla or Hostinger File Manager:**
   - Upload the entire folder to `public_html/mistakingkitchen-app`
   - Make sure `node_modules` is included

3. **Configure Node.js in hPanel:**
   - Go to hPanel → Advanced → Node.js
   - Set root directory, startup file, and port
   - Enable and restart

### Option 3: Deploy via SSH

```bash
# Connect to Hostinger via SSH
ssh youruser@yourdomain.com

# Clone the repo
cd ~
git clone https://github.com/nenifix/mistakingkitchen.git mistakingkitchen-app

# Install dependencies
cd mistakingkitchen-app
npm install --production

# Set up in hPanel Node.js section to point to this directory
```

## Contact Form Setup (Optional Enhancement)

By default, the form shows a success message on the frontend. To actually **receive emails**, integrate one of these:

### Option A: Hostinger SMTP (Recommended)
Edit `.env` with your Hostinger email credentials:
```
SMTP_HOST=smtp.hostinger.com
SMTP_PORT=587
SMTP_USER=your@yourdomain.com
SMTP_PASS=yourpassword
CONTACT_TO=godwintext@gmail.com
```

Then install `nodemailer` and update `server.js` to use it.

### Option B: SendGrid
```
SENDGRID_API_KEY=SG.xxx
CONTACT_TO=godwintext@gmail.com
```

### Option C: Formspree (Easiest, no code changes)
1. Go to https://formspree.io and create a free form
2. Replace the form action in `index.html`:
```html
<form action="https://formspree.io/f/YOUR_FORM_ID" method="POST">
```
3. Remove the JavaScript form handler

## File Structure
```
mistakingkitchen-app/
├── server.js          # Express server
├── package.json       # Dependencies
├── .env               # Environment variables (create from .env.example)
├── .env.example       # Template for .env
├── .gitignore         # Git ignore rules
├── public/
│   └── index.html     # The complete landing page
└── README.md          # This file
```

## Environment Variables
| Variable | Description | Default |
|----------|-------------|---------|
| PORT | Server port | 3000 |
| SMTP_HOST | Email server host | — |
| SMTP_PORT | Email server port | 587 |
| SMTP_USER | Email username | — |
| SMTP_PASS | Email password | — |
| CONTACT_TO | Where to send contact form messages | godwintext@gmail.com |

## Troubleshooting

### App shows "Unable to connect"
- Check that Node.js is enabled in hPanel
- Verify `server.js` is the startup file
- Check the port matches what Hostinger expects

### 502 Bad Gateway
- App may have crashed. Check logs in hPanel → Node.js → Logs
- Run `npm install` again in the app directory

### Node modules not found
```bash
cd ~/public_html/mistakingkitchen-app
rm -rf node_modules
npm install --production
```

### Port already in error logs
Hostinger sets the PORT environment variable automatically. Don't hardcode it.

## Updating the Site
```bash
cd C:\Users\ai9\Desktop\mistakingkitchen-app
# Edit files as needed
git add .
git commit -m "Update message"
git push
# Then on Hostinger: git pull or use hPanel Git deployment
```

## Support
- Mista King Kitchen: godwintext@gmail.com
- Instagram: @MISTA_KING_SHAWARMA
- Phone: 053 046 0039 | 055 171 3849

require('dotenv').config();
const express = require('express');
const compression = require('compression');
const cors = require('cors');
const path = require('path');
const { spawn } = require('child_process');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;
const PB_PORT = process.env.PB_PORT || 8090;
const PB_DIR = path.join(__dirname, 'pocketbase');
const PB_DATA_DIR = path.join(PB_DIR, 'pb_data');

// --- Start PocketBase ---
let pbProcess = null;

function startPocketBase() {
    const pbBinary = path.join(PB_DIR, process.platform === 'win32' ? 'pocketbase.exe' : 'pocketbase');

    if (!fs.existsSync(pbBinary)) {
        console.log('[PocketBase] Binary not found at:', pbBinary);
        console.log('[PocketBase] Please download PocketBase from https://pocketbase.io/docs/');
        console.log('[PocketBase] Place the binary in:', PB_DIR);
        return;
    }

    // Create data directory if not exists
    if (!fs.existsSync(PB_DATA_DIR)) {
        fs.mkdirSync(PB_DATA_DIR, { recursive: true });
    }

    pbProcess = spawn(pbBinary, ['serve', '--http', `127.0.0.1:${PB_PORT}`], {
        cwd: PB_DIR,
        stdio: ['ignore', 'pipe', 'pipe']
    });

    pbProcess.stdout.on('data', (d) => {
        const s = d.toString().trim();
        if (s) console.log('[PB]', s);
    });
    pbProcess.stderr.on('data', (d) => {
        const s = d.toString().trim();
        if (s) console.error('[PB ERR]', s);
    });
    pbProcess.on('exit', (code) => {
        console.log(`[PocketBase] Exited with code ${code}`);
        pbProcess = null;
    });

    console.log(`[PocketBase] Starting on port ${PB_PORT}...`);
}

// --- Middleware ---
app.use(compression());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// --- Security headers ---
app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    next();
});

// --- Proxy PocketBase API and Admin ---
// Forward /api/* and /_/* to PocketBase
app.use('/api/pb', async (req, res) => {
    try {
        const pbUrl = `http://127.0.0.1:${PB_PORT}${req.url}`;
        const response = await fetch(pbUrl, {
            method: req.method,
            headers: { 'Content-Type': 'application/json' },
            body: req.method !== 'GET' ? JSON.stringify(req.body) : undefined
        });
        const data = await response.text();
        res.status(response.status).set('Content-Type', 'application/json').send(data);
    } catch (e) {
        res.status(502).json({ error: 'PocketBase not available', message: e.message });
    }
});

app.use('/_/pb', async (req, res) => {
    try {
        const pbUrl = `http://127.0.0.1:${PB_PORT}/_${req.url}`;
        const response = await fetch(pbUrl, {
            method: req.method,
            headers: { 'Content-Type': 'application/json' },
            body: req.method !== 'GET' ? JSON.stringify(req.body) : undefined
        });
        const data = await response.text();
        res.status(response.status).send(data);
    } catch (e) {
        res.status(502).send('PocketBase not available');
    }
});

// --- Serve static files from /public ---
app.use(express.static(path.join(__dirname, 'public'), {
    maxAge: '1d',
    etag: true
}));

// --- Health check ---
app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        app: 'Mista King Kitchen',
        pocketbase: pbProcess ? 'running' : 'not running',
        email: process.env.SENDGRID_API_KEY ? 'SendGrid configured' : 'not configured',
        timestamp: new Date().toISOString()
    });
});

// --- Contact form endpoint (SendGrid) ---
app.post('/api/contact', async (req, res) => {
    const { name, email, phone, message } = req.body;

    if (!name || !email || !message) {
        return res.status(400).json({ success: false, error: 'Name, email, and message are required.' });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        return res.status(400).json({ success: false, error: 'Please enter a valid email address.' });
    }

    const toEmail = process.env.CONTACT_TO || 'godwintext@gmail.com';
    const fromEmail = process.env.FROM_EMAIL || 'noreply@mistakingkitchen.com';

    const htmlBody = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: #D00000; color: white; padding: 20px; border-radius: 12px 12px 0 0; text-align: center;">
                <h1 style="margin: 0; font-size: 22px;">MISTA KING KITCHEN</h1>
                <p style="margin: 5px 0 0; font-size: 13px; opacity: 0.9;">New Website Message</p>
            </div>
            <div style="background: #f9f9f9; padding: 24px; border: 1px solid #eee; border-top: none; border-radius: 0 0 12px 12px;">
                <table style="width: 100%; border-collapse: collapse;">
                    <tr><td style="padding: 8px 0; color: #888; font-size: 13px; width: 100px;">Name:</td><td style="padding: 8px 0; font-weight: bold; font-size: 14px;">${name}</td></tr>
                    <tr><td style="padding: 8px 0; color: #888; font-size: 13px;">Email:</td><td style="padding: 8px 0; font-size: 14px;"><a href="mailto:${email}">${email}</a></td></tr>
                    ${phone ? `<tr><td style="padding: 8px 0; color: #888; font-size: 13px;">Phone:</td><td style="padding: 8px 0; font-size: 14px;"><a href="tel:${phone}">${phone}</a></td></tr>` : ''}
                </table>
                <div style="margin-top: 20px; padding: 16px; background: white; border-radius: 8px; border-left: 4px solid #D00000;">
                    <p style="margin: 0 0 8px; color: #888; font-size: 12px; text-transform: uppercase; letter-spacing: 1px;">Message</p>
                    <p style="margin: 0; font-size: 14px; line-height: 1.6; white-space: pre-wrap;">${message.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</p>
                </div>
                <p style="margin-top: 20px; font-size: 11px; color: #aaa; text-align: center;">Sent from Mista King Kitchen website<br>${new Date().toLocaleString()}</p>
            </div>
        </div>
    `;

    const textBody = [`Name: ${name}`, `Email: ${email}`, phone ? `Phone: ${phone}` : '', '', 'Message:', message].filter(Boolean).join('\n');

    try {
        const sgApiKey = process.env.SENDGRID_API_KEY;

        if (!sgApiKey) {
            console.log(`[CONTACT] ${name} (${email}): ${message}`);
            return res.json({ success: true, message: 'Your message has been received! We\'ll get back to you soon.' });
        }

        const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${sgApiKey}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
                personalizations: [{ to: [{ email: toEmail }], subject: `MKK Website Message from ${name}` }],
                from: { email: fromEmail, name: 'Mista King Kitchen' },
                reply_to: { email: email, name: name },
                content: [{ type: 'text/plain', value: textBody }, { type: 'text/html', value: htmlBody }]
            })
        });

        if (response.ok || response.status === 202) {
            console.log(`[CONTACT] Sent via SendGrid to ${toEmail} from ${name}`);
            res.json({ success: true, message: 'Your message has been sent successfully!' });
        } else {
            const errText = await response.text();
            console.error(`[SENDGRID ERROR] ${response.status}: ${errText}`);
            res.json({ success: true, message: 'Your message has been received!' });
        }
    } catch (err) {
        console.error(`[EMAIL ERROR] ${err.message}`);
        res.status(500).json({ success: false, error: 'Failed to send. Call 053 046 0039.' });
    }
});

// --- Catch-all: serve index.html ---
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// --- Start server ---
app.listen(PORT, '0.0.0.0', () => {
    console.log('\n============================================');
    console.log('  MISTA KING KITCHEN — Server Running');
    console.log(`  Port: ${PORT}`);
    console.log(`  URL:  http://localhost:${PORT}`);
    console.log(`  PocketBase: port ${PB_PORT}`);
    console.log(`  Time: ${new Date().toLocaleString()}`);
    console.log('============================================\n');

    // Start PocketBase after Express is ready
    startPocketBase();
});

// --- Graceful shutdown ---
process.on('SIGINT', () => {
    if (pbProcess) pbProcess.kill();
    process.exit(0);
});
process.on('SIGTERM', () => {
    if (pbProcess) pbProcess.kill();
    process.exit(0);
});

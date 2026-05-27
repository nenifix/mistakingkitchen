require('dotenv').config();
const express = require('express');
const compression = require('compression');
const cors = require('cors');
const nodemailer = require('nodemailer');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

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

// --- Serve static files from /public ---
app.use(express.static(path.join(__dirname, 'public'), {
    maxAge: '1d',
    etag: true
}));

// --- Create email transporter ---
// Uses Hostinger SMTP by default, falls back to other configured SMTP
function createTransporter() {
    const smtpHost = process.env.SMTP_HOST;
    const smtpPort = parseInt(process.env.SMTP_PORT) || 587;
    const smtpUser = process.env.SMTP_USER;
    const smtpPass = process.env.SMTP_PASS;

    if (smtpHost && smtpUser && smtpPass) {
        console.log(`[EMAIL] Using SMTP: ${smtpHost}:${smtpPort} as ${smtpUser}`);
        return nodemailer.createTransport({
            host: smtpHost,
            port: smtpPort,
            secure: smtpPort === 465,
            auth: { user: smtpUser, pass: smtpPass }
        });
    }

    // Fallback: create a fake transporter that logs to console
    console.log('[EMAIL] No SMTP configured — messages will be logged to console only.');
    console.log('[EMAIL] Set SMTP_HOST, SMTP_USER, SMTP_PASS in .env to enable email delivery.');
    return null;
}

const transporter = createTransporter();

// --- Health check endpoint ---
app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        app: 'Mista King Kitchen',
        email: transporter ? 'configured' : 'not configured (console only)',
        timestamp: new Date().toISOString()
    });
});

// --- Contact form endpoint ---
app.post('/api/contact', async (req, res) => {
    const { name, email, phone, message } = req.body;

    // Validate required fields
    if (!name || !email || !message) {
        return res.status(400).json({
            success: false,
            error: 'Name, email, and message are required.'
        });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        return res.status(400).json({
            success: false,
            error: 'Please enter a valid email address.'
        });
    }

    const toEmail = process.env.CONTACT_TO || 'godwintext@gmail.com';

    const mailOptions = {
        from: `"Mista King Kitchen Website" <${process.env.SMTP_USER || 'noreply@mistakingkitchen.com'}>`,
        to: toEmail,
        replyTo: email,
        subject: `MKK Website Message from ${name}`,
        text: [
            `Name: ${name}`,
            `Email: ${email}`,
            phone ? `Phone: ${phone}` : '',
            '',
            'Message:',
            message
        ].filter(Boolean).join('\n'),
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <div style="background: #D00000; color: white; padding: 20px; border-radius: 12px 12px 0 0; text-align: center;">
                    <h1 style="margin: 0; font-size: 22px;">MISTA KING KITCHEN</h1>
                    <p style="margin: 5px 0 0; font-size: 13px; opacity: 0.9;">New Website Message</p>
                </div>
                <div style="background: #f9f9f9; padding: 24px; border: 1px solid #eee; border-top: none; border-radius: 0 0 12px 12px;">
                    <table style="width: 100%; border-collapse: collapse;">
                        <tr>
                            <td style="padding: 8px 0; color: #888; font-size: 13px; width: 100px;">Name:</td>
                            <td style="padding: 8px 0; font-weight: bold; font-size: 14px;">${name}</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px 0; color: #888; font-size: 13px;">Email:</td>
                            <td style="padding: 8px 0; font-size: 14px;"><a href="mailto:${email}">${email}</a></td>
                        </tr>
                        ${phone ? `
                        <tr>
                            <td style="padding: 8px 0; color: #888; font-size: 13px;">Phone:</td>
                            <td style="padding: 8px 0; font-size: 14px;"><a href="tel:${phone}">${phone}</a></td>
                        </tr>` : ''}
                    </table>
                    <div style="margin-top: 20px; padding: 16px; background: white; border-radius: 8px; border-left: 4px solid #D00000;">
                        <p style="margin: 0 0 8px; color: #888; font-size: 12px; text-transform: uppercase; letter-spacing: 1px;">Message</p>
                        <p style="margin: 0; font-size: 14px; line-height: 1.6; white-space: pre-wrap;">${message}</p>
                    </div>
                    <p style="margin-top: 20px; font-size: 11px; color: #aaa; text-align:center;">
                        Sent from Mista King Kitchen website contact form<br>
                        ${new Date().toLocaleString()}
                    </p>
                </div>
            </div>
        `
    };

    try {
        if (transporter) {
            await transporter.sendMail(mailOptions);
            console.log(`[CONTACT] Email sent to ${toEmail} from ${name} (${email})`);
        } else {
            // Log to console when SMTP not configured
            console.log('──────────────────────────────────');
            console.log(`[CONTACT] New message from ${name} (${email})${phone ? ' — ' + phone : ''}`);
            console.log(`[CONTACT] Message: ${message}`);
            console.log(`[CONTACT] Would send to: ${toEmail}`);
            console.log('──────────────────────────────────');
        }

        res.json({
            success: true,
            message: 'Your message has been sent successfully! We\'ll get back to you soon.'
        });
    } catch (err) {
        console.error(`[EMAIL ERROR] ${err.message}`);
        res.status(500).json({
            success: false,
            error: 'Failed to send message. Please try calling us directly at 053 046 0039.'
        });
    }
});

// --- Catch-all: serve index.html for SPA routing ---
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// --- Start server ---
app.listen(PORT, '0.0.0.0', () => {
    console.log('\n============================================');
    console.log('  MISTA KING KITCHEN — Server Running');
    console.log(`  Port: ${PORT}`);
    console.log(`  URL:  http://localhost:${PORT}`);
    console.log(`  Email: ${transporter ? 'SMTP configured' : 'Console only (set .env for email)'}`);
    console.log(`  Time: ${new Date().toLocaleString()}`);
    console.log('============================================\n');
});

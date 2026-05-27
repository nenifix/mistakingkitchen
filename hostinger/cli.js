#!/usr/bin/env node
/**
 * MISTA KING KITCHEN — CLI
 * 
 * Usage:
 *   mkk                    — interactive menu
 *   mkk server start       — start web server
 *   mkk server stop        — stop web server  
 *   mkk server status      — check server status
 *   mkk menu list          — list menu items
 *   mkk menu add           — add menu item (interactive)
 *   mkk menu remove        — remove menu item
 *   mkk contacts list      — list contact form submissions
 *   mkk contacts read      — mark contact as read
 *   mkk contacts reply     — reply to contact via email
 *   mkk branches list      — list branches
 *   mkk branches add       — add branch
 *   mkk pb start           — start PocketBase
 *   mkk pb stop            — stop PocketBase
 *   mkk pb status          — PocketBase status
 *   mkk pb admin           — create admin user
 *   mkk setup              — full setup wizard
 *   mkk status             — full system status
 */

const { Command } = require('commander');
const inquirer = require('inquirer');
const chalk = require('chalk');
const Table = require('cli-table3');
const ora = require('ora');
const { spawn, execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const http = require('http');

const APP_DIR = path.join(__dirname);
const PB_DIR = path.join(APP_DIR, 'pocketbase');
const PB_DATA_DIR = path.join(PB_DIR, 'pb_data');
const PB_URL = 'http://127.0.0.1:8090';
const APP_URL = 'http://127.0.0.1:3000';

// ─── Helpers ───────────────────────────────────────────────

function pbRequest(method, path, body, token) {
    return new Promise((resolve, reject) => {
        const data = body ? JSON.stringify(body) : '';
        const req = http.request({
            hostname: '127.0.0.1',
            port: 8090,
            path,
            method,
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(data),
                ...(token ? { 'Authorization': `Bearer ${token}` } : {})
            }
        }, (res) => {
            let chunks = '';
            res.on('data', d => chunks += d);
            res.on('end', () => {
                try { resolve({ status: res.statusCode, data: JSON.parse(chunks) }); }
                catch { resolve({ status: res.statusCode, data: chunks }); }
            });
        });
        req.on('error', reject);
        if (data) req.write(data);
        req.end();
    });
}

async function getAdminToken() {
    const envFile = path.join(APP_DIR, '.env');
    let email = 'info@nenifix.com';
    let password = 'nenifix2mkk';
    
    if (fs.existsSync(envFile)) {
        const env = fs.readFileSync(envFile, 'utf8');
        const em = env.match(/PB_ADMIN_EMAIL=(.+)/);
        const pm = env.match(/PB_ADMIN_PASSWORD=(.+)/);
        if (em) email = em[1].trim();
        if (pm) password = pm[1].trim();
    }

    const res = await pbRequest('POST', '/api/admins/auth-with-password', {
        identity: email, password
    });
    return res.data?.token || null;
}

function printTable(headers, rows) {
    const table = new Table({
        head: headers.map(h => chalk.cyan(h)),
        style: { head: [], border: [] }
    });
    rows.forEach(r => table.push(r));
    console.log(table.toString());
}

function log(msg) { console.log(chalk.gray(`[${new Date().toLocaleTimeString()}]`), msg); }
function ok(msg) { console.log(chalk.green('✓'), msg); }
function err(msg) { console.log(chalk.red('✗'), msg); }
function warn(msg) { console.log(chalk.yellow('⚠'), msg); }
function info(msg) { console.log(chalk.blue('ℹ'), msg); }

function checkPort(port) {
    return new Promise((resolve) => {
        const req = http.get(`http://127.0.0.1:${port}/api/health`, (res) => {
            resolve(res.statusCode < 500);
        });
        req.on('error', () => resolve(false));
        req.setTimeout(2000, () => { req.destroy(); resolve(false); });
    });
}

// ─── Program ───────────────────────────────────────────────

const program = new Command();

program
    .name('mkk')
    .description('Mista King Kitchen — CLI Management')
    .version('2.0.0');

// ─── STATUS ────────────────────────────────────────────────

program
    .command('status')
    .description('Full system status')
    .action(async () => {
        console.log(chalk.bold.red('\n  MISTA KING KITCHEN — System Status\n'));

        const spinner = ora('Checking services...').start();

        const [appUp, pbUp] = await Promise.all([
            checkPort(3000),
            checkPort(8090)
        ]);

        spinner.stop();

        const services = [
            ['Web Server', '3000', appUp ? chalk.green('RUNNING') : chalk.red('STOPPED')],
            ['PocketBase', '8090', pbUp ? chalk.green('RUNNING') : chalk.red('STOPPED')],
        ];

        printTable(['Service', 'Port', 'Status'], services);

        // Check .env
        const envExists = fs.existsSync(path.join(APP_DIR, '.env'));
        console.log(`\n  ${envExists ? chalk.green('✓') : chalk.red('✗')} .env file ${envExists ? 'exists' : 'missing'}`);

        // Check PB binary
        const pbBinary = path.join(PB_DIR, process.platform === 'win32' ? 'pocketbase.exe' : 'pocketbase');
        const pbExists = fs.existsSync(pbBinary);
        console.log(`  ${pbExists ? chalk.green('✓') : chalk.red('✗')} PocketBase binary ${pbExists ? 'found' : 'missing'}`);

        // Check PB data
        const pbDataExists = fs.existsSync(PB_DATA_DIR);
        console.log(`  ${pbDataExists ? chalk.green('✓') : chalk.red('✗')} PocketBase data ${pbDataExists ? 'exists' : 'missing'}`);

        // Check node_modules
        const nmExists = fs.existsSync(path.join(APP_DIR, 'node_modules'));
        console.log(`  ${nmExists ? chalk.green('✓') : chalk.red('✗')} node_modules ${nmExists ? 'installed' : 'missing'}`);

        console.log();
    });

// ─── SERVER ────────────────────────────────────────────────

const serverCmd = program.command('server').description('Web server management');

serverCmd
    .command('start')
    .description('Start the web server')
    .action(() => {
        const spinner = ora('Starting MKK server...').start();
        const child = spawn('node', ['server.js'], {
            cwd: APP_DIR,
            detached: true,
            stdio: 'ignore'
        });
        child.unref();
        setTimeout(() => {
            spinner.succeed(`Server started (PID: ${child.pid})`);
            log(`URL: ${APP_URL}`);
            log(`Admin: ${APP_URL}/_/`);
        }, 2000);
    });

serverCmd
    .command('stop')
    .description('Stop the web server')
    .action(() => {
        try {
            if (process.platform === 'win32') {
                execSync('taskkill /F /IM node.exe /FI "WINDOWTITLE eq mkk*" 2>nul || taskkill /F /IM node.exe 2>nul', { stdio: 'pipe' });
            } else {
                execSync('pkill -f "node server.js" 2>/dev/null || true', { stdio: 'pipe' });
            }
            ok('Server stopped');
        } catch (e) {
            warn('Server was not running or could not be stopped');
        }
    });

serverCmd
    .command('status')
    .description('Check web server status')
    .action(async () => {
        const up = await checkPort(3000);
        if (up) {
            ok(`Web server is running at ${APP_URL}`);
        } else {
            err('Web server is not running');
            log('Start with: mkk server start');
        }
    });

// ─── MENU ──────────────────────────────────────────────────

const menuCmd = program.command('menu').description('Menu management');

menuCmd
    .command('list')
    .description('List all menu items')
    .action(async () => {
        const spinner = ora('Fetching menu items...').start();
        try {
            const token = await getAdminToken();
            if (!token) { spinner.fail('PocketBase not available or admin not configured'); return; }

            const res = await pbRequest('GET', '/api/collections/menu_items/records?perPage=100', null, token);
            spinner.stop();

            if (!res.data?.items?.length) {
                warn('No menu items found. Add some with: mkk menu add');
                return;
            }

            const rows = res.data.items.map(item => [
                item.id.substring(0, 8),
                item.name || '-',
                item.category || '-',
                item.price ? `${item.price} GHS` : 'Available',
                item.tag || '-',
                item.rating || '-'
            ]);

            printTable(['ID', 'Name', 'Category', 'Price', 'Tag', 'Rating'], rows);
            console.log(`\n  ${res.data.items.length} menu item(s)\n`);
        } catch (e) {
            spinner.fail('Error: ' + e.message);
        }
    });

menuCmd
    .command('add')
    .description('Add a new menu item (interactive)')
    .action(async () => {
        const answers = await inquirer.prompt([
            { name: 'name', message: 'Item name:', validate: v => v.length > 0 },
            { name: 'category', message: 'Category:', type: 'list', choices: ['Rice', 'Noodles', 'Shawarma', 'Pizza', 'Drinks', 'Other'] },
            { name: 'price', message: 'Price (GHS, or "Available"):', default: 'Available' },
            { name: 'tag', message: 'Tag:', type: 'list', choices: ['Customer Favorite', 'Signature', 'Fresh & Spicy', 'Classic', 'House Special', 'Popular', 'Drinks', ''] },
            { name: 'description', message: 'Description:' },
            { name: 'rating', message: 'Rating (1-5):', default: '4.8', validate: v => !isNaN(v) && v >= 1 && v <= 5 }
        ]);

        const spinner = ora('Adding menu item...').start();
        try {
            const token = await getAdminToken();
            if (!token) { spinner.fail('PocketBase not available'); return; }

            const body = {
                name: answers.name,
                category: answers.category,
                price: answers.price.toLowerCase() === 'available' ? null : parseFloat(answers.price),
                tag: answers.tag || '',
                description: answers.description || '',
                rating: parseFloat(answers.rating)
            };

            const res = await pbRequest('POST', '/api/collections/menu_items/records', body, token);
            if (res.status === 200) {
                ok(`Added: ${answers.name}`);
            } else {
                err(`Failed: ${JSON.stringify(res.data)}`);
            }
        } catch (e) {
            spinner.fail('Error: ' + e.message);
        }
    });

menuCmd
    .command('remove <id>')
    .description('Remove a menu item by ID')
    .action(async (id) => {
        const spinner = ora('Removing menu item...').start();
        try {
            const token = await getAdminToken();
            if (!token) { spinner.fail('PocketBase not available'); return; }

            const res = await pbRequest('DELETE', `/api/collections/menu_items/records/${id}`, null, token);
            if (res.status === 204) {
                ok(`Removed item ${id}`);
            } else {
                err(`Failed: ${JSON.stringify(res.data)}`);
            }
        } catch (e) {
            spinner.fail('Error: ' + e.message);
        }
    });

// ─── CONTACTS ──────────────────────────────────────────────

const contactsCmd = program.command('contacts').description('Contact form submissions');

contactsCmd
    .command('list')
    .description('List contact form submissions')
    .option('-s, --status <status>', 'Filter by status: new, read, replied')
    .option('-l, --limit <n>', 'Limit results', '20')
    .action(async (opts) => {
        const spinner = ora('Fetching contacts...').start();
        try {
            const token = await getAdminToken();
            if (!token) { spinner.fail('PocketBase not available'); return; }

            let filter = '';
            if (opts.status) filter = `status="${opts.status}"`;

            const res = await pbRequest('GET', `/api/collections/messages/records?perPage=${opts.limit}&filter=${encodeURIComponent(filter)}`, null, token);
            spinner.stop();

            if (!res.data?.items?.length) {
                warn('No contact submissions found');
                return;
            }

            const rows = res.data.items.map(item => [
                item.id.substring(0, 8),
                item.name || '-',
                item.email || '-',
                (item.message || '').substring(0, 40) + '...',
                item.status === 'new' ? chalk.red(item.status) : item.status === 'read' ? chalk.yellow(item.status) : chalk.green(item.status),
                new Date(item.created).toLocaleDateString()
            ]);

            printTable(['ID', 'Name', 'Email', 'Message', 'Status', 'Date'], rows);
            console.log(`\n  ${res.data.items.length} submission(s)\n`);
        } catch (e) {
            spinner.fail('Error: ' + e.message);
        }
    });

contactsCmd
    .command('read <id>')
    .description('View a contact submission')
    .action(async (id) => {
        try {
            const token = await getAdminToken();
            if (!token) { err('PocketBase not available'); return; }

            const res = await pbRequest('GET', `/api/collections/messages/records/${id}`, null, token);
            if (res.status !== 200) { err('Not found'); return; }

            const item = res.data;
            console.log(chalk.bold('\n  Contact Submission\n'));
            console.log(`  ${chalk.cyan('Name:')}    ${item.name}`);
            console.log(`  ${chalk.cyan('Email:')}   ${item.email}`);
            console.log(`  ${chalk.cyan('Phone:')}   ${item.phone || '-'}`);
            console.log(`  ${chalk.cyan('Status:')}  ${item.status}`);
            console.log(`  ${chalk.cyan('Date:')}    ${new Date(item.created).toLocaleString()}`);
            console.log(`  ${chalk.cyan('Message:')}`);
            console.log(`  ${item.message}`);
            console.log();

            // Mark as read
            if (item.status === 'new') {
                await pbRequest('PATCH', `/api/collections/messages/records/${id}`, { status: 'read' }, token);
                ok('Marked as read');
            }
        } catch (e) {
            err('Error: ' + e.message);
        }
    });

contactsCmd
    .command('reply <id>')
    .description('Reply to a contact (opens email client)')
    .action(async (id) => {
        try {
            const token = await getAdminToken();
            if (!token) { err('PocketBase not available'); return; }

            const res = await pbRequest('GET', `/api/collections/messages/records/${id}`, null, token);
            if (res.status !== 200) { err('Not found'); return; }

            const item = res.data;
            const subject = encodeURIComponent(`Re: MKK Website Message from ${item.name}`);
            const body = encodeURIComponent(`Hi ${item.name},\n\nThank you for contacting Mista King Kitchen!\n\n---\nYour original message:\n${item.message}`);

            console.log(`\n  Open your email client to reply to ${item.name} (${item.email})`);
            console.log(`  Subject: Re: MKK Website Message from ${item.name}`);
            console.log(`\n  mailto:${item.email}?subject=${subject}&body=${body}\n`);

            // Mark as replied
            await pbRequest('PATCH', `/api/collections/messages/records/${id}`, { status: 'replied' }, token);
            ok('Marked as replied');
        } catch (e) {
            err('Error: ' + e.message);
        }
    });

// ─── BRANCHES ──────────────────────────────────────────────

const branchesCmd = program.command('branches').description('Branch management');

branchesCmd
    .command('list')
    .description('List all branches')
    .action(async () => {
        const spinner = ora('Fetching branches...').start();
        try {
            const token = await getAdminToken();
            if (!token) { spinner.fail('PocketBase not available'); return; }

            const res = await pbRequest('GET', '/api/collections/branches/records?perPage=100', null, token);
            spinner.stop();

            if (!res.data?.items?.length) {
                warn('No branches found');
                return;
            }

            const rows = res.data.items.map(b => [
                b.id.substring(0, 8),
                b.name || '-',
                b.address || '-',
                b.phone || '-',
                b.hours || '11AM-10PM'
            ]);

            printTable(['ID', 'Name', 'Address', 'Phone', 'Hours'], rows);
        } catch (e) {
            spinner.fail('Error: ' + e.message);
        }
    });

branchesCmd
    .command('add')
    .description('Add a new branch (interactive)')
    .action(async () => {
        const answers = await inquirer.prompt([
            { name: 'name', message: 'Branch name:', validate: v => v.length > 0 },
            { name: 'address', message: 'Address:', validate: v => v.length > 0 },
            { name: 'phone', message: 'Phone:' },
            { name: 'hours', message: 'Operating hours:', default: '11:00 AM – 10:00 PM' }
        ]);

        const spinner = ora('Adding branch...').start();
        try {
            const token = await getAdminToken();
            if (!token) { spinner.fail('PocketBase not available'); return; }

            const res = await pbRequest('POST', '/api/collections/branches/records', answers, token);
            if (res.status === 200) {
                ok(`Added branch: ${answers.name}`);
            } else {
                err(`Failed: ${JSON.stringify(res.data)}`);
            }
        } catch (e) {
            spinner.fail('Error: ' + e.message);
        }
    });

// ─── POCKETBASE ────────────────────────────────────────────

const pbCmd = program.command('pb').description('PocketBase management');

pbCmd
    .command('start')
    .description('Start PocketBase server')
    .action(() => {
        const pbBinary = path.join(PB_DIR, process.platform === 'win32' ? 'pocketbase.exe' : 'pocketbase');
        if (!fs.existsSync(pbBinary)) {
            err('PocketBase binary not found. Run: mkk setup');
            return;
        }

        const spinner = ora('Starting PocketBase...').start();
        const child = spawn(pbBinary, ['serve', '--http', '127.0.0.1:8090'], {
            cwd: PB_DIR,
            detached: true,
            stdio: 'ignore'
        });
        child.unref();

        setTimeout(() => {
            spinner.succeed(`PocketBase started (PID: ${child.pid})`);
            log(`Admin: ${PB_URL}/_/`);
        }, 2000);
    });

pbCmd
    .command('stop')
    .description('Stop PocketBase server')
    .action(() => {
        try {
            if (process.platform === 'win32') {
                execSync('taskkill /F /IM pocketbase.exe 2>nul', { stdio: 'pipe' });
            } else {
                execSync('pkill -f "pocketbase serve" 2>/dev/null || true', { stdio: 'pipe' });
            }
            ok('PocketBase stopped');
        } catch (e) {
            warn('PocketBase was not running');
        }
    });

pbCmd
    .command('status')
    .description('Check PocketBase status')
    .action(async () => {
        const up = await checkPort(8090);
        if (up) {
            ok(`PocketBase is running at ${PB_URL}`);
            log(`Admin: ${PB_URL}/_/`);
        } else {
            err('PocketBase is not running');
            log('Start with: mkk pb start');
        }
    });

pbCmd
    .command('admin')
    .description('Create admin user')
    .action(async () => {
        const spinner = ora('Creating admin user...').start();
        try {
            const res = await pbRequest('POST', '/api/admins', {
                email: 'info@nenifix.com',
                password: 'nenifix2mkk',
                passwordConfirm: 'nenifix2mkk'
            });

            if (res.status === 200) {
                ok('Admin user created');
                log('Email:    info@nenifix.com');
                log('Password: nenifix2mkk');
                log(`Login:    ${PB_URL}/_/`);
            } else if (res.data?.data?.code === 400) {
                warn('Admin user may already exist');
            } else {
                err(`Failed: ${JSON.stringify(res.data)}`);
            }
        } catch (e) {
            spinner.fail('Error: ' + e.message);
        }
    });

pbCmd
    .command('setup')
    .description('Setup PocketBase collections')
    .action(async () => {
        const spinner = ora('Setting up collections...').start();
        try {
            const token = await getAdminToken();
            if (!token) { spinner.fail('Admin not available. Run: mkk pb admin'); return; }

            // Messages collection
            const msgRes = await pbRequest('POST', '/api/collections', {
                name: 'messages',
                type: 'base',
                schema: [
                    { name: 'name', type: 'text', required: true },
                    { name: 'email', type: 'email', required: true },
                    { name: 'phone', type: 'text', required: false },
                    { name: 'message', type: 'text', required: true },
                    { name: 'status', type: 'select', options: { select: ['new', 'read', 'replied'] }, required: true }
                ],
                listRule: '', viewRule: '', createRule: '', updateRule: '', deleteRule: ''
            }, token);

            if (msgRes.status === 200) ok('Created messages collection');
            else if (msgRes.data?.data?.code === 400) warn('Messages collection already exists');
            else err(`Messages: ${JSON.stringify(msgRes.data)}`);

            // Menu items collection
            const menuRes = await pbRequest('POST', '/api/collections', {
                name: 'menu_items',
                type: 'base',
                schema: [
                    { name: 'name', type: 'text', required: true },
                    { name: 'category', type: 'text', required: false },
                    { name: 'price', type: 'number', required: false },
                    { name: 'tag', type: 'text', required: false },
                    { name: 'description', type: 'text', required: false },
                    { name: 'rating', type: 'number', required: false }
                ],
                listRule: '', viewRule: '', createRule: '', updateRule: '', deleteRule: ''
            }, token);

            if (menuRes.status === 200) ok('Created menu_items collection');
            else if (menuRes.data?.data?.code === 400) warn('Menu items collection already exists');
            else err(`Menu items: ${JSON.stringify(menuRes.data)}`);

            // Branches collection
            const branchRes = await pbRequest('POST', '/api/collections', {
                name: 'branches',
                type: 'base',
                schema: [
                    { name: 'name', type: 'text', required: true },
                    { name: 'address', type: 'text', required: true },
                    { name: 'phone', type: 'text', required: false },
                    { name: 'hours', type: 'text', required: false }
                ],
                listRule: '', viewRule: '', createRule: '', updateRule: '', deleteRule: ''
            }, token);

            if (branchRes.status === 200) ok('Created branches collection');
            else if (branchRes.data?.data?.code === 400) warn('Branches collection already exists');
            else err(`Branches: ${JSON.stringify(branchRes.data)}`);

            spinner.succeed('Collections setup complete');
        } catch (e) {
            spinner.fail('Error: ' + e.message);
        }
    });

// ─── SETUP WIZARD ──────────────────────────────────────────

program
    .command('setup')
    .description('Full setup wizard')
    .action(async () => {
        console.log(chalk.bold.red('\n  MISTA KING KITCHEN — Setup Wizard\n'));

        const steps = [
            { name: 'Install dependencies', fn: () => execSync('npm install', { cwd: APP_DIR, stdio: 'pipe' }) },
            { name: 'Create .env', fn: () => {
                if (!fs.existsSync(path.join(APP_DIR, '.env'))) {
                    fs.copyFileSync(path.join(APP_DIR, '.env.example'), path.join(APP_DIR, '.env'));
                }
            }},
            { name: 'Download PocketBase', fn: () => {
                const pbBinary = path.join(PB_DIR, process.platform === 'win32' ? 'pocketbase.exe' : 'pocketbase');
                if (!fs.existsSync(pbBinary)) {
                    warn('Please download PocketBase from https://pocketbase.io/docs/');
                    warn(`Place binary in: ${PB_DIR}`);
                }
            }},
        ];

        for (const step of steps) {
            const spinner = ora(step.name).start();
            try {
                step.fn();
                spinner.succeed(step.name);
            } catch (e) {
                spinner.warn(`${step.name}: ${e.message}`);
            }
        }

        console.log(chalk.bold('\n  Setup complete!\n'));
        log('Next steps:');
        log('  1. mkk pb start     — Start PocketBase');
        log('  2. mkk pb admin     — Create admin user');
        log('  3. mkk pb setup     — Create collections');
        log('  4. mkk server start — Start web server');
        log('');
    });

// ─── INTERACTIVE MODE ──────────────────────────────────────

program
    .command('interactive', { isDefault: true })
    .description('Interactive menu (default)')
    .action(async () => {
        console.log(chalk.bold.red('\n  👑 MISTA KING KITCHEN — Admin CLI\n'));

        const { action } = await inquirer.prompt([{
            name: 'action',
            type: 'list',
            message: 'What do you want to do?',
            choices: [
                { name: '📊 System Status', value: 'status' },
                { name: '🌐 Web Server', value: 'server' },
                { name: '📋 Menu Management', value: 'menu' },
                { name: '📧 Contact Submissions', value: 'contacts' },
                { name: '🏪 Branches', value: 'branches' },
                { name: '🗄️  PocketBase', value: 'pb' },
                { name: '⚙️  Full Setup', value: 'setup' },
                { name: '❌ Exit', value: 'exit' }
            ]
        }]);

        switch (action) {
            case 'status':
                await program.parseAsync(['node', 'mkk', 'status']);
                break;
            case 'server':
                const { serverAction } = await inquirer.prompt([{
                    name: 'serverAction', type: 'list', message: 'Web server:', choices: [
                        { name: 'Start', value: 'start' },
                        { name: 'Stop', value: 'stop' },
                        { name: 'Status', value: 'status' }
                    ]
                }]);
                await program.parseAsync(['node', 'mkk', 'server', serverAction]);
                break;
            case 'menu':
                const { menuAction } = await inquirer.prompt([{
                    name: 'menuAction', type: 'list', message: 'Menu:', choices: [
                        { name: 'List items', value: 'list' },
                        { name: 'Add item', value: 'add' },
                        { name: 'Remove item', value: 'remove' }
                    ]
                }]);
                if (menuAction === 'remove') {
                    const { id } = await inquirer.prompt([{ name: 'id', message: 'Item ID:' }]);
                    await program.parseAsync(['node', 'mkk', 'menu', 'remove', id]);
                } else {
                    await program.parseAsync(['node', 'mkk', 'menu', menuAction]);
                }
                break;
            case 'contacts':
                const { contactAction } = await inquirer.prompt([{
                    name: 'contactAction', type: 'list', message: 'Contacts:', choices: [
                        { name: 'List all', value: 'list' },
                        { name: 'View by ID', value: 'read' }
                    ]
                }]);
                if (contactAction === 'read') {
                    const { id } = await inquirer.prompt([{ name: 'id', message: 'Contact ID:' }]);
                    await program.parseAsync(['node', 'mkk', 'contacts', 'read', id]);
                } else {
                    await program.parseAsync(['node', 'mkk', 'contacts', 'list']);
                }
                break;
            case 'branches':
                await program.parseAsync(['node', 'mkk', 'branches', 'list']);
                break;
            case 'pb':
                const { pbAction } = await inquirer.prompt([{
                    name: 'pbAction', type: 'list', message: 'PocketBase:', choices: [
                        { name: 'Start', value: 'start' },
                        { name: 'Stop', value: 'stop' },
                        { name: 'Status', value: 'status' },
                        { name: 'Create admin', value: 'admin' },
                        { name: 'Setup collections', value: 'setup' }
                    ]
                }]);
                await program.parseAsync(['node', 'mkk', 'pb', pbAction]);
                break;
            case 'setup':
                await program.parseAsync(['node', 'mkk', 'setup']);
                break;
            case 'exit':
                console.log(chalk.gray('\n  Goodbye! 👋\n'));
                process.exit(0);
        }

        // Return to menu
        await program.parseAsync(['node', 'mkk', 'interactive']);
    });

// ─── Parse ─────────────────────────────────────────────────

program.parse();

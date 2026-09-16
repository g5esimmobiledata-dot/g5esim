import fs from 'fs/promises';
import path from 'path';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { pathToFileURL } from 'url';

const root = process.cwd();
const outDir = path.join(root, 'docs');
const htmlPath = path.join(outDir, 'G5ESIM_PLATFORM_USER_MANUAL.html');
const pdfPath = path.join(outDir, 'G5ESIM_PLATFORM_USER_MANUAL.pdf');
const today = new Date().toISOString().slice(0, 10);
const execFileAsync = promisify(execFile);

function escapeXml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function svgDataUri(svg) {
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
}

function screenshotSvg({ title, subtitle, nav = [], cards = [], form = [], highlight = '', footer = '' }) {
  const navItems = nav
    .map((item, index) => {
      const y = 100 + index * 42;
      const active = item.active;
      return `
        <rect x="24" y="${y}" width="190" height="30" rx="8" fill="${active ? '#0f766e' : '#101c31'}" opacity="${active ? '1' : '0.82'}"/>
        <text x="44" y="${y + 20}" fill="${active ? '#ffffff' : '#b6c4d8'}" font-size="14">${escapeXml(item.label)}</text>
      `;
    })
    .join('');

  const cardItems = cards
    .map((card, index) => {
      const x = 250 + (index % 3) * 260;
      const y = 108 + Math.floor(index / 3) * 105;
      return `
        <rect x="${x}" y="${y}" width="230" height="78" rx="12" fill="${card.fill || '#f8fafc'}" stroke="#dbe3ef"/>
        <text x="${x + 16}" y="${y + 27}" fill="#475569" font-size="13">${escapeXml(card.label)}</text>
        <text x="${x + 16}" y="${y + 56}" fill="#0f172a" font-size="25" font-weight="700">${escapeXml(card.value)}</text>
      `;
    })
    .join('');

  const formItems = form
    .map((field, index) => {
      const col = index % 2;
      const row = Math.floor(index / 2);
      const x = 250 + col * 390;
      const y = 270 + row * 58;
      return `
        <text x="${x}" y="${y}" fill="#0f172a" font-size="13">${escapeXml(field.label)}</text>
        <rect x="${x}" y="${y + 9}" width="340" height="34" rx="7" fill="${field.fill || '#0b1930'}" stroke="${field.stroke || '#1e3a5f'}"/>
        <text x="${x + 14}" y="${y + 31}" fill="${field.textColor || '#dbeafe'}" font-size="13">${escapeXml(field.value || '')}</text>
      `;
    })
    .join('');

  return svgDataUri(`
    <svg xmlns="http://www.w3.org/2000/svg" width="1100" height="620" viewBox="0 0 1100 620">
      <defs>
        <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="14" stdDeviation="18" flood-color="#0f172a" flood-opacity="0.18"/>
        </filter>
      </defs>
      <rect width="1100" height="620" rx="26" fill="#eaf0f6"/>
      <rect x="34" y="34" width="1032" height="552" rx="22" fill="#ffffff" filter="url(#shadow)"/>
      <rect x="34" y="34" width="1032" height="52" rx="22" fill="#07111f"/>
      <circle cx="62" cy="60" r="6" fill="#ef4444"/>
      <circle cx="82" cy="60" r="6" fill="#f59e0b"/>
      <circle cx="102" cy="60" r="6" fill="#22c55e"/>
      <text x="132" y="66" fill="#dbeafe" font-size="14">G5ESIM Platform</text>
      <rect x="34" y="86" width="205" height="500" fill="#07111f"/>
      <text x="58" y="124" fill="#ffffff" font-size="20" font-weight="700">Menu</text>
      ${navItems}
      <text x="250" y="132" fill="#0f172a" font-size="30" font-weight="700">${escapeXml(title)}</text>
      <text x="250" y="162" fill="#64748b" font-size="15">${escapeXml(subtitle)}</text>
      ${cardItems}
      ${formItems}
      ${
        highlight
          ? `<rect x="250" y="510" width="780" height="46" rx="10" fill="#f0fdfa" stroke="#99f6e4"/><text x="270" y="539" fill="#134e4a" font-size="15" font-weight="700">${escapeXml(highlight)}</text>`
          : ''
      }
      ${footer ? `<text x="250" y="580" fill="#64748b" font-size="13">${escapeXml(footer)}</text>` : ''}
    </svg>
  `);
}

function visual(title, src, caption) {
  return `
    <figure class="manual-shot">
      <img src="${src}" alt="${escapeXml(title)}" />
      <figcaption>${escapeXml(caption)}</figcaption>
    </figure>
  `;
}

const screenshots = {
  adminDashboard: screenshotSvg({
    title: 'Admin Dashboard',
    subtitle: 'Start here to monitor customers, orders, revenue, and service health.',
    nav: [
      { label: 'Dashboard', active: true },
      { label: 'Customers' },
      { label: 'Orders' },
      { label: 'eSIM Packages' },
      { label: "eRoaming's" },
      { label: 'Platform Setup' },
    ],
    cards: [
      { label: 'Customers', value: '1,248' },
      { label: 'Orders Today', value: '82' },
      { label: 'Wallet Top Ups', value: '$4,250' },
      { label: 'Pending DID', value: '6' },
      { label: 'Open Tickets', value: '14' },
      { label: 'Failed Orders', value: '3' },
    ],
    highlight: 'Use the dashboard every day before changing provider, payment, or module settings.',
  }),
  createUser: screenshotSvg({
    title: 'Create New User',
    subtitle: 'Admin creates the customer, then checks modules and wallet.',
    nav: [
      { label: 'Dashboard' },
      { label: 'Customers', active: true },
      { label: 'User' },
      { label: 'Agent' },
      { label: 'Reseller' },
      { label: 'KYC Verification' },
    ],
    form: [
      { label: 'Email', value: 'customer@example.com' },
      { label: 'Name', value: 'John Doe' },
      { label: 'Account Status', value: 'Live' },
      { label: 'Account Type', value: 'User' },
      { label: 'Password', value: 'Set initial password' },
      { label: 'KYC Required', value: 'Yes' },
    ],
    highlight: 'After saving, open Customer Details to enable modules, review wallet, and confirm KYC.',
  }),
  walletTopup: screenshotSvg({
    title: 'Wallet and Fund Top Up',
    subtitle: 'Users add balance by payment gateway or voucher. Admin can adjust manually.',
    nav: [
      { label: 'Dashboard' },
      { label: 'Wallet', active: true },
      { label: 'Vouchers' },
      { label: 'Orders' },
      { label: 'Invoices' },
    ],
    cards: [
      { label: 'Current Balance', value: '$125.00' },
      { label: 'Last Top Up', value: '$50.00' },
      { label: 'Voucher Credit', value: '$25.00' },
    ],
    form: [
      { label: 'Top Up Amount', value: '100.00 USD' },
      { label: 'Payment Method', value: 'Wallet / Card / Gateway' },
      { label: 'Voucher Code', value: '0000-0000-0000-0000' },
      { label: 'Reason', value: 'Manual admin credit note' },
    ],
    highlight: 'Always keep a clear note for manual wallet credit or debit.',
  }),
  modules: screenshotSvg({
    title: 'Enable Features and Modules',
    subtitle: 'Turn features on or off for User, Agent, Reseller, Web, and Mobile.',
    nav: [
      { label: 'Platform Setup', active: true },
      { label: 'Modules' },
      { label: 'Features' },
      { label: 'Languages' },
      { label: 'Payment Gateways' },
    ],
    form: [
      { label: 'Role', value: 'User' },
      { label: 'Module', value: 'Chat Module' },
      { label: 'Web Access', value: 'Enabled', fill: '#dcfce7', textColor: '#166534', stroke: '#86efac' },
      { label: 'Mobile Access', value: 'Enabled', fill: '#dcfce7', textColor: '#166534', stroke: '#86efac' },
      { label: 'eRoaming', value: 'Enabled', fill: '#dcfce7', textColor: '#166534', stroke: '#86efac' },
      { label: 'IPTV Services', value: 'Disabled', fill: '#fee2e2', textColor: '#991b1b', stroke: '#fca5a5' },
    ],
    highlight: 'If a user cannot see a menu, check role modules first, then user-specific overrides.',
  }),
  esimFlow: screenshotSvg({
    title: 'Buy and Install eSIM',
    subtitle: 'Customer selects destination, pays, then installs QR/manual details.',
    nav: [
      { label: 'Dashboard' },
      { label: 'My eSIMs', active: true },
      { label: 'Orders' },
      { label: 'Wallet' },
      { label: 'Support' },
    ],
    cards: [
      { label: 'Destination', value: 'France' },
      { label: 'Data', value: '10 GB' },
      { label: 'Validity', value: '30 Days' },
    ],
    form: [
      { label: 'Package', value: 'France 10GB / 30 Days' },
      { label: 'Payment', value: 'Wallet or Gateway' },
      { label: 'QR Code', value: 'Open My eSIMs' },
      { label: 'Status', value: 'Ready To Install', fill: '#dcfce7', textColor: '#166534', stroke: '#86efac' },
    ],
    highlight: 'The QR code is usually one-time install. Use it on the correct unlocked eSIM device.',
  }),
  sip: screenshotSvg({
    title: 'SIP User and eRoaming DID',
    subtitle: 'Admin assigns SIP account, DID number, tariffs, and allowed call features.',
    nav: [
      { label: "eRoaming's" },
      { label: 'SIP Users', active: true },
      { label: 'SIP Configuration' },
      { label: "Tariff's" },
      { label: 'Registration Profile' },
    ],
    form: [
      { label: 'Platform User', value: 'customer@example.com' },
      { label: 'SIP Username', value: '10000003' },
      { label: 'Internal Tariff', value: 'SIP to SIP' },
      { label: 'International Tariff', value: 'Retail Rate' },
      { label: 'DID Number', value: '+96171724040' },
      { label: 'Voicemail / PBX', value: 'Enabled' },
    ],
    highlight: 'Internal calls use internal SIP routing. International calls use origination rates.',
  }),
  chat: screenshotSvg({
    title: 'Secure Chat Search',
    subtitle: 'Users search by phone, email, SIP username, or UID. The full user list stays hidden.',
    nav: [
      { label: 'Dashboard' },
      { label: 'Chat', active: true },
      { label: 'Media' },
      { label: 'Calls Recorded' },
    ],
    form: [
      { label: 'Search Contact', value: '10000003 or customer@example.com' },
      { label: 'Security Rule', value: 'Minimum 3 characters' },
      { label: 'Share Menu', value: 'Photo, Video, Location, Document' },
      { label: 'Calls', value: 'Voice, Video, Group Call' },
      { label: 'Recordings', value: 'Saved inside chat session' },
      { label: 'Forward / Download', value: 'Available for media files' },
    ],
    highlight: 'This prevents users from browsing all existing platform users.',
  }),
  mobile: screenshotSvg({
    title: 'Mobile App Main Services',
    subtitle: 'Customer uses eSIM, wallet, eRoaming, SIP dialpad, chat, KYC, and support.',
    nav: [
      { label: 'Home', active: true },
      { label: 'eSIM' },
      { label: 'eRoaming' },
      { label: 'Chat' },
      { label: 'Wallet' },
      { label: 'Support' },
    ],
    cards: [
      { label: 'Language', value: 'EN / AR / FR' },
      { label: 'SIP Call', value: 'Internal' },
      { label: 'Wallet', value: '$125' },
    ],
    form: [
      { label: 'Dialpad', value: 'Internal SIP or International Number' },
      { label: 'Chat Search', value: 'Phone / Email / SIP / UID' },
      { label: 'Voice Message', value: 'Mic icon' },
      { label: 'Video Message', value: 'Camera icon' },
    ],
    highlight: 'Mobile features appear only when mobile modules are enabled for the user role.',
  }),
  reseller: screenshotSvg({
    title: 'Reseller Workspace',
    subtitle: 'Reseller manages customers, prices, wallet, orders, storefront, and enabled services.',
    nav: [
      { label: 'Dashboard', active: true },
      { label: 'Customers' },
      { label: 'eSIM Packages' },
      { label: "eRoaming's" },
      { label: 'IPTV Services' },
      { label: 'Platform Setup' },
    ],
    cards: [
      { label: 'Revenue', value: '$8,420' },
      { label: 'Customers', value: '146' },
      { label: 'Wallet', value: '$950' },
    ],
    form: [
      { label: 'Storefront', value: 'Active' },
      { label: 'Payment Gateways', value: 'Enabled' },
      { label: 'Modules', value: 'Controlled by Admin' },
      { label: 'Support', value: 'Open tickets' },
    ],
    highlight: 'Reseller sees only the modules Admin enabled for that reseller account.',
  }),
  agent: screenshotSvg({
    title: 'Agent Workspace',
    subtitle: 'Agent helps assigned customers buy services and solve support issues.',
    nav: [
      { label: 'Dashboard', active: true },
      { label: 'Customers' },
      { label: 'Orders' },
      { label: 'Wallet' },
      { label: 'Support' },
    ],
    cards: [
      { label: 'Assigned Users', value: '38' },
      { label: 'Orders', value: '21' },
      { label: 'Tickets', value: '5' },
    ],
    form: [
      { label: 'Customer Search', value: 'Email / Phone / UID' },
      { label: 'Allowed Modules', value: 'eSIM, Wallet, Support' },
      { label: 'Escalation', value: 'To Reseller or Admin' },
      { label: 'Security', value: '2FA recommended' },
    ],
    highlight: 'Agent access should stay limited to assigned customers and allowed modules.',
  }),
};

const sections = [
  {
    id: 'overview',
    title: '1. Platform Overview',
    body: `
      <p>G5ESIM is a telecom and digital-services platform for selling and managing eSIM packages, eRoaming DID numbers, SIP services, IPTV subscriptions, wallets, vouchers, gift cards, support, chat, and reseller or agent operations.</p>
      ${visual('Admin dashboard screenshot example', screenshots.adminDashboard, 'Visual example: the Admin dashboard gives the operator a fast view of customers, orders, wallet top-ups, pending DID requests, tickets, and failed orders.')}
      <div class="grid two">
        <div class="box"><h3>Admin Backend</h3><p>Full control of customers, resellers, agents, providers, modules, pricing, billing, reports, languages, security, and platform content.</p></div>
        <div class="box"><h3>Reseller</h3><p>Business workspace for managing own customers, agents, prices, storefront, wallet, vouchers, orders, support, and enabled modules.</p></div>
        <div class="box"><h3>Agent</h3><p>Sales and support workspace for assigned customers. Agent access depends on modules enabled by Admin or Reseller.</p></div>
        <div class="box"><h3>User</h3><p>Customer area and mobile app access for buying, using, and managing services.</p></div>
      </div>
      <div class="note"><strong>Important:</strong> Module permission decides whether a role can see or use a feature. Billing/profile rules decide whether that feature is free, paid, trial-based, web-enabled, or mobile-enabled.</div>
    `,
  },
  {
    id: 'admin-login',
    title: '2. Admin Backend Basics',
    body: `
      <h3>How to Login as Admin</h3>
      <ol>
        <li>Open the Admin Panel URL.</li>
        <li>Enter the admin email/username and password.</li>
        <li>If 2FA is enabled, enter the authenticator code.</li>
        <li>After login, review the dashboard, alerts, pending orders, and support tickets.</li>
      </ol>
      <h3>Daily Admin Checklist</h3>
      <ul>
        <li>Check failed or pending orders.</li>
        <li>Check support tickets and VIP Concierge requests.</li>
        <li>Check payment gateway and wallet activity.</li>
        <li>Check provider sync status for eSIM, DID, SIP, and IPTV services.</li>
        <li>Review suspicious login/IP activity.</li>
      </ul>
    `,
  },
  {
    id: 'create-users',
    title: '3. How Admin Creates Users, Agents, and Resellers',
    body: `
      <div class="easy"><strong>Simple meaning:</strong> this is where Admin adds a new customer, agent, or reseller, then decides what that account can use.</div>
      ${visual('Create user screenshot example', screenshots.createUser, 'Screenshot example: the Create User page collects email, name, status, account type, password, and KYC requirement.')}
      <h3>Create a New User</h3>
      <ol>
        <li>Go to <strong>Admin Panel > Customers > User</strong>.</li>
        <li>Click <strong>Create</strong> or <strong>New User</strong>.</li>
        <li>Enter the customer name, email, phone number, password, account status, and account type.</li>
        <li>Select which modules/features the user can access if the form provides module controls.</li>
        <li>Save the user.</li>
        <li>Open the user details page and confirm wallet, KYC, modules, orders, and status.</li>
      </ol>
      <h3>Create a New Agent</h3>
      <ol>
        <li>Go to <strong>Admin Panel > Customers > Agent</strong>.</li>
        <li>Create the account and set account type as Agent.</li>
        <li>Assign permissions/modules such as customers, orders, wallet, eSIM packages, eRoaming, IPTV, vouchers, invoices, support, and platform setup if required.</li>
        <li>If the agent belongs under a reseller, assign the correct parent reseller.</li>
        <li>Save and test login as the agent.</li>
      </ol>
      <h3>Create a New Reseller</h3>
      <ol>
        <li>Go to <strong>Admin Panel > Customers > Reseller</strong>.</li>
        <li>Create the reseller account with name, email, phone, password, and active status.</li>
        <li>Enable reseller modules such as storefront, payment gateways, currencies, modules, API docs, customers, eSIM pricing, eRoaming, IPTV, wallet, vouchers, invoices, and support.</li>
        <li>Configure reseller pricing and wallet rules if needed.</li>
        <li>Save and test the reseller dashboard.</li>
      </ol>
      <div class="warning"><strong>Security:</strong> Do not enable reseller or agent permissions unless the account is trusted. Always confirm KYC or business verification when required.</div>
    `,
  },
  {
    id: 'funds-wallet',
    title: '4. How to Top Up Funds and Manage Wallets',
    body: `
      <div class="easy"><strong>Simple meaning:</strong> wallet is the customer balance. Users can add money by payment gateway or voucher. Admin can manually adjust it when needed.</div>
      ${visual('Wallet top-up screenshot example', screenshots.walletTopup, 'Screenshot example: wallet top-up can use payment methods, voucher code, or a manual admin credit note.')}
      <h3>User Wallet Top Up</h3>
      <ol>
        <li>User opens <strong>Account > Wallet</strong>.</li>
        <li>User selects wallet top-up amount.</li>
        <li>User pays using an enabled payment gateway or redeems a voucher if available.</li>
        <li>After successful payment, wallet balance is updated.</li>
        <li>User can use wallet balance to buy supported services.</li>
      </ol>
      <h3>Admin Manual Wallet Adjustment</h3>
      <ol>
        <li>Go to <strong>Admin Panel > Customers</strong>.</li>
        <li>Open the customer details page.</li>
        <li>Find the wallet/balance section.</li>
        <li>Add or deduct balance with a clear reason.</li>
        <li>Save and confirm the transaction appears in wallet history.</li>
      </ol>
      <h3>Voucher Wallet Top Up</h3>
      <ol>
        <li>Admin or permitted reseller creates voucher batch under <strong>Vouchers</strong>.</li>
        <li>Set voucher type as wallet credit, amount, quantity, status, and validity.</li>
        <li>User opens wallet or voucher page and redeems the code.</li>
        <li>The value is credited to wallet after successful redemption.</li>
      </ol>
      <div class="note"><strong>Audit rule:</strong> Every manual wallet action should include a reason so finance and support can understand why funds changed.</div>
    `,
  },
  {
    id: 'modules-features',
    title: '5. How to Enable Features and Modules',
    body: `
      <div class="easy"><strong>Simple meaning:</strong> modules are ON/OFF switches. If a module is OFF, the user cannot see or use that service.</div>
      ${visual('Module enable screenshot example', screenshots.modules, 'Screenshot example: Admin can enable a module for web users, mobile app users, or disable it for a role.')}
      <h3>Enable Modules Globally by Role</h3>
      <ol>
        <li>Go to <strong>Admin Panel > Platform Setup > Modules</strong> or <strong>Features</strong>.</li>
        <li>Select the role: User, Agent, or Reseller.</li>
        <li>Enable or disable modules for web access.</li>
        <li>Enable or disable modules for mobile app access where available.</li>
        <li>Save changes.</li>
        <li>Login with a test account for that role and confirm the menu changed correctly.</li>
      </ol>
      <h3>Enable Modules for One Specific Customer</h3>
      <ol>
        <li>Go to <strong>Admin Panel > Customers</strong>.</li>
        <li>Open the specific user, reseller, or agent.</li>
        <li>Open the Modules or Features section.</li>
        <li>Turn on the services that this account can use.</li>
        <li>Save and confirm from the customer account.</li>
      </ol>
      <h3>Common Module Examples</h3>
      <table>
        <thead><tr><th>Module</th><th>What it controls</th></tr></thead>
        <tbody>
          <tr><td>eSIM Services</td><td>Browse, buy, manage, and top up eSIM packages.</td></tr>
          <tr><td>Order Management</td><td>View and manage orders.</td></tr>
          <tr><td>Wallet Top Up</td><td>Allows wallet balance and wallet payments.</td></tr>
          <tr><td>Gift Cards</td><td>Allows gift card purchase or redemption.</td></tr>
          <tr><td>Rewards</td><td>Allows member rewards and loyalty features.</td></tr>
          <tr><td>eRoaming / Virtual Numbers</td><td>DID numbers, SIP calling, and eRoaming services.</td></tr>
          <tr><td>IPTV Services</td><td>IPTV packages, users, channels, and subscriptions.</td></tr>
          <tr><td>Vouchers</td><td>Create, list, or redeem vouchers depending on role.</td></tr>
          <tr><td>Invoices</td><td>View invoices and billing records.</td></tr>
          <tr><td>Chat</td><td>User chat, media sharing, voice/video calls, and call recordings.</td></tr>
          <tr><td>Platform Setup</td><td>Storefront, currencies, payment gateways, pages, FAQ, blog, translations, API docs.</td></tr>
        </tbody>
      </table>
    `,
  },
  {
    id: 'esim-services',
    title: '6. eSIM Services',
    body: `
      <div class="easy"><strong>Simple meaning:</strong> eSIM service lets customers buy mobile data for a country or region, then install it using QR/manual details.</div>
      ${visual('eSIM purchase screenshot example', screenshots.esimFlow, 'Screenshot example: customer selects destination and package, pays, then opens My eSIMs to install.')}
      <h3>What the eSIM Module Does</h3>
      <p>The eSIM module lets users browse destinations, buy data packages, view installation details, and manage purchased eSIMs. Admin controls providers, package catalog, rates, countries, regions, top-ups, and package visibility.</p>
      <h3>Admin: Configure eSIM Services</h3>
      <ol>
        <li>Go to <strong>Admin Panel > Master eSIM Packages > Providers</strong>.</li>
        <li>Add or configure provider API credentials.</li>
        <li>Sync packages from providers.</li>
        <li>Go to <strong>eSIM Catalog</strong> and enable packages that should be visible.</li>
        <li>Configure <strong>Rates</strong>, markup, and selling prices.</li>
        <li>Check <strong>Countries</strong> and <strong>Regions</strong>.</li>
        <li>Test a purchase using a user account.</li>
      </ol>
      <h3>User: Buy an eSIM</h3>
      <ol>
        <li>Open the website or mobile app.</li>
        <li>Search for the destination country or region.</li>
        <li>Select the package by data amount, validity, and price.</li>
        <li>Pay by card, wallet, voucher, or another enabled method.</li>
        <li>Open <strong>My eSIMs</strong> to view QR code and installation instructions.</li>
      </ol>
      <div class="warning"><strong>Customer warning:</strong> eSIM QR codes are usually single-use. The customer must install it on the correct unlocked eSIM-compatible device.</div>
    `,
  },
  {
    id: 'topup',
    title: '7. eSIM Top-Up Packages',
    body: `
      <h3>What Top-Up Does</h3>
      <p>Top-up packages allow users to add more data or validity to an existing eligible eSIM without buying a new eSIM profile.</p>
      <h3>Admin: Manage Top-Ups</h3>
      <ol>
        <li>Go to <strong>Admin Panel > Master eSIM Packages > Topup Packages</strong>.</li>
        <li>Sync top-up packages from enabled providers.</li>
        <li>Check which base packages support top-up.</li>
        <li>Set cost and selling prices where needed.</li>
        <li>Review top-up orders under <strong>Order Management > Top-up Orders</strong>.</li>
      </ol>
      <h3>User: Buy Top-Up</h3>
      <ol>
        <li>Open <strong>My eSIMs</strong>.</li>
        <li>Select an eSIM that supports top-up.</li>
        <li>Select top-up package.</li>
        <li>Pay and wait for confirmation.</li>
      </ol>
    `,
  },
  {
    id: 'eroaming-did',
    title: '8. eRoaming and DID Numbers',
    body: `
      <h3>What eRoaming Does</h3>
      <p>eRoaming lets users buy and use DID/virtual numbers. A DID can receive calls and can also be connected to SIP services depending on configuration.</p>
      <h3>Admin: Configure DID Services</h3>
      <ol>
        <li>Go to <strong>Admin Panel > eRoaming's > Providers</strong>.</li>
        <li>Configure DID provider credentials and settings.</li>
        <li>Go to <strong>DID Numbers</strong> to import, sync, or manage available numbers.</li>
        <li>Set pricing under <strong>Cost & Price</strong>.</li>
        <li>Review purchases under <strong>Logs & Purchase</strong>, <strong>Pending</strong>, and <strong>Active</strong>.</li>
      </ol>
      <h3>User: Buy or Use DID</h3>
      <ol>
        <li>Open <strong>Account > eRoaming's</strong> or the mobile app eRoaming area.</li>
        <li>Select country and number if available.</li>
        <li>Review setup fee, monthly fee, and terms.</li>
        <li>Pay using available payment method.</li>
        <li>After activation, view the DID under <strong>My DID's</strong>.</li>
      </ol>
      <div class="note"><strong>Billing rule:</strong> DID registration profile fees are extra fees only. If DID is marked Free in a profile, no extra profile charge is added on top of the normal DID price.</div>
    `,
  },
  {
    id: 'sip',
    title: '9. SIP Users, Tariffs, and Registration Profiles',
    body: `
      <div class="easy"><strong>Simple meaning:</strong> SIP is the calling account. It controls internal calls, international calls, DID receiving, voicemail, PBX, recording, and call rules.</div>
      ${visual('SIP user screenshot example', screenshots.sip, 'Screenshot example: Admin assigns platform user, SIP username, DID number, tariffs, and allowed call features.')}
      <h3>What SIP Does</h3>
      <p>SIP services allow users to make internal SIP-to-SIP calls, international outgoing calls, receive calls through assigned DID numbers, and use telephony features such as voicemail, call recording, forwarding, ring groups, caller ID, and PBX functions.</p>
      <h3>Admin: Create SIP User</h3>
      <ol>
        <li>Go to <strong>Admin Panel > Extra > eRoaming SIP Users</strong>.</li>
        <li>Click <strong>Create SIP User</strong>.</li>
        <li>Select <strong>Create User</strong>: New or Existing.</li>
        <li>If New, choose Auto Generate or Manual SIP username/password.</li>
        <li>If Existing, select the platform user and enter or select SIP details.</li>
        <li>Select SIP Provider. Provider details fill automatically where configured.</li>
        <li>Select Registration Profile.</li>
        <li>Assign Internal Tariff and International Tariff.</li>
        <li>Allocate DID number if the user needs inbound calls.</li>
        <li>Enable or disable features such as internal calls, international calls, voicemail, PBX, chat, call recording, fax, and other modules.</li>
        <li>Save and test the SIP user.</li>
      </ol>
      <h3>Admin: Configure SIP Tariffs</h3>
      <ol>
        <li>Go to <strong>SIP Configuration > Tariff's</strong>.</li>
        <li>Use <strong>Internal</strong> for internal SIP destinations.</li>
        <li>Use <strong>Origination Rates</strong> for international outgoing call rates.</li>
        <li>Create a Tariff Name, then open it to manage destinations and prefixes.</li>
        <li>Use Import/Export for bulk origination destinations.</li>
        <li>Use <strong>Rate Group</strong> to assign provider, routing type, reseller/agent/user ownership, and routing behavior.</li>
      </ol>
      <h3>Admin: Registration Profile</h3>
      <ol>
        <li>Go to <strong>SIP Configuration > Registration Profile</strong>.</li>
        <li>Create a profile for automatic signup or manual registration.</li>
        <li>For each feature, choose Enabled/Disabled.</li>
        <li>Choose Free or Paid.</li>
        <li>If Paid, set setup fee, monthly fee, fixed charge, charge percentage, and free trial days if allowed.</li>
        <li>Choose whether each feature is enabled for Web users and Mobile App users.</li>
      </ol>
      <div class="warning"><strong>Important:</strong> Paid feature fees in the registration profile are extra charges. They should not replace the normal DID, SIP, eSIM, or other base service price.</div>
    `,
  },
  {
    id: 'chat',
    title: '10. Chat, Media, Voice, and Video Features',
    body: `
      <div class="easy"><strong>Simple meaning:</strong> chat is the built-in WhatsApp-style module for messages, media, voice/video calls, recordings, and quick media access.</div>
      ${visual('Chat screenshot example', screenshots.chat, 'Screenshot example: user must search by phone, email, SIP username, or UID before starting chat. The full user list is hidden.')}
      <h3>What Chat Does</h3>
      <p>Chat allows platform users to communicate with other users from web or mobile, share media, send voice/video messages, and start voice/video calls where real-time calling is configured.</p>
      <h3>Main Chat Features</h3>
      <ul>
        <li>Direct chat, group chat, and broadcast.</li>
        <li>Photo, video, document, contact, location, poll, event, fax, screenshot, app share, and AI image request cards.</li>
        <li>Voice messages and video messages.</li>
        <li>Voice call, video call, group call.</li>
        <li>Call recording and saved call recordings inside the chat session.</li>
        <li>Quick access filters for images, videos, all media, and call recordings.</li>
        <li>Download and forward media or recordings.</li>
      </ul>
      <h3>How User Starts a Chat</h3>
      <ol>
        <li>Open <strong>Account > Chat</strong> or mobile chat.</li>
        <li>Search by phone, email, SIP username, or UID.</li>
        <li>The user list stays hidden until at least 3 characters or 3 digits are entered.</li>
        <li>Select the contact and start chat.</li>
      </ol>
      <h3>Admin Setup Notes</h3>
      <ul>
        <li>Enable Chat module for the role or specific user.</li>
        <li>Enable Chat in SIP registration profile if SIP-related chat permissions are required.</li>
        <li>For reliable voice/video calls behind firewalls or blocked networks, configure TURN relay service on 443/TLS.</li>
      </ul>
    `,
  },
  {
    id: 'iptv',
    title: '11. IPTV Services',
    body: `
      <h3>What IPTV Does</h3>
      <p>IPTV services allow the platform to sell and manage IPTV packages, providers, bouquets, channels, users, subscriptions, trials, pricing, and logs.</p>
      <h3>Admin: Configure IPTV</h3>
      <ol>
        <li>Go to <strong>Admin Panel > IPTV Services > IPTV Provider</strong>.</li>
        <li>Configure provider API or account settings.</li>
        <li>Manage bouquets and channels.</li>
        <li>Set cost and selling price.</li>
        <li>Configure settings such as trial, wallet payment, and subscription behavior.</li>
        <li>Review IPTV logs and user list.</li>
      </ol>
      <h3>User: Buy IPTV</h3>
      <ol>
        <li>Open <strong>Account > IPTV Services</strong>.</li>
        <li>Select package or trial if available.</li>
        <li>Pay and wait for activation.</li>
        <li>View IPTV account details in the IPTV user area.</li>
      </ol>
    `,
  },
  {
    id: 'payments',
    title: '12. Payments, Gateways, Vouchers, and Gift Cards',
    body: `
      <h3>Payment Gateways</h3>
      <ol>
        <li>Go to <strong>Admin Panel > Payment Gateways > Gateways</strong>.</li>
        <li>Enable the gateway.</li>
        <li>Enter API keys, secret keys, webhook settings, and mode.</li>
        <li>Save and run a test checkout.</li>
      </ol>
      <h3>Vouchers</h3>
      <p>Vouchers can be used for wallet credit, promotions, reseller credits, or controlled customer balance top-ups.</p>
      <ol>
        <li>Go to <strong>Marketing > Vouchers</strong>.</li>
        <li>Create voucher code or batch.</li>
        <li>Select value, quantity, validity, status, and usage rules.</li>
        <li>Share voucher codes with users or resellers.</li>
      </ol>
      <h3>Gift Cards</h3>
      <p>Gift cards allow users to purchase stored value or promotional credit for themselves or others where enabled.</p>
    `,
  },
  {
    id: 'support-kyc-security',
    title: '13. KYC, Support, Concierge, and Security',
    body: `
      <h3>KYC Verification</h3>
      <p>KYC verifies user identity and can be required before high-risk services are used.</p>
      <ol>
        <li>User opens <strong>KYC Verification</strong>.</li>
        <li>User uploads required documents.</li>
        <li>Admin reviews documents under <strong>Customers > KYC Verification</strong>.</li>
        <li>Admin approves or rejects.</li>
      </ol>
      <h3>Support Tickets</h3>
      <ol>
        <li>User opens support/VIP Concierge.</li>
        <li>User submits message and attachments.</li>
        <li>Admin replies from Support System.</li>
        <li>Ticket is closed after resolution.</li>
      </ol>
      <h3>Security</h3>
      <ul>
        <li>Use 2FA for Admin, Reseller, and Agent accounts.</li>
        <li>Review IP logs for suspicious activity.</li>
        <li>Do not share SIP, provider, payment, or API credentials with users.</li>
        <li>Disable accounts immediately if compromise is suspected.</li>
      </ul>
    `,
  },
  {
    id: 'reseller',
    title: '14. Reseller Guide',
    body: `
      <div class="easy"><strong>Simple meaning:</strong> reseller is a business account that can sell services to its own customers under the permissions Admin gives.</div>
      ${visual('Reseller workspace screenshot example', screenshots.reseller, 'Screenshot example: reseller dashboard can show customers, eSIM sales, eRoaming, IPTV, wallet, support, and storefront tools.')}
      <h3>What Reseller Can Do</h3>
      <p>A reseller manages their own customers and business workspace. Access depends on modules enabled by Admin.</p>
      <h3>Common Reseller Actions</h3>
      <ol>
        <li>Login to the reseller panel.</li>
        <li>Check dashboard, statistics, wallet, and recent orders.</li>
        <li>Create or manage customers and agents if allowed.</li>
        <li>Set eSIM cost and selling prices if allowed.</li>
        <li>Manage eRoaming/DID and IPTV users if modules are enabled.</li>
        <li>Create vouchers if enabled.</li>
        <li>Review invoices and support tickets.</li>
        <li>Configure storefront, SMTP, currencies, payment gateways, pages, FAQ, blog, language, and translations if platform setup is enabled.</li>
      </ol>
      <h3>Reseller Storefront</h3>
      <p>The storefront is the reseller-facing white-label website area. It can include branding, pages, FAQ, blog, payment gateways, currencies, and customer modules.</p>
    `,
  },
  {
    id: 'agent',
    title: '15. Agent Guide',
    body: `
      <div class="easy"><strong>Simple meaning:</strong> agent is a sales/support account that helps assigned customers but should not have full reseller or admin access.</div>
      ${visual('Agent workspace screenshot example', screenshots.agent, 'Screenshot example: agent dashboard focuses on assigned customers, allowed modules, orders, wallet, and support escalation.')}
      <h3>What Agent Can Do</h3>
      <p>An agent helps sell and support services for assigned customers. Agent access is controlled by Admin or Reseller permissions.</p>
      <h3>Common Agent Actions</h3>
      <ol>
        <li>Login to the agent/account workspace.</li>
        <li>Check assigned customers.</li>
        <li>Create or help customers if allowed.</li>
        <li>Place eSIM, eRoaming, IPTV, or other service orders if enabled.</li>
        <li>Use wallet, vouchers, invoices, and support tools if enabled.</li>
        <li>Escalate unresolved problems to Reseller or Admin.</li>
      </ol>
      <div class="note"><strong>Rule:</strong> Agents should only see the modules and customers assigned to them.</div>
    `,
  },
  {
    id: 'user',
    title: '16. User / Customer Guide',
    body: `
      <h3>User Account Area</h3>
      <p>The user account area is where customers buy and manage services.</p>
      <table>
        <thead><tr><th>User Menu</th><th>Purpose</th></tr></thead>
        <tbody>
          <tr><td>Dashboard</td><td>Account overview, active services, wallet, and recent activity.</td></tr>
          <tr><td>Profile</td><td>Manage personal details and preferences.</td></tr>
          <tr><td>My eSIMs</td><td>View purchased eSIMs, QR codes, and installation details.</td></tr>
          <tr><td>Orders</td><td>View all purchases and statuses.</td></tr>
          <tr><td>Wallet</td><td>Top up balance and pay with wallet where enabled.</td></tr>
          <tr><td>Gift Cards</td><td>Buy or redeem gift cards.</td></tr>
          <tr><td>Member Rewards</td><td>View loyalty rewards if enabled.</td></tr>
          <tr><td>eRoaming's</td><td>Buy and manage virtual numbers/DIDs.</td></tr>
          <tr><td>My DID's</td><td>View active DID numbers.</td></tr>
          <tr><td>IPTV Services</td><td>Buy or manage IPTV subscriptions.</td></tr>
          <tr><td>Vouchers</td><td>Redeem wallet vouchers.</td></tr>
          <tr><td>KYC Verification</td><td>Submit identity documents.</td></tr>
          <tr><td>Referrals</td><td>Invite users and track referral rewards.</td></tr>
          <tr><td>Chat</td><td>Secure chat, media sharing, voice/video calls.</td></tr>
          <tr><td>VIP Concierge</td><td>Premium support if enabled.</td></tr>
          <tr><td>Security</td><td>2FA and IP logs.</td></tr>
        </tbody>
      </table>
    `,
  },
  {
    id: 'mobile',
    title: '17. Mobile App Guide',
    body: `
      <div class="easy"><strong>Simple meaning:</strong> the mobile app gives the customer the same important services in a phone-friendly interface.</div>
      ${visual('Mobile app screenshot example', screenshots.mobile, 'Screenshot example: mobile app can show eSIM, eRoaming, SIP dialpad, chat, wallet, KYC, and support depending on enabled mobile modules.')}
      <h3>What the Mobile App Does</h3>
      <p>The mobile app lets customers use core services from Android or iOS. Available features depend on enabled mobile modules.</p>
      <h3>Mobile Features</h3>
      <ul>
        <li>Register and login.</li>
        <li>Switch languages such as English, Arabic, French, Spanish, Italian, and Russian where translations are available.</li>
        <li>Buy and view eSIM packages.</li>
        <li>View orders and wallet.</li>
        <li>Use eRoaming/DID and SIP dialpad where enabled.</li>
        <li>Make internal SIP or international calls where allowed.</li>
        <li>Use chat, voice messages, video messages, media sharing, voice calls, video calls, and recordings where enabled.</li>
        <li>Submit KYC and support requests.</li>
      </ul>
      <h3>Mobile SIP Calling Rules</h3>
      <ul>
        <li>Internal SIP calls should allow internal SIP usernames without international format.</li>
        <li>International calls should require a country code.</li>
        <li>Call history should show previous calls.</li>
        <li>Speaker, dial tone, and call audio require the mobile voice engine and correct app rebuild, not only hot reload.</li>
      </ul>
    `,
  },
  {
    id: 'troubleshooting',
    title: '18. Troubleshooting and Support Checklist',
    body: `
      <h3>When a User Cannot See a Feature</h3>
      <ol>
        <li>Check account status is active.</li>
        <li>Check KYC status if required.</li>
        <li>Check global module setting for that role.</li>
        <li>Check user-specific module overrides.</li>
        <li>Check web/mobile access for that feature.</li>
        <li>Check registration profile billing if SIP/eRoaming feature.</li>
      </ol>
      <h3>When Wallet Top Up Fails</h3>
      <ol>
        <li>Check payment gateway status.</li>
        <li>Check transaction logs.</li>
        <li>Check webhook delivery.</li>
        <li>Check if wallet top-up module is enabled.</li>
        <li>Check if manual credit is needed after payment confirmation.</li>
      </ol>
      <h3>When eSIM Order Fails</h3>
      <ol>
        <li>Check payment status.</li>
        <li>Check provider response.</li>
        <li>Check package availability.</li>
        <li>Check customer email and account status.</li>
        <li>Retry provider sync or create support escalation.</li>
      </ol>
      <h3>When Voice/Video Chat Call Has No Audio</h3>
      <ol>
        <li>Check microphone/camera browser permissions.</li>
        <li>Check device audio output.</li>
        <li>Check whether HTTPS is used.</li>
        <li>Check TURN server configuration for blocked networks.</li>
        <li>Check that both users accepted the call.</li>
      </ol>
    `,
  },
];

const toc = sections
  .map((section) => `<li><a href="#${section.id}">${section.title}</a></li>`)
  .join('\n');

const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>G5ESIM Platform User Manual</title>
  <style>
    @page {
      size: A4;
      margin: 18mm 16mm 18mm 16mm;
      @bottom-center {
        content: "G5ESIM Platform User Manual - Page " counter(page);
        color: #64748b;
        font-size: 9px;
      }
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: Arial, Helvetica, sans-serif;
      color: #0f172a;
      background: #ffffff;
      line-height: 1.48;
      font-size: 12px;
    }
    .cover {
      min-height: 255mm;
      padding: 32mm 18mm;
      color: white;
      background: linear-gradient(145deg, #07111f 0%, #0d2b3d 54%, #0f766e 100%);
      page-break-after: always;
      position: relative;
      overflow: hidden;
    }
    .cover:after {
      content: "";
      position: absolute;
      right: -60mm;
      bottom: -70mm;
      width: 180mm;
      height: 180mm;
      border-radius: 50%;
      border: 1px solid rgba(255,255,255,0.18);
      background: rgba(255,255,255,0.05);
    }
    .brand {
      display: inline-flex;
      padding: 8px 12px;
      border: 1px solid rgba(255,255,255,0.25);
      border-radius: 6px;
      font-size: 13px;
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }
    .cover h1 {
      margin: 34mm 0 8mm;
      max-width: 150mm;
      font-size: 38px;
      line-height: 1.08;
    }
    .cover p {
      max-width: 145mm;
      color: #dbeafe;
      font-size: 15px;
    }
    .cover .meta {
      position: absolute;
      left: 18mm;
      bottom: 22mm;
      color: #d1fae5;
      font-size: 12px;
    }
    h1, h2, h3 { page-break-after: avoid; }
    h2 {
      margin: 0 0 10px;
      padding-bottom: 7px;
      border-bottom: 2px solid #14b8a6;
      color: #0f172a;
      font-size: 21px;
    }
    h3 {
      margin: 16px 0 7px;
      color: #134e4a;
      font-size: 14px;
    }
    p { margin: 0 0 9px; }
    a { color: #0f766e; text-decoration: none; }
    ol, ul { margin: 6px 0 12px 20px; padding: 0; }
    li { margin: 4px 0; }
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 10px 0 14px;
      page-break-inside: avoid;
    }
    th {
      background: #e2e8f0;
      text-align: left;
      color: #0f172a;
      font-size: 11px;
      padding: 7px;
      border: 1px solid #cbd5e1;
    }
    td {
      padding: 7px;
      border: 1px solid #dbe3ef;
      vertical-align: top;
    }
    .toc {
      page-break-after: always;
    }
    .toc h2 { margin-top: 0; }
    .toc ol {
      columns: 2;
      column-gap: 24px;
      margin-left: 18px;
    }
    .toc li {
      break-inside: avoid;
      margin: 8px 0;
      font-size: 12px;
    }
    .section {
      page-break-before: always;
    }
    .section:first-of-type {
      page-break-before: auto;
    }
    .grid {
      display: grid;
      gap: 10px;
      margin: 12px 0;
    }
    .grid.two { grid-template-columns: 1fr 1fr; }
    .box {
      border: 1px solid #dbe3ef;
      border-radius: 8px;
      padding: 11px;
      background: #f8fafc;
      page-break-inside: avoid;
    }
    .box h3 {
      margin-top: 0;
      color: #0f172a;
    }
    .note, .warning {
      margin: 12px 0;
      border-radius: 8px;
      padding: 11px 12px;
      page-break-inside: avoid;
    }
    .note {
      border: 1px solid #99f6e4;
      background: #f0fdfa;
      color: #134e4a;
    }
    .warning {
      border: 1px solid #fecaca;
      background: #fff1f2;
      color: #7f1d1d;
    }
    .easy {
      margin: 10px 0 12px;
      border: 1px solid #bfdbfe;
      border-left: 5px solid #0ea5e9;
      border-radius: 8px;
      padding: 10px 12px;
      background: #eff6ff;
      color: #0f172a;
      page-break-inside: avoid;
    }
    .manual-shot {
      margin: 14px 0 16px;
      padding: 8px;
      border: 1px solid #dbe3ef;
      border-radius: 10px;
      background: #f8fafc;
      page-break-inside: avoid;
    }
    .manual-shot img {
      display: block;
      width: 100%;
      border-radius: 8px;
      border: 1px solid #cbd5e1;
      background: white;
    }
    .manual-shot figcaption {
      margin-top: 7px;
      color: #475569;
      font-size: 10.5px;
      line-height: 1.35;
    }
    .role-band {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 8px;
      margin: 14px 0 18px;
    }
    .pill {
      padding: 8px 10px;
      border-radius: 999px;
      background: #0f172a;
      color: white;
      text-align: center;
      font-weight: bold;
      font-size: 11px;
    }
    .small { font-size: 10px; color: #64748b; }
  </style>
</head>
<body>
  <section class="cover">
    <div class="brand">G5ESIM Mobile</div>
    <h1>Platform User Manual</h1>
    <p>Practical guide for Admin, Reseller, Agent, User, and Mobile App workflows. Includes how to create users, top up funds, enable modules, and understand each service.</p>
    <div class="role-band">
      <div class="pill">Admin</div>
      <div class="pill">Reseller</div>
      <div class="pill">Agent</div>
      <div class="pill">User</div>
    </div>
    <div class="meta">Generated ${today}<br/>Internal training and customer support manual</div>
  </section>

  <section class="toc">
    <h2>Table of Contents</h2>
    <ol>${toc}</ol>
    <div class="note">This manual is written for operations and support. Menu names may vary slightly depending on enabled modules, language, and account permissions.</div>
  </section>

  ${sections
    .map(
      (section) => `
        <section class="section" id="${section.id}">
          <h2>${section.title}</h2>
          ${section.body}
        </section>
      `,
    )
    .join('\n')}
</body>
</html>`;

await fs.mkdir(outDir, { recursive: true });
await fs.writeFile(htmlPath, html, 'utf8');

const chromeCandidates = [
  process.env.CHROME_PATH,
  process.env.PUPPETEER_EXECUTABLE_PATH,
  process.platform === 'win32' && process.env.LOCALAPPDATA
    ? path.join(process.env.LOCALAPPDATA, 'ms-playwright', 'chromium-1217', 'chrome-win64', 'chrome.exe')
    : '',
  process.platform === 'win32' && process.env.USERPROFILE
    ? path.join(process.env.USERPROFILE, '.cache', 'puppeteer', 'chrome', 'win64-144.0.7559.96', 'chrome-win64', 'chrome.exe')
    : '',
  process.platform === 'win32'
    ? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
    : '',
  process.platform === 'win32'
    ? 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'
    : '',
  process.platform !== 'win32' ? '/usr/bin/google-chrome' : '',
  process.platform !== 'win32' ? '/usr/bin/chromium' : '',
].filter(Boolean);

let chromePath = '';
for (const candidate of chromeCandidates) {
  try {
    await fs.access(candidate);
    chromePath = candidate;
    break;
  } catch {
    // Try the next browser path.
  }
}

if (!chromePath) {
  throw new Error('Could not find Chrome/Chromium to render the PDF.');
}

await execFileAsync(chromePath, [
  '--headless',
  '--disable-gpu',
  '--no-sandbox',
  `--print-to-pdf=${pdfPath}`,
  pathToFileURL(htmlPath).href,
]);

console.log(JSON.stringify({ htmlPath, pdfPath }, null, 2));

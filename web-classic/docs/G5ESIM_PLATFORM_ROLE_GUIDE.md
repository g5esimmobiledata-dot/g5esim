# G5ESIM Platform Role Guide

Version: Draft 2026-05-24

This guide explains how the G5ESIM platform is used by each role:

- Backend Admin
- Reseller
- Agent
- User / Customer
- Mobile App User

It also explains the main services available in the project, including eSIM packages, eRoaming DID numbers, SIP users, chat, IPTV, vouchers, wallets, support, KYC, and platform setup.

---

## 1. Platform Overview

G5ESIM is a multi-role eSIM and telecom service platform. It supports direct customer sales, reseller and agent sales, white-label storefronts, mobile app access, eRoaming DID numbers, SIP calling, IPTV services, vouchers, wallets, gift cards, support tickets, chat, and reporting.

The platform has four main account levels:

- Admin: controls the full backend, providers, prices, modules, customers, payments, security, and reports.
- Reseller: manages their own customers, agents, pricing, storefront, vouchers, wallet, orders, and enabled modules.
- Agent: works under the platform or a reseller, can manage assigned customers and services depending on enabled permissions.
- User: buys and uses services through the web account area or mobile app.

Important rule:

- Admin controls which modules are visible and enabled for every role.
- Reseller and Agent access depends on modules and permissions assigned by Admin.
- User access depends on account status, KYC rules, purchased services, and enabled modules.

---

## 2. Admin Backend Guide

The Admin Backend is the control center for the whole platform.

### 2.1 Admin Login

1. Open the admin panel.
2. Login with the admin account.
3. If 2FA is enabled, complete the verification.
4. Confirm the correct language and currency if needed.

### 2.2 Dashboard and Statistics

Use Dashboard and Statistics to monitor:

- Total customers, resellers, and agents.
- Total orders and revenue.
- Active services.
- Provider activity.
- Failed or pending orders.
- Recent transactions.

Recommended daily check:

1. Review failed orders.
2. Review pending eRoaming/DID orders.
3. Review open support tickets.
4. Check provider sync and payment status.

### 2.3 Customer Management

Admin can manage:

- Users
- Agents
- Resellers
- KYC verification

Typical actions:

1. Create a user, reseller, or agent.
2. Edit account details.
3. Enable or disable account status.
4. Assign modules and permissions.
5. Review KYC documents.
6. Check customer orders, wallet, invoices, and service status.

Security note:

- Do not give reseller or agent permissions unless the account is trusted.
- Use KYC where required before allowing higher-risk services.

### 2.4 Transactions

Transactions show activity from:

- eRoaming virtual number providers.
- eSIM providers.
- Customer payments.
- Voucher logs.
- Provider-specific sales.

Use this area to audit:

- Paid orders.
- Failed payment attempts.
- Provider API responses.
- Voucher redemptions.
- Customer balance movements.

### 2.5 Order Management

Order Management includes:

- Orders
- Custom Orders
- Top-up Orders

Admin should use this area to:

1. Search by customer, order ID, package, ICCID, or provider.
2. Review order status.
3. Refund or investigate failed top-ups.
4. Handle manual/custom package requests.
5. Confirm that eSIM delivery was completed.

### 2.6 Master eSIM Packages

This area controls the eSIM catalog.

Main sections:

- Providers
- eSIM Catalog
- Rates
- Topup Packages
- Regions
- Countries

Recommended setup flow:

1. Configure providers.
2. Sync provider packages.
3. Review countries and regions.
4. Set rates and markups.
5. Enable packages for sale.
6. Test buying one package from a customer account.

Provider examples:

- Maya Mobile
- eSIM Go
- Other supported providers configured in the platform

### 2.7 Marketing

Marketing includes:

- Vouchers
- Gift Cards
- Referral Program
- Member Rewards

Typical use:

1. Create voucher batches for promotions or wallet top-ups.
2. Create gift card products.
3. Configure referral rewards.
4. Configure member rewards and loyalty benefits.

### 2.8 Support System

Support includes:

- Support tickets
- VIP Concierge

Admin can:

- View and reply to tickets.
- Assign ticket status.
- Use concierge tools.
- Configure support behavior and WhatsApp/support settings.

### 2.9 eRoaming and DID Numbers

eRoaming manages virtual numbers and DID services.

Sections:

- Dashboard
- Providers
- DID Numbers
- Bought DIDs
- Cost & Price
- Logs & Purchase
- Pending
- Active

Admin can:

1. Configure DID providers.
2. Import or sync available numbers.
3. Set selling prices, setup fees, and monthly fees.
4. Approve or reject pending purchases.
5. Assign DID numbers to users.
6. Review active DID subscriptions.

DID behavior:

- A user can receive calls when a DID is assigned and active.
- DID charges can be normal service price plus optional extra registration profile fees.
- If a profile marks DID as Free, it means no extra profile fee is added on top of the normal DID price.
- If a profile marks DID as Paid, the profile fee is an extra charge on top of the normal DID price.

### 2.10 eRoaming SIP Users

SIP users are managed under eRoaming SIP Users.

Admin can:

- View SIP users.
- Create a SIP user.
- Edit a SIP user.
- Assign a platform user.
- Choose New or Existing SIP account.
- Auto-generate or manually enter SIP username/password.
- Select SIP provider.
- Allocate DID number.
- Enable or disable SIP features.
- Assign internal and international tariffs.

Important:

- SIP User create/edit pages must be dedicated pages, not popup forms.
- If a DID is allocated, the SIP username can become the DID number so the user can receive inbound calls.
- SIP user permissions control what the user can access.
- SIP registration profile rules control whether features are free, paid, trial-based, web-enabled, or mobile-enabled.

### 2.11 SIP Configuration

SIP Configuration includes:

- SIP Settings
- Tariffs
- Registration Profile

#### SIP Settings

Configure the SIP provider connection:

- External SIP
- Custom SIP
- FreePBX / Asterisk
- ASTPP
- Local

The provider selected here can be used by SIP users and rate groups.

#### Tariffs

Tariffs have three working areas:

- Internal
- Origination Rates
- Rate Group

Internal tariffs:

- Used for internal SIP to SIP calls.
- Uses special internal destinations and prefixes.
- Does not import international origination bulk rates.

Origination Rates:

- Used for international outgoing calls.
- Has tariff names.
- Click a tariff name to manage destinations.
- Supports create, delete, import, and export.
- Destination table uses:
  - Destination
  - Prefix
  - Buying Cost (USD)
  - Selling Price (USD)
  - Rate Group
  - Created Date
  - Modified Date
  - Status

Rate Group:

- Groups routes for pricing and routing.
- Select Rate Type:
  - Normal User
  - Reseller
  - Agent
- Assign the rate group to all normal users, selected reseller, selected agent, or downline.
- Select Provider, such as ASTPP or another configured SIP provider.
- Select Routing Type.

Routing type note:

- LCR means Least Cost Routing, so the system tries cheaper routes first.
- Quality routing can prioritize higher-quality routes.
- Configure carefully because this decides how calls are routed and charged.

#### Registration Profile

Registration profiles define default SIP and feature behavior for automatic or manual SIP registration.

Use profiles to decide:

- Which services are enabled.
- Whether each service is Free or Paid.
- Whether paid services have a free trial.
- Whether the service is enabled for web users.
- Whether the service is enabled for mobile app users.
- Whether extra charges apply.

Paid extra charge fields:

- Extra One Time Setup Fee
- Extra Monthly Fee
- Extra Fixed Charge
- Extra Charge %
- Free Trial Days

Important billing rule:

- Free means no extra profile charge is added.
- Paid means extra profile charge is added on top of the normal platform service price.
- Do not treat profile fees as the base service price. They are additional fees only.

Example services controlled by profile:

- SIP Account
- DID Numbers
- Internal Calls
- International Calls
- Voicemail
- PBX
- Call Forward
- Do Not Disturb
- Callback
- Conference Call
- CLIR / Hide Caller ID
- Caller ID
- Call Recording
- Ring Group
- Chat
- Trace Me
- Fax

### 2.12 Chat Module

Chat supports web and mobile chat.

Features:

- User to user chat.
- Photo sharing.
- Video sharing.
- Document sharing.
- Location sharing.
- Contact sharing.
- Poll sharing.
- Event sharing.
- AI image request cards.
- Fax request cards.
- Screenshot sharing.
- App sharing.
- Voice messages.
- Video messages.
- Voice call.
- Video call.
- Group call.
- Broadcast.
- Call recording.
- Video call recording.
- Quick media access for images, videos, and recorded calls.
- Download, forward, preview image, and play video/audio.

Security rule:

- When a user starts a chat, the system must not show all existing users.
- The user must search by phone, email, SIP username, or UID.
- Search starts only after at least 3 characters or 3 digits.

Call quality note:

- For calls to work behind blocked ports or strict firewalls, configure TURN relay servers on reliable ports such as 443/TLS.
- STUN alone may not work in restricted countries or networks.

### 2.13 IPTV Services

Admin IPTV sections:

- IPTV Provider
- Bouquets
- Cost & Price
- Channels
- IPTV Logs
- User List
- Setting

Admin can:

1. Configure IPTV provider.
2. Manage bouquets and channel lists.
3. Set cost and selling price.
4. Review IPTV orders and subscriptions.
5. Enable trials if supported.
6. Manage user IPTV accounts.

### 2.14 Debit Cards

Debit card modules include:

- PagoCards
- Sudo Africa

Admin can configure and monitor card products, providers, and card-related activity where supported.

### 2.15 Payment Gateways

Admin can configure payment gateways for customer checkout.

Typical tasks:

- Enable or disable gateway.
- Add API keys.
- Set environment mode.
- Test checkout.
- Confirm webhook behavior.

### 2.16 Reports and Invoices

Admin reports include:

- Analytics & Reports
- Advanced Analytics
- Invoices
- Reviews

Use this section for:

- Revenue review.
- Service performance.
- Customer invoices.
- Review moderation.

### 2.17 Platform Setup

Platform Setup includes:

- Settings
- Features
- Modules
- Currencies
- Failover & API
- Banner Management
- Pages Management
- FAQ Management
- Blog
- API Docs

Use this area to:

1. Configure the general platform.
2. Enable or disable modules per role.
3. Manage languages and translations.
4. Configure currencies.
5. Configure failover and API access.
6. Manage content pages, FAQ, blog, and banners.

---

## 3. Reseller Guide

Resellers manage their own business area under the platform.

### 3.1 Reseller Dashboard

The reseller dashboard shows:

- Sales summary.
- Revenue.
- Wallet balance.
- Recent orders.
- Active packages.
- eRoaming, IPTV, and service health if enabled.

### 3.2 Reseller Customers

Resellers can manage:

- Agents
- Sub-resellers if enabled
- Users/customers

Typical workflow:

1. Create or invite a customer.
2. Assign services or modules.
3. Monitor orders.
4. Help with support and billing.

### 3.3 Reseller eSIM Packages

Resellers can access:

- eSIM dashboard.
- Cost & Price.
- Logs.

Use this section to:

- Review available packages.
- Set reseller selling prices where allowed.
- Track package sales.
- Review completed and failed orders.

### 3.4 Reseller eRoaming

If enabled, reseller can manage:

- eRoaming dashboard.
- User DID services.
- DID user subscriptions.

Reseller can help users with:

- DID number purchase.
- DID renewal.
- eRoaming usage.

### 3.5 Reseller IPTV

If enabled, reseller can manage:

- IPTV dashboard.
- IPTV users.
- Cost & Price.
- IPTV logs.
- User list.
- IPTV settings.

### 3.6 Reseller Wallets, Vouchers, and Invoices

Reseller can:

- Use wallet funds.
- Create or manage vouchers if enabled.
- View invoices.
- Track customer payments and service purchases.

### 3.7 Reseller Platform Setup

If enabled, reseller can manage white-label options:

- Storefront
- SMTP
- App Stores
- Currencies
- Payment Gateways
- Modules
- Failover & API
- Banner
- Pages
- FAQ
- Blog
- Language
- Translation
- API Docs

Important:

- Reseller setup options depend on Admin permission.
- Some settings may be inherited from the main platform.

---

## 4. Agent Guide

Agents are similar to resellers but usually operate with more limited permissions.

### 4.1 Agent Dashboard

The agent dashboard helps the agent monitor:

- Customers.
- Orders.
- Wallet.
- eSIM sales.
- eRoaming users.
- IPTV users.
- Support requests.

### 4.2 Agent Customer Management

Agents can manage assigned customers if enabled.

Typical workflow:

1. Add customer.
2. Help customer select services.
3. Process orders or guide payment.
4. Monitor order status.
5. Escalate support issues to Admin or Reseller.

### 4.3 Agent Services

Agents may have access to:

- eSIM packages.
- eRoaming and DID.
- IPTV.
- Vouchers.
- Invoices.
- Wallet.
- Chat.
- Support.

Access depends on modules enabled by Admin or Reseller.

---

## 5. User / Customer Web Guide

Users can access services from the account area.

### 5.1 User Dashboard

The dashboard gives the customer a summary of:

- Active services.
- Orders.
- Wallet balance.
- eSIMs.
- Support.
- Notifications.

### 5.2 Profile

Users can manage:

- Name and profile details.
- Email and phone where allowed.
- Password or login settings where enabled.
- Language preference.

### 5.3 Buy and Use eSIM

User flow:

1. Browse destinations or packages.
2. Select package.
3. Pay using available payment method or wallet.
4. Open My eSIMs.
5. View QR code or manual installation details.
6. Install eSIM on device.
7. Use top-up if available.

Customer should check:

- Device supports eSIM.
- Device is unlocked.
- Destination and validity are correct before purchase.
- QR code is installed only on the intended device.

### 5.4 Orders

Users can view:

- eSIM orders.
- Top-up orders.
- IPTV orders.
- eRoaming orders.
- Payment status.
- Delivery status.

### 5.5 Wallet

Wallet can be used for:

- Wallet balance.
- Top-up.
- Voucher redemption.
- Payments where enabled.

### 5.6 Gift Cards, Rewards, and Referrals

If enabled, users can:

- Buy or redeem gift cards.
- Join member rewards.
- Invite users through referral program.
- Track reward balance or referral status.

### 5.7 eRoaming and DID

Users can:

- Buy DID/eRoaming numbers.
- View active DID numbers.
- Receive calls to assigned DID if enabled.
- Use SIP calling if a SIP account is assigned.
- View call features based on profile permissions.

### 5.8 IPTV Services

Users can:

- Browse IPTV packages.
- Buy IPTV subscription.
- View IPTV account or playlist details where supported.
- Renew or manage IPTV subscription.

### 5.9 Chat

Users can:

- Search contacts by phone, email, SIP username, or UID.
- Start direct chat.
- Start group chat or broadcast where enabled.
- Send photos, videos, documents, location, contacts, polls, events, AI image requests, fax requests, screenshots, and app shares.
- Send voice messages and video messages.
- Make voice or video calls.
- Record calls if allowed.
- Access images, videos, and call recordings quickly.

Security:

- Users cannot browse all platform users.
- Search requires at least 3 characters or 3 digits.

### 5.10 KYC Verification

If KYC is required:

1. Open KYC Verification.
2. Upload required documents.
3. Submit.
4. Wait for Admin approval.

Some services may be blocked until KYC is approved.

### 5.11 Support and VIP Concierge

Users can:

- Open support tickets.
- Contact VIP Concierge if enabled.
- Follow ticket status.
- Upload attachments when needed.

### 5.12 Security

Users should:

- Enable 2FA if available.
- Review IP logs.
- Keep email and phone secure.
- Report unknown activity.

---

## 6. Mobile App Guide

The mobile app gives users access to the main customer services from Android/iOS.

### 6.1 Mobile Login and Language

User flow:

1. Open the mobile app.
2. Login or register.
3. Select language if available.
4. Complete verification if required.

Supported language targets include:

- English
- Arabic
- French
- Spanish
- Italian
- Russian

### 6.2 Mobile eSIM Usage

Users can:

- Browse packages.
- Buy eSIMs.
- View active eSIMs.
- Open QR/manual installation details.
- Check order status.
- Buy top-ups where available.

### 6.3 Mobile eRoaming and SIP Calls

Mobile app can support:

- eRoaming DID view.
- SIP call dialpad.
- Internal SIP calls.
- International calls.
- Speaker option.
- Dial tone.
- Call history.

Important:

- Internal SIP calls should not require international format.
- International calls should require country code.
- Display text should show eRoaming branding where configured.

### 6.4 Mobile Chat

Mobile chat should support:

- Secure contact search by phone, email, SIP username, or UID.
- Direct chat.
- Group chat.
- Voice and video calls where RTC is configured.
- Voice messages.
- Video messages.
- Media sharing.
- Location sharing.
- Documents.
- Call recordings if allowed.

### 6.5 Mobile Account Services

Mobile users can also access:

- Wallet.
- Orders.
- KYC.
- Support.
- Referrals.
- Gift cards.
- IPTV if enabled.
- Notifications.
- Profile and security.

---

## 7. Module and Billing Rules

The platform has two control layers:

1. Module permission: decides whether the user can see/use a feature.
2. Billing/profile rule: decides whether the feature is Free, Paid, Trial, Web-enabled, or Mobile-enabled.

Example:

- A SIP user may have Chat enabled.
- The registration profile may mark Chat as Paid.
- The user can see/use the feature only when module access is enabled.
- If paid activation is required, the user must pay before full activation.

Paid profile fees are extra charges only:

- They do not replace the base eSIM, DID, SIP, IPTV, or other service price.
- Free means no extra profile fee.
- Paid means add extra charge on top of normal service price.

---

## 8. Recommended Testing Checklist

Use this checklist after creating or changing modules.

### Admin Test

- Login as Admin.
- Create one test user.
- Create one test reseller.
- Create one test agent.
- Enable and disable modules.
- Check that each role sees the correct menu.
- Create an eSIM order.
- Create a DID order.
- Create a SIP user.
- Create internal and origination tariffs.
- Create registration profile.
- Test chat contact search.
- Test support ticket.

### Reseller Test

- Login as Reseller.
- Check dashboard.
- Create a customer.
- Set package pricing if allowed.
- Place a customer order.
- Create voucher if allowed.
- Open invoices.
- Test support.

### Agent Test

- Login as Agent.
- Check assigned modules.
- Create or manage customer if allowed.
- Place test order.
- Confirm access is limited correctly.

### User Web Test

- Login as User.
- Buy eSIM.
- Open My eSIMs.
- Redeem voucher.
- Open wallet.
- Start chat by searching phone, email, SIP username, or UID.
- Upload media in chat.
- Open support ticket.
- Complete KYC if required.

### Mobile App Test

- Login/register.
- Switch language.
- Buy or view eSIM.
- Test eRoaming dialpad.
- Test internal SIP call.
- Test international call validation.
- Test chat search.
- Send image, video, voice message, and document.
- Test notifications.

---

## 9. Support Notes for Staff

When helping a customer, always check in this order:

1. Account status.
2. KYC status.
3. Module permission.
4. Service subscription status.
5. Payment status.
6. Provider response.
7. Device compatibility.
8. Logs and error messages.

For SIP or chat call issues:

1. Check microphone/camera permissions.
2. Check browser/mobile permission.
3. Check SIP account status.
4. Check registration profile permissions.
5. Check TURN server configuration for restricted networks.
6. Test on Wi-Fi and mobile data.

For eSIM issues:

1. Confirm device supports eSIM.
2. Confirm eSIM was not already installed on another device.
3. Confirm the user is in the supported destination.
4. Confirm package validity and activation rules.
5. Check provider order status.

---

## 10. Short Role Summary

Admin:

- Full control of platform, customers, providers, services, modules, billing, security, and reports.

Reseller:

- Manages own business area, customers, agents, storefront, services, orders, vouchers, wallet, and reports based on permissions.

Agent:

- Manages assigned customers and services based on reseller/admin permissions.

User:

- Buys and uses eSIM, eRoaming, IPTV, wallet, vouchers, chat, support, and account services.

Mobile User:

- Uses the same customer services from the mobile app with mobile-friendly access to eSIM, eRoaming, SIP calls, chat, wallet, KYC, orders, and support.

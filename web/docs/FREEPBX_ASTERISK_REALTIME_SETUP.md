# FreePBX / Asterisk Realtime SIP Setup

This project is now prepared to provision real SIP accounts for Linphone SDK by writing Asterisk PJSIP realtime rows into:

- `ps_endpoints`
- `ps_auths`
- `ps_aors`
- `ps_contacts`

The FreePBX/Asterisk server must be configured to read those tables from the same PostgreSQL database used by the app, or from a replicated database with the same tables.

## Target Flow

1. A customer registers in the app.
2. The backend creates a row in `user_sip_accounts`.
3. If FreePBX realtime is enabled, the backend also creates:
   - `ps_endpoints`
   - `ps_auths`
   - `ps_aors`
4. Linphone SDK requests `/api/voice/session`.
5. The backend returns the user's real SIP username, password, domain, port, and transport.
6. Linphone registers to Asterisk/FreePBX.
7. Asterisk writes active registrations into `ps_contacts`.
8. The app's Free SIP test reads `ps_contacts` and shows Online/Offline.
9. Vonage forwards inbound virtual-number calls to `sip:username@sip.yourdomain.com`.

## Recommended Server

- Ubuntu 22.04/24.04 VPS
- FreePBX with Asterisk 20 or 21
- Public DNS name, for example `sip.yourdomain.com`
- TLS enabled for SIP, preferably port `5061`
- RTP ports open only as needed
- Database access restricted by firewall/VPC/private network

## App Admin Settings

Go to Admin -> Concierge Management -> Feature & Bot -> FreePBX / Asterisk.

Use:

- Enable Real SIP Provisioning: `On`
- SIP Domain: `sip.yourdomain.com`
- Provisioning Mode: `Asterisk Realtime`
- PJSIP Transport Name: `transport-tls`
- Dial Context: `from-internal`
- Linphone SIP Port: `5061`
- Allowed Codecs: `opus,ulaw,alaw`
- Voicemail Extension: `*98`
- Outbound Proxy: `sip:sip.yourdomain.com;transport=tls`

Click Save Concierge, then Test FreePBX.

## Install Required Asterisk Modules

On the FreePBX/Asterisk server:

```bash
sudo apt update
sudo apt install -y unixodbc unixodbc-dev odbc-postgresql
```

Confirm Asterisk has these modules:

```bash
asterisk -rx "module show like res_config_odbc"
asterisk -rx "module show like res_odbc"
asterisk -rx "module show like res_pjsip"
```

If ODBC modules are missing, install the matching Asterisk/FreePBX packages for your distro.

## Database User

Create a dedicated database user for Asterisk. Replace values first:

```sql
CREATE USER asterisk_realtime WITH PASSWORD 'CHANGE_ME_STRONG_PASSWORD';

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE
  ps_endpoints,
  ps_auths,
  ps_aors,
  ps_contacts
TO asterisk_realtime;

GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO asterisk_realtime;
```

If your app and PBX use different databases, replicate or migrate the four `ps_*` tables to the PBX database and update the app connection strategy accordingly.

## ODBC Files

Copy the templates from `deploy/freepbx/` to the FreePBX server:

- `odbcinst.ini`
- `odbc.ini`
- `res_odbc_custom.conf`
- `sorcery_custom.conf`
- `extconfig_custom.conf`
- `extensions_custom.conf`

The FreePBX-friendly destination paths are usually:

```text
/etc/odbcinst.ini
/etc/odbc.ini
/etc/asterisk/res_odbc_custom.conf
/etc/asterisk/sorcery_custom.conf
/etc/asterisk/extconfig_custom.conf
/etc/asterisk/extensions_custom.conf
```

Edit database host, database name, username, password, and domain before reload.

## FreePBX Reload

```bash
fwconsole reload
asterisk -rx "module reload res_odbc.so"
asterisk -rx "module reload res_config_odbc.so"
asterisk -rx "module reload res_pjsip.so"
```

Check ODBC:

```bash
asterisk -rx "odbc show"
```

Check realtime endpoints:

```bash
asterisk -rx "pjsip show endpoints"
```

After a user signs in or tests SIP in the app, you should see their endpoint in that list.

## Linphone SDK Registration Values

The mobile app should use `/api/voice/session` and register with:

- username: `data.username`
- password: `data.sipPassword`
- domain: `data.sipDomain`
- port: `data.sipPort`
- transport: `data.sipTransport`
- outbound proxy: `data.sipOutboundProxy`

The current backend now returns the user's stored SIP account instead of one shared password.

## Vonage Inbound Forwarding

For each virtual number routed to Free SIP Call, the app stores:

```text
sip:USER_EXTENSION@sip.yourdomain.com
```

Vonage Voice API can connect to this SIP URI from the inbound NCCO. Your app already defaults new receiving call routing to the user's Free SIP account.

## Firewall

Open only what is required:

- TCP `5061` for SIP TLS
- UDP RTP range configured in Asterisk, commonly `10000-20000`
- Database port only from app server/PBX private IPs
- FreePBX admin UI only from trusted IPs or VPN

Avoid exposing UDP `5060` publicly unless you really need it.

## Verification Checklist

1. Save FreePBX settings in the admin panel.
2. Click Test FreePBX.
3. Log in as a customer or create a new user.
4. Confirm database rows exist:

```sql
SELECT id, transport, aors, auth, context FROM ps_endpoints ORDER BY id DESC LIMIT 5;
SELECT id, username FROM ps_auths ORDER BY id DESC LIMIT 5;
SELECT id, max_contacts FROM ps_aors ORDER BY id DESC LIMIT 5;
```

5. Register with Linphone SDK or Linphone desktop.
6. Confirm active contact:

```sql
SELECT endpoint, uri, user_agent, expiration_time FROM ps_contacts ORDER BY endpoint;
```

7. Run Free SIP Account test in the customer panel.
8. Assign a virtual number and call it.

## Important Notes

- FreePBX may overwrite some base config files. Use the `_custom.conf` files where possible.
- The app creates realtime tables defensively, but production DB permissions should be explicit.
- For push notifications on mobile, Linphone SDK needs platform push setup separately. SIP registration alone works while the app is active; reliable background ringing needs mobile push integration.

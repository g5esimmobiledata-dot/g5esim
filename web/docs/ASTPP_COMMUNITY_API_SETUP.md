# ASTPP Community API Setup

This app can provision ASTPP Community SIP users through the ASTPP Community API add-on.

## App Settings

Go to:

```text
Admin -> Concierge Management -> Feature & Bot
```

Set:

```text
SIP Provisioning Provider: ASTPP Community
Enable ASTPP Provisioning: On
ASTPP API URL: https://your-astpp-host
X-Auth-Token: value from /var/lib/astpp/astpp-config.conf
Admin Account ID: ASTPP admin/reseller account id
Admin Account Token: encrypted account token returned by ASTPP API login
SIP Domain: sip.yourdomain.com
SIP Profile ID: 1
Reseller ID: 0
SIP Transport: udp
SIP Port: 5060
```

Click Save, then Test ASTPP.

## Required ASTPP API Add-on

ASTPP Community ships the API add-on under:

```text
addons/Community/api
```

Install/enable that add-on on the ASTPP server and apply:

```text
addons/Community/api/database/api_1.0.0.sql
```

The app calls:

```text
POST /admin/customer/
POST /admin/sip_devices/
```

with header:

```text
X-Auth-Token: YOUR_ASTPP_API_TOKEN
```

## Password Patch

The stock Community `sip_devices_create` endpoint generates its own SIP password. For this app, patch ASTPP so it accepts the `password` field sent by the app.

In:

```text
addons/Community/api/web_interface/astpp/application/controllers/admin/sip_devices.php
```

replace:

```php
$password = $this->common->generate_password();
```

with:

```php
$password = !empty($postdata['password']) ? $postdata['password'] : $this->common->generate_password();
```

Then deploy the patched file into the live ASTPP web interface.

## Provisioning Flow

When a customer opens the virtual-number dashboard or gets assigned a number:

1. The app creates an ASTPP customer with `customer_create`.
2. The app creates a numeric SIP device with `sip_devices_create`.
3. The app stores the SIP identity in `user_sip_accounts`.
4. Virtual-number SIP forwarding uses `sip:USERNAME@sip.yourdomain.com`.

ASTPP Community requires numeric SIP usernames, so the app generates names like:

```text
10000123
```

# G5eSIM Desktop Wrapper

Open-source Electron desktop wrapper for the G5eSIM web portal.

This repository contains only the desktop shell:

- Privacy and welcome screen
- Offline fallback screen
- Electron preload bridge
- Remote desktop URL resolver
- Windows installer configuration

It does not contain the private G5eSIM backend, customer data, provider integrations, API keys, server credentials, payment logic, or any private business code.

## How It Works

The app starts with a privacy screen, then opens one of the configured login targets:

- Admin
- User
- Agent
- Reseller

The wrapper reads `desktop-config.json` first, then checks the remote `desktopUrlLink` endpoint. This allows the live server URL and login targets to be changed without rebuilding the desktop app.

Default config:

```json
{
  "apiBaseUrl": "https://g5esim.mobile",
  "desktopUrlLink": "https://g5esim.mobile/api/desktop/config"
}
```

## Development

Install dependencies:

```bash
npm install
```

Check JavaScript syntax:

```bash
npm run check
```

Run locally:

```bash
npm start
```

Build Windows installer:

```bash
npm run build:win
```

Build Windows portable executable:

```bash
npm run build:portable
```

## Public Build Pipeline

The GitHub Actions workflow in `.github/workflows/windows-build.yml` builds the Windows installer from the public source in this repository and uploads the build artifacts.

This is included to make the build process reviewable for open-source code-signing programs such as OSSign.

## Security

Do not commit private API keys, server credentials, payment credentials, provider credentials, customer data, or private backend code to this repository.

The bundled `desktop-config.json` must remain safe for public distribution. Any sensitive desktop access token should be distributed outside this repository or configured at runtime.

## License

MIT

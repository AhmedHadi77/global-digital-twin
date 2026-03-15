# Oracle Cloud Always Free Backend Deployment

This project already includes an Oracle deployment kit in:

- `deploy/oracle/setup_vm.sh`
- `deploy/oracle/global-digital-twin.service`
- `deploy/oracle/Caddyfile.example`
- `deploy/oracle/backend.env.oracle.example`
- `deploy/oracle/redeploy_backend.sh`

Use this when you want an always-on backend without Render sleep delays.

## What stays the same

- Frontend stays on Vercel
- Simulator stays embedded in the backend
- Database can stay on Render Postgres for now

## What changes

- Backend moves from Render to Oracle Cloud Always Free VM

## 1. Create the Oracle VM

Create an Ubuntu VM in Oracle Cloud Always Free.

Recommended:

- Shape: `VM.Standard.A1.Flex`
- 1 OCPU
- 6 GB RAM
- Public IPv4 enabled

Also reserve a static public IP and attach it to the VM.

Open inbound ports:

- `22`
- `80`
- `443`

## 2. Point a hostname to the VM

Use either:

- your own domain, for example `api.yourdomain.com`
- or a free hostname such as DuckDNS, for example `ahmedgdt.duckdns.org`

That hostname must point to your Oracle VM public IP.

## 3. SSH into the VM

Example:

```bash
ssh -i /path/to/private-key ubuntu@YOUR_ORACLE_PUBLIC_IP
```

## 4. Clone the repo and run the setup script

Example:

```bash
git clone https://github.com/AhmedHadi77/global-digital-twin.git
cd global-digital-twin
chmod +x deploy/oracle/setup_vm.sh
APP_DOMAIN=YOUR_API_HOSTNAME APP_USER=ubuntu APP_DIR=/opt/global-digital-twin bash deploy/oracle/setup_vm.sh
```

Example with DuckDNS:

```bash
APP_DOMAIN=ahmedgdt.duckdns.org APP_USER=ubuntu APP_DIR=/opt/global-digital-twin bash deploy/oracle/setup_vm.sh
```

## 5. Edit the backend env file on the VM

After setup finishes:

```bash
nano /opt/global-digital-twin/backend/.env
```

Make sure it contains valid values like:

```env
DB_USER=global_digital_twin_user
DB_HOST=dpg-d6p0sd1j16oc738q3oo0-a.singapore-postgres.render.com
DB_NAME=global_digital_twin
DB_PASSWORD=YOUR_REAL_RENDER_DB_PASSWORD
DB_PORT=5432
DB_SSL=true
PORT=5000
FRONTEND_URLS=http://localhost:3000,https://global-digital-twin-frontend.vercel.app
RUN_EMBEDDED_SIMULATOR=true
```

## 6. Restart the backend service

```bash
sudo systemctl restart global-digital-twin
sudo systemctl status global-digital-twin
```

To view logs:

```bash
journalctl -u global-digital-twin -f
```

## 7. Test the Oracle backend

Open:

- `https://YOUR_API_HOSTNAME/health`
- `https://YOUR_API_HOSTNAME/summary`
- `https://YOUR_API_HOSTNAME/devices`

If these work, the backend is live and always-on.

## 8. Update the Vercel frontend

In Vercel, change:

```env
NEXT_PUBLIC_API_BASE_URL=https://global-digital-twin-backend.onrender.com
```

to:

```env
NEXT_PUBLIC_API_BASE_URL=https://YOUR_API_HOSTNAME
```

Then redeploy the frontend.

## 9. Updating the backend later

After pushing new code to GitHub, SSH into the VM and run:

```bash
cd /opt/global-digital-twin
chmod +x deploy/oracle/redeploy_backend.sh
bash deploy/oracle/redeploy_backend.sh
```

## Important note

This removes the Render backend sleep issue.

If you keep using Render free Postgres, the database is still temporary and must later be moved if you want a fully long-term free stack.

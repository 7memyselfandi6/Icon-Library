# IconLibrary Full Stack Setup

## Prerequisites

- Node.js 20+
- MongoDB running and accessible from `MONGODB_URI`

## Backend (server)

### Environment variables

Create `/home/dhz/Icon_Lib/server/.env` with:

```
PORT=4000
MONGODB_URI=mongodb://127.0.0.1:27017/icon_library
JWT_SECRET=change_me
TOKEN_EXPIRES_IN=1d
ADMIN_INITIAL_PASSWORD=admin123
CLIENT_ORIGIN=http://localhost:5173
PUBLIC_BASE_URL=http://localhost:4000
```

### Install and run

```
cd /home/dhz/Icon_Lib/server
npm install
npm run dev
```

The backend seeds the admin user on startup if it does not exist.

## Frontend (client)

### Environment variables

Create `/home/dhz/Icon_Lib/client/.env` with:

```
VITE_API_URL=http://localhost:4000
```

### Install and run

```
cd /home/dhz/Icon_Lib/client
npm install
npm run dev
```

## Production notes

- Configure `PUBLIC_BASE_URL` to the public backend URL used for serving icon files.
- Configure `CLIENT_ORIGIN` to the deployed frontend URL.
- Ensure MongoDB backups and monitoring are enabled in production.

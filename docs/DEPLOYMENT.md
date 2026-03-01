# IconLibrary Deployment Notes

## Backend configuration

Required environment variables:

```
PORT=4000
MONGODB_URI=mongodb://127.0.0.1:27017/icon_library
JWT_SECRET=change_me
TOKEN_EXPIRES_IN=1d
ADMIN_INITIAL_PASSWORD=admin123
CLIENT_ORIGIN=http://localhost:5173,http://localhost:3000
PUBLIC_BASE_URL=http://localhost:4000
```

The backend seeds the admin user at startup when it does not exist.

## Frontend configuration

```
VITE_API_URL=http://localhost:4000
```

## Dependencies

- Node.js 20+
- MongoDB 8+

## Run commands

Backend:

```
cd /home/dhz/Icon_Lib/server
npm install
npm run dev
```

Frontend:

```
cd /home/dhz/Icon_Lib/client
npm install
npm run dev -- --host
```

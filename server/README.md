# IconLibrary Backend

## Setup

1. Install dependencies:

```
npm install
```

2. Create an environment file:

```
cp .env.example .env
```

3. Update `.env` with your MongoDB URI and JWT secret.

4. Start the server:

```
npm run dev
```

The API runs on `http://localhost:4000` by default.

## Environment Variables

- `PORT`: Server port (default 4000)
- `MONGODB_URI`: MongoDB connection string
- `JWT_SECRET`: Secret used to sign JWTs
- `TOKEN_EXPIRES_IN`: JWT expiration time (e.g., `1d`)
- `ADMIN_INITIAL_PASSWORD`: Initial password for the fixed `admin` account
- `CLIENT_ORIGIN`: Allowed CORS origin
- `PUBLIC_BASE_URL`: Base URL used in generated icon URLs

## API Overview

### Authentication

- `POST /api/auth/login`
- `POST /api/auth/logout`
- `POST /api/auth/change-password`

### Icons

- `POST /api/icons`
- `GET /api/icons`
- `GET /api/icons/:id`
- `PUT /api/icons/:id`
- `DELETE /api/icons/:id`
- `GET /api/icons/:id/preview`
- `GET /api/icons/:id/download?type=file|html`

### Metadata and Stats

- `GET /api/categories`
- `GET /api/tags`
- `GET /api/stats`

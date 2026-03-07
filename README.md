# Task Manager Starter

This is a cPanel-friendly starter for a daily task tracker with:

- PHP 8 backend
- MySQL via PDO
- React + TypeScript frontend built with Vite
- Session-based authentication with per-user task isolation

The frontend is meant to be built locally and deployed as static files. The PHP API runs directly on shared hosting.

## Project layout

- `public/` web root for Apache/cPanel
- `public/api/` JSON API entrypoint
- `server/` backend classes kept out of the web root
- `frontend/` React source
- `database/schema.sql` MySQL schema

## Local development

1. Copy `.env.example` to `.env` and update the database settings.
2. Create a MySQL database and import `database/schema.sql`.
3. Start PHP:

   ```bash
   php -S 127.0.0.1:8000 public/router.php
   ```

4. Install frontend dependencies:

   ```bash
   npm install
   ```

5. Start Vite:

   ```bash
   npm run dev
   ```

The React app proxies `/api` to the PHP server during development.

## Build the frontend

Build locally before deployment:

```bash
npm run build
```

This writes the production frontend bundle to `public/index.html` and `public/assets/`.

## cPanel / InMotion deployment

Recommended deployment:

1. Upload the whole project outside the public web root if your hosting layout allows it.
2. Point the domain or subdomain document root to `public/`.
3. Copy `.env.example` to `.env` and set your live database credentials.
4. Import `database/schema.sql` through phpMyAdmin.
5. Build locally with `npm run build` and upload the generated `public/index.html` plus `public/assets/`.

If you must use `public_html/`:

1. Put the contents of `public/` in `public_html/`.
2. Keep `server/` and `.env` one level above `public_html/`.
3. Keep the relative folder names the same so `public_html/api/index.php` can still reach `../server`.

## API endpoints

- `GET /api` overview
- `GET /api/health` health check
- `GET /api/auth/me` get current authenticated user
- `POST /api/auth/register` register a user and start a session
- `POST /api/auth/login` login and start a session
- `POST /api/auth/logout` clear the session
- `GET /api/tasks` tracker dashboard data
- `POST /api/tasks` create task
- `PATCH /api/tasks/{id}` update task
- `PATCH /api/tasks/{id}/completion` mark today's completion on or off
- `DELETE /api/tasks/{id}` delete task

### Task payload

```json
{
  "title": "Drink 2L water",
  "description": "Spread it across the day"
}
```

### Completion payload

```json
{
  "date": "2026-03-04",
  "completed": true
}
```

### Auth payloads

Registration:

```json
{
  "name": "Jane Doe",
  "email": "jane@example.com",
  "password": "strongpass123"
}
```

Login:

```json
{
  "email": "jane@example.com",
  "password": "strongpass123"
}
```

## Database update

If you already imported an older schema, re-import `database/schema.sql` or migrate your DB so it includes:

- `users` table
- `tasks.user_id` foreign key to `users.id`
- `task_completions` foreign key to `tasks.id`

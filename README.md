# Task Manager Starter

This is a cPanel-friendly starter for a task manager with:

- PHP 8 backend
- MySQL via PDO
- React + TypeScript frontend built with Vite

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
- `GET /api/tasks` list tasks
- `POST /api/tasks` create task
- `PATCH /api/tasks/{id}` update task
- `DELETE /api/tasks/{id}` delete task

### Task payload

```json
{
  "title": "Finish hosting setup",
  "description": "Point the addon domain to the public directory",
  "status": "todo",
  "priority": "high",
  "dueDate": "2026-03-15T18:00"
}
```

<?php

declare(strict_types=1);

$builtIndexes = [
    __DIR__ . '/index.html',
    __DIR__ . '/app/index.html',
];

foreach ($builtIndexes as $builtIndex) {
    if (is_file($builtIndex)) {
        header('Content-Type: text/html; charset=utf-8');
        readfile($builtIndex);
        exit;
    }
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Task Manager</title>
    <style>
        :root {
            color-scheme: light;
            font-family: "Space Grotesk", "Segoe UI", sans-serif;
            background:
                radial-gradient(circle at top left, rgba(255, 180, 120, 0.45), transparent 28%),
                radial-gradient(circle at bottom right, rgba(95, 143, 255, 0.25), transparent 30%),
                #f7f3ec;
            color: #1f1d1a;
        }

        body {
            margin: 0;
            min-height: 100vh;
            display: grid;
            place-items: center;
            padding: 24px;
        }

        main {
            width: min(720px, 100%);
            background: rgba(255, 255, 255, 0.82);
            backdrop-filter: blur(18px);
            border: 1px solid rgba(31, 29, 26, 0.08);
            border-radius: 24px;
            padding: 32px;
            box-shadow: 0 24px 80px rgba(43, 50, 66, 0.12);
        }

        h1 {
            margin: 0 0 12px;
            font-size: clamp(2rem, 5vw, 3.4rem);
            line-height: 0.95;
        }

        p {
            margin: 0 0 16px;
            line-height: 1.6;
        }

        code {
            font-family: "IBM Plex Mono", "SFMono-Regular", monospace;
            font-size: 0.95rem;
            background: rgba(31, 29, 26, 0.06);
            padding: 0.15rem 0.4rem;
            border-radius: 999px;
        }
    </style>
</head>
<body>
    <main>
        <h1>Task Manager starter</h1>
        <p>The PHP backend is in place. The React frontend bundle has not been built yet.</p>
        <p>Run <code>npm install</code>, then <code>npm run build</code> to generate <code>public/index.html</code> and <code>public/assets/</code>.</p>
        <p>For local development use <code>php -S 127.0.0.1:8000 public/router.php</code> and <code>npm run dev</code>.</p>
    </main>
</body>
</html>

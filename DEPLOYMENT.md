# Deployment Guide

This guide will help you host your project for free using **Render** (for the backend) and **Vercel** (for the frontend).

## Part 1: Deploy Backend to Render

1.  **Sign Up/Login**: Go to [render.com](https://render.com) and log in (recommended: sign in with GitHub).
2.  **Create Service**:
    *   Click **New +** and select **Web Service**.
    *   Connect your GitHub repository: `https://github.com/vishal-g-s-2006/ManagementCounseling`.
3.  **Configure**:
    *   **Name**: `tnea-backend` (or similar).
    *   **Region**: Choose the one closest to you (e.g., Singapore).
    *   **Branch**: `main`.
    *   **Root Directory**: `backend` (Important!).
    *   **Runtime**: `Node`.
    *   **Build Command**: `npm install`.
    *   **Start Command**: `node server.js`.
    *   **Free Instance Type**: Select "Free".
4.  **Deploy**: Click **Create Web Service**.
5.  **Wait**: It will take a few minutes. Once deployed, you will see a URL like `https://tnea-backend.onrender.com`. **Copy this URL.**

## Part 2: Connect Frontend to Backend

1.  Clone specific file or edit on GitHub (easier for now):
    *   Open `frontend/script.js`.
    *   Find the first line: `const API_URL = 'http://localhost:3000/api';`.
    *   Replace `'http://localhost:3000/api'` with your new Render URL + `/api`.
    *   Example: `const API_URL = 'https://tnea-backend.onrender.com/api';`.
2.  **Commit** this change to your repository.

## Part 3: Deploy Frontend to Vercel

1.  **Sign Up/Login**: Go to [vercel.com](https://vercel.com) and log in with GitHub.
2.  **Add New Project**:
    *   Click **Add New...** -> **Project**.
    *   Import your `ManagementCounseling` repository.
3.  **Configure**:
    *   **Project Name**: `tnea-counseling` (or similar).
    *   **Framework Preset**: Other (default is fine).
    *   **Root Directory**: Click "Edit" and select `frontend`.
4.  **Deploy**: Click **Deploy**.
5.  **Done**: You will get a Vercel URL (e.g., `https://tnea-counseling.vercel.app`).

## Troubleshooting

*   **CORS Error**: If the frontend cannot talk to the backend, check the browser console. The backend is configured to allow all origins (`cors()`), so it should work.
*   **Database**: The SQLite database is local to the Render instance. **Warning**: On the free tier of Render, the file system is ephemeral. This means **your database data will reset** every time the server restarts (which happens frequently on free tier). For a permanent database, you would need an external database like PostgreSQL (Render offers a free Postgres too) or MongoDB. For this demo/project, SQLite is fine but data won't persist long-term.

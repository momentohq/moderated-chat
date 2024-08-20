# Web Moderated Chat App

This directory contains a React + TypeScript + Vite web app version of the Moderated Chat demo.

## Prerequisites

- Node version 16 or higher is required

## Running the demo

Create a `.env` file to specify the base URL for your API endpoints.

```bash
VITE_API_BASE_URL="https://your-api-endpoint.com"
```

Then run the web app:

```bash
npm install
npm run dev
```

## Deploying to Vercel

For [Vercel](https://vercel.com) deployments of the moderated chat app, you must also ensure the `VITE_API_BASE_URL` environment variable exists. You can create this using the Vercel console on the project's Settings > Environment Variables page.

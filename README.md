# Welcome to React Router!

A modern, production-ready template for building full-stack React applications using React Router.

[![Open in StackBlitz](https://developer.stackblitz.com/img/open_in_stackblitz.svg)](https://stackblitz.com/github/remix-run/react-router-templates/tree/main/default)

## Features

- 🚀 Server-side rendering
- ⚡️ Hot Module Replacement (HMR)
- 📦 Asset bundling and optimization
- 🔄 Data loading and mutations
- 🔒 TypeScript by default
- 🎉 TailwindCSS for styling
- 📖 [React Router docs](https://reactrouter.com/)

## Getting Started

### Installation

Install the dependencies:

```bash
npm install
```

### Development

Start the development server with HMR:

```bash
npm run dev
```

Your application will be available at `http://localhost:5173`.

## Building for Production

Create a production build:

```bash
npm run build
```

## Deployment

### Docker Deployment

To build and run using Docker:

```bash
docker build -t my-app .

# Run the container
docker run -p 3000:3000 my-app
```

The containerized application can be deployed to any platform that supports Docker, including:

- AWS ECS
- Google Cloud Run
- Azure Container Apps
- Digital Ocean App Platform
- Fly.io
- Railway

### DIY Deployment

If you're familiar with deploying Node applications, the built-in app server is production-ready.

Make sure to deploy the output of `npm run build`

```
├── package.json
├── package-lock.json (or pnpm-lock.yaml, or bun.lockb)
├── build/
│   ├── client/    # Static assets
│   └── server/    # Server-side code
```

## Styling

This template comes with [Tailwind CSS](https://tailwindcss.com/) already configured for a simple default starting experience. You can use whatever CSS framework you prefer.

---

Built with ❤️ using React Router.

## Reviews

`ReviewView` supports place reviews, user review history, and submission using
Fluent UI and the existing authenticated API helper. Routes, API contract, and
test instructions are documented in [docs/reviews.md](docs/reviews.md).

Run `npm test` for unit tests, `npm run typecheck` for TypeScript checks, and
`npm run build` for the production build.

# Results
<img width="1920" height="1243" alt="Screenshot 2026-10-14 at 6 21 26 AM" src="https://github.com/user-attachments/assets/db8e3f9c-c075-4f66-9466-c5057a319a7e" />
<img width="1920" height="1243" alt="Screenshot 2026-10-14 at 6 22 30 AM" src="https://github.com/user-attachments/assets/af7e34fb-4e00-4f22-bc8e-cddf21e8e9f9" />
<img width="3024" height="4032" alt="81365554775__3DD25C75-AFCE-42BC-903B-AD30A8F952A5" src="https://github.com/user-attachments/assets/ba1c3746-4d8a-44e8-a4e7-b182c1bca21d" />




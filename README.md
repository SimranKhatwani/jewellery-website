# AURELLE — Fine Silver Jewellery

A luxury digital catalogue and management system for **AURELLE**, presenting sculptural solid 925 sterling silver rings and delicate chain anklets with MongoDB GridFS image storage, REST API backend, and dedicated Admin Panel.

---

## ✦ Project Structure

```
jewellery website/
├── frontend/                 # Complete AURELLE Storefront & Admin Panel
│   ├── src/                  # React 19 + TypeScript components, PDP, 3D ring viewer
│   │   ├── admin/            # Dedicated Admin Portal (/admin)
│   │   ├── assets/           # High-res photography & campaign imagery
│   │   ├── components/       # Editorial catalogue sections & modals
│   │   ├── data/             # Catalogue fallback dataset
│   │   ├── services/         # API integration client & live event bus
│   │   └── types/            # Jewellery & specification interfaces
│   ├── public/               # Video assets and static media
│   ├── index.html            # Vite HTML entry
│   ├── vite.config.ts        # Vite configuration with /api backend proxy
│   ├── package.json          # Frontend dependencies
│   └── tsconfig.json         # Frontend TypeScript config
│
├── backend/                  # REST API & Database Engine
│   ├── src/                  # Express + TypeScript source
│   │   ├── config/           # MongoDB Atlas & GridFS bucket setup
│   │   ├── models/           # Mongoose models (Product, Category, Admin)
│   │   ├── routes/           # REST endpoints (auth, products, media, categories)
│   │   ├── middleware/       # JWT auth & error handling
│   │   └── scripts/          # Idempotent seed scripts (seedAdmin, seedProducts)
│   ├── .env                  # Backend environment secrets
│   ├── .env.example          # Sample environment variables
│   ├── package.json          # Backend dependencies
│   └── tsconfig.json         # Backend TypeScript config
│
└── package.json              # Monorepo workspace command runner
```

---

## ✦ Quick Start Commands

From the root project directory:

### 1. Run Frontend Dev Server (Port 3000)
```bash
npm run dev
# Or: cd frontend && npm run dev
```
Open [http://localhost:3000/](http://localhost:3000/) for the public website.

### 2. Run Backend API Server (Port 5000)
```bash
npm run server
# Or: cd backend && npm run dev
```
API running on [http://localhost:5000/api](http://localhost:5000/api).

### 3. Seed Initial Admin & Migrate Images to GridFS
```bash
# Seed the default admin (admin@aurelle.com / AurelleAdmin2026!)
npm run seed:admin

# Migrate local images into MongoDB GridFS & seed products
npm run seed
```

### 4. Access the Admin Panel
Navigate to [http://localhost:3000/admin](http://localhost:3000/admin) (or `#admin`) to manage products, upload image binaries directly to GridFS, and toggle publication status.

### 5. Build Both Projects
```bash
npm run build
```

---

*© AURELLE Fine Silver Jewellery · Distributed by RKB Enterprises.*

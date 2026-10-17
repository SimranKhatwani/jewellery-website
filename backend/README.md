# AURELLE Fine Silver Jewellery — Backend & Catalogue Management

High-performance, secure Node.js + Express + TypeScript REST API and MongoDB GridFS database storage engine powering the AURELLE luxury jewellery catalogue and Admin Panel.

---

## Architecture Overview

```
                      ┌──────────────────────────────────────┐
                      │    AURELLE Public Frontend (Vite)    │
                      │  - Pure Luxury UI & 3D Visualizer    │
                      │  - Public Catalogue & Filters        │
                      └──────────────────┬───────────────────┘
                                         │
                                         ▼
                             REST API & Proxy (/api)
                                         │
                      ┌──────────────────┴───────────────────┐
                      │    Express + TypeScript Backend      │
                      │  - JWT Bearer Authentication         │
                      │  - Input Validation & Rate Limiting  │
                      │  - GridFS Image Upload & Streaming   │
                      └──────────────────┬───────────────────┘
                                         │
                                         ▼
                      ┌──────────────────────────────────────┐
                      │         MongoDB (Atlas / Local)       │
                      │  - Collections: products, categories │
                      │  - Admins collection (bcrypt hash)   │
                      │  - GridFS: media.files, media.chunks │
                      └──────────────────────────────────────┘
```

---

## Features & Implementation

1. **Pure Binary GridFS Image Storage**:
   - High-resolution jewellery photography is stored directly as binary chunks in MongoDB (`media.files` and `media.chunks`).
   - Image serving via `/api/media/:id` with HTTP cache headers (`Cache-Control: public, max-age=86400`) and ETag validation.
   - Client and server-side validation rejecting files > 5MB and non-image MIME types.

2. **Idempotent Product & Image Seeding**:
   - `npm run seed`: Automatically inspects local product photography, imports binaries into GridFS, and upserts initial products without duplicating on subsequent runs.
   - `npm run seed:admin`: Creates the default superadmin account securely hashed with `bcryptjs`.

3. **Dedicated Admin Panel (`/admin`)**:
   - Accessible via `/admin` (or `#admin` hash fallback).
   - Segregated from public storefront navigation.
   - Product CRUD: Create, Edit, Delete (with confirmation), and instant 1-click Publish/Draft toggle.
   - Real-time image upload directly from computer to GridFS with immediate visual preview.
   - Live metrics: Total items, live published, drafts, bestsellers, and category counts.

4. **Zero-Downtime Graceful Degradation**:
   - If MongoDB or the backend is offline, the frontend gracefully falls back to the embedded curated catalogue so the storefront never breaks.

---

## REST API Endpoints

### 1. Authentication
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `POST` | `/api/auth/login` | Public (Rate-limited) | Admin login (Returns JWT token & admin profile) |
| `POST` | `/api/auth/logout` | Public | Invalidates admin session |
| `GET` | `/api/auth/me` | Protected (Bearer) | Validates session & returns current admin |

### 2. Public Catalogue
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/api/products` | Public | List all published products (`?category=rings`, `?search=band`) |
| `GET` | `/api/products/:slugOrId` | Public | Retrieve single product details by slug or MongoDB ID |
| `GET` | `/api/categories` | Public | List active catalogue categories |
| `GET` | `/api/media/:id` | Public | Stream image binary directly from MongoDB GridFS |

### 3. Protected Admin Operations
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/api/products/admin/all` | Admin | Retrieve all products (published and unpublished drafts) |
| `POST` | `/api/products` | Admin | Create a new product |
| `PUT` | `/api/products/:id` | Admin | Update product details |
| `DELETE` | `/api/products/:id` | Admin | Permanently delete product from catalogue |
| `PATCH` | `/api/products/:id/toggle-publish` | Admin | Instantly toggle published/hidden status |
| `POST` | `/api/media` | Admin | Upload multipart image binary directly into GridFS |
| `DELETE` | `/api/media/:id` | Admin | Delete media binary from GridFS |
| `POST` | `/api/categories` | Admin | Create new category |

---

## Environment Variables (`.env`)

Create a `.env` file in `backend/` based on `backend/.env.example`:

```env
PORT=5000
MONGODB_URI=mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/aurelle?retryWrites=true&w=majority
FRONTEND_URL=http://localhost:3000
JWT_SECRET=your_super_secret_jwt_key_here
JWT_EXPIRES_IN=7d
ADMIN_NAME=Aurelle Admin
ADMIN_EMAIL=admin@aurelle.com
ADMIN_PASSWORD=AurelleAdmin2026!
```

---

## Setup & Running Guide

### 1. Install Backend Dependencies
```bash
cd backend
npm install
```

### 2. Configure MongoDB
- In `backend/.env`, set your `MONGODB_URI` to your MongoDB Atlas cluster URI (or local MongoDB `mongodb://127.0.0.1:27017/aurelle`).

### 3. Seed Initial Admin & Catalogue
```bash
# Create the initial admin account
npm run seed:admin

# Migrate local images into MongoDB GridFS and seed products
npm run seed
```

### 4. Start the Backend Server
```bash
# Development (with auto-restart via tsx)
npm run dev

# Or build & run production:
npm run build
npm start
```
The backend server runs on `http://localhost:5000`.

### 5. Accessing the Admin Panel
1. Open your browser and navigate to:
   `http://localhost:3000/admin` (or `http://localhost:3000/#admin`)
2. Log in with the configured credentials:
   - **Email**: `admin@aurelle.com`
   - **Password**: `AurelleAdmin2026!`
3. You can now add products, upload high-resolution images to GridFS, toggle publication status, and manage display order.

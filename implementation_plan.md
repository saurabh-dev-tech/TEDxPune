# Implementation Plan: TEDx Community Mobile App

This document outlines the step-by-step technical execution strategy for building the TEDx Community App, based on the approved PRD.

## 1. 🏗️ Tech Stack Recap
- **Mobile:** React Native (Expo) with TypeScript
- **Backend:** Node.js (NestJS)
- **Database:** PostgreSQL with Prisma ORM
- **Authentication:** LinkedIn OAuth 2.0 + JWT
- **Styling:** Vanilla CSS (or NativeWind) using the "Quiet, Editorial Palette"

---

## 2. 🗄️ Database Schema (Prisma)
The following schema defines the core entities for Phase 1.

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

enum Role {
  USER
  ADMIN
  SUPERADMIN
}

model User {
  id            String    @id @default(cuid())
  email         String    @unique
  name          String
  bio           String?
  profileImage  String?
  linkedinId    String?   @unique
  role          Role      @default(USER)
  status        String    @default("ACTIVE") // ACTIVE, SUSPENDED, BLOCKED
  posts         Post[]
  comments      Comment[]
  likes         Like[]
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
}

model Post {
  id        String    @id @default(cuid())
  content   String
  authorId  String
  author    User      @relation(fields: [authorId], references: [id])
  likes     Like[]
  comments  Comment[]
  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt
}

model Comment {
  id        String   @id @default(cuid())
  content   String
  postId    String
  post      Post     @relation(fields: [postId], references: [id])
  authorId  String
  author    User     @relation(fields: [authorId], references: [id])
  createdAt DateTime @default(now())
}

model Like {
  id        String   @id @default(cuid())
  postId    String
  post      Post     @relation(fields: [postId], references: [id])
  userId    String
  user      User     @relation(fields: [userId], references: [id])
  createdAt DateTime @default(now())

  @@unique([postId, userId])
}
```

---

## 3. 🚀 Phase-wise Development

### Phase 1: Foundation & Authentication
- **Backend Setup:**
    - Initialize NestJS project.
    - Configure Prisma and connect to PostgreSQL.
    - Implement LinkedIn OAuth strategy using Passport.js.
    - Create JWT issuance and validation middleware.
- **Mobile Setup:**
    - Configure `expo-auth-session` for LinkedIn login.
    - Implement a secure `AuthContext` to manage tokens.
    - Design Splash and Login screens using the Editorial Palette.

### Phase 2: Core Community Features
- **Profile Management:**
    - API for fetching and updating user profiles.
    - Mobile: Profile screen with edit functionality.
- **Community Feed (Home):**
    - API: Paginated GET `/posts` endpoint.
    - API: POST `/posts` for creating new content.
    - Mobile: Main feed with infinite scroll and pull-to-refresh.
- **Engagement:**
    - API: Like/Unlike toggle and nested comments.
    - Mobile: Interaction buttons on feed cards; Post detail screen for comments.

### Phase 3: User Discovery & Admin Panel
- **Discovery:**
    - API: GET `/users` with basic filtering.
    - Mobile: Directory screen to browse fellow members.
- **SaaS Admin Panel:**
    - Initialize Next.js dashboard.
    - Implement authentication for Admin roles only.
    - Build "User Management" and "Content Moderation" views.

---

## 4. 🎨 Design System Implementation
- **Theme Config:** Centralize colors (`#E11D2E`, `#0A0A0A`, etc.) in a `constants/Theme.ts` file.
- **Typography:** Load fonts (Instrument Serif, Inter, JetBrains Mono) via `expo-font`.
- **Components:** Create reusable components:
    - `Button`: Primary/Secondary variants with 8-12px radius.
    - `Card`: Editorial style with hairline borders (#E4E4E7).
    - `Input`: Minimalist focus states.

---

## 5. 🛠️ Next Steps
1. **Infrastructure:** Provision a PostgreSQL instance (Local or Supabase/Neon).
2. **API Contracts:** Define exact JSON payloads for all endpoints.
3. **Skeleton App:** Generate the base navigation structure (Tabs: Home, Discovery, Profile).

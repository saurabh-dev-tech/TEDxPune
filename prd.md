# Product Requirements Document (PRD) for TEDx Community Mobile App

## 1. 📌 Project Overview
The TEDx Community App is a mobile platform (iOS & Android) designed to foster professional networking and engagement among TEDx members globally. It enables users to create profiles, share insights via posts, interact through likes and comments, and discover fellow community members. A SaaS-based Admin Panel ensures centralized control, moderation, and analytics. 

## 2. 🎯 Objectives
- Build a secure, LinkedIn-integrated professional network for TEDx members.
- Drive engagement through user-generated content and social interactions.
- Enable seamless onboarding using LinkedIn OAuth.
- Provide scalable admin oversight via a cloud-hosted dashboard.
- Lay foundation for future real-time chat with end-to-end encryption.

## 3. 👥 User Roles

### 3.1 Community Member
- Authenticate via LinkedIn or email.
- Create, view, edit, and manage personal profile.
- Publish, edit, and delete posts.
- Engage with content (like, comment).
- Discover and view other members.

### 3.2 Administrator
- Manage user accounts (view, block, suspend, edit).
- Moderate posts and comments.
- Access platform analytics (users, engagement, activity).
- Configure system settings.
- (Future) Multi-admin support with role-based access.

## 4. 📱 Mobile App Features

### 4.1 Authentication
- **Primary:** LinkedIn OAuth 2.0.
- **Fallback:** Email + password with secure hashing (bcrypt).
- **Session management:** via JWT tokens.

### 4.2 User Profile
- **Display:** Name, profile image, email, bio (optional).
- Editable fields within app.
- Auto-sync name/email from LinkedIn on login.

### 4.3 Community Feed
- Chronological feed of public posts.
- Infinite scroll with pagination.
- Support for text-only posts (images/links in Phase 2).

### 4.4 Post Creation
- Create, edit, and delete own posts.
- Timestamp displayed (e.g., "2h ago").
- Real-time feed updates.

### 4.5 Engagement
- Like/unlike posts.
- Comment and reply in threaded format.
- View comment count and recent comments.

### 4.6 User Discovery
- Browse list of registered members.
- Click to view full profile.
- (Future) Search and filter by location, event, interests.

## 5. 🖥 Admin Panel (SaaS)

### 5.1 Dashboard
- **Key metrics:** Total users, active users (7/30-day), total posts, comments, engagement rate.

### 5.2 User Management
- List all users with search/filter.
- **Actions:** View, block, suspend, edit (name, bio, status).

### 5.3 Content Moderation
- View all posts and comments.
- Delete or flag inappropriate content.
- Audit log of moderation actions.

### 5.4 Analytics
- User growth over time.
- Daily/weekly engagement trends.
- Post volume and interaction rates.

### 5.5 SaaS Capabilities
- Web-based (React/Next.js).
- Connected to shared backend APIs.
- (Future) Multi-tenancy, subscription model, RBAC.

## 6. 🔐 Security Considerations
- OAuth 2.0 via LinkedIn.
- JWT for API authentication.
- HTTPS enforcement.
- Role-based access control (RBAC) between user and admin.
- Data encryption at rest and in transit.

## 7. 🏗 Tech Architecture

| Layer | Technology |
|---|---|
| **Mobile App** | React Native |
| **Backend** | Node.js (NestJS), REST APIs |
| **Database** | PostgreSQL (primary), Cloudinary (image storage) |
| **Cloud** | AWS/GCP (hosting), CDN |
| **Admin Panel** | React + Next.js |

## 8. 🔄 System Flow
1. User logs in via LinkedIn → JWT issued.
2. Profile created/fetched from DB.
3. Feed loads latest posts.
4. User creates post → stored in DB → visible in feed.
5. Others engage → likes/comments recorded.
6. Admin logs into panel → monitors activity → moderates if needed. 

## 9. 📈 Future Scope (Phase 2+)
- **Private Messaging:** One-on-one chat with E2EE (WebSockets).
- **Advanced Posts:** Images, links, hashtags.
- **Search & Filters:** By name, event, topic.
- **Notifications:** Push/email alerts.
- **Multi-admin RBAC:** Roles like Moderator, Analyst.

## 10. 🎨 Design System & UI Guidelines

### 10.1 Color Palette (A quiet, editorial palette)
- **Signal Red:** `#E11D2E`
- **Ink:** `#0A0A0A`
- **Paper:** `#FFFFFF`
- **Mist:** `#F4F4F5`
- **Hairline:** `#E4E4E7`
- **Slate:** `#52525B`

### 10.2 Typography
- **Headlines & Editorial Moments:** Instrument Serif
- **Interface:** Inter 600
- **Body:** Inter 400 (set at 14.5–15px, 1.5 line height)
- **Meta, Timestamps, & Kickers:** JetBrains Mono

### 10.3 UI Motifs & Rules
- **Red Usage:** Used sparingly for Floating Action Buttons (FAB), primary Call To Actions (CTA), single active tab rules, and kicker accents.
- **Border Radius:** Cards (12px), Chips (999px), Buttons (8-12px).
- **Shadows vs Borders:** Hairline borders (`#E4E4E7`) replace shadows almost everywhere.
- **Sectioning:** A short red rule (12–28px) recurs as a sectioning mark.
- **Hierarchy:** Monospace kickers carry micro-hierarchy without adding weight.
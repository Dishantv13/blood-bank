# 🩸 RaktSarthi — Comprehensive Improvement Plan

> **Scope:** Security hardening · New features · UI/UX enhancements · Code-quality polish  
> **Date:** 2026-03-29  
> **Based on:** Full codebase scan of `backend/` and `frontend/src/`

---

## Table of Contents

1. [Security Improvements](#1-security-improvements)
2. [New Features](#2-new-features)
3. [UI / UX Improvements](#3-ui--ux-improvements)
4. [Code Quality & Architecture](#4-code-quality--architecture)
5. [Priority Matrix](#5-priority-matrix)
6. [Implementation Checklist](#6-implementation-checklist)

---

## 1. Security Improvements

### 1.1 · Brute-force / Rate Limiting ✅ Partially done
| Item | File(s) | Status |
|------|---------|--------|
| `authLimiter` applied to `/login`, `/register`, `/forgot-password`, `/google` | `backend/routes/auth.route.js` | ✅ Done |
| `authLimiter` applied to Blood Bank login & register routes | `backend/routes/bloodBankPortal.route.js` | ⚠️ Verify |
| `authLimiter` applied to Admin login route | `backend/routes/adminAuth.route.js` | ⚠️ Verify |

**Recommendation:** Audit every auth route file to confirm `authLimiter` is present. Add it where missing.

---

### 1.2 · Account Lockout After Failed Logins
Currently the app only rate-limits by IP. A sophisticated attacker can rotate IPs.

**Plan:**
- Add `loginAttempts` (Number) and `lockUntil` (Date) fields to `User.model.js` and `BloodBank.model.js`.
- In `authService.js#loginUser`, increment `loginAttempts` on each failed password check.
- Lock the account for 15 minutes after **5** consecutive failures; return a generic `401` (do not reveal lock status to prevent enumeration).
- Reset `loginAttempts` to `0` on a successful login.

```js
// Pseudocode – backend/services/authService.js
if (user.lockUntil && user.lockUntil > Date.now()) {
  throw new ApiError(401, 'Invalid email or password');
}
if (!isPasswordValid) {
  user.loginAttempts = (user.loginAttempts || 0) + 1;
  if (user.loginAttempts >= 5) {
    user.lockUntil = new Date(Date.now() + 15 * 60 * 1000);
  }
  await user.save();
  throw new ApiError(401, 'Invalid email or password');
}
user.loginAttempts = 0;
user.lockUntil = undefined;
```

---

### 1.3 · Google OAuth — Empty Blood Group
**Current behaviour:** New Google OAuth users are created with `bloodGroup: ''` (empty string) which is accepted by the schema validator (not required) but may cause subtle downstream bugs when filtering donors.

**Plan:**
- Confirm Google OAuth user creation already leaves `bloodGroup` as empty string (already fixed per `authService.js:176`).
- After first Google login, redirect the user to a **"Complete Your Profile"** wizard that requires blood group before proceeding.
- Mark profile as `isProfileComplete: Boolean` (add to schema); block donor-specific API actions until `true`.

---

### 1.4 · JWT / Token Security
| Finding | File | Fix |
|---------|------|-----|
| Token secrets fall back to a single `JWT_SECRET` for all three roles (user, admin, bloodbank) when role-specific secrets are absent | `backend/utils/authCookies.js:24-49` | Document clearly in `.env.example`; warn at startup if fallback is used |
| Refresh token is never invalidated server-side (no token family / revocation list) | `backend/utils/authCookies.js` | Add a Redis-backed (or MongoDB) refresh-token allowlist; revoke on logout and password change |
| Access token `15m` expiry is good; but refresh `7d` for bloodbank is `30d` — unusually long | `backend/utils/authCookies.js:45` | Reduce bloodbank refresh token TTL to `7d` to match other roles |

---

### 1.5 · Input Validation — Password Strength
- Minimum length is only **6 characters** (`backend/routes/auth.route.js:26`).
- **Recommendation:** Enforce at least **8 characters**, one uppercase, one number, one special character using a regex validator in `validationService.js`.

```js
// backend/services/validationService.js
export const validatePassword = (password) => {
  if (!password || password.length < 8) {
    throw new ApiError(400, 'Password must be at least 8 characters');
  }
  if (!/[A-Z]/.test(password)) {
    throw new ApiError(400, 'Password must contain at least one uppercase letter');
  }
  if (!/[0-9]/.test(password)) {
    throw new ApiError(400, 'Password must contain at least one number');
  }
  if (!/[^A-Za-z0-9]/.test(password)) {
    throw new ApiError(400, 'Password must contain at least one special character');
  }
};
```

---

### 1.6 · Sensitive Data Exposure
| Finding | File | Fix |
|---------|------|-----|
| Production error responses still include `err.stack` when `NODE_ENV !== 'production'` — fine for dev, but double-check env vars in deployed environments | `backend/middleware/globalErrorHandler.js:10` | Already handled; document that `NODE_ENV=production` must be set in deployment |
| CORS allows *all* origins in `NODE_ENV=development` (`app.js:54`) | `backend/app.js:54` | Acceptable for local dev; confirm this env var is never `development` in production deployments |
| File upload — no MIME-type allowlist on `multer` middleware | `backend/middleware/multer.js` | Add `fileFilter` to accept only `image/jpeg`, `image/png`, `image/webp` |

---

### 1.7 · HTTP Security Headers (Helmet)
Helmet is already in use. Suggested additional tuning:

```js
// backend/app.js
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "res.cloudinary.com", "lh3.googleusercontent.com"],
      scriptSrc: ["'self'"],
    }
  },
  crossOriginEmbedderPolicy: false, // needed for Google Maps embeds
}));
```

---

### 1.8 · Aadhar Card Image Security
The `User` model stores `aadharCard.imageUrl` (a Cloudinary URL). This is personally identifiable information (PII).

**Plan:**
- Store Cloudinary images in a **private folder** with signed URLs; never expose the raw Cloudinary URL to clients.
- Add an API endpoint that generates a short-lived signed URL on demand: `GET /api/users/aadhar-url`.
- Set `isVerified` only by an admin action, never by the user themselves.

---

### 1.9 · `isFake` Flag Exposure
`User.model.js` has an `isFake: Boolean` field. Ensure `toPublicUser()` in `authService.js` never returns this field (currently it does not — confirm stays that way).

---

## 2. New Features

### 2.1 · Real-Time Notifications (WebSocket / SSE)
**Problem:** Donors and patients have no real-time alert when a matching blood request appears.

**Plan:**
- Add **Server-Sent Events (SSE)** endpoint: `GET /api/notifications/stream` (authenticated).
- On blood request creation, push events to donors with matching blood group in the same city.
- Frontend: subscribe with `EventSource`; show toast + badge counter in Navbar.
- Store notification history in a `Notification` MongoDB collection with `isRead` flag.

```
Backend model: Notification { userId, type, title, message, relatedId, isRead, createdAt }
Frontend: NotificationBell component in Navbar with unread count badge
```

---

### 2.2 · Blood Request Emergency Alert
**Plan:**
- Add an `urgency` field (`low | medium | high | critical`) to `BloodRequest.model.js` (field may already exist — verify).
- For `critical` requests, trigger an email to all eligible donors in the city using the existing `emailService`.
- Add a visible **"🚨 CRITICAL"** badge on request cards.

---

### 2.3 · Donation Certificate Generation
**Plan:**
- After a donation is marked `completed`, generate a PDF certificate (use `pdfkit` or `puppeteer`).
- Endpoint: `GET /api/donations/:id/certificate` (auth-protected, own donation only).
- Frontend: "Download Certificate" button on the Donation detail card in the Dashboard.

---

### 2.4 · Donation Reminder System
**Plan:**
- After a successful donation, schedule a reminder email 90 days later (safe donation interval) using a cron job (`node-cron`).
- Store `nextEligibleDate` on `User.donorInfo`.
- Show countdown banner on Dashboard: "You can donate again in **X days**".

---

### 2.5 · Advanced Analytics Dashboard (Admin)
Current admin dashboard shows basic counts. Expand with:

| Widget | Data Source |
|--------|-------------|
| Monthly donations trend (line chart) | `Donation` collection |
| Blood group demand heatmap | `BloodRequest` aggregation |
| Top-10 donor leaderboard | `User.donorInfo.totalDonations` |
| Blood bank inventory status (gauge chart) | `Inventory` collection |
| Camp attendance vs. target | `BloodCamp` registrations |

Use `recharts` (already compatible with React 18) for chart rendering.

---

### 2.6 · Pagination / Infinite Scroll on Listing Pages
The `backend/utils/pagination.js` utility already exists but is not used on every listing endpoint.

**Plan:**
- Enforce `page` + `limit` query params on `GET /api/users/donors`, `GET /api/bloodbanks`, `GET /api/events`, `GET /api/blood-camps`.
- Frontend: Add a **"Load More"** button or infinite scroll using `IntersectionObserver` on `Donors.jsx` and `BloodBanks.jsx`.

---

### 2.7 · Multi-Language Support (i18n)
The app's target audience is India — adding Hindi support increases reach.

**Plan:**
- Use `react-i18next`.
- Extract all UI strings into `public/locales/en/translation.json` and `public/locales/hi/translation.json`.
- Add language switcher in Navbar.

---

### 2.8 · "Complete Your Profile" Onboarding Wizard
For new users (Google OAuth or regular sign-up with minimal data):

**Plan:**
- Detect `isProfileComplete: false` in `AuthContext`.
- Show a multi-step modal wizard after login: (1) Blood Group, (2) Address, (3) Phone.
- Mark `isProfileComplete: true` after wizard completes.

---

### 2.9 · Health Eligibility Quick Check (Frontend)
Before a user submits a donation, show a quick self-assessment:

- Last donation < 90 days? → Blocked with message.
- Weight < 50 kg? → Blocked with message.
- Currently on medication? → Warning.

This reduces invalid donation records without requiring full form submission.

---

### 2.10 · Dedicated `/api/health` Monitoring Endpoint
Already implemented in `backend/app.js:104-113`. **Enhancement:**
- Add `responseTimeMs` field to the response (measure mongoose ping latency).
- Integrate with an uptime monitor (e.g., UptimeRobot free tier) pointing at `/api/health`.

---

## 3. UI / UX Improvements

### 3.1 · Password Visibility Toggle
**Problem:** All password fields (Login, Signup, ChangePassword, ResetPassword, BloodBank equivalents) are plain `<input type="password">` with no show/hide option.

**Plan:**
- Create a reusable `PasswordInput` component with an eye/eye-slash icon toggle.
- Replace all password `<input>` fields across:
  - `frontend/src/pages/Login.jsx`
  - `frontend/src/pages/Signup.jsx`
  - `frontend/src/pages/ChangePassword.jsx`
  - `frontend/src/pages/ResetPassword.jsx`
  - `frontend/src/pages/BloodBankLogin.jsx`
  - `frontend/src/pages/BloodBankChangePassword.jsx`
  - `frontend/src/pages/BloodBankResetPassword.jsx`

```jsx
// frontend/src/components/PasswordInput.jsx
const PasswordInput = ({ value, onChange, placeholder, name }) => {
  const [visible, setVisible] = useState(false);
  return (
    <div className="password-input-wrapper">
      <input type={visible ? 'text' : 'password'} value={value} onChange={onChange}
             placeholder={placeholder} name={name} />
      <button type="button" onClick={() => setVisible(v => !v)} aria-label="Toggle password visibility">
        {visible ? <EyeSlashIcon /> : <EyeIcon />}
      </button>
    </div>
  );
};
```

---

### 3.2 · Confirmation Dialog Before Destructive Actions
**Problem:** Admin delete actions (Delete User, Delete Blood Bank, Reject Request) execute immediately on button click — no "Are you sure?" step.

**Plan:**
- Create a generic `ConfirmDialog` modal component.
- Wrap all destructive admin actions in `AdminUsers.jsx`, `AdminBloodBanks.jsx`, `AdminRequests.jsx`.

```jsx
// frontend/src/components/ConfirmDialog.jsx
const ConfirmDialog = ({ isOpen, title, message, onConfirm, onCancel, danger }) => { ... }
```

---

### 3.3 · Skeleton / Loading States
The existing `SkeletonLoader` component exists but may not be used consistently.

**Plan:**
- Audit every data-fetching page and ensure a `<SkeletonLoader />` is shown while data loads.
- Replace any remaining plain-text "Loading…" strings with the skeleton.
- Ensure the `PageLoader` in `App.jsx` (Suspense fallback) uses the spinner/skeleton, not plain text.

---

### 3.4 · 404 Not Found Page
A `NotFound.jsx` component already exists and is imported in `App.jsx`.

**Verify:** Confirm the catch-all route renders `<NotFound />` instead of `<Navigate to="/login" />`.

```jsx
// frontend/src/App.jsx — catch-all route
<Route path="*" element={<NotFound />} />
```

---

### 3.5 · Accessible Forms
- Add `aria-label` / `aria-describedby` to all form inputs.
- Ensure all interactive elements are keyboard-navigable.
- Check color-contrast ratios on the gradient backgrounds for WCAG AA compliance (target ≥ 4.5:1 for normal text).

---

### 3.6 · Mobile Responsiveness Audit
- Test all admin table pages on mobile (< 480 px) — tables often overflow.
- Add horizontal scroll wrapper or card-list view for small screens.
- Ensure Navbar hamburger menu closes when a route is selected.

---

### 3.7 · Empty State Illustrations
When a donor list, event list, or request list is empty, show a friendly illustration + CTA button instead of a blank area.

```jsx
// Example empty state
{donors.length === 0 && (
  <EmptyState
    icon="🩸"
    title="No donors found"
    message="Be the first to register as a donor in your area."
    ctaLabel="Become a Donor"
    ctaHref="/profile"
  />
)}
```

---

### 3.8 · Toast Notification Improvements
- Auto-dismiss success toasts after 3 s; keep error toasts until manually dismissed.
- Add a "View" action button on request-related notifications that navigates to the request detail.
- Stack toasts (max 3 visible) with a "clear all" option.

---

### 3.9 · Dark Mode Polish
The `ThemeContext` and `ThemeToggle` components exist. Ensure:
- All admin pages (`adminPage/`) respect the dark-mode CSS variables.
- Charts/modals use dark-mode-aware colours.
- `prefers-color-scheme` media query is used as the default on first load.

---

### 3.10 · Blood Bank Directory Filters
On `BloodBanks.jsx`, add filter controls:
- Filter by city / state
- Filter by available blood group
- Sort by distance (requires user geolocation consent)

---

## 4. Code Quality & Architecture

### 4.1 · Environment Variable Validation
`backend/config/security.js` validates critical secrets. Extend it to warn about optional but important variables:

```js
const warn = (name) => {
  if (!process.env[name]) console.warn(`[config] Optional env var missing: ${name}`);
};
warn('JWT_EXPIRES_IN');
warn('CLOUDINARY_CLOUD_NAME');
warn('EMAIL_HOST');
```

Also create a documented `.env.example` file at the root with all variable names (values blanked).

---

### 4.2 · Dedicated `/api/health` Endpoint Enhancement
Already exists at `backend/app.js:104`. Add a MongoDB ping time measurement:

```js
app.get('/api/health', async (req, res) => {
  const start = Date.now();
  let dbStatus = 'disconnected';
  try {
    await mongoose.connection.db.command({ ping: 1 });
    dbStatus = 'connected';
  } catch (_) { /* noop */ }
  res.json({
    status: dbStatus === 'connected' ? 'healthy' : 'degraded',
    db: dbStatus,
    dbPingMs: Date.now() - start,
    uptime: process.uptime().toFixed(2) + ' seconds',
    version: process.env.npm_package_version || '1.0.0',
  });
});
```

---

### 4.3 · Structured Logging
Replace `console.log` / `console.error` throughout the backend with a proper logging library:

**Recommendation:** `pino` (zero-dep, JSON output, works with log aggregators like Datadog/Papertrail).

```js
// backend/utils/logger.js
import pino from 'pino';
const logger = pino({ level: process.env.LOG_LEVEL || 'info' });
export default logger;
```

Update `globalErrorHandler.js` to use `logger.error({ err }, 'Unhandled error')` so sensitive stack traces never appear in stdout in production.

---

### 4.4 · API Versioning
All routes are currently `/api/...`. As the app grows, add a version prefix:

```js
app.use('/api/v1/auth', authRoutes);
```

This keeps backwards compatibility when breaking changes are introduced.

---

### 4.5 · Test Coverage
The project currently has no automated tests.

**Plan:**
- **Backend:** Add `jest` + `supertest` unit tests for `authService.js` (register, login, password reset).
- **Frontend:** Add `React Testing Library` tests for `Login.jsx` and `Signup.jsx` form validation.
- **CI:** Add a GitHub Actions workflow that runs tests on every PR.

---

### 4.6 · Docker / Deployment
Add a `docker-compose.yml` for local development:

```yaml
services:
  backend:
    build: ./backend
    ports: ["5001:5001"]
    env_file: ./backend/.env
  frontend:
    build: ./frontend
    ports: ["3000:3000"]
    env_file: ./frontend/.env
```

---

## 5. Priority Matrix

| # | Item | Impact | Effort | Priority |
|---|------|--------|--------|----------|
| 1.2 | Account lockout after failed logins | 🔴 High | 🟡 Medium | **P0** |
| 1.5 | Stronger password validation (8+ chars, complexity) | 🔴 High | 🟢 Low | **P0** |
| 1.6 | Multer MIME-type allowlist | 🔴 High | 🟢 Low | **P0** |
| 3.1 | Password visibility toggle | 🟡 Medium | 🟢 Low | **P1** |
| 3.2 | Confirmation dialog before destructive actions | 🟡 Medium | 🟢 Low | **P1** |
| 1.4 | Refresh-token revocation on logout/password change | 🔴 High | 🔴 High | **P1** |
| 2.1 | Real-time notifications (SSE) | 🟡 Medium | 🔴 High | **P2** |
| 2.3 | Donation certificate PDF | 🟡 Medium | 🟡 Medium | **P2** |
| 2.5 | Advanced analytics dashboard | 🟡 Medium | 🔴 High | **P2** |
| 2.6 | Pagination on listing pages | 🟡 Medium | 🟡 Medium | **P1** |
| 3.3 | Skeleton loaders everywhere | 🟢 Low | 🟢 Low | **P1** |
| 3.7 | Empty state illustrations | 🟢 Low | 🟢 Low | **P2** |
| 4.3 | Structured logging with pino | 🟡 Medium | 🟡 Medium | **P2** |
| 4.5 | Test coverage (jest + RTL) | 🔴 High | 🔴 High | **P2** |
| 2.7 | Multi-language (i18n) | 🟢 Low | 🔴 High | **P3** |
| 4.6 | Docker / docker-compose | 🟢 Low | 🟡 Medium | **P3** |

---

## 6. Implementation Checklist

### Phase 1 — Security (P0, immediate)
- [ ] Add account lockout logic to `authService.js` (User + BloodBank)
- [ ] Upgrade minimum password length to 8 chars + complexity in `validationService.js`
- [ ] Add MIME-type `fileFilter` to `backend/middleware/multer.js`
- [ ] Audit all auth routes for `authLimiter` presence
- [ ] Reduce bloodbank refresh token TTL from `30d` → `7d`
- [ ] Create `.env.example` with all variable names documented

### Phase 2 — UX Quick Wins (P1)
- [ ] Build `PasswordInput` component with show/hide toggle
- [ ] Replace all password fields in Login, Signup, ChangePassword, ResetPassword (user + bloodbank)
- [ ] Build `ConfirmDialog` component
- [ ] Wire ConfirmDialog into AdminUsers, AdminBloodBanks, AdminRequests delete/reject actions
- [ ] Audit all pages for skeleton loader usage; replace "Loading…" text
- [ ] Verify `<Route path="*" element={<NotFound />} />` catch-all is in place
- [ ] Add pagination (Load More button) to Donors and BloodBanks pages

### Phase 3 — New Features (P2)
- [ ] Real-time notifications: `Notification` model + SSE endpoint + `NotificationBell` component
- [ ] Blood request urgency field + critical email alerts
- [ ] Donation certificate PDF endpoint + Download button in Dashboard
- [ ] Donation reminder cron job (90-day interval)
- [ ] Expand Admin analytics with recharts charts
- [ ] Empty state illustrations for all listing pages

### Phase 4 — Code Quality (P2/P3)
- [ ] Replace console.log/error with pino logger throughout backend
- [ ] Add `/api/health` MongoDB ping latency
- [ ] Add API versioning (`/api/v1/`)
- [ ] Write jest + supertest tests for core auth flows
- [ ] Write React Testing Library tests for Login and Signup forms
- [ ] Add GitHub Actions CI workflow
- [ ] Add docker-compose for local dev
- [ ] Implement multi-language support (react-i18next, English + Hindi)

---

*This document will be updated as items are completed. Each phase can be tracked as a GitHub milestone.*

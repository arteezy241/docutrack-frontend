# DocuTrack Web — CLAUDE.md
Last updated: May 2026 (glassmorphism redesign, font improvements, mobile fixes, custom Google button)

## Project
React + Vite → mheku.fyi (Vercel, auto-deploys on push to master)
Backend: ASP.NET Core .NET 10 → api.mheku.fyi (Railway, auto-deploys on push to master)
Frontend local: C:\Users\PC\source\repos\docutrack-frontend\
Backend local: C:\Users\PC\source\repos\DocuTrack\
Push backend first, wait for Railway deploy, then push frontend.

## Rules
- Branch is master not main on both repos
- Give exact find/replace when editing existing files
- Never push without confirming it compiles/runs locally first

## Tech Stack
Frontend: React + Vite, Zustand (authStore, themeStore), TanStack Query, Axios (withCredentials:true), Inter font, CSS variables dark/light mode, useWindowWidth() hook (768px breakpoint), canvas particles on auth pages
Backend: ASP.NET Core .NET 10, EF Core (Npgsql), BCrypt.Net, JWT HS256, Google.Apis.Auth, Resend API, Cloudflare R2, WebPush VAPID, AspNetCoreRateLimit

## API
baseURL: https://api.mheku.fyi/api
All routes require X-API-Key header (ApiKeyMiddleware — global in Program.cs)
Auth: Bearer JWT in Authorization header
withCredentials: true (httpOnly cookie for trusted device)

## Key Files
src/api/client.js — Axios instance, auto Bearer, 401→/login
src/api/push.js — registerPush() — call after every login
src/components/Sidebar.jsx — TopNav (floating top bar), AppLayout, ProfileDropdown. Default export Sidebar() is a no-op kept for compat.
src/hooks/useWindowWidth.js — breakpoint 768px
src/store/authStore.js — token, user, login, logout, setUser, isAuthenticated
src/store/themeStore.js — isDark, toggleTheme — sets data-theme on html element
src/styles/theme.css — full design system (CSS variables + global reset + keyframes)
src/pages/Login.jsx — split-panel login: OtpBoxes, EyeIcon, Spinner, SpinnerMuted, inline CSS const

## Pages (src/pages/)
Login, Register, VerifyOtp, Dashboard, Documents, Routing, Workflow, Departments, Users, AuditLog, Settings, QrLogin, QrConfirm

## Auth Flow
1. POST /auth/login → if requiresOtp → OTP modal → POST /auth/verify-device
2. verify-device sets httpOnly cookie device_token_{userId} (90d, do NOT clear on logout)
3. JWT saved to localStorage, cookie managed by browser via withCredentials
4. QR Login: create session → poll status → mobile confirms → desktop receives JWT

## Login Page Architecture (src/pages/Login.jsx)
Split-panel layout: left 60% (canvas particles + layered radial blobs + branding), right 40% (frosted glass card). Mobile < 768px hides left panel.
Sub-components defined inline: OtpBoxes (6 individual digit inputs, auto-advance/backspace/paste), EyeIcon (show/hide toggle), Spinner (white, for primary buttons), SpinnerMuted (text-secondary color, for glass buttons).
All styles in a CSS const string injected via <style> — uses only CSS variables from theme.css (no hardcoded colors except particle canvas).
Forgot password: 3-step inline state machine (email → OTP → newpass → done) with animated step-dot pill indicator. No separate page/route.

**Auth loading state:** Single `authLoading` state (null | 'credentials' | 'google' | 'qr'). When any method is active: other auth buttons are disabled at opacity 0.5, active button shows spinner + loading label. Guards `if (authLoading !== null) return` before every auth action to prevent double-submits.

**Google button (custom glass):** Rendered as a stacked overlay — a `div.btn-google` (glass button, `pointer-events:none`) sits on top of a real `<GoogleLogin>` component at `opacity:0.001` (not 0 — fully transparent blocks pointer events on cross-origin iframes in production). The `<GoogleLogin>` iframe sits at `zIndex:2` and receives the actual click, preserving the `cr.credential` JWT ID token sent to `POST /auth/google { idToken: cr.credential }`. Do NOT use `overflow:hidden` on the wrapper and do NOT set opacity to `0` — both break click passthrough on production (deployed domain). The glass button has `backdrop-filter: blur(12px)`, Google logo SVG inline, hover lift effect.

**Light mode login card:** The login card background is always dark (`rgba(255,255,255,0.06)`) even in light mode — `[data-theme="light"] .login-root { background: #0d0f14 }`. Global theme.css sets `color: inherit` on all elements in light mode which would darken the card's white text. Fix: explicit `!important` color overrides on `.login-card` scoped selectors for `.f-label`, `.f-input`, `.or-divider span`, `.link-btn-sm`, `.pw-toggle`, `.btn-google`, and heading/paragraph elements — all forced back to their original white/rgba-white values.

**Left panel contrast:** `.login-subline` uses `rgba(255,255,255,0.88)` (not text-secondary). Feature pills use `rgba(255,255,255,0.1)` background, `rgba(255,255,255,0.2)` border, and `rgba(255,255,255,0.88)` text at 14px — readable against the animated gradient/blob background.

**Button radius consistency:** `.btn-primary`, `.btn-glass`, `.btn-google`, `.f-input` all use `var(--radius-md)` (10px).

**Password label row:** `.f-label-row` uses `flex, justify-content: space-between, gap: 8px, flex-wrap: nowrap`. `.link-btn` has `white-space: nowrap; flex-shrink: 0` so "Forgot password?" never wraps.

Auth logic: POST /auth/login → requiresOtp → OTP modal → POST /auth/verify-device → login() + registerPush(). Google OAuth and QR login preserved. 429 rate-limit error handled.

## Register Page Architecture (src/pages/Register.jsx)
Same split-panel layout as Login (60/40, left panel hidden on mobile < 768px).
Left panel: identical canvas particles + 3 static radial blobs + DOCUTRACK wordmark + headline + subline.
Right panel: frosted glass login-card (card-head / card-body / card-foot), same CSS class names as Login.
Fields: Full Name, Username, Email, Password (EyeIcon show/hide), Confirm Password.
Password strength bar: 4-segment bar (3px tall) rendered below password input when non-empty. Score 0–4 computed from: length≥8, uppercase, lowercase, digit. Colors: danger → #fb923c → warning → success. Labels: Weak / Fair / Good / Strong.
POST /auth/register → { fullName, username, email, password, role:'Staff' } → navigate('/verify-otp', { state: { email } }).

## VerifyOtp Page Architecture (src/pages/VerifyOtp.jsx)
Centered full-page layout on var(--bg-base) with 3 atmospheric radial blobs (no particle canvas).
DOCUTRACK logo mark (48px accent gradient) + wordmark centered above the card.
Card: frosted glass, same structure as Login card. fadeUp animation on the entire wrapper.
OtpBoxes component: 6 individual digit inputs (46×56px), same behavior as Login's OtpBoxes (auto-advance, backspace goes back, paste fills all, arrow keys navigate).
Resend button: 60-second countdown via useEffect tick. While counting: shows "Resend code in Xs". When 0: "Resend code" link → POST /auth/resend-otp → resets countdown to 60.
Success state: green checkmark circle, "Email verified!" text, auto-navigate to /login after 2s.
Email input shown when !location.state?.email (direct URL access).
POST /auth/verify-otp → { email, otp } → navigate('/login', { state: { message: '...' } }).

## Database Models (key ones)
User: Id, Username, Email, FullName, PasswordHash, Role (Admin/Staff/Viewer), DepartmentId, IsActive
Document: Id, Title, Content, Status (0=Draft,1=InReview,2=Approved,3=Rejected,4=Archived), OwnerId, FileUrl, FileName, DueDate
RoutingEvent: Id, DocumentId, FromUserId, ToUserId, Timestamp, Note, StatusAfter
NOTE: DocumentId1 column exists in DB as EF Core workaround — do not remove

## Backend Patterns
Standard endpoint: [HttpGet][Authorize] → get userId from claims → logic → return Ok()
Email: await _email.SendEmailAsync(to, subject, htmlBody)
After model change: create migration + add ALTER TABLE to alterCommands[] in Program.cs
EF Core: always parameterized queries, never raw string SQL interpolation

## CORS
Allowed: https://mheku.fyi, http://localhost:5173
AllowCredentials(), AllowAnyHeader(), AllowAnyMethod()

## Design System
All tokens live in src/styles/theme.css. Dark theme is `:root` default; light is `[data-theme="light"]`.

**Glassmorphism surface system (dark mode):**
- All card/panel backgrounds are semi-transparent: `rgba(255,255,255,0.06)` — matches the Login card level
- `backdrop-filter: blur(24px) saturate(180%)` on every card, panel, and modal
- Border: `rgba(255,255,255,0.12)`, shadow: `0 8px 40px rgba(0,0,0,0.40)` + inset top highlight
- Light mode panels shift to `rgba(255,255,255,0.62)` with dark borders via `[data-theme="light"]` overrides

**Glass utility classes:**
- `.lg-base` — used on Dashboard stat cards and panels
- `.glass` — general utility (uses `--glass-*` tokens)
- `.modal-box` — global override: dark glass in dark mode, white glass in light mode (both via theme.css `!important` rules)
- `.user-card` (Users.jsx), `.rule-card` (Workflow.jsx) — CSS class glass treatment with lift-on-hover

**Backgrounds:** --bg-base `#060810`, --bg-surface/card/elevated → all `rgba(255,255,255,0.06–0.10)` (glass)
**Borders:** --border-subtle `rgba(255,255,255,0.10)`, --border-default `rgba(255,255,255,0.18)`, --border-strong `rgba(255,255,255,0.30)`
**Text (glass-optimised):** --text-primary `#FFFFFF`, --text-secondary `rgba(255,255,255,0.80)`, --text-tertiary `rgba(255,255,255,0.52)`. Light mode: primary `#0a0d14`, secondary `rgba(10,13,20,0.75)`, tertiary `rgba(10,13,20,0.52)`
**Text rendering:** Dark mode applies `text-shadow: 0 1px 4–12px rgba(0,0,0,0.40–0.55)` to all text elements to lift them off blurred backgrounds. Light mode explicitly resets `text-shadow: none`.
**Accent:** --accent-gradient `linear-gradient(135deg,#5B52F0,#3DBBFF)`, --accent-from `#5B52F0`, --accent-to `#3DBBFF`
**Semantic (Apple HIG vibrant):** --success `#30D158`, --warning `#FF9F0A`, --danger `#FF453A`, --info `#0A84FF` — each has a -bg variant at 0.14 opacity
**Glass tokens:** --glass-bg `rgba(255,255,255,0.06)`, --glass-border `rgba(255,255,255,0.12)`, --glass-blur `blur(24px) saturate(180%)`, --glass-shadow, --glass-shadow-hover
**Typography scale (global):** body `15px`, h1 `1.70rem/700`, h2 `1.20rem/700`, h3 `1.00rem/650`
**Layout:** --header-height 56px, --content-max 1280px, --radius-sm/md/lg/xl/full (6/10/14/20/9999px)
**Shadows:** --shadow-sm/md/lg include inset top-highlight. --shadow-accent uses new brand colors.
**Motion:** --ease-spring, --ease-out, --duration-fast/base/slow (120/220/380ms)
**Keyframes (global):** fadeUp, fadeIn, scaleIn, spin, pulse, shimmer
Font: Inter variable from Google Fonts, antialiased, 6px custom scrollbar, ::selection indigo tint

## Navigation Architecture (src/components/Sidebar.jsx)
The old left sidebar is replaced by a floating pill top nav. The file still exports `AppLayout` (named) and `Sidebar` (default no-op). Also contains `AppBackground` (particle canvas + blobs, rendered inside AppLayout on all app pages).

**TopNav — floating pill (desktop ≥768px):**
- `div.tn-bar-wrap`: `position:fixed; top:12px; pointer-events:none` — wrapper provides centering without blocking clicks
- `header.tn-bar`: `height:48px`, glass pill — `rgba(13,15,20,0.45)`, `blur(28px)`, `border:rgba(255,255,255,0.13)`, `border-radius:9999px`. `pointer-events:all`. No `overflow:hidden` (would clip dropdown).
- Left: DocuTrack logo (clickable `<Link to="/">`) + wordmark 15px/700 white
- Center: thin divider + `nav.tn-pills` — 8 NavLink pills, 13px/550, `rgba(255,255,255,0.75)`. Active: accent-gradient bg + white/600 + accent glow shadow.
- Right: hamburger button (mobile only) + avatar wrap with `ProfileDropdown`
- Nav order: Dashboard (end=true) → Documents → Routing → Workflow → Departments → Users → Audit Log → Settings

**TopNav (mobile <768px):**
- Top bar: logo + wordmark left, burger icon + avatar right
- Burger opens slide-in drawer (`.tn-drawer`): dark glass `rgba(11,13,22,0.80)` + `blur(28px)`, all 8 nav items
- Fixed `nav.tn-bottom`: 56px glass bar, 5 icon-only tabs — active: accent-to color + dot indicator

**ProfileDropdown:** glass panel `rgba(13,15,22,0.72)` + `blur(28px)`, `border-radius:16px`. Text always hardcoded white (bg is always dark). Identity row (name/email/role badge) + Settings + Security + divider + Sign out danger. CRITICAL: do NOT add `overflow:hidden` to `.tn-bar` — it clips the dropdown.

**AppLayout:** `paddingTop:72`, `paddingBottom: isMobile ? 56 : 0`, inner wrapper `maxWidth:1100, margin:0 auto`. Inner wrapper padding is `isMobile ? '16px 0' : '32px 24px'` — zero horizontal padding on mobile so each page controls its own side padding and avoids double-padding that would clip content. AppBackground renders fixed canvas particles + 3 blobs behind all content at z-index 0.

**Light mode nav:** Pill and drawer/dropdown are always dark — explicit `[data-theme="light"]` overrides in CSS force white text for `.tn-pill`, `.tn-wordmark`, `.tn-dd-item`, `.tn-drawer-item`.

## Page Design Conventions (applied to all app pages)
These rules are consistent across all polished pages. Do not deviate when editing.

**Page header:** h1 (global scale: 1.70rem/700/ls -0.02em), subtitle 14px text-secondary. Right-aligned action button: accent-gradient, 36px height, 12px border-radius, SVG icon + label.

**Glass panel pattern (all main content panels):**
```jsx
style={{
  background: 'rgba(255,255,255,0.06)',
  backdropFilter: 'blur(24px) saturate(180%)',
  WebkitBackdropFilter: 'blur(24px) saturate(180%)',
  border: '1px solid rgba(255,255,255,0.12)',
  borderRadius: 20,
  overflow: 'hidden',
  boxShadow: '0 8px 40px rgba(0,0,0,0.40), 0 1px 0 rgba(255,255,255,0.08) inset',
}}
```
Use `borderRadius: 20` (not 16) on all panels going forward.

**Table cards:** glass panel pattern above, overflow hidden. No @import inside inline `<style>` blocks (Inter is already global).
- Header row: text-secondary, 11px/600, uppercase, letter-spacing 0.06em, `border-bottom rgba(255,255,255,0.08)`.
- Row padding: 15px 16px. Row hover: `rgba(255,255,255,0.05)`. Last-child: no border-bottom.
- Action buttons (last column): 32px circle, border-subtle, icon-only, title tooltip. Danger variant gets --danger-bg on hover.

**Status badges:** padding 5px 10px, border-radius var(--radius-full), 12px font, 600 weight. Use semantic vars.

**Modals:** `.modal-box` class — gets glass treatment automatically via global CSS in theme.css (`rgba(18,22,40,0.82)` dark / `rgba(255,255,255,0.82)` light, both with `blur(28px)`). `border-radius:20px`. Do not override background/border on `.modal-box` inline. Overlay: `rgba(0,0,0,0.6)` + `blur(16px)`. Max-width 480px, scaleIn animation.

**Inputs (forms/modals):** `var(--bg-card)` background (adapts to light/dark), `var(--border-default)`, 10px radius, 40px height, 14px font, `color: var(--text-primary)`. Focus: `border-color var(--accent-from)`, `box-shadow 0 0 0 3px rgba(91,82,240,0.20)`. Placeholder: `var(--text-tertiary)`.

**Field labels:** 11px, 700, text-tertiary, letter-spacing 0.05em, uppercase.

**Submit buttons in modals:** full-width (flex:1 next to cancel ghost), height 40px, accent-gradient, shadow-accent. Ghost cancel: height 36px, border-default.

**Settings cards:** same glass pattern as panels, `borderRadius: 20`, `padding: 24`. Use `cardStyle` object in Settings.jsx — do not hardcode per-card.

## Page-Specific Architecture Notes

**Documents (src/pages/Documents.jsx)**
Table columns: Title | Type | Status | Due Date | File | Created | Actions. Status badges use semantic vars. Action column: pencil (update status) + trash (delete), both 32px circles. View modal includes due-date picker, workflow trigger, and file upload/remove. Create and Status modals follow standard modal pattern.

**Routing (src/pages/Routing.jsx)**
Two tabs: Routing (document selector + routing history table + status change history) and Templates (card list). Routing history table: Approve = checkmark icon circle (.approve), Reject = × icon circle (.danger). Template cards keep text Use/Delete buttons (not table-column context). All mutations preserved.

**Users (src/pages/Users.jsx)**
Desktop: 3-column card grid (repeat(3,1fr)), mobile: 1 column. No table. Each card: role-colored avatar (Admin=amber, Staff=blue, Viewer=gray), name + email + role badge + dept. Inactive users: opacity 0.5, "Inactive" pill. Action buttons: assign-dept icon + deactivate/reactivate icon (32px circles). Assign dept modal uses standard pattern.

**Settings (src/pages/Settings.jsx)**
No tab navigation — single scrollable page with 5 stacked glass cards (24px gap, `cardStyle` object: `rgba(255,255,255,0.06)` glass, `borderRadius:20`, `padding:24`):
1. Profile: 64px accent-gradient avatar, display mode (name+email+role+Edit button) ↔ edit mode (form fields + Save/Cancel). Alert helper for success/error banners.
2. Security: Change Password accordion (chevron rotates). TwoFactorSection: iOS Toggle (44×24), Trust Device button, Trusted Devices list with revoke icon circles.
3. Appearance: Dark Mode toggle + 3 email notification toggles, all using Toggle component.
4. API Keys: generate form + key list. Power icon (toggle) + × icon (revoke), both 32px circles.
5. Sign Out: danger button → `logout()` + `navigate('/login', { replace: true })`.

**AuditLog (src/pages/AuditLog.jsx)**
Admin-only page (non-admin sees lock SVG + message). Table columns: Timestamp | User | Action | Resource | IP (5 columns — Details removed). Timestamp and IP in ui-monospace/SFMono-Regular/Menlo stack, 12px. Alternating row background: odd rows get var(--bg-card) tint. Filter selects: 175px each, side-by-side (≈360px total), not full-width. Table card: bg-surface/border-subtle.

**Workflow (src/pages/Workflow.jsx)**
Rules displayed as a card grid (auto-fill, minmax 300px). Each rule card: order badge + rule name (bold) + note in header; iOS Toggle right-aligned in header; trigger→next status flow pill with SVG arrow; assignee row if set; footer with delete icon circle. No text Activate/Deactivate button. Create rule modal: standard pattern with wf-input (40px height, bg-card, border-default, 10px radius).

**Departments (src/pages/Departments.jsx)**
Two tabs: By College (tree view) and All Departments (flat table).
Tree view: college rows have border-left 3px solid var(--accent-from), 15px/700 text, always-visible department children indented 16px with 13px text. Expand button on departments shows/hides member list. No college-level collapse. Unassigned departments shown with warning-bg border-left.
Flat view: proper HTML table, columns: Department | College | Members | Actions. College shown as code badge + name.
Both modals (Department, College) follow standard modal pattern with dp-input (40px, bg-card, border-default, 10px radius).

**Register (src/pages/Register.jsx)**
See Register Page Architecture section above.

**VerifyOtp (src/pages/VerifyOtp.jsx)**
See VerifyOtp Page Architecture section above.

## Security Features (for documentation)
JWT, BCrypt, Google OAuth 2.0, OTP email (registration + 2FA), QR Login (Steam-style),
Trusted devices (httpOnly cookie per-user), X-API-Key middleware, SSL/TLS,
RBAC (Admin/Staff/Viewer), EF Core parameterized queries, Rate limiting (10 login/min),
Input validation, Global error handler, File type validation (magic bytes + 10MB), Audit logging

## Capstone Context
Course: DCSN05C — Database Security Systems, LPU-Cavite
Frame: "Database Security System with Advanced Protection Mechanisms"
Docs tone: formal academic third person, Feature→Purpose→Implementation→Security rationale

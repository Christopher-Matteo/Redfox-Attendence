# REDFOX ATTENDANCE
### Production-Ready Web-Based Attendance Software for Redfox & Redstone Hotels

A simple, fast, and verified attendance system built strictly according to hotel operational requirements. Zero HRMS bloat, privacy-first camera verification, permanent branch QR codes, and a segregated private management admin portal.

---

## 🚀 Key URLs

| Screen | Route | Visibility | Access Requirements |
|---|---|---|---|
| **Employee Terminal** | `/attendance/:code` (e.g. `/attendance/ecr`) | Public (Staff) | Direct camera access, no password needed |
| **Branch Alias** | `/branch/:code` (e.g. `/branch/ecr`) | Public (Staff) | Automatically redirects to `/attendance/:code` |
| **Private Admin Login** | `/private-admin/login` | Management Only | Admin username & password |
| **Private Admin Portal** | `/private-admin` | Management Only | Secure session cookie (scrypt + HMAC token) |

> 🔒 **Critical Security Rule:** There are **zero** links, buttons, or navigation to the Admin portal anywhere on employee-facing pages. Direct unauthenticated access to `/private-admin` or `/api/admin/*` is blocked.

---

## 🔑 Default Administrator Credentials

- **URL:** `http://localhost:3000/private-admin/login`
- **Username:** `admin`
- **Password:** `RedfoxAdmin2026!`
*(Password can be updated anytime inside `Settings` within the admin portal)*

---

## ✨ Features & Architecture

### 1. Employee Attendance Terminal (`/attendance/:code`)
- Mobile-first, hotel-branded terminal (`REDFOX ATTENDANCE`).
- Automatically recognizes the branch from the QR code (no branch selector needed).
- Simple name dropdown showing active staff assigned to that specific branch.
- No employee passwords, IDs, or accounts needed.
- **[ CHECK IN ]**:
  - Opens front-facing camera with face positioning guide circle.
  - Automatically captures 1 still photo with a 3-second countdown and shutter audio feedback.
  - No photo gallery uploads permitted (direct camera stream only).
  - Submits punch with status `Pending Verification`.
  - Duplicate check: Blocks accidental double check-ins (*"You have already checked in at 8:58 AM"*).
- **[ CHECK OUT ]**:
  - Automatically validates that check-in was logged today.
  - Overnight shift support: Matches against night shift from previous day if checking out early morning.
  - Prevents double checkout (*"You have already checked out at 7:04 PM"*).

### 2. Privacy-First Photo Handling
- Photos are strictly temporary and non-guessable (`cin_<random-uuid>.jpg` / `cout_<random-uuid>.jpg`).
- Photos are stored in a private directory (`./data/photos/`) outside the public web root.
- Unauthenticated requests cannot access photos.
- **Immediate Automatic Deletion:** Once the manager clicks **[ ✓ CORRECT ]** or **[ ✕ WRONG PERSON ]**, the photo file is **permanently deleted from server disk** and the database record is updated to `Photo Deleted After Verification`.
- Deleted photos are never stored in long-term storage or included in CSV reports.

### 3. Rapid Admin Verification Queue
- Direct quick-access queue for all unverified attendance snapshots.
- Displays Staff Name, Branch, Punch Type (Check In / Check Out), Time, and Photo preview.
- **[ ✓ CORRECT ]**: Marks employee as **Present** and permanently destroys the photo.
- **[ ✕ WRONG PERSON ]**: Prompts confirmation dialog, marks employee as **Absent**, and destroys the photo.
- Automatically advances to the next pending item in the queue for fast daily manager reviews.

### 4. Branch Management & Permanent QR Codes
- Admin can add, edit, and toggle active/inactive status for branches.
- Permanent QR code generated for each branch attendance URL (`/attendance/:code`).
- Built-in **View QR**, **Download QR (PNG)**, and **Print QR Placard** modal formatted for front-desk and staff entrance display.

### 5. Shift & Temporary Schedule Management
- Shifts configured with Start Time and End Time (e.g., General Shift `09:00 - 19:00`, Morning Shift `07:00 - 16:00`, Night Shift `22:00 - 07:00`).
- **Temporary Shift Override:** Change an employee's shift for a single specific date (e.g., Arun normally 9 AM – 7 PM, tomorrow 7 AM – 4 PM). Afterwards, their normal roster remains untouched.

### 6. Daily Attendance & Bulk Absent Action
- Filter by Date, Branch, Employee, and Status.
- **[ Mark Unmarked Employees Absent ]**: Batch action with confirmation dialog to mark staff who did not punch as Absent.
- Automatically marks assigned Weekly Off days without requiring manual input.
- Full manual override capability (with audit trail recording `Updated by Admin` and timestamp).

### 7. Monthly Muster Matrix & Drilldown Logs
- Comprehensive monthly summary table displaying Present, Absent, Week Off, Leave, Half Day, and Total Working Days.
- Click any staff member to view an interactive day-by-day log (e.g. `01 Oct - Present - 8:58 AM - 7:04 PM`).

### 8. Reports & CSV Export
- Export Daily and Monthly attendance reports to CSV format (compatible with Microsoft Excel, Google Sheets, and LibreOffice).
- Filter by Branch and Employee.
- Clean printable report layout for hardcopy filing.

---

## 🛠️ Technology Stack

- **Framework:** Next.js (App Router, Server External Packages)
- **Database:** SQLite with `better-sqlite3` (WAL mode, foreign keys enabled, indexed)
- **Styling:** Custom Vanilla CSS with luxury Redfox brand tokens (Outfit & Inter typography)
- **QR Code Engine:** `qrcode` high-resolution generator
- **Camera Capture:** HTML5 `navigator.mediaDevices.getUserMedia` + Canvas rasterization
- **Security:** Scrypt password hashing + HMAC signed HTTP-only cookies

---

## 🏃 Running the Application

### Development Server
```bash
npm run dev
```
App runs at `http://localhost:3000`.

### Production Build & Start
```bash
npm run build
npm start
```

### Run End-to-End Test Suite
To verify all 28 workflow steps (login, branch creation, shift assignment, camera check-in, duplicate check, photo verification, disk deletion, check-out, and exports):
```bash
node scripts/test-workflow.mjs
```

---

## 📁 Project Structure

```
RedfoxAttendence/
├── data/
│   ├── attendance.db          # SQLite persistent database
│   └── photos/                 # Private temporary verification photos
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── admin/          # Authenticated admin management APIs
│   │   │   │   ├── attendance/ # Daily attendance, overrides & mark absent
│   │   │   │   ├── branches/   # Branch CRUD & QR generation
│   │   │   │   ├── employees/  # Staff CRUD & roster assignment
│   │   │   │   ├── login/      # Admin authentication
│   │   │   │   ├── logout/     # Session termination
│   │   │   │   ├── me/         # Session verification
│   │   │   │   ├── pending-verifications/ # Unverified photos queue
│   │   │   │   ├── photos/[filename]/     # Secure streaming endpoint
│   │   │   │   ├── reports/    # Monthly summary & CSV export
│   │   │   │   ├── settings/   # Password updates
│   │   │   │   ├── shifts/     # Shift CRUD & temporary overrides
│   │   │   │   └── verify/     # Correct / Wrong decision handler
│   │   │   └── attendance/     # Public employee terminal APIs
│   │   │       ├── branch/[code]/
│   │   │       ├── check-in/
│   │   │       ├── check-out/
│   │   │       └── employee-status/
│   │   ├── attendance/[code]/  # Mobile-friendly employee terminal page
│   │   ├── private-admin/      # Management portal
│   │   │   ├── login/          # Secret login screen
│   │   │   └── page.tsx        # Master admin dashboard
│   │   ├── globals.css         # Redfox design system & tokens
│   │   ├── layout.tsx          # Root HTML layout
│   │   └── page.tsx            # Public landing & branch directory
│   ├── components/
│   │   └── admin/              # Modular admin view components
│   │       ├── branches-view.tsx
│   │       ├── daily-attendance-view.tsx
│   │       ├── dashboard-view.tsx
│   │       ├── employees-view.tsx
│   │       ├── export-view.tsx
│   │       ├── monthly-report-view.tsx
│   │       ├── pending-verification-view.tsx
│   │       ├── settings-view.tsx
│   │       ├── shifts-view.tsx
│   │       └── sidebar.tsx
│   ├── lib/
│   │   ├── api-helpers.ts      # Shared API response & auth guards
│   │   ├── auth.ts             # Scrypt hashing & session cookie utilities
│   │   ├── db.ts               # SQLite schema & database connection
│   │   ├── photos.ts           # Temporary photo saving & disk deletion
│   │   └── qr.ts               # QR code generator
│   └── middleware.ts           # Route protection & branch alias redirect
├── scripts/
│   └── test-workflow.mjs       # End-to-end integration test script
├── next.config.mjs
├── tsconfig.json
└── package.json
```

---

© 2026 Redfox & Redstone Hotels. Official Attendance System.

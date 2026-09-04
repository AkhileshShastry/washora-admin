# Washora Laundry Admin PWA

Last updated: 2026-09-04

## Purpose

Washora Admin is a mobile-first laundry delivery tracking app that replaces the current manual Excel workflow. The first release focuses on admin operations: orders, customers, expenses, price master data, pickup and delivery tracking, payment status, and monthly profit visibility.

## Current Source Workbook

Reference file:

```text
C:\Users\Nithasha\Downloads\Washora_Master_Sheet.xlsx
```

Workbook tables found during analysis:

| Sheet | Current role | App mapping |
| --- | --- | --- |
| Orders | Main operational register | `orders` collection |
| Customers | Customer master and formulas | `customers` collection, stats derived from orders |
| Daily Summary | Manual summary | Dashboard calculations, not stored manually |
| Expenses | Expense log and manual P&L cells | `expenses` collection, P&L derived in app |
| Pricing Master | Service price list | `priceItems` collection |

Excel table ranges:

| Excel table | Range | Notes |
| --- | --- | --- |
| `orders` | `Orders!A1:T14` | 13 real order records |
| `Table1` | `Expenses!A1:E12` | Expense entry table |
| `Price_list` | `Pricing Master!A1:D16` | 15 price items |

Important workbook columns:

- Orders: Receipt Id, Date, Customer Id, Customer Name, Phone Number, Address, Service type, No. of Clothes, Total Amount, Order Status, Payment Status, Payment Mode, Pickup Date, Delivery Date, Pickup Status, Delivery Status, Collected By, Delivered By, Customer Notes, Instagram/Referral Source.
- Expenses: Date, Expense Type, Description, Amount, Paid by.
- Pricing Master: Service Type, Customer Price, Dhobi Cost, Profit.
- Daily Summary: Date, Total Pickups, Total Deliveries, Total Orders, Cash Collected, UPI Collected, Pending Payments, Remarks.

## Stack

| Layer | Choice | Reason |
| --- | --- | --- |
| Frontend | React with Vite | Fast local development, simple deployment, PWA friendly |
| PWA | Web app manifest plus service worker | Installable mobile app without app store release |
| Backend | Firebase serverless | No custom backend or API server for MVP |
| Auth | Firebase Auth email/password | Free-tier friendly for admin login |
| Database | Cloud Firestore | Real-time sync, mobile-friendly document model |
| Hosting | Firebase Hosting | Simple deploy path for a static PWA |
| Icons | Lucide React | Consistent icon buttons and dashboard visuals |

## Free-Tier Plan

Use the Firebase Spark plan for MVP.

- Firebase config is free.
- Email/password Firebase Auth is free for this admin use case.
- Firestore has no-cost quotas suitable for the expected early order volume.
- Firebase Hosting has no-cost quotas suitable for the early PWA.
- Avoid SMS/Phone Auth initially because SMS verification can be billed.

## Architecture

```text
React PWA
  |
  | Firebase SDK
  v
Firebase Auth + Firestore
```

No custom backend is planned for MVP. Business logic that does not require privileged server access lives in the React app and shared utility functions. Firestore security rules restrict database access to signed-in users.

## Project Structure

```text
washora-app/
|-- docs/
|   |-- FIREBASE_SETUP.md
|   |-- MIGRATION_GUIDE.md
|   `-- WASHORA_PROJECT_PLAN.md
|-- public/
|   |-- manifest.json
|   |-- sw.js
|   `-- washora-logo.jpeg
|-- src/
|   |-- components/
|   |   |-- common/
|   |   |-- dashboard/
|   |   |-- layout/
|   |   `-- orders/
|   |-- data/
|   |   `-- seedData.js
|   |-- hooks/
|   |   |-- useAuth.js
|   |   `-- useWashoraData.js
|   |-- pages/
|   |   |-- Customers.jsx
|   |   |-- Dashboard.jsx
|   |   |-- Expenses.jsx
|   |   |-- FirebaseSetup.jsx
|   |   |-- Login.jsx
|   |   |-- Orders.jsx
|   |   |-- Pricing.jsx
|   |   `-- Settings.jsx
|   |-- services/
|   |   |-- dataService.js
|   |   `-- firebase.js
|   |-- utils/
|   |   |-- calculations.js
|   |   |-- helpers.js
|   |   `-- statuses.js
|   |-- App.jsx
|   |-- main.jsx
|   `-- styles.css
|-- firestore.rules
|-- firebase.json
|-- .firebaserc
|-- index.html
|-- vite.config.js
`-- package.json
```

## Firestore Collections

### `orders`

Order is the primary operational record.

```js
{
  id: "ws-014",
  receiptId: "ws-014",
  orderDate: "2026-09-04",
  customerId: "sow-bare-5626",
  customerName: "Sowmya",
  phone: "9449505785",
  address: "barebail",
  area: "Barebail",
  items: [
    {
      id: "line-1",
      serviceType: "Kurtha(wash+iron)",
      quantity: 2,
      customerPrice: 80,
      dhobiCost: 0,
      lineTotal: 160,
      lineDhobiCost: 0,
      lineProfit: 160
    }
  ],
  clothesCount: 2,
  totalAmount: 160,
  dhobiCost: 0,
  grossProfit: 160,
  orderStatus: "Order Placed",
  paymentStatus: "Pending",
  paymentMode: "UPI",
  pickupDate: "",
  deliveryDate: "",
  pickupStatus: "",
  deliveryStatus: "",
  collectedBy: "Nikshepa",
  deliveredBy: "",
  customerNotes: "",
  referralSource: "Instagram",
  createdAt: "...",
  updatedAt: "..."
}
```

Decision: the app uses `items[]` instead of only one service type. This is more flexible than Excel and supports mixed laundry orders while still allowing old Excel rows to import as one-line orders.

### `customers`

```js
{
  id: "sow-bare-5626",
  name: "Sowmya",
  phone: "9449505785",
  address: "barebail",
  area: "Barebail",
  notes: ""
}
```

Customer totals, revenue, and first order date are derived from `orders`.

### `expenses`

```js
{
  id: "expense-001",
  date: "2026-06-18",
  expenseType: "Marketing",
  description: "Pamplet print",
  amount: 1200,
  paidBy: "Ranjith",
  linkedOrderId: ""
}
```

### `priceItems`

```js
{
  id: "price-kurtha-wash-iron",
  serviceType: "Kurtha(wash+iron)",
  customerPrice: 80,
  dhobiCost: 0,
  profit: 80,
  active: true
}
```

### `settings`

Use one document:

```text
settings/app
```

Fields:

```js
{
  staffMembers: ["Nikshepa", "Ranjith"],
  orderStatuses: ["Order Placed", "Picked Up", "Dropped at Dhobi", "Ready at Dhobi", "Delivered"],
  paymentStatuses: ["Pending", "Done", "Not delivered"],
  paymentModes: ["UPI", "Cash", "Card", "Bank Transfer"]
}
```

## App Screens

### Login

- Firebase email/password login when Firebase config is present.
- Firebase setup page is shown when Firebase config is missing.
- Demo mode is opt-in only through `VITE_ENABLE_DEMO_MODE=true`.
- Firestore data loading starts only after a signed-in Firebase Auth user exists.

### Dashboard

- Total orders.
- Active orders.
- Today pickups.
- Today deliveries.
- Pending payment amount.
- Monthly revenue.
- Monthly expenses.
- Monthly profit.
- Active order list.
- Pending collection list.

### Orders

- Search by receipt, customer, phone, address, or area.
- Filter by order status.
- Filter by payment status.
- Add/edit order modal.
- Multi-item order entry.
- Auto calculation for quantity, customer amount, dhobi cost, and profit.
- Quick status and payment updates from the order card.
- Call and WhatsApp buttons when a phone number is present.

### Customers

- Customer master list.
- Search by name, phone, address, area, or customer ID.
- Add new customers.
- Edit existing customer name, phone, area, address, and notes.
- Existing customer IDs are locked during edit to avoid breaking order links.
- Derived totals from orders.

### Expenses

- Add expenses.
- Search expenses.
- Delete expenses.
- Total expense summary.

### Pricing

- Searchable quick-reference pricing table.
- Add/edit price items.
- Customer price, dhobi cost, and profit.
- Active/inactive price items.

### Settings

- Demo vs Firestore mode indicator.
- Edit staff names.
- Reset demo data only when demo mode is explicitly enabled.
- Seed Firestore with workbook-derived demo data after Firebase is configured.
- Import the current Excel workbook into Firestore.
- Migrate old browser demo storage into Firestore.

## Firebase Setup

Create a Firebase project and register a Web app. Put the values in `.env` using `.env.example`.

```text
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
```

Enable these Firebase products:

- Authentication: Email/password provider.
- Firestore Database.
- Hosting.

Initial Firestore rules in this repo:

```js
allow read, write: if request.auth != null;
```

Before production, tighten this to admin users only. A simple next step is adding an `admins/{uid}` document and checking that document in rules.

## PWA Details

Implemented PWA files:

- `public/manifest.json`
- `public/sw.js`
- `public/washora-logo.jpeg`

The service worker caches the app shell and falls back to `index.html` for navigation requests. Firestore offline persistence is not enabled yet; that can be added later if offline order entry becomes important.

## Implementation Status

Completed in the first implementation pass:

- React + Vite project scaffold.
- Vite React plugin config for automatic JSX runtime.
- Firebase setup screen when `.env` is missing.
- Demo storage disabled by default.
- Optional Firebase Analytics support through `VITE_FIREBASE_MEASUREMENT_ID`.
- Firestore subscriptions gated behind Firebase Auth.
- Settings migration tools for Excel import and browser demo storage import.
- Washora logo added to public assets.
- PWA manifest and service worker.
- Firebase config module.
- Firebase Auth hook.
- Firestore data service.
- Local demo storage fallback.
- Workbook-derived seed data.
- Dashboard.
- Orders list.
- Add/edit order modal.
- Customers page with add/edit modal.
- Expenses page.
- Pricing page with searchable table and add/edit modal.
- Settings page.
- Mobile-first responsive shell with bottom navigation.

## Next Implementation Milestones

1. Install dependencies and run production build.
2. Add Firebase project config to `.env`.
3. Enable Firebase Auth and create the first admin user.
4. Deploy Firestore rules.
5. Import current Excel workbook from Settings.
6. Add admin-only Firestore rules.
7. Add export to CSV or Excel for backup.
8. Add monthly reports by date range.
9. Add delivery reminders and WhatsApp message templates.

## Product Decisions

- Keep MVP free-tier friendly.
- Use email/password auth first.
- Avoid custom backend until there is a clear need.
- Store order line items rather than only a single service type.
- Derive dashboard and customer stats from source records.
- Keep old Excel rows compatible as single-line orders.
- Keep Firestore document structures readable and easy to export.

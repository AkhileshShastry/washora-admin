# Washora Data Migration Guide

Last updated: 2026-09-04

Use this guide after Firebase Auth and Firestore are configured and you can log in to the app.

## Migration Options

The Settings page supports three Firestore import actions.

| Action | Use when | Source |
| --- | --- | --- |
| Import Excel | You want to migrate the current workbook | `.xlsx` or `.xls` selected from your computer |
| Migrate browser data | You entered demo data before Firebase was configured | Browser `localStorage` key `washora-admin-demo-data-v1` |
| Seed built-in data | You want the workbook sample data bundled in the app | `src/data/seedData.js` |

## Recommended First Migration

1. Log in to the Washora app.
2. Open Settings.
3. Click Import Excel.
4. Choose:

```text
C:\Users\Nithasha\Downloads\Washora_Master_Sheet.xlsx
```

5. Wait for the success message.
6. Open Orders, Customers, Expenses, and Pricing to confirm counts.

The importer writes to these Firestore collections:

```text
orders
customers
expenses
priceItems
settings/app
```

## Excel Mapping

### Orders

Excel sheet:

```text
Orders
```

Firestore collection:

```text
orders
```

Each Excel row becomes one order document. The existing one-service Excel rows become one item inside `items[]`.

### Customers

Excel sheet:

```text
Customers
```

Firestore collection:

```text
customers
```

Customers are imported from the sheet and also completed from order rows when an order has a customer not already present in the customer master.

### Expenses

Excel sheet:

```text
Expenses
```

Firestore collection:

```text
expenses
```

The current Excel `Expense Type` is treated as part of the description. The app infers a clean category such as Dhobi, Fuel, Packing, Recharge, Marketing, or Other.

### Pricing

Excel sheet:

```text
Pricing Master
```

Firestore collection:

```text
priceItems
```

Profit is calculated as:

```text
customerPrice - dhobiCost
```

## Browser Demo Data Migration

If you entered data before Firebase was enabled, it may still exist in browser storage.

1. Log in to the app.
2. Open Settings.
3. Check the Browser data line.
4. Click Migrate browser data if it is enabled.

This only migrates data stored in the same browser profile on the same device.

## Duplicate Behavior

Imports use stable document IDs where possible:

- Orders use the receipt ID.
- Customers use the customer ID.
- Prices use the service type.
- Expenses use a generated ID based on row details.

Re-importing the same workbook updates matching orders, customers, and prices instead of creating duplicates. Expenses are stable for the same workbook row order.

## Safety Notes

- Import runs as the signed-in Firebase user.
- Firestore rules must allow the signed-in user to write.
- Existing matching documents are merged, not deleted.
- Always review Orders and Expenses after the first import.

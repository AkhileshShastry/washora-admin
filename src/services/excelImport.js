import { createSeedData } from "../data/seedData";
import { calculateOrderTotals } from "../utils/calculations";
import { makeCustomerId } from "../utils/helpers";

const OFFICE_REL_NS = "http://schemas.openxmlformats.org/officeDocument/2006/relationships";

const HEADER_ALIASES = {
  receiptid: "receiptId",
  date: "date",
  customerid: "customerId",
  customername: "customerName",
  phonenumber: "phone",
  address: "address",
  area: "area",
  servicetype: "serviceType",
  noofclothes: "clothesCount",
  totalamount: "totalAmount",
  orderstatus: "orderStatus",
  paymentstatus: "paymentStatus",
  paymentmode: "paymentMode",
  pickupdate: "pickupDate",
  deliverydate: "deliveryDate",
  pickupstatus: "pickupStatus",
  deliverystatus: "deliveryStatus",
  collectedby: "collectedBy",
  deliveredby: "deliveredBy",
  customernotes: "customerNotes",
  instagramreferralsource: "referralSource",
  name: "name",
  firstorderdate: "firstOrderDate",
  totalorders: "totalOrders",
  totalrevenue: "totalRevenue",
  notes: "notes",
  expensetype: "expenseType",
  description: "description",
  amount: "amount",
  paidby: "paidBy",
  customerprice: "customerPrice",
  dhobicost: "dhobiCost",
  profit: "profit",
};

const STAFF_FALLBACK = createSeedData().settings.staffMembers;

function cleanText(value) {
  return String(value ?? "")
    .replace(/\s+/g, " ")
    .trim();
}

function headerKey(value) {
  const compact = cleanText(value).toLowerCase().replace(/[^a-z0-9]/g, "");
  return HEADER_ALIASES[compact] || compact;
}

function slugify(value, fallback) {
  const slug = cleanText(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 70);

  return slug || String(fallback);
}

function hashText(value) {
  let hash = 0;
  const text = cleanText(value);

  for (let index = 0; index < text.length; index += 1) {
    hash = (hash * 31 + text.charCodeAt(index)) >>> 0;
  }

  return hash.toString(36);
}

function parseXml(text) {
  return new DOMParser().parseFromString(text, "application/xml");
}

function byLocalName(root, localName) {
  return [...root.getElementsByTagName("*")].filter((node) => node.localName === localName);
}

function firstLocalText(root, localName) {
  return byLocalName(root, localName)[0]?.textContent || "";
}

function resolveTarget(basePath, target) {
  if (target.startsWith("/")) {
    return target.slice(1);
  }

  const baseParts = basePath.split("/").slice(0, -1);
  const targetParts = target.split("/");
  const output = [...baseParts];

  targetParts.forEach((part) => {
    if (!part || part === ".") {
      return;
    }
    if (part === "..") {
      output.pop();
    } else {
      output.push(part);
    }
  });

  return output.join("/");
}

async function readZipText(zip, path) {
  const file = zip.file(path);
  return file ? file.async("string") : "";
}

async function readSharedStrings(zip) {
  const xml = await readZipText(zip, "xl/sharedStrings.xml");
  if (!xml) {
    return [];
  }

  const doc = parseXml(xml);
  return byLocalName(doc, "si").map((item) =>
    byLocalName(item, "t")
      .map((textNode) => textNode.textContent || "")
      .join(""),
  );
}

async function readWorkbookSheets(zip) {
  const workbookXml = await readZipText(zip, "xl/workbook.xml");
  const relsXml = await readZipText(zip, "xl/_rels/workbook.xml.rels");

  if (!workbookXml || !relsXml) {
    throw new Error("This file does not look like a valid Excel workbook.");
  }

  const workbookDoc = parseXml(workbookXml);
  const relsDoc = parseXml(relsXml);
  const rels = new Map(
    byLocalName(relsDoc, "Relationship").map((rel) => [
      rel.getAttribute("Id"),
      resolveTarget("xl/workbook.xml", rel.getAttribute("Target") || ""),
    ]),
  );

  return byLocalName(workbookDoc, "sheet").map((sheet) => {
    const relationId = sheet.getAttributeNS(OFFICE_REL_NS, "id") || sheet.getAttribute("r:id");
    return {
      name: sheet.getAttribute("name"),
      path: rels.get(relationId),
    };
  });
}

function columnIndex(cellRef) {
  const letters = cleanText(cellRef).match(/[A-Z]+/i)?.[0] || "A";
  return letters
    .toUpperCase()
    .split("")
    .reduce((total, letter) => total * 26 + letter.charCodeAt(0) - 64, 0) - 1;
}

function readCell(cell, sharedStrings) {
  const type = cell.getAttribute("t");
  const rawValue = firstLocalText(cell, "v");

  if (type === "s") {
    const text = sharedStrings[Number(rawValue)] || "";
    return { raw: text, text: cleanText(text) };
  }

  if (type === "inlineStr") {
    const text = byLocalName(cell, "t")
      .map((textNode) => textNode.textContent || "")
      .join("");
    return { raw: text, text: cleanText(text) };
  }

  const numeric = Number(rawValue);
  const raw = rawValue !== "" && Number.isFinite(numeric) ? numeric : rawValue;
  return { raw, text: cleanText(rawValue) };
}

function numberValue(entry) {
  if (typeof entry?.raw === "number") {
    return entry.raw;
  }

  const parsed = Number(cleanText(entry?.text).replace(/[^0-9.-]/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

function stringValue(entry) {
  return cleanText(entry?.text || entry?.raw);
}

function isoFromDateParts(year, month, day) {
  if (!year || !month || !day) {
    return "";
  }

  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return "";
  }

  return date.toISOString().slice(0, 10);
}

function excelSerialDate(value) {
  if (typeof value !== "number" || value <= 0 || value > 80000) {
    return "";
  }

  const utc = Date.UTC(1899, 11, 30) + Math.floor(value) * 86400000;
  return new Date(utc).toISOString().slice(0, 10);
}

function dateValue(entry) {
  if (!entry) {
    return "";
  }

  if (typeof entry.raw === "number") {
    return excelSerialDate(entry.raw);
  }

  const text = stringValue(entry);
  if (!text) {
    return "";
  }

  const iso = text.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (iso) {
    return isoFromDateParts(Number(iso[1]), Number(iso[2]), Number(iso[3]));
  }

  const match = text.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/);
  if (match) {
    const first = Number(match[1]);
    const second = Number(match[2]);
    const year = Number(match[3].length === 2 ? `20${match[3]}` : match[3]);
    const month = first > 12 ? second : first;
    const day = first > 12 ? first : second;

    return isoFromDateParts(year, month, day);
  }

  const parsed = new Date(text);
  if (!Number.isNaN(parsed.getTime())) {
    return isoFromDateParts(parsed.getFullYear(), parsed.getMonth() + 1, parsed.getDate());
  }

  return "";
}

async function readSheetObjects(zip, sheets, sharedStrings, sheetName, keyFields) {
  const sheetInfo = sheets.find((sheet) => sheet.name?.toLowerCase() === sheetName.toLowerCase());
  if (!sheetInfo?.path) {
    return [];
  }

  const xml = await readZipText(zip, sheetInfo.path);
  if (!xml) {
    return [];
  }

  const doc = parseXml(xml);
  const rows = byLocalName(doc, "row");
  const headerRow = rows.find((row) => byLocalName(row, "c").length > 0);
  if (!headerRow) {
    return [];
  }

  const headers = [];
  byLocalName(headerRow, "c").forEach((cell) => {
    headers[columnIndex(cell.getAttribute("r"))] = headerKey(readCell(cell, sharedStrings).text);
  });

  const output = [];
  let blankRun = 0;

  rows
    .filter((row) => Number(row.getAttribute("r") || 0) > Number(headerRow.getAttribute("r") || 1))
    .forEach((row) => {
      if (blankRun > 80) {
        return;
      }

      const item = {
        __rowNumber: Number(row.getAttribute("r") || output.length + 2),
      };

      byLocalName(row, "c").forEach((cell) => {
        const header = headers[columnIndex(cell.getAttribute("r"))];
        if (header) {
          item[header] = readCell(cell, sharedStrings);
        }
      });

      const hasKeyData = keyFields.some((field) => stringValue(item[field]) || numberValue(item[field]));
      if (hasKeyData) {
        blankRun = 0;
        output.push(item);
      } else {
        blankRun += 1;
      }
    });

  return output;
}

function normalizeOrderStatus(value) {
  const key = cleanText(value).toLowerCase();
  const statuses = {
    "order placed": "Order Placed",
    pickedup: "Picked Up",
    "picked up": "Picked Up",
    "dropped at dobhi": "Dropped at Dhobi",
    "dropped at dhobi": "Dropped at Dhobi",
    "ready at dobhi": "Ready at Dhobi",
    "ready at dhobi": "Ready at Dhobi",
    delivered: "Delivered",
  };

  return statuses[key] || cleanText(value) || "Order Placed";
}

function normalizePaymentStatus(value) {
  const key = cleanText(value).toLowerCase();
  const statuses = {
    done: "Done",
    paid: "Done",
    pending: "Pending",
    "not delivered": "Not delivered",
  };

  return statuses[key] || cleanText(value) || "Pending";
}

function inferExpenseType(value) {
  const key = cleanText(value).toLowerCase();

  if (key.includes("dobhi") || key.includes("dhobi")) {
    return "Dhobi";
  }
  if (key.includes("fuel")) {
    return "Fuel";
  }
  if (key.includes("bag") || key.includes("pack")) {
    return "Packing";
  }
  if (key.includes("recharge") || key.includes("jio")) {
    return "Recharge";
  }
  if (key.includes("print") || key.includes("pamphlet") || key.includes("pamplet")) {
    return "Marketing";
  }

  return "Other";
}

function parsePriceItems(rows) {
  return rows
    .map((row, index) => {
      const serviceType = stringValue(row.serviceType);
      const customerPrice = numberValue(row.customerPrice);
      const dhobiCost = numberValue(row.dhobiCost);

      if (!serviceType) {
        return null;
      }

      return {
        id: `price-${slugify(serviceType, index + 1)}`,
        serviceType,
        customerPrice,
        dhobiCost,
        profit: customerPrice - dhobiCost,
        active: true,
      };
    })
    .filter(Boolean);
}

function parseCustomers(rows) {
  return rows
    .map((row) => {
      const id = stringValue(row.customerId).toLowerCase();
      const name = stringValue(row.name);

      if (!id || !name) {
        return null;
      }

      return {
        id,
        name,
        phone: stringValue(row.phone),
        address: stringValue(row.address),
        area: stringValue(row.area),
        firstOrderDate: dateValue(row.firstOrderDate),
        notes: stringValue(row.notes),
      };
    })
    .filter(Boolean);
}

function parseOrders(rows) {
  return rows
    .map((row) => {
      const receiptId = stringValue(row.receiptId);
      const customerName = stringValue(row.customerName);
      const phone = stringValue(row.phone);
      const area = stringValue(row.area);
      const address = stringValue(row.address);
      const customerId =
        stringValue(row.customerId).toLowerCase() || makeCustomerId(customerName, area || address, phone);
      const quantity = numberValue(row.clothesCount);
      const totalAmount = numberValue(row.totalAmount);
      const serviceType = stringValue(row.serviceType) || "Laundry";
      const unitPrice = quantity > 0 ? Math.round((totalAmount / quantity) * 100) / 100 : totalAmount;
      const id = slugify(receiptId, `order-${row.__rowNumber}`);
      const totals = calculateOrderTotals([
        {
          id: `${id}-item-1`,
          serviceType,
          quantity,
          customerPrice: unitPrice,
          dhobiCost: 0,
        },
      ]);

      if (!receiptId || !customerName) {
        return null;
      }

      return {
        id,
        receiptId,
        orderDate: dateValue(row.date),
        customerId,
        customerName,
        phone,
        address,
        area,
        ...totals,
        totalAmount: totalAmount || totals.totalAmount,
        orderStatus: normalizeOrderStatus(stringValue(row.orderStatus)),
        paymentStatus: normalizePaymentStatus(stringValue(row.paymentStatus)),
        paymentMode: stringValue(row.paymentMode),
        pickupDate: dateValue(row.pickupDate),
        deliveryDate: dateValue(row.deliveryDate),
        pickupStatus: stringValue(row.pickupStatus),
        deliveryStatus: stringValue(row.deliveryStatus),
        collectedBy: stringValue(row.collectedBy),
        deliveredBy: stringValue(row.deliveredBy),
        customerNotes: stringValue(row.customerNotes),
        referralSource: stringValue(row.referralSource),
      };
    })
    .filter(Boolean);
}

function parseExpenses(rows) {
  return rows
    .map((row) => {
      const rawType = stringValue(row.expenseType);
      const description = [rawType, stringValue(row.description)].filter(Boolean).join(" - ");
      const amount = numberValue(row.amount);

      if (!rawType || !amount) {
        return null;
      }

      const key = `${row.__rowNumber}-${dateValue(row.date)}-${description}-${amount}`;

      return {
        id: `expense-${hashText(key)}`,
        date: dateValue(row.date),
        expenseType: inferExpenseType(description),
        description,
        amount,
        paidBy: stringValue(row.paidBy),
      };
    })
    .filter(Boolean);
}

function mergeCustomers(customers, orders) {
  const customerMap = new Map(customers.map((customer) => [customer.id, customer]));

  orders.forEach((order) => {
    if (!order.customerId || !order.customerName) {
      return;
    }

    const existing = customerMap.get(order.customerId) || {};
    customerMap.set(order.customerId, {
      id: order.customerId,
      name: existing.name || order.customerName,
      phone: existing.phone || order.phone,
      address: existing.address || order.address,
      area: existing.area || order.area,
      firstOrderDate: existing.firstOrderDate || order.orderDate,
      notes: existing.notes || "",
    });
  });

  return [...customerMap.values()];
}

function buildSettings(orders, expenses) {
  const staff = new Set(STAFF_FALLBACK);

  orders.forEach((order) => {
    if (order.collectedBy) {
      staff.add(order.collectedBy);
    }
    if (order.deliveredBy) {
      staff.add(order.deliveredBy);
    }
  });
  expenses.forEach((expense) => {
    if (expense.paidBy) {
      staff.add(expense.paidBy);
    }
  });

  return {
    ...createSeedData().settings,
    staffMembers: [...staff].filter(Boolean),
  };
}

export async function parseWashoraWorkbook(file) {
  const { default: JSZip } = await import("jszip");
  const buffer = await file.arrayBuffer();
  const zip = await JSZip.loadAsync(buffer);
  const [sheets, sharedStrings] = await Promise.all([readWorkbookSheets(zip), readSharedStrings(zip)]);

  const [priceRows, customerRows, orderRows, expenseRows] = await Promise.all([
    readSheetObjects(zip, sheets, sharedStrings, "Pricing Master", ["serviceType", "customerPrice"]),
    readSheetObjects(zip, sheets, sharedStrings, "Customers", ["customerId", "name", "phone"]),
    readSheetObjects(zip, sheets, sharedStrings, "Orders", ["receiptId", "customerName", "totalAmount"]),
    readSheetObjects(zip, sheets, sharedStrings, "Expenses", ["date", "expenseType", "amount"]),
  ]);

  const priceItems = parsePriceItems(priceRows);
  const parsedCustomers = parseCustomers(customerRows);
  const orders = parseOrders(orderRows);
  const expenses = parseExpenses(expenseRows);
  const customers = mergeCustomers(parsedCustomers, orders);

  const data = {
    orders,
    customers,
    expenses,
    priceItems,
    settings: buildSettings(orders, expenses),
  };

  return {
    data,
    summary: {
      orders: orders.length,
      customers: customers.length,
      expenses: expenses.length,
      priceItems: priceItems.length,
    },
    warnings: [],
  };
}

import jsPDF from "jspdf";
import QRCode from "qrcode";
import { formatDate } from "../utils/helpers";

const BUSINESS = {
  phone: "79077 36608",
  instagram: "@washora.mangalore",
  email: "washora.team@gmail.com",
  upiName: "RANJITH KUMAR",
  upiId: "8197857509@jupiteraxis",
  upiPhone: "+918197857509",
  qrPayload: "upi://pay?pa=8197857509@jupiteraxis&pn=RANJITH%20KUMAR&cu=INR",
};

function formatAmount(value) {
  return `Rs. ${Number(value || 0).toFixed(2)}`;
}

function loadImageData(url) {
  return fetch(url)
    .then((response) => response.blob())
    .then(
      (blob) =>
        new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result);
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        }),
    );
}

function drawRightAligned(doc, text, y, fontSize = 11, color = [18, 32, 51]) {
  doc.setFontSize(fontSize);
  doc.setTextColor(...color);
  doc.text(text, 188, y, { align: "right" });
}

async function renderQrCode(doc, x, y, size) {
  const qrDataUrl = await QRCode.toDataURL(BUSINESS.qrPayload, {
    errorCorrectionLevel: "M",
    margin: 1,
    width: 240,
    color: {
      dark: "#000000",
      light: "#ffffff",
    },
  });

  doc.addImage(qrDataUrl, "PNG", x, y, size, size);
}

export async function downloadInvoice(order) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageWidth = 210;
  const contentLeft = 12;
  const contentRight = 198;
  const blue = [15, 61, 122];
  const muted = [102, 112, 132];
  const line = [218, 229, 238];

  try {
    const logo = await loadImageData("/washora-logo.jpeg");
    doc.addImage(logo, "JPEG", 22, 9, 38, 31);
  } catch {
    doc.setTextColor(...blue);
    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.text("WASHORA", 22, 27);
  }

  doc.setFont("helvetica", "bold");
  doc.setTextColor(...blue);
  doc.setFontSize(10);
  doc.text("Phone / WhatsApp", contentRight, 16, { align: "right" });
  doc.setFontSize(18);
  doc.text(BUSINESS.phone, contentRight, 25, { align: "right" });

  doc.setDrawColor(...line);
  doc.setLineWidth(0.5);
  doc.line(contentLeft, 47, contentRight, 47);

  doc.setTextColor(0, 0, 0);
  doc.setFontSize(21);
  doc.text("Tax Invoice", pageWidth / 2, 61, { align: "center" });

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text("Bill To:", contentLeft, 83);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text(String(order.customerName || "Customer"), contentLeft, 92);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text("Receipt / Invoice No.", contentRight, 83, { align: "right" });
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text(String(order.receiptId || "Invoice"), contentRight, 92, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(`Delivery: ${formatDate(order.deliveryDate || order.orderDate)}`, contentRight, 102, {
    align: "right",
  });

  const itemTop = 119;
  doc.setFillColor(245, 248, 253);
  doc.roundedRect(contentLeft, itemTop, 186, 47, 7, 7, "F");
  const items = order.items?.length ? order.items : [{
    serviceType: order.serviceType || "Laundry Service",
    quantity: order.clothesCount || 1,
    customerPrice: Number(order.totalAmount || 0) / Number(order.clothesCount || 1),
    lineTotal: order.totalAmount,
  }];
  const serviceName = items.map((item) => item.serviceType).filter(Boolean).join(", ") || "Laundry Service";

  doc.setTextColor(...blue);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text(serviceName, 19, itemTop + 11);
  doc.setTextColor(...muted);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text("Quantity", 19, itemTop + 23);
  doc.text("Price / Unit", 84, itemTop + 23);
  doc.text("GST", 126, itemTop + 23);
  doc.text("Amount", 188, itemTop + 23, { align: "right" });

  doc.setTextColor(0, 0, 0);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  const quantity = items.reduce((total, item) => total + Number(item.quantity || 0), 0);
  const unitPrice = quantity ? Number(order.totalAmount || 0) / quantity : 0;
  doc.text(`${quantity} clothes`, 19, itemTop + 36);
  doc.text(formatAmount(unitPrice), 84, itemTop + 36);
  doc.text("--", 126, itemTop + 36);
  doc.text(formatAmount(order.totalAmount), 188, itemTop + 36, { align: "right" });

  const summaryTop = 181;
  doc.setDrawColor(...line);
  doc.roundedRect(contentLeft, summaryTop, 186, 43, 7, 7, "S");
  doc.setTextColor(0, 0, 0);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("Pricing / Breakup", 19, summaryTop + 11);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text("Sub Total", 19, summaryTop + 23);
  drawRightAligned(doc, formatAmount(order.totalAmount), summaryTop + 23, 10);
  doc.setTextColor(...blue);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("Total Amount", 19, summaryTop + 35);
  doc.text(formatAmount(order.totalAmount), 188, summaryTop + 35, { align: "right" });

  doc.setTextColor(0, 0, 0);
  doc.setFontSize(10);
  doc.text("Official UPI Payment Reference", contentLeft, 244);

  const qrBoxX = 18;
  const qrBoxY = 248;
  const qrSize = 42;
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(1.0);
  doc.roundedRect(qrBoxX - 2, qrBoxY - 2, qrSize + 4, qrSize + 4, 3, 3, "S");
  await renderQrCode(doc, qrBoxX, qrBoxY, qrSize);

  doc.setFont("helvetica", "normal");
  doc.setTextColor(...muted);
  doc.text(`Instagram: ${BUSINESS.instagram}`, 70, 256);
  doc.text(`Email: ${BUSINESS.email}`, 70, 265);
  doc.text(`Phone / WhatsApp: ${BUSINESS.phone}`, 70, 274);
  doc.text(`UPI ID: ${BUSINESS.upiId}`, 70, 283);

  doc.setTextColor(0, 0, 0);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("Thank you for doing business with us", pageWidth / 2, 292, { align: "center" });

  const filename = `washora-invoice-${String(order.receiptId || "invoice").replace(/[^a-z0-9-_]/gi, "-")}.pdf`;
  doc.save(filename);
}
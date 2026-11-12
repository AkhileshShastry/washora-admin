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
  doc.text(String(order.receiptId || "Invoice"), contentRight, 92, {
    align: "right",
  });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(
    `Delivery: ${formatDate(order.deliveryDate || order.orderDate)}`,
    contentRight,
    102,
    {
      align: "right",
    },
  );

  const itemTop = 119;
  const items = order.items?.length
    ? order.items
    : [
        {
          serviceType: order.serviceType || "Laundry Service",
          quantity: order.clothesCount || 1,
          customerPrice:
            Number(order.totalAmount || 0) / Number(order.clothesCount || 1),
          lineTotal: order.totalAmount,
        },
      ];
  const invoiceItems = items.map((item) => {
    const quantity = Number(item.quantity || 0);
    const lineTotal = Number(
      item.lineTotal ?? quantity * Number(item.customerPrice || 0),
    );

    return {
      serviceType: item.serviceType || "Laundry Service",
      quantity,
      unitPrice: quantity
        ? lineTotal / quantity
        : Number(item.customerPrice || 0),
      lineTotal,
      serviceLines: doc.splitTextToSize(
        item.serviceType || "Laundry Service",
        76,
      ),
    };
  });
  const itemsSubtotal = invoiceItems.reduce(
    (total, item) => total + item.lineTotal,
    0,
  );
  const deliveryCharge = Number(order.deliveryCharge || 0);
  const totalAmount = Number(
    order.totalAmount ?? itemsSubtotal + deliveryCharge,
  );
  const itemRowHeights = invoiceItems.map((item) =>
    Math.max(10, item.serviceLines.length * 4 + 3),
  );
  const itemCardHeight = Math.max(
    47,
    21 + itemRowHeights.reduce((total, height) => total + height, 0),
  );

  doc.setFillColor(245, 248, 253);
  doc.roundedRect(contentLeft, itemTop, 186, itemCardHeight, 7, 7, "F");

  doc.setTextColor(...blue);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("Services", 19, itemTop + 11);
  doc.setTextColor(...muted);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text("Qty", 102, itemTop + 11);
  doc.text("Price / Unit", 124, itemTop + 11);
  doc.text("GST", 155, itemTop + 11);
  doc.text("Amount", 188, itemTop + 11, { align: "right" });

  let rowTop = itemTop + 17;
  invoiceItems.forEach((item, index) => {
    const rowHeight = itemRowHeights[index];
    const textY = rowTop + 5;
    doc.setTextColor(0, 0, 0);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.text(item.serviceLines, 19, textY);
    doc.text(String(item.quantity), 102, textY);
    doc.text(formatAmount(item.unitPrice), 124, textY);
    doc.text("--", 155, textY);
    doc.text(formatAmount(item.lineTotal), 188, textY, { align: "right" });

    rowTop += rowHeight;
    if (index < invoiceItems.length - 1) {
      doc.setDrawColor(...line);
      doc.setLineWidth(0.25);
      doc.line(19, rowTop, 191, rowTop);
    }
  });

  const summaryTop = itemTop + itemCardHeight + 10;
  const summaryHeight = deliveryCharge > 0 ? 52 : 43;
  doc.setDrawColor(...line);
  doc.roundedRect(contentLeft, summaryTop, 186, summaryHeight, 7, 7, "S");
  doc.setTextColor(0, 0, 0);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("Pricing / Breakup", 19, summaryTop + 11);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  const subtotalY = deliveryCharge > 0 ? summaryTop + 22 : summaryTop + 23;
  doc.text("Sub Total", 19, subtotalY);
  drawRightAligned(doc, formatAmount(itemsSubtotal), subtotalY, 10);
  if (deliveryCharge > 0) {
    doc.text("Delivery Charge", 19, summaryTop + 33);
    drawRightAligned(doc, formatAmount(deliveryCharge), summaryTop + 33, 10);
  }
  doc.setTextColor(...blue);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  const totalY = deliveryCharge > 0 ? summaryTop + 45 : summaryTop + 35;
  doc.text("Total Amount", 19, totalY);
  doc.text(formatAmount(totalAmount), 188, totalY, { align: "right" });

  doc.setTextColor(0, 0, 0);
  doc.setFontSize(10);
  const paymentTop = Math.max(244, summaryTop + summaryHeight + 15);
  doc.text("Official UPI Payment Reference", contentLeft, paymentTop);

  const qrBoxX = 18;
  const qrBoxY = paymentTop + 4;
  const qrSize = 42;
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(1.0);
  doc.roundedRect(qrBoxX - 2, qrBoxY - 2, qrSize + 4, qrSize + 4, 3, 3, "S");
  await renderQrCode(doc, qrBoxX, qrBoxY, qrSize);

  doc.setFont("helvetica", "normal");
  doc.setTextColor(...muted);
  doc.text(`Instagram: ${BUSINESS.instagram}`, 70, qrBoxY + 8);
  doc.text(`Email: ${BUSINESS.email}`, 70, qrBoxY + 17);
  doc.text(`Phone / WhatsApp: ${BUSINESS.phone}`, 70, qrBoxY + 26);
  doc.text(`UPI ID: ${BUSINESS.upiId}`, 70, qrBoxY + 35);

  doc.setTextColor(0, 0, 0);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("Thank you for doing business with us", pageWidth / 2, 292, {
    align: "center",
  });

  const filename = `washora-invoice-${String(order.receiptId || "invoice").replace(/[^a-z0-9-_]/gi, "-")}.pdf`;
  doc.save(filename);
}

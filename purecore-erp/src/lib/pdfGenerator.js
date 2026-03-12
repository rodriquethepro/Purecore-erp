const generatePDF = (invoiceData, itemsList, total, deliveryFee) => {
  const doc = new jsPDF();

  // Logo
  const logo = new Image();
  logo.src = "/purecore-logo.png";
  doc.addImage(logo, "PNG", 150, 10, 40, 20);

  // Company Info
  doc.setFontSize(18);
  doc.text("PURECORE", 20, 20);
  doc.setFontSize(10);
  doc.text("Your Trusted Supplier", 20, 26);
  doc.text("20 Cupido Road", 20, 32);
  doc.text("Stellenbosch, South Africa", 20, 38);
  doc.text("Phone: 071 856 6139", 20, 44);

  // Customer Info
  doc.setFontSize(12);
  doc.text(`Customer Name: ${invoiceData.customer_name}`, 20, 54);
  doc.text(`Address: ${invoiceData.customer_address || ""}`, 20, 60);
  doc.text(`Phone: ${invoiceData.customer_phone || ""}`, 20, 66);

  // Invoice Info
  const invoiceNo = `INV-${String(invoiceData.invoice_number || "").padStart(4, "0")}`;
  doc.text(`Invoice: ${invoiceNo}`, 150, 40);
  doc.text(`Date: ${new Date().toLocaleDateString()}`, 150, 48);

  // Table Headers
  let startY = 80;
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.setFillColor(230, 230, 230); // Light gray background for header
  doc.rect(20, startY - 6, 170, 10, "F");
  doc.text("Product", 22, startY);
  doc.text("Qty", 100, startY);
  doc.text("Price", 120, startY);
  doc.text("Total", 150, startY);
  doc.setFont("helvetica", "normal");

  let y = startY + 6;
  itemsList.forEach((item, index) => {
    // Alternating row color
    if (index % 2 === 0) {
      doc.setFillColor(245, 245, 245); // Light gray
      doc.rect(20, y - 4, 170, 10, "F");
    }

    doc.text(item.name, 22, y);
    doc.text(String(item.quantity), 100, y);
    doc.text(`R${item.price}`, 120, y);
    doc.text(`R${item.total}`, 150, y);
    y += 10;
  });

  y += 5;
  doc.setDrawColor(0);
  doc.line(20, y, 190, y);

  // Delivery Fee / Total
  y += 10;
  if (deliveryFee > 0) doc.text(`Delivery Fee: R${deliveryFee} (Orders below R400)`, 150, y);
  if (deliveryFee === 0) doc.text("Delivery: FREE", 150, y);
  y += 10;
  doc.setFontSize(14);
  doc.text(`Total: R${total}`, 150, y);
  doc.setFontSize(11);

  // Banking Details (Left)
  let bottomY = 210;
  doc.setFontSize(11);
  doc.text("Banking Details", 20, bottomY);
  bottomY += 8;
  doc.text("Bank: FNB", 20, bottomY);
  bottomY += 6;
  doc.text("Account Name: PureCore", 20, bottomY);
  bottomY += 6;
  doc.text("Account Number: 123456789", 20, bottomY);
  bottomY += 6;
  doc.text("Branch Code: 250655", 20, bottomY);

  // Received Section (Right)
  let receivedY = 210;
  doc.text("Received By:", 120, receivedY);
  receivedY += 12;
  doc.line(120, receivedY, 190, receivedY);
  receivedY += 10;
  doc.text("Name", 120, receivedY);
  receivedY += 15;
  doc.line(120, receivedY, 190, receivedY);
  receivedY += 10;
  doc.text("Date", 120, receivedY);
  receivedY += 15;
  doc.line(120, receivedY, 190, receivedY);
  receivedY += 10;
  doc.text("Signature", 120, receivedY);

  // Footer
  doc.setFontSize(10);
  doc.text("Thank you for choosing PureCore Cleaning Chemicals", 20, 285);

  return doc;
};
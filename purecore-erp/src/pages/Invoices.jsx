import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import jsPDF from "jspdf";
import "./Invoice.css";

export default function Invoice() {
  const [products, setProducts] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState("");
  const [qty, setQty] = useState(1);
  const [items, setItems] = useState([]);
  const [customer, setCustomer] = useState({ name: "", address: "", phone: "" });
  const [invoices, setInvoices] = useState([]);

  // Fetch Products
  const fetchProducts = async () => {
    const { data } = await supabase.from("products").select("*");
    setProducts(data || []);
  };

  // Fetch Invoices
  const fetchInvoices = async () => {
    const { data } = await supabase
      .from("invoices")
      .select("*") // Make sure 'status' is included
      .order("created_at", { ascending: false });
    setInvoices(data || []);
  };

  useEffect(() => {
    fetchProducts();
    fetchInvoices();
  }, []);

  // Add Product to Invoice
  const addItem = () => {
    const product = products.find((p) => String(p.id) === String(selectedProduct));
    if (!product) return;

    const existing = items.find((i) => i.product_id === product.id);
    if (existing) {
      const updated = items.map((i) =>
        i.product_id === product.id
          ? {
              ...i,
              quantity: i.quantity + Number(qty),
              total: (i.quantity + Number(qty)) * i.selling_price,
            }
          : i
      );
      setItems(updated);
    } else {
      setItems([
        ...items,
        {
          product_id: product.id,
          name: product.name,
          selling_price: Number(product.selling_price),
          buying_price: Number(product.buying_price),
          price: Number(product.selling_price), // Price for PDF & DB
          quantity: Number(qty),
          total: Number(qty) * Number(product.selling_price),
        },
      ]);
    }

    setQty(1);
  };

  // Remove Item
  const removeItem = (productId) => setItems(items.filter((i) => i.product_id !== productId));

  // Generate PDF (kept exactly as your last version)
  const generatePDF = (invoiceData, itemsList, total, deliveryFee) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    let y = 20;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(20);
    doc.text("Pure Core Supplies", pageWidth / 2, y, { align: "center" });
    y += 8;
    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    doc.text("20 Cupido Road, Stellenbosch", pageWidth / 2, y, { align: "center" });
    y += 6;
    doc.text("Phone: 071 856 6139", pageWidth / 2, y, { align: "center" });

    y += 15;
    doc.setFontSize(12);
    doc.text(`Invoice: INV-${String(invoiceData.invoice_number || "").padStart(4, "0")}`, 20, y);
    doc.text(`Date: ${new Date().toLocaleDateString()}`, 20, y + 7);
    doc.text("Bill To:", 140, y);
    doc.text(invoiceData.customer_name, 140, y + 6);
    doc.text(invoiceData.customer_address, 140, y + 12);
    doc.text(`Phone: ${invoiceData.customer_phone}`, 140, y + 18);
    y += 30;

    doc.setFillColor(230, 230, 230);
    doc.rect(20, y - 6, 170, 8, "F");
    doc.setFont("helvetica", "bold");
    doc.text("Product", 25, y);
    doc.text("Qty", 110, y);
    doc.text("Price", 135, y);
    doc.text("Total", 160, y);
    y += 10;

    doc.setFont("helvetica", "normal");
    itemsList.forEach((item) => {
      doc.text(item.name, 25, y);
      doc.text(String(item.quantity), 110, y);
      doc.text(`R${item.price}`, 135, y);
      doc.text(`R${item.total}`, 160, y);
      y += 8;
    });

    doc.line(20, y, 190, y);
    y += 10;
    if (deliveryFee > 0) doc.text(`Delivery Fee: R${deliveryFee}`, 135, y);
    else doc.text("Delivery: FREE", 135, y);
    y += 10;
    doc.setFont("helvetica", "bold");
    doc.text(`Total: R${total}`, 160, y);

    let footerY = 240;
    doc.setFont("helvetica", "bold");
    doc.text("Banking Details", 20, footerY);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text("Bank: FNB", 20, footerY + 6);
    doc.text("Account Name: Pure Core Supplies", 20, footerY + 12);
    doc.text("Account Number: 123456789", 20, footerY + 18);
    doc.text("Branch Code: 250655", 20, footerY + 24);
    doc.setFont("helvetica", "bold");
    doc.text("Payment Reference:", 20, footerY + 34);
    doc.setFont("helvetica", "normal");
    doc.text(`Use Invoice Number INV-${String(invoiceData.invoice_number || "").padStart(4, "0")}`, 20, footerY + 40);

    let rightX = pageWidth - 70;
    doc.setFont("helvetica", "bold");
    doc.text("Received By", rightX, footerY);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text("Name:", rightX, footerY + 10);
    doc.line(rightX + 15, footerY + 10, rightX + 60, footerY + 10);
    doc.text("Date:", rightX, footerY + 22);
    doc.line(rightX + 15, footerY + 22, rightX + 60, footerY + 22);
    doc.text("Signature:", rightX, footerY + 34);
    doc.line(rightX + 25, footerY + 34, rightX + 60, footerY + 34);

    doc.text("Thank you for choosing Pure Core Supplies", pageWidth / 2, 285, { align: "center" });
    return doc;
  };

  // Create Invoice
  const createInvoice = async () => {
    if (!customer.name || !customer.address || !customer.phone) return alert("Fill customer details");
    if (items.length === 0) return alert("Add items");

    const currentItems = [...items];
    let total = currentItems.reduce((sum, i) => sum + i.total, 0);
    let deliveryFee = total < 400 ? 50 : 0;
    total += deliveryFee;

    const { data: invoice } = await supabase
      .from("invoices")
      .insert([{ customer_name: customer.name, customer_address: customer.address, customer_phone: customer.phone, total, status: "pending" }])
      .select()
      .single();

    for (const item of currentItems) {
      await supabase.from("invoice_items").insert([{
        invoice_id: invoice.id,
        product_id: item.product_id,
        quantity: item.quantity,
        price: item.price,          // <- fixes null price
        selling_price: item.selling_price,
        buying_price: item.buying_price
      }]);

      // Deduct stock
      const { data: product } = await supabase
        .from("products")
        .select("*")
        .eq("id", item.product_id)
        .single();
      await supabase
        .from("products")
        .update({ quantity: product.quantity - item.quantity })
        .eq("id", item.product_id);
    }

    setItems([]);
    setCustomer({ name: "", address: "", phone: "" });
    setSelectedProduct("");
    setQty(1);

    fetchProducts();
    fetchInvoices();

    const doc = generatePDF(invoice, currentItems, total, deliveryFee);
    doc.output("dataurlnewwindow"); // PDF now opens
  };

  // Process Invoice
  const processInvoice = async (id) => {
    if (!confirm("Mark this invoice as processed?")) return;
    await supabase.from("invoices").update({ status: "processed" }).eq("id", id);
    fetchInvoices();
  };

  // Cancel Invoice
  const cancelInvoice = async (id) => {
    if (!confirm("Cancel this invoice and restore stock?")) return;
    const { data: invoiceItems } = await supabase.from("invoice_items").select("*").eq("invoice_id", id);
    for (const item of invoiceItems) {
      const { data: product } = await supabase.from("products").select("*").eq("id", item.product_id).single();
      await supabase.from("products").update({ quantity: product.quantity + item.quantity }).eq("id", item.product_id);
    }
    await supabase.from("invoice_items").delete().eq("invoice_id", id);
    await supabase.from("invoices").delete().eq("id", id);
    fetchProducts();
    fetchInvoices();
  };

  // View PDF
  const viewPDF = async (invoiceId) => {
    const { data: invoice } = await supabase.from("invoices").select("*").eq("id", invoiceId).single();
    const { data: invoiceItems } = await supabase.from("invoice_items").select("*").eq("invoice_id", invoiceId);
    const mappedItems = invoiceItems.map((i) => ({
      product_id: i.product_id,
      name: products.find(p => p.id === i.product_id)?.name || "Unknown",
      price: i.price,               // fixes null price
      quantity: i.quantity,
      total: i.price * i.quantity
    }));
    let itemsTotal = mappedItems.reduce((sum, i) => sum + i.total, 0);
    let deliveryFee = itemsTotal < 400 ? 50 : 0;
    const doc = generatePDF(invoice, mappedItems, invoice.total, deliveryFee);
    doc.output("dataurlnewwindow");
  };

  return (
    <div className="invoice-page">
      <h1>Create Invoice</h1>

      <h3>Customer Details</h3>
      <div className="invoice-form">
        <input placeholder="Customer Name" value={customer.name} onChange={(e) => setCustomer({ ...customer, name: e.target.value })} />
        <input placeholder="Address" value={customer.address} onChange={(e) => setCustomer({ ...customer, address: e.target.value })} />
        <input placeholder="Phone" value={customer.phone} onChange={(e) => setCustomer({ ...customer, phone: e.target.value })} />
      </div>

      <h3>Add Products</h3>
      <div className="invoice-form">
        <select value={selectedProduct} onChange={(e) => setSelectedProduct(e.target.value)}>
          <option value="">Select Product</option>
          {products.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name} ({p.quantity} in stock)
            </option>
          ))}
        </select>
        <input type="number" min="1" value={qty} onChange={(e) => setQty(e.target.value)} />
        <button className="btn btn-add" onClick={addItem}>Add Item</button>
      </div>

      <h3>Items</h3>
      <div className="items-list">
        {items.map((i) => (
          <div key={i.product_id} className="item-row">
            <span>{i.name} x{i.quantity} = R{i.total}</span>
            <button className="btn btn-remove" onClick={() => removeItem(i.product_id)}>Remove</button>
          </div>
        ))}
      </div>

      <button className="btn btn-create" onClick={createInvoice}>Create Invoice</button>

      <h2>Invoice History</h2>
      <div className="invoice-history">
        {invoices.map((inv) => (
          <div key={inv.id} className="invoice-card">
            <strong>Invoice INV-{String(inv.invoice_number).padStart(4, "0")}</strong>
            <p>Customer: {inv.customer_name} | Total: R{inv.total} | Status: {inv.status}</p>
            <div className="invoice-actions">
              <button className="btn btn-view" onClick={() => viewPDF(inv.id)}>View PDF</button>
              {inv.status && inv.status !== "processed" && (
                <button className="btn btn-process" onClick={() => processInvoice(inv.id)}>Process</button>
              )}
              <button className="btn btn-cancel" onClick={() => cancelInvoice(inv.id)}>Cancel</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
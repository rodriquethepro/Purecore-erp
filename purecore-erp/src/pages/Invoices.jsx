import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import jsPDF from "jspdf";
import "./Invoice.css";
import logo from "../assets/Purecore-logo.png";

export default function Invoice() {
  const [products, setProducts] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [selectedProduct, setSelectedProduct] = useState("");
  const [qty, setQty] = useState(1);
  const [items, setItems] = useState([]);
  const [customer, setCustomer] = useState({ name: "", address: "", phone: "" });
  const [invoices, setInvoices] = useState([]);
  const [deliveryOption, setDeliveryOption] = useState("free");

  const fetchProducts = async () => {
    const { data } = await supabase.from("products").select("*");
    setProducts(data || []);
  };

  const fetchCustomers = async () => {
    const { data } = await supabase.from("customers").select("*");
    setCustomers(data || []);
  };

  const fetchInvoices = async () => {
    const { data } = await supabase
      .from("invoices")
      .select("*")
      .order("created_at", { ascending: false });
    setInvoices(data || []);
  };

  useEffect(() => {
    fetchProducts();
    fetchCustomers();
    fetchInvoices();
  }, []);

  useEffect(() => {
    if (!selectedCustomerId) return;

    const cust = customers.find(c => String(c.id) === String(selectedCustomerId));
    if (cust) {
      setCustomer({
        name: cust.name || "",
        address: `${cust.street || ""} ${cust.suburb || ""} ${cust.town || ""}`.trim(),
        phone: cust.phone || "",
      });
    }
  }, [selectedCustomerId, customers]);

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
          price: Number(product.selling_price),
          quantity: Number(qty),
          total: Number(qty) * Number(product.selling_price),
        },
      ]);
    }

    setQty(1);
  };

  const removeItem = (productId) => setItems(items.filter((i) => i.product_id !== productId));

  // ---------------------- PDF GENERATION ----------------------
  const generatePDF = (invoiceData, itemsList, total, deliveryFee) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();

    // ✅ SAFE IMAGE LOAD (prevents crash if logo fails in production)
    try {
      if (logo) {
        doc.addImage(logo, "PNG", (pageWidth - 100) / 2, 10, 100, 35);
      }
    } catch (err) {
      console.warn("Logo failed to load in PDF");
    }

    let y = 30;

    y += 10;
    doc.setFontSize(11);
    doc.text("20 Cupido Road", pageWidth / 2, y, { align: "center" });
    y += 5;
    doc.text("Stellenbosch", pageWidth / 2, y, { align: "center" });
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

    return doc;
  };

  // ---------------------- CREATE INVOICE ----------------------
  const createInvoice = async () => {
    if (!customer.name || !customer.address || !customer.phone) return alert("Fill customer details");
    if (items.length === 0) return alert("Add items");

    const currentItems = [...items];
    let total = currentItems.reduce((sum, i) => sum + i.total, 0);
    let deliveryFee = deliveryOption === "paid" ? 50 : 0;
    total += deliveryFee;

    const { data: invoice } = await supabase
      .from("invoices")
      .insert([{
        customer_name: customer.name,
        customer_address: customer.address,
        customer_phone: customer.phone,
        total,
        status: "pending"
      }])
      .select()
      .single();

    for (const item of currentItems) {
      await supabase.from("invoice_items").insert([{
        invoice_id: invoice.id,
        product_id: item.product_id,
        quantity: item.quantity,
        price: item.price,
        selling_price: item.selling_price,
        buying_price: item.buying_price
      }]);

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
    setSelectedCustomerId("");
    setSelectedProduct("");
    setQty(1);
    setDeliveryOption("free");

    fetchProducts();
    fetchInvoices();

    const doc = generatePDF(invoice, currentItems, total, deliveryFee);

    // ✅ FIX
    window.open(doc.output("bloburl"), "_blank");
  };

  const viewPDF = async (invoiceId) => {
    const { data: invoice } = await supabase.from("invoices").select("*").eq("id", invoiceId).single();
    const { data: invoiceItems } = await supabase
      .from("invoice_items")
      .select("*")
      .eq("invoice_id", invoiceId);

    const mappedItems = invoiceItems.map((i) => ({
      product_id: i.product_id,
      name: products.find(p => p.id === i.product_id)?.name || "Unknown",
      price: i.price,
      quantity: i.quantity,
      total: i.price * i.quantity
    }));

    let itemsTotal = mappedItems.reduce((sum, i) => sum + i.total, 0);
    let deliveryFee = (invoice.total - itemsTotal) > 0 ? 50 : 0;

    const doc = generatePDF(invoice, mappedItems, invoice.total, deliveryFee);

    // ✅ FIX
    window.open(doc.output("bloburl"), "_blank");
  };

  return <div className="invoice-page">{/* UI unchanged */}</div>;
}
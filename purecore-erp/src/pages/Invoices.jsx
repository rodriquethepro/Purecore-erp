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

  const generatePDF = (invoiceData, itemsList, total, deliveryFee) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();

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

    // Extract customer info from the invoiceData
    const { customer_name, customer_address, customer_phone } = invoiceData;

    const invoiceDate = new Date(invoiceData.created_at).toLocaleDateString();
    y += 15;
    doc.setFontSize(12);
    doc.text(`Invoice: INV-${String(invoiceData.invoice_number || "").padStart(4, "0")}`, 20, y);
    doc.text(`Date: ${invoiceDate}`, 20, y + 7);
    doc.text("Bill To:", 140, y);
    doc.text(customer_name, 140, y + 6);
    doc.text(customer_address, 140, y + 12);
    doc.text(`Phone: ${customer_phone}`, 140, y + 18);

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
    doc.setFont("helvetica", "bold");
    doc.text(deliveryFee > 0 ? `Delivery Fee: R${deliveryFee}` : "Delivery: FREE", 135, y);
    y += 10;
    doc.text(`Total: R${total}`, 160, y);

    const bankingDetails = "Bank: Capitec\nAccount Name: PureCore Group\nAccount Number: 2517867905\nBranch Code: 470010";
    const lines = bankingDetails.split('\n');
    lines.forEach((line, index) => {
      doc.text(line, 10, 200 + index * 6); // Position on the left at the bottom
    });

    doc.setFontSize(10);
    doc.text(`Payment Reference: INV-${String(invoiceData.invoice_number).padStart(4, "0")}`, 10, 150);

    y = 250; // Positioning Y for the signature section
    doc.setFontSize(10);
    doc.text(`Received By: `, 150, y); // Placeholder for signature
    doc.text(`Name: _______________________`, 150, y + 6); // Placeholder for name
    doc.text(`Date: _______________________`, 150, y + 12); // Placeholder for date
    doc.text(`Signature: __________________`, 150, y + 18); // Placeholder for signature
    return doc;
  };

  const createInvoice = async () => {
    if (!customer.name || !customer.address || !customer.phone) {
      alert("Fill customer details");
      return;
    }
    if (items.length === 0) {
      alert("Add items");
      return;
    }

    const currentItems = [...items];
    let total = currentItems.reduce((sum, i) => sum + i.total, 0);
    let deliveryFee = deliveryOption === "paid" ? 50 : 0;
    total += deliveryFee;

    const { data: invoice, error: invoiceError } = await supabase
      .from("invoices")
      .insert([{
        customer_name: customer.name,
        customer_address: customer.address,
        customer_phone: customer.phone,
        total,
        status: "pending",
        created_at: new Date()
      }])
      .select()
      .single();

    if (invoiceError) {
      console.error("Error creating invoice:", invoiceError);
      alert("Error creating invoice");
      return;
    }

    for (const item of currentItems) {
      await supabase.from("invoice_items").insert([{
        invoice_id: invoice.id,
        product_id: item.product_id,
        quantity: item.quantity,
        price: item.price,
        selling_price: item.selling_price,
        buying_price: item.buying_price
      }]);

      const { data: product, error: productError } = await supabase
        .from("products")
        .select("*")
        .eq("id", item.product_id)
        .single();

      if (productError) {
        console.error("Error fetching product:", productError);
        continue; // Skip this item if there was an error fetching the product.
      }

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

    if (doc) {
      window.open(doc.output("bloburl"), "_blank");
    } else {
      console.warn("Generated PDF document is null");
    }
  };

  const viewPDF = async (invoiceId) => {
    const { data: invoice, error: invoiceError } = await supabase
      .from("invoices")
      .select("*")
      .eq("id", invoiceId)
      .single();

    if (invoiceError) {
      console.error("Error fetching invoice:", invoiceError);
      alert("Error fetching invoice");
      return;
    }

    const { data: invoiceItems, error: itemsError } = await supabase
      .from("invoice_items")
      .select("*")
      .eq("invoice_id", invoiceId);

    if (itemsError) {
      console.error("Error fetching invoice items:", itemsError);
      return;
    }

    const mappedItems = invoiceItems.map((i) => ({
      product_id: i.product_id,
      name: products.find((p) => p.id === i.product_id)?.name || "Unknown",
      price: i.price,
      quantity: i.quantity,
      total: i.price * i.quantity,
    }));

    let itemsTotal = mappedItems.reduce((sum, i) => sum + i.total, 0);
    let deliveryFee = (invoice.total - itemsTotal) > 0 ? 50 : 0;

    const doc = generatePDF(invoice, mappedItems, invoice.total, deliveryFee);

    if (doc) {
      window.open(doc.output("bloburl"), "_blank");
    } else {
      console.warn("Generated PDF document is null");
    }
  };

  const updateInvoiceStatus = async (invoiceId, newStatus) => {
    const { error } = await supabase
      .from("invoices")
      .update({ status: newStatus })
      .eq("id", invoiceId);

    if (error) {
      console.error("Error updating invoice status:", error);
      alert("Error updating status");
    } else {
      fetchInvoices(); // Refresh the list of invoices after updating
      alert("Invoice status updated successfully");
    }
  };

  const updateInvoiceToDelivered = async (invoiceId) => {
    const { error } = await supabase
      .from("invoices")
      .update({ status: "delivery" })
      .eq("id", invoiceId);

    if (error) {
      console.error("Error updating invoice status to delivery:", error);
      alert("Error updating status to delivery");
    } else {
      fetchInvoices(); // Refresh the list of invoices after updating
      alert("Invoice status updated to delivered successfully");
    }
  };

  const deleteInvoice = async (invoiceId) => {
    const confirmDelete = window.confirm("Are you sure you want to delete this invoice?");
    if (!confirmDelete) return;

    const { error: itemsError } = await supabase
      .from("invoice_items")
      .delete()
      .eq("invoice_id", invoiceId);

    if (itemsError) {
      console.error("Error deleting invoice items:", itemsError);
      alert("Error deleting associated invoice items. Invoice not deleted.");
      return;
    }

    const { error } = await supabase
      .from("invoices")
      .delete()
      .eq("id", invoiceId);

    if (error) {
      console.error("Error deleting invoice:", error);
      alert("Error deleting invoice");
    } else {
      fetchInvoices(); // Refresh the list after deletion
      alert("Invoice deleted successfully");
    }
  };

  const groupInvoicesByDate = (invoices) => {
    const groupedInvoices = {};

    invoices.forEach(invoice => {
      const invoiceDate = new Date(invoice.created_at);
      const monthYear = `${invoiceDate.getMonth() + 1}-${invoiceDate.getFullYear()}`;

      if (!groupedInvoices[monthYear]) {
        groupedInvoices[monthYear] = [];
      }
      groupedInvoices[monthYear].push(invoice);
    });

    return groupedInvoices;
  };

  const groupedInvoices = groupInvoicesByDate(invoices);

  return (
    <div className="invoice-page">
      <h1 className="page-title">Create Invoice</h1>

      {/* CUSTOMER SECTION */}
      <div className="card">
        <h2>Customer Details</h2>
        <select
          className="input"
          value={selectedCustomerId}
          onChange={(e) => setSelectedCustomerId(e.target.value)}
        >
          <option value="">Select a customer</option>
          {customers.map((customer) => (
            <option key={customer.id} value={customer.id}>
              {customer.name}
            </option>
          ))}
        </select>

        <div className="customer-info">
          <p><strong>Name:</strong> {customer.name}</p>
          <p><strong>Address:</strong> {customer.address}</p>
          <p><strong>Phone:</strong> {customer.phone}</p>
        </div>
      </div>

      {/* PRODUCT SECTION */}
      <div className="card">
        <h2>Add Products</h2>
        <div className="flex-row">
          <select
            className="input"
            value={selectedProduct}
            onChange={(e) => setSelectedProduct(e.target.value)}
          >
            <option value="">Select a product</option>
            {products.map((product) => (
              <option key={product.id} value={product.id}>
                {product.name} (R{product.selling_price})
              </option>
            ))}
          </select>

          <input
            className="input small"
            type="number"
            value={qty}
            onChange={(e) => setQty(e.target.value)}
            min="1"
          />

          <button className="btn primary" onClick={addItem}>
            Add
          </button>
        </div>
      </div>

      {/* ITEMS */}
      <div className="card">
        <h2>Invoice Items</h2>
        {items.length === 0 ? (
          <p className="empty">No items added</p>
        ) : (
          items.map((item) => (
            <div key={item.product_id} className="item-row">
              <span>{item.name}</span>
              <span>Qty: {item.quantity}</span>
              <span>R{item.total}</span>
              <button
                className="btn danger"
                onClick={() => removeItem(item.product_id)}
              >
                Remove
              </button>
            </div>
          ))
        )}
      </div>

      {/* DELIVERY */}
      <div className="card">
        <h2>Delivery</h2>
        <select
          className="input"
          value={deliveryOption}
          onChange={(e) => setDeliveryOption(e.target.value)}
        >
          <option value="free">Free Delivery</option>
          <option value="paid">Paid Delivery (R50)</option>
        </select>
      </div>

      {/* CREATE BUTTON */}
      <button className="btn success full" onClick={createInvoice}>
        Create Invoice
      </button>

      {/* HISTORY */}
      <div className="card">
        <h2>Past Invoices</h2>
        {Object.keys(groupedInvoices).length === 0 ? (
          <p className="empty">No past invoices found.</p>
        ) : (
          Object.keys(groupedInvoices).map((monthYear) => (
            <div key={monthYear} className="invoice-group">
              <h3>{monthYear}</h3>
              {groupedInvoices[monthYear].map((invoice) => (
                <div key={invoice.id} className="invoice-row">
                  <div>
                    <strong>INV-{String(invoice.invoice_number).padStart(4, "0")}</strong>
                    <strong><p>{String(invoice.customer_name).padStart(4, "0")}</p></strong>
                    <p>R{invoice.total}</p>
                    <p className={`status ${invoice.status}`}>{invoice.status}</p>
                  </div>

                  <div className="actions">
                    {invoice.status === "paid" ? (
                      <button className="btn" onClick={() => viewPDF(invoice.id)}>View</button>
                    ) : (
                      <>
                        <button className="btn" onClick={() => viewPDF(invoice.id)}>View</button>
                        {invoice.status !== "delivery" && (
                          <button className="btn success" onClick={() => {
                            updateInvoiceToDelivered(invoice.id);
                          }}>Delivered</button>
                        )}
                        <button className="btn danger" onClick={() => deleteInvoice(invoice.id)}>Delete</button>
                        <button className="btn success" onClick={() => updateInvoiceStatus(invoice.id, "paid")}>Paid</button>
                        <button className="btn warning" onClick={() => updateInvoiceStatus(invoice.id, "unpaid")}>Unpaid</button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

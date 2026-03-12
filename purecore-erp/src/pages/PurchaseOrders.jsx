import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import "./PurchaseOrder.css";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export default function PurchaseOrder() {
  const [products, setProducts] = useState([]);
  const [uniqueSuppliers, setUniqueSuppliers] = useState([]);
  const [selectedSupplier, setSelectedSupplier] = useState("");
  const [poItems, setPoItems] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState("");
  const [qty, setQty] = useState(1);
  const [purchaseOrders, setPurchaseOrders] = useState([]);

  // Fetch products and derive suppliers
  const fetchProducts = async () => {
    const { data } = await supabase.from("products").select("*");
    setProducts(data || []);

    const suppliersSet = new Set(data?.map((p) => p.supplier).filter((s) => s));
    setUniqueSuppliers([...suppliersSet]);
  };

  // Fetch Purchase Orders
  const fetchPOs = async () => {
    // Fetch supplier name from products or another table if needed
    const { data } = await supabase
      .from("purchase_orders")
      .select("*")
      .order("created_at", { ascending: false });

    setPurchaseOrders(data || []);
  };

  useEffect(() => {
    fetchProducts();
    fetchPOs();
  }, []);

  // Add product to PO
  const addPoItem = () => {
    if (!selectedProduct || qty <= 0) return;

    const product = products.find((p) => p.id === selectedProduct);
    if (!product) return;

    const existing = poItems.find((i) => i.product_id === product.id);

    if (existing) {
      setPoItems(
        poItems.map((i) =>
          i.product_id === product.id
            ? {
                ...i,
                quantity: i.quantity + Number(qty),
                total: (i.quantity + Number(qty)) * i.price,
              }
            : i
        )
      );
    } else {
      setPoItems([
        ...poItems,
        {
          product_id: product.id,
          name: product.name,
          price: product.buying_price,
          quantity: Number(qty),
          total: Number(qty) * product.buying_price,
        },
      ]);
    }

    setQty(1);
  };

  // Remove item from PO
  const removePoItem = (id) => {
    setPoItems(poItems.filter((i) => i.product_id !== id));
  };

  // Generate PDF
  const generatePOPdf = (poNumber, supplier, items, total) => {
    const doc = new jsPDF();

    doc.setFontSize(20);
    doc.text("PureCore Supplies", 14, 20);

    doc.setFontSize(14);
    doc.text("Purchase Order", 14, 30);

    doc.setFontSize(11);
    doc.text(`PO Number: PO-${String(poNumber).padStart(4, "0")}`, 14, 40);
    doc.text(`Supplier: ${supplier}`, 14, 48);
    doc.text(`Date: ${new Date().toLocaleDateString()}`, 14, 56);

    const tableData = items.map((item) => [
      item.name,
      item.quantity,
      `R${item.price}`,
      `R${item.total}`,
    ]);

    autoTable(doc, {
      startY: 65,
      head: [["Product", "Qty", "Price", "Total"]],
      body: tableData,
    });

    doc.text(`Total: R${total}`, 14, doc.lastAutoTable.finalY + 10);

    return doc;
  };

  // Delete PO
  const deletePO = async (id) => {
    if (!confirm("Delete this Purchase Order?")) return;

    const { error } = await supabase.from("purchase_orders").delete().eq("id", id);
    if (error) {
      console.error(error);
      alert("Error deleting PO");
      return;
    }

    fetchPOs();
  };

  // Create PO
  const createPO = async () => {
    if (!selectedSupplier) return alert("Select a supplier");
    if (poItems.length === 0) return alert("Add items to the PO");

    const total = poItems.reduce((sum, i) => sum + i.total, 0);

    const { data: po, error } = await supabase
      .from("purchase_orders")
      .insert([{ supplier_id: selectedSupplier, total }])
      .select()
      .single();

    if (error) {
      console.error(error);
      return;
    }

    // Insert PO items with UUIDs
    const { error: itemsError } = await supabase
      .from("po_items")
      .insert(
        poItems.map((item) => ({
          po_id: po.id,
          product_id: item.product_id, // UUID
          quantity: item.quantity,
          price: item.price,
        }))
      );

    if (itemsError) {
      console.error("PO Items Insert Error:", itemsError);
      alert("Error saving PO items");
      return;
    }

    const pdfDoc = generatePOPdf(po.id, selectedSupplier, poItems, total);
    pdfDoc.output("dataurlnewwindow");

    setPoItems([]);
    setSelectedSupplier("");
    setSelectedProduct("");
    fetchPOs();
  };

  // View PDF for existing PO
  const viewPDF = async (po) => {
    const { data: itemsData, error } = await supabase
      .from("po_items")
      .select("quantity, price, products(name)")
      .eq("po_id", po.id);

    if (error) {
      console.error(error);
      return alert("Error fetching PO items");
    }

    if (!itemsData || itemsData.length === 0) {
      return alert("There are no items added to this PO.");
    }

    const itemsForPDF = itemsData.map((item) => ({
      name: item.products?.name || "Unknown Product",
      quantity: item.quantity,
      price: item.price,
      total: item.quantity * item.price,
    }));

    const supplierName = po.supplier_id;

    const pdfDoc = generatePOPdf(po.id, supplierName, itemsForPDF, po.total);
    pdfDoc.output("dataurlnewwindow");
  };

  return (
    <div className="po-page">
      <h1>Purchase Order</h1>

      {/* Supplier selection */}
      <div className="po-section">
        <h3>Select Supplier</h3>
        <select
          value={selectedSupplier}
          onChange={(e) => {
            setSelectedSupplier(e.target.value);
            setSelectedProduct("");
          }}
        >
          <option value="">Select Supplier</option>
          {uniqueSuppliers.map((s, idx) => (
            <option key={idx} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      {/* Add products */}
      <div className="po-section">
        <h3>Add Products</h3>
        <select
          value={selectedProduct}
          onChange={(e) => setSelectedProduct(e.target.value)}
        >
          <option value="">Select Product</option>
          {products
            .filter((p) => p.supplier === selectedSupplier)
            .map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} ({p.quantity} in stock)
              </option>
            ))}
        </select>

        <input
          type="number"
          min="1"
          value={qty}
          onChange={(e) => setQty(Number(e.target.value))}
        />

        <button onClick={addPoItem}>Add Item</button>
      </div>

      {/* PO items */}
      <div className="po-section">
        <h3>PO Items</h3>
        {poItems.map((i) => (
          <div key={i.product_id} className="po-item">
            {i.name} x{i.quantity} = R{i.total}
            <button onClick={() => removePoItem(i.product_id)}>Remove</button>
          </div>
        ))}
      </div>

      <button className="btn-create" onClick={createPO}>
        Create Purchase Order
      </button>

      {/* PO history */}
      <div className="po-section">
        <h2>Purchase Order History</h2>
        {purchaseOrders.map((po) => (
          <div key={po.id} className="po-card">
            <strong>PO-{String(po.id).padStart(4, "0")}</strong>
            <p>
              Supplier: {po.supplier_id} | Total: R{po.total}
            </p>
            <button className="btn-view" onClick={() => viewPDF(po)}>
              View PDF
            </button>
            <button className="btn-delete" onClick={() => deletePO(po.id)}>
              Delete PO
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
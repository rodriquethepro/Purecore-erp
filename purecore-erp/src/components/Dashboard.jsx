import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import "./Dashboard.css";

export default function Dashboard() {

  const [products, setProducts] = useState([]);
  const [invoiceItems, setInvoiceItems] = useState([]);

  useEffect(() => {
    fetchProducts();
    fetchInvoiceItems();
  }, []);

  const fetchProducts = async () => {
    const { data, error } = await supabase
      .from("products")
      .select("*");

    if (!error) {
      setProducts(data || []);
    }
  };

  const fetchInvoiceItems = async () => {
    const { data, error } = await supabase
      .from("invoice_items")
      .select("*");

    if (!error) {
      setInvoiceItems(data || []);
    }
  };

  // TOTAL PRODUCTS (how many products you offer)
  const totalProducts = products.length;

  // UNIQUE SUPPLIERS
  const uniqueSuppliers = [
    ...new Set(products.map((p) => p.supplier).filter(Boolean))
  ];

  const totalSuppliers = uniqueSuppliers.length;

  // PRODUCTS PER SUPPLIER
  const productsPerSupplier = uniqueSuppliers.map((supplier) => ({
    supplier,
    count: products.filter((p) => p.supplier === supplier).length
  }));

  // TOTAL REVENUE FROM INVOICES
  const totalRevenue = invoiceItems.reduce((sum, item) => {

    const selling = Number(item.selling_price || 0);
    const buying = Number(item.buying_price || 0);
    const quantity = Number(item.quantity || 0);

    const profit = (selling - buying) * quantity;

    return sum + profit;

  }, 0);

  return (
    <div className="dashboard-page">

      <h1>Dashboard</h1>

      <div className="dashboard-kpis">

        {/* Total Products */}
        <div className="kpi-card">
          <h3>Total Products</h3>
          <p>{totalProducts}</p>
        </div>

        {/* Total Suppliers */}
        <div className="kpi-card">
          <h3>Total Suppliers</h3>
          <p>{totalSuppliers}</p>
        </div>

        {/* Products per Supplier */}
        <div className="kpi-card">
          <h3>Products per Supplier</h3>

          <ul>
            {productsPerSupplier.map((item) => (
              <li key={item.supplier}>
                {item.supplier}: {item.count}
              </li>
            ))}
          </ul>

        </div>

        {/* Total Revenue */}
        <div className="kpi-card">
          <h3>Total Revenue</h3>
          <p>R{totalRevenue.toFixed(2)}</p>
        </div>

      </div>

    </div>
  );
}
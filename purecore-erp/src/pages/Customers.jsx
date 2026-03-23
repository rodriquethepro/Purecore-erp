import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import "./Customers.css"; // ✅ Make sure to create this CSS file

export default function Customers() {
  const [customers, setCustomers] = useState([]);
  const [form, setForm] = useState({
    name: "",
    street: "",
    suburb: "",
    town: "",
    phone: ""
  });

  // ---------------------- FETCH CUSTOMERS + INVOICE COUNTS ----------------------
  const fetchCustomers = async () => {
    const { data: customersData } = await supabase
      .from("customers")
      .select("*");

    // Fetch invoices grouped by customer_name dynamically
    const { data: invoices } = await supabase
      .from("invoices")
      .select("customer_name");

    // Count invoices per customer
    const counts = {};
    invoices?.forEach(inv => {
      counts[inv.customer_name] = (counts[inv.customer_name] || 0) + 1;
    });

    // Attach status dynamically
    const withStatus = customersData.map(c => {
      const count = counts[c.name] || 0;

      let status = "New";
      if (count === 1) status = "Once-off";
      if (count >= 3) status = "Regular";

      return {
        ...c,
        invoice_count: count,
        status
      };
    });

    setCustomers(withStatus || []);
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  // ---------------------- ADD CUSTOMER ----------------------
  const addCustomer = async () => {
    if (!form.name) return alert("Enter customer name");

    await supabase.from("customers").insert([form]);

    setForm({
      name: "",
      street: "",
      suburb: "",
      town: "",
      phone: ""
    });

    fetchCustomers();
  };

  // ---------------------- RENDER ----------------------
  return (
    <div className="customers-page">
      <h1>Customers</h1>

      {/* FORM */}
      <div className="customer-form">
        <input
          placeholder="Name"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
        />
        <input
          placeholder="Street"
          value={form.street}
          onChange={(e) => setForm({ ...form, street: e.target.value })}
        />
        <input
          placeholder="Suburb"
          value={form.suburb}
          onChange={(e) => setForm({ ...form, suburb: e.target.value })}
        />
        <input
          placeholder="Town"
          value={form.town}
          onChange={(e) => setForm({ ...form, town: e.target.value })}
        />
        <input
          placeholder="Phone"
          value={form.phone}
          onChange={(e) => setForm({ ...form, phone: e.target.value })}
        />

        <button onClick={addCustomer}>Add Customer</button>
      </div>

      {/* CUSTOMER LIST */}
      <div className="table-wrapper">
        <table className="customers-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Address</th>
              <th>Phone</th>
              <th>Invoices</th>
              <th>Status</th>
            </tr>
          </thead>

          <tbody>
            {customers.map((c) => (
              <tr key={c.id}>
                <td data-label="Name">{c.name}</td>
                <td data-label="Address">
                  {c.street}<br />
                  {c.suburb}<br />
                  {c.town}
                </td>
                <td data-label="Phone">{c.phone}</td>
                <td data-label="Invoices">{c.invoice_count}</td>
                <td data-label="Status">
                  <strong>{c.status}</strong>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
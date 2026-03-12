import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import "./Products.css";

export default function Products() {
  const [products, setProducts] = useState([]);
  const [product, setProduct] = useState({
    id: null,
    name: "",
    quantity: 0,
    selling_price: 0,
    buying_price: 0,
    supplier: "",
  });

  // Fetch products
  const fetchProducts = async () => {
    const { data } = await supabase.from("products").select("*").order("id", { ascending: true });
    setProducts(data || []);
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  // Add or Update Product
  const saveProduct = async () => {
    if (!product.name) return alert("Product name is required");

    if (product.id) {
      // Update existing product
      await supabase
        .from("products")
        .update({
          name: product.name,
          quantity: product.quantity,
          selling_price: product.selling_price,
          buying_price: product.buying_price,
          supplier: product.supplier,
        })
        .eq("id", product.id)
        .select(); // ensure supabase returns updated row
    } else {
      // Insert new product
      const { data } = await supabase
        .from("products")
        .insert([
          {
            name: product.name,
            quantity: product.quantity,
            selling_price: product.selling_price,
            buying_price: product.buying_price,
            supplier: product.supplier,
          },
        ])
        .select(); // get inserted row back
    }

    // Reset form
    setProduct({ id: null, name: "", quantity: 0, selling_price: 0, buying_price: 0, supplier: "" });
    fetchProducts();
  };

  // Edit product
  const editProduct = (p) => {
    setProduct({
      id: p.id,
      name: p.name,
      quantity: p.quantity,
      selling_price: p.selling_price,
      buying_price: p.buying_price,
      supplier: p.supplier || "",
    });
  };

  // Delete product
  const deleteProduct = async (id) => {
    if (!confirm("Delete this product?")) return;
    await supabase.from("products").delete().eq("id", id);
    fetchProducts();
  };

  return (
    <div className="products-page">
      <h1>Products</h1>

      <div className="product-form">
        <input
          placeholder="Product Name"
          value={product.name}
          onChange={(e) => setProduct({ ...product, name: e.target.value })}
        />
        <input
          type="number"
          placeholder="Quantity"
          value={product.quantity}
          onChange={(e) => setProduct({ ...product, quantity: Number(e.target.value) })}
        />
        <input
          type="number"
          placeholder="Selling Price"
          value={product.selling_price}
          onChange={(e) => setProduct({ ...product, selling_price: Number(e.target.value) })}
        />
        <input
          type="number"
          placeholder="Buying Price"
          value={product.buying_price}
          onChange={(e) => setProduct({ ...product, buying_price: Number(e.target.value) })}
        />
        <input
          placeholder="Supplier"
          value={product.supplier}
          onChange={(e) => setProduct({ ...product, supplier: e.target.value })}
        />
        <button onClick={saveProduct}>{product.id ? "Update Product" : "Add Product"}</button>
      </div>

      <h2>Product List</h2>
      <table className="products-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Quantity</th>
            <th>Selling Price</th>
            <th>Buying Price</th>
            <th>Supplier</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {products.map((p) => (
            <tr key={p.id}>
              <td data-label="Name">{p.name}</td>
              <td data-label="Quantity">{p.quantity}</td>
              <td data-label="Selling Price">R{p.selling_price}</td>
              <td data-label="Buying Price">R{p.buying_price}</td>
              <td data-label="Supplier">{p.supplier}</td>
              <td data-label="Actions">
                <button onClick={() => editProduct(p)}>Edit</button>
                <button onClick={() => deleteProduct(p.id)} style={{ color: "white", backgroundColor: "red" }}>Delete</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
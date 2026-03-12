import { useState } from "react"
import { supabase } from "../lib/supabaseClient"

export default function ProductForm() {

const [name,setName] = useState("")
const [price,setPrice] = useState("")

const addProduct = async () => {

await supabase
.from("products")
.insert([{ name, selling_price: price }])

alert("Product added")

}

return (

<div>

<input
placeholder="Product name"
onChange={(e)=>setName(e.target.value)}
/>

<input
placeholder="Price"
onChange={(e)=>setPrice(e.target.value)}
/>

<button onClick={addProduct}>
Add Product
</button>

</div>

)

}
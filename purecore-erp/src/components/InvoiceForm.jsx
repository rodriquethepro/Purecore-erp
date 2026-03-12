import { generateInvoicePDF } from "../lib/pdfGenerator"
import { generateInvoiceNumber } from "../utils/invoiceNumber"

export default function InvoiceForm(){

const createInvoice = () => {

const invoice = {

number: generateInvoiceNumber(),
customer: "ABC Cleaning",
date: new Date().toLocaleDateString(),

items: [
{ product: "PureCore Thick Bleach", qty: 5, price: 45 }
],

total: 225

}

generateInvoicePDF(invoice)

}

return(

<button onClick={createInvoice}>
Generate Invoice PDF
</button>

)

}
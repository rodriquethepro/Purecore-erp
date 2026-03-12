import { generatePONumber } from "../utils/poNumber"

export default function PurchaseOrderForm(){

const createPO = () => {

const po = generatePONumber()

alert(`Purchase Order Created: ${po}`)

}

return(

<button onClick={createPO}>
Create Purchase Order
</button>

)

}
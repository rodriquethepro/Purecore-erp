export const generateInvoiceNumber = () => {

const number = Math.floor(Math.random() * 100000)

return `INV-${number}`

}
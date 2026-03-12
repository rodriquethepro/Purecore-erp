export const generatePONumber = () => {

const number = Math.floor(Math.random() * 100000)

return `PO-${number}`

}
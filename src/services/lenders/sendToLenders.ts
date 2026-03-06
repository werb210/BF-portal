import axios from "axios"

export async function sendToLenders(applicationId: string, lenders: string[]) {

  const res = await axios.post("/api/lenders/send", {
    applicationId,
    lenders
  })

  return res.data

}

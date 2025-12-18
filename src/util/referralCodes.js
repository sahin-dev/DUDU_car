// const  referralCodes = require("referral-codes")

async function generateUniqueCode (){
  const referralCodes = await import("referral-codes")
  
  const code  =  referralCodes.generate({
    length:4,
    count:1
  })

  return code[0].toUpperCase()
}



module.exports = generateUniqueCode
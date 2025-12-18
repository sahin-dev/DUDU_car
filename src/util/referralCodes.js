const  referralCodes = require("referral-codes")

async function generateUniqueCode (){
  if(!referralCodes){
    referralCodes = (await import("referral-codes")).default
  }
  const code  =  referralCodes.generate({
    length:4,
    count:1
  })

  return code[0].toUpperCase()
}



module.exports = generateUniqueCode
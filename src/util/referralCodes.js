const referralCodes = require("referral-codes")

function generateUniqueCode (){
     const code  =  referralCodes.generate({
        length:4,
        count:1
    })

  return code[0].toUpperCase()
}

module.exports = generateUniqueCode
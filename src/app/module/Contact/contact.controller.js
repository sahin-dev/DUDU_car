const catchAsync = require("../../../util/catchAsync");
const sendResponse = require("../../../util/sendResponse");
const { contactService } = require("./contact.service");

const getContacts = catchAsync(async (req,res)=>{
    const contacts = await contactService.getContacts()

    sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Contacts found",
    data: contacts,
  });
})


const updateContact = catchAsync(async (req,res)=>{

    const {email, number} = req.body

    console.log(req.body)
    const updatedContacts = await contactService.updateContact(email, number)

    sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Contacts updated",
    data: updatedContacts,
  });
})

module.exports.contactController = {
    getContacts,
    updateContact
}
const Contact = require("./Contact.model")


const getContacts = async ()=>{

    const contacts = await Contact.find({})

    if(!contacts){
        return {number:null, email:null}
    }

    return contacts[0]

}

const updateContact = async (email, number)=>{

    const contact = await getContacts()

     if(!contact){
        let createdContact = await Contact.create({email:email || '', number: number || ''})
        return createdContact
    }

    let contactData = {email: email || contact.email, number: number || contact.number }
    

   return await Contact.findOneAndUpdate({_id:contact._id}, contactData, {new:true})
}

module.exports.contactService = {
    getContacts,
    updateContact
}
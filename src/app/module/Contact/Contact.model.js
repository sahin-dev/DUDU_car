const { Schema, model } = require("mongoose");

const contactSchema = new Schema(
  {
    email: {
      type: String,
      required: false,
    },
    number: {
      type: String,
      required: false
    }
  },
  { timestamps: true }
);

const Contact = model("Contact", contactSchema);

module.exports = Contact;

const { sendTicket } = require("./smsController");
const express = require("express");
const app = express();
const User = require("../models/user");

const cookieParser = require("cookie-parser");
app.use(cookieParser());

//production
// const stripe = require("stripe")(
//   "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"
// );

// test
const stripe = require("stripe")(
  "sk_test_51MchbUSHgjbJVeCEdGCirq8uGLo5Knir0um3cb2F39N2zn93vVS2KDhMC677E2R663FVJn6SZpQHAZ6ix5Yzexee00ecaOYnSG"
);

const uuid = require("uuid").v4;

const payment = async (req, res) => {

  let charge, status;
  var { product, token, user, event } = req.body;

  console.log(event.event_id);

  var key = uuid();

  try {
    const customer = await stripe.customers.create({
      email: token.email,
      source: token.id,
    });

    charge = await stripe.charges.create(
      {
        amount: product.price * 100,
        currency: "INR",
        customer: customer.id,
        receipt_email: token.email,
        description: `Booked Ticket for ${product.name}`,
        shipping: {
          name: token.billing_name,
          address: {
            line1: token.shipping_address_line1,
            line2: token.shipping_address_line2,
            city: token.shipping_address_city,
            country: token.shipping_address_country,
            postal_code: token.shipping_address_zip,
          },
        },
      },
      {
        idempotencyKey: key,
      }
    );

    console.log("Charge: ", { charge });
    status = "success";
  } catch (error) {
    console.log(error);
    status = "success";
  }

  // collecting ticket details
  User.find({ user_token: user.user_id }, async function (err, docs) {
    console.log("Inside DB ***********")
    console.log(docs)
    if (docs.length !== 0) {

      var Details = {
        email: docs[0].email,
        event_name: product.name,
        name: token.billing_name,
        pass: key,
        price: product.price,
        address1: token.shipping_address_line1,
        city: token.shipping_address_city,
        zip: token.shipping_address_zip,
      };
    
      console.log("All details before email: ", Details);
    
      sendTicket(Details);
    } else {
      status = "error";
      res.status(401).send({ msg: "User is unauthorized" });
    }
  });

  //NOTE-
  //add this user into events-> registerted people-> [(name, pass)] //no need to get from cookies

  res.send({ status });
};

module.exports = {
  payment
};

// Require dependencies
const express = require('express');
var bodyParser = require('body-parser');
const mongoose = require("mongoose");
require('dotenv').config();

// Start express app
const app = express();

// Enable body parser to read input
app.use(bodyParser.urlencoded({ extended: false }));

// Connect to mongoDB
mongoose.connect(process.env.DB_URL, { useNewUrlParser: true });

// Create schema for a reminder
const reminderSchema = {
    description: String
}

// Create a model based on the schema
const Reminder = mongoose.model("Reminder", reminderSchema);

// Add a default item
// const welcome = new Reminder({
//     description: "Welcome to AlfredSMS!",
// });

// welcome.save();

// Authenticate your twilio account
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const client = require('twilio')(accountSid, authToken);

// A function to send the current state of the reminders list
function sendCurrentList() {
    // Send the updated list of items
    Reminder.find({}, function (err, reminderItems) {
        if (err) console.log(err);
        else {
            var count = 1;
            var currentItemsString = "";
            reminderItems.forEach(function (singleItem) {
                currentItemsString += "\n" + count + ". " + singleItem.description;
                count++;
            });

            client.messages.create({
                body: "Here are your reminders:\n" + currentItemsString,
                from: process.env.TWILIO_PHONE_NUMBER,
                to: process.env.MY_PHONE_NUMBER
            })
                .then((message) => console.log(message.sid))
                .catch((err) => console.log(err));
        }
    });
}

// Respond to incoming SMS
app.post('/message', (req, res) => {

    var messageBody = req.body.Body;

    // Ensure message is being sent from a your device only
    if (messageBody.toLowerCase() == "get") {
        console.log("Get function was called.");
        sendCurrentList();
    } else if (req.body.From == process.env.MY_PHONE_NUMBER) {

        if (messageBody.split(" ")[0].toLowerCase() == "remove") {

            // Remove an item from the database based on the index provided by the user
            var indexToRemove = messageBody.split(" ")[1];

            Reminder.find({}, function (err, reminderItems) {
                if (err) console.log(err);
                else {
                    var count = 1;
                    reminderItems.forEach(function (singleItem) {
                        if (count == indexToRemove) {
                            Reminder.findByIdAndRemove(singleItem._id, function (err) {
                                if (err) console.log(err);
                                else {
                                    console.log("Successfully deleted checked item.");

                                    // Send the updated list of items
                                    sendCurrentList();
                                }
                            });
                            count++;
                            return;
                        }
                        count++;
                    });
                }
            });

        } else {

            // Add a new reminder item
            const reminder = new Reminder({
                description: messageBody
            });

            // Insert the new reminder item into the database
            reminder.save(function (err) {
                if (err) console.log(err);
                else {
                    // Send the updated list of items
                    sendCurrentList();
                }
            });
        }
    }
});

var PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log("Express server listening on port: " + PORT);
});
const express = require('express');
var bodyParser = require('body-parser');
const fs = require('fs');

const app = express();

app.use(bodyParser.urlencoded({ extended: false }));

// Initialize list name to a variable
const remindersList = 'list.txt';

// Read in current list
var readList = fs.readFileSync(remindersList, 'utf8');

// Allows access to .env variables
require('dotenv').config();

// Authenticate your twilio account
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const client = require('twilio')(accountSid, authToken);

// Send text message
client.messages.create({
    body: "Here are your reminders:\n" + readList,
    from: process.env.TWILIO_PHONE_NUMBER,
    to: process.env.MY_PHONE_NUMBER
})
    .then((message) => console.log(message.sid))
    .catch((err) => console.log(err))
    ;

// Respond to incoming SMS
app.post('/message', (req, res) => {


    // console.log(req.body.Body);
    var messageBody = req.body.Body;

    // Ensure message is being sent from a your device only
    if (req.body.From == process.env.MY_PHONE_NUMBER) {
        var readUpdatedList;

        if (messageBody.split(" ")[0].toLowerCase() == "remove") {
            var indexToRemove = messageBody.split(" ")[1];

            var currentList = fs.readFileSync(remindersList, 'utf8');
            var reducedList = currentList.split("\n");
            reducedList.splice(indexToRemove, 1);
            var newString = reducedList.join("\n");
            fs.writeFileSync(remindersList, newString);

        } else {
            fs.appendFileSync(remindersList, "\n" + messageBody);
        }

        // Return the list in a numbered format without updating the list
        var returnString = "";
        var currentList = fs.readFileSync(remindersList, 'utf8');
        var listtoArr = currentList.split("\n");

        for (i = 1; i < listtoArr.length; i++) {
            returnString += "\n" + i + ". " + listtoArr[i];
        }

        // Send the new list as an SMS
        res.send(`
        <Response>
            <Message>
                Message received. Here are your reminders: \n${returnString}
            </Message>
        </Response>    
        `);

    }

});

var PORT = 1337
app.listen(PORT, () => {
    console.log("Express server listening on port: " + PORT);
});
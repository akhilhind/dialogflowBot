const express = require('express');
const fs = require('fs');
const mzfs = require('mz/fs');
const mongodb = require("mongodb");
const mongoClient = mongodb.MongoClient;
const ObjectId = mongodb.ObjectId;
const bodyParser = require('body-parser');
const {
    json
} = require('express');
const {
    Card,
    SuggestionS
} = require('dialogflow-fulfillment');
const functions = require('firebase-functions');
const app = express();
app.use(bodyParser.urlencoded({
    extended: true
}));

const {
    getWeather,
    getWeatherByCor
} = require('./apifn');

app.use(express.json());

const port = 9876;
app.get('/', (req, res) => {
    res.send('chal gya');
});

var curr_user = null;
var name = null;

app.post('/', (req, res) => {
    // console.log(req.body);
    let intent = req.body.queryResult.intent.displayName;
    console.log(intent);
    var msg = {
        "fulfillmentMessages": [{
            "text": {
                "text": []
            }
        }]
    };

    if (intent == 'askWeather') {
        let sessid = req.body.session.split('/').pop();
        let w = '';
        let city = req.body.queryResult.parameters['geo-city'];
        w = getWeather(city);
        let responseObj = {
            'fulfillmentMessages': [{
                "text": {
                    "text": [w]
                }
            }]
        }
        console.log(w);
        // if(w.split(' ')[3] )
        // console.log(w);
        // console.log()
        // responseObj.fulfillmentMessages.push({
        //     "quickReplies": {
        //         "quickReplies": [
        //             "Order pizza for me",
        //             "Tell me weather"
        //         ]
        //     },
        // });
        responseObj.fulfillmentMessages.push({
            "platforms": ['FACEBOOK', 'PLATFORM_UNSPECIFIED', 'TELEGRAM', 'GOOGLE_TELEPHONY']
        });
        mongoClient.connect("mongodb://localhost:27017", function (error, client) {
            let database = client.db("chatbot");
            console.log("Database connected.");
            database.collection('activeSessions').findOne({
                "sessionid": sessid
            }, function (err, user) {
                if (user == null) { } else if (user.ordering == 'true') {
                    responseObj['outputContexts'] = [{
                        "name": `projects/test-agent2-waqh/agent/sessions/${sessid}/contexts/update_pizza`,
                        "lifespanCount": 10
                    }, {
                        "name": `projects/test-agent2-waqh/agent/sessions/${sessid}/contexts/order_yes`,
                        "lifespanCount": 1
                    }, {
                        "name": `projects/test-agent2-waqh/agent/sessions/${sessid}/contexts/order_no`,
                        "lifespanCount": 1
                    }]
                }
                res.send(responseObj);
            })
        });

    } else if (intent == 'thanks') {
        let sessid = req.body.session.split('/').pop();
        mongoClient.connect("mongodb://localhost:27017", function (error, client) {
            let database = client.db("chatbot");
            console.log("Database connected.");
            database.collection('activeSessions').findOne({
                "sessionid": sessid
            }, function (err, user) {
                if (user.parameters.ordering == 'false') {
                    msg.fulfillmentMessages[0].text['text'].push('Happy to serve you');
                    res.send(msg);
                } else {
                    // console.log(user);
                    msg.fulfillmentMessages[0].text['text'][0] = `${user.parameters.name}, you have a pending order. Would you like to continue?.`;
                    msg.fulfillmentMessages.push({
                        "quickReplies": {
                            "quickReplies": [
                                "Yes",
                                "No"
                            ]
                        },
                    });
                    msg.fulfillmentMessages.push({
                        "platforms": ['FACEBOOK', 'PLATFORM_UNSPECIFIED', 'TELEGRAM']
                    })
                    msg['outputContexts'] = [{
                        "name": `projects/test-agent2-waqh/agent/sessions/${user.sessionid}/contexts/update_pizza`,
                        "lifespanCount": 10
                    }, {
                        "name": `projects/test-agent2-waqh/agent/sessions/${user.sessionid}/contexts/order_yes`,
                        "lifespanCount": 1
                    }, {
                        "name": `projects/test-agent2-waqh/agent/sessions/${user.sessionid}/contexts/order_no`,
                        "lifespanCount": 1
                    }]
                    res.send(msg);
                }
            })
        });
    } else if (intent == 'order_pizza') {
        let sessid = req.body.session.split('/').pop();
        let prm = req.body.queryResult.parameters;
        console.log(prm);
        mongoClient.connect("mongodb://localhost:27017", function (error, client) {
            let database = client.db("chatbot");
            let query = {
                'sessionid': sessid
            };
            let updt = {
                $set: {
                    'ordering': 'true',
                    "orderDetails": {
                        "pizza-size": prm['pizza-size'],
                        "pizza-quantity": prm['pizza-quantity'],
                        "pizza-toppings": prm['pizza-toppings']
                    }
                }
            };
            console.log("Database connected.");
            database.collection('activeSessions').updateOne(query, updt, function (err, res) {
                if (err) throw err;
                console.log("updates");
            })
        });
        msg.fulfillmentMessages[0].text.text.push(`${prm['pizza-quantity']} ${prm['pizza-size']} sized pizza with ${prm['pizza-toppings']} is being prepared for you.`);
        msg.fulfillmentMessages.push({
            'text': {
                'text': ['Would you like to continue?']
            }
        });
        msg.fulfillmentMessages.push({
            "quickReplies": {
                "quickReplies": [
                    "Yes",
                    "No",
                    "Change the size of pizza"
                ]
            },
        });
        msg.fulfillmentMessages.push({
            "platforms": ['FACEBOOK', 'PLATFORM_UNSPECIFIED', 'TELEGRAM']
        });
        // msg.fulfillmentMessages.push({
        //     'platform': 'PLATFORM_UNSPECIFIED', 
        //     "suggestions": {
        //         "suggestions": [{
        //                 "title": "YES"
        //             },
        //             {
        //                 "title": "NO"
        //             }
        //         ]
        //     }
        // })
        // msg.fulfillmentMessages[0].text.text.push('Would you like to continue?');
        msg['outputContexts'] = [{
            "name": `projects/test-agent2-waqh/agent/sessions/${sessid}/contexts/order_yes`,
            "lifespanCount": 1
        }, {
            "name": `projects/test-agent2-waqh/agent/sessions/${sessid}/contexts/order_no`,
            "lifespanCount": 1
        }]
        res.send(msg);
    } else if (intent == 'order_yes') {
        let sessid = req.body.session.split('/').pop();
        mongoClient.connect("mongodb://localhost:27017", function (error, client) {
            let database = client.db("chatbot");
            console.log("Database connected.");
            database.collection('activeSessions').findOne({
                "sessionid": sessid
            }, function (err, user) {
                let prm = user.orderDetails;
                console.log(62, prm);
                msg.fulfillmentMessages[0].text['text'][0] = `Order having ${prm['pizza-quantity']} ${prm['pizza-size']} sized pizza with ${prm['pizza-toppings']} toppings has been placed.`;
                msg.fulfillmentMessages.push({
                    'text': {
                        'text': ['Thanks for ordering.']
                    }
                });
                msg.fulfillmentMessages.push({
                    "card": {
                        "title": "Nagarro",
                        "subtitle": "Explore a wide range of delicious pizzas on our website.",
                        "imageUri": "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQDv9wFQMxoSrsmvqb49dRlalc3yGioFJNR2w&usqp=CAU",
                        "buttons": [{
                            "text": "Go to our website.",
                            "postback": "https://nagarro.com"
                        }]
                    },
                    "platforms": ['FACEBOOK', 'PLATFORM_UNSPECIFIED', 'TELEGRAM']
                });
                msg['outputContexts'] = [{
                    "name": `projects/test-agent2-waqh/agent/sessions/${sessid}/contexts/update_pizza`,
                    "lifespanCount": 0
                }]
                // client.close();
                updateOrder(sessid);
                res.send(msg);
            })
        });
    } else if (intent == 'order_no') {
        let sessid = req.body.session.split('/').pop();
        mongoClient.connect("mongodb://localhost:27017", function (error, client) {
            let database = client.db("chatbot");
            let query = {
                'sessionid': sessid
            };
            let updt = {
                $set: {
                    'ordering': 'false',
                    "orderDetails": {
                        "pizza-size": null,
                        "pizza-quantity": null,
                        "pizza-toppings": null
                    }
                }
            };
            console.log("Database connected.");
            database.collection('activeSessions').updateOne(query, updt, function (err, res) {
                if (err) throw err;
                console.log("updates");
            })
            msg.fulfillmentMessages[0].text['text'].push('Ok then, I have removed your pending order');
            msg.fulfillmentMessages.push({
                "quickReplies": {
                    "quickReplies": [
                        "Order pizza again",
                        "Tell me the weather conditions"
                    ]
                },
            });
            msg.fulfillmentMessages.push({
                "platforms": ['FACEBOOK', 'PLATFORM_UNSPECIFIED', 'TELEGRAM']
            });
            res.send(msg);
        })
    } else if (intent == 'continue_yes') {
        let sessid = req.body.session.split('/').pop();
        mongoClient.connect("mongodb://localhost:27017", function (error, client) {
            let database = client.db("chatbot");
            console.log("Database connected.");
            database.collection('activeSessions').findOne({
                "sessionid": sessid
            }, function (err, user) {
                let prm = user.orderDetails;
                console.log(62, prm);
                msg.fulfillmentMessages[0].text['text'][0] = `Order having ${prm['pizza-quantity']} ${prm['pizza-size']} sized pizza with ${prm['pizza-toppings']} toppings has been placed.`;
                // client.close();
                msg['outputContexts'] = [{
                    "name": `projects/test-agent2-waqh/agent/sessions/${sessid}/contexts/update_pizza`,
                    "lifespanCount": 0
                }]
                updateOrder(sessid);
                res.send(msg);
            })
        });
    } else if (intent == 'continue_no') {
        let sessid = req.body.session.split('/').pop();
        mongoClient.connect("mongodb://localhost:27017", function (error, client) {
            let database = client.db("chatbot");
            let query = {
                'sessionid': sessid
            };
            let updt = {
                $set: {
                    'ordering': 'false',
                    "orderDetails": {
                        "pizza-size": null,
                        "pizza-quantity": null,
                        "pizza-toppings": null
                    }
                }
            };
            console.log("Database connected.");
            database.collection('activeSessions').updateOne(query, updt, function (err, res) {
                if (err) throw err;
                console.log("updates");
            })
            msg.fulfillmentMessages[0].text['text'].push('Ok then, I have removed your pending order');
            msg.fulfillmentMessages.push({
                "quickReplies": {
                    "quickReplies": [
                        "Order a pizza",
                        "Tell me weather the conditions",
                    ]
                },
            });
            msg.fulfillmentMessages.push({
                "platforms": ['FACEBOOK', 'PLATFORM_UNSPECIFIED', 'TELEGRAM']
            })
            msg['outputContexts'] = [{
                "name": `projects/test-agent2-waqh/agent/sessions/${sessid}/contexts/update_pizza`,
                "lifespanCount": 0
            }]
            res.send(msg);
        })
    } else if (intent == 'thank') {
        let sessid = req.body.session.split('/').pop();
        console.log(sessid);
        mongoClient.connect("mongodb://localhost:27017", function (error, client) {
            let database = client.db("chatbot");
            console.log("Database connected.");
            database.collection('activeSessions').findOne({
                "sessionid": sessid
            }, function (err, user) {
                if (user == null) {
                    msg.fulfillmentMessages[0].text['text'].push('For what!');
                    // msg["outputContexts"] = [{
                    //     "name": `projects/test-agent2-waqh/agent/sessions/${sessid}/contexts/expect_username`,
                    //     "lifespanCount": 1
                    // }]
                    res.send(msg);
                } else {
                    if (user.ordering == 'true') {
                        let prm = user.orderDetails;
                        console.log(62, prm);
                        msg.fulfillmentMessages[0].text['text'][0] = `Happy to serve you ${user.parameters['name']}. By the way you have an incomplete order having ${prm['pizza-quantity']} ${prm['pizza-size']} sized pizza with ${prm['pizza-toppings']} toppings.`;
                        msg.fulfillmentMessages.push({
                            'text': {
                                'text': ['Would you like to continue ordering the pizza?']
                            }
                        });
                        msg.fulfillmentMessages.push({
                            "quickReplies": {
                                "quickReplies": [
                                    "Yes",
                                    "No",
                                    "Change the size of pizza"
                                ]
                            },
                        });
                        msg.fulfillmentMessages.push({
                            "platforms": ['FACEBOOK', 'PLATFORM_UNSPECIFIED', 'TELEGRAM']
                        });

                        msg['outputContexts'] = [{
                            "name": `projects/test-agent2-waqh/agent/sessions/${user.sessionid}/contexts/continue_yes`,
                            "lifespanCount": 1
                        }, {
                            "name": `projects/test-agent2-waqh/agent/sessions/${user.sessionid}/contexts/continue_no`,
                            "lifespanCount": 1
                        }]

                    } else {
                        msg.fulfillmentMessages[0].text['text'][0] = 'Happy to serve you'
                    }
                    // console.log(user);
                    res.send(msg);
                }
            })
        });
    } else if (intent == 'update_pizza_size') {
        let sessid = req.body.session.split('/').pop();
        console.log(req.body.queryResult.outputContexts);
        let prm = req.body.queryResult.outputContexts;
        for (let i in prm) {
            // console.log(558, prm[i].name.split('/').pop());
            if (prm[i].name.split('/').pop() == 'user') {
                prm = prm[i].parameters;
                break;
            }
        }
        console.log(529, prm);
        mongoClient.connect("mongodb://localhost:27017", function (error, client) {
            let database = client.db("chatbot");
            let query = {
                'sessionid': sessid
            };
            let updt = {
                $set: {
                    "orderDetails": {
                        "pizza-size": prm['pizza-size'],
                        "pizza-quantity": prm['pizza-quantity'],
                        "pizza-toppings": prm['pizza-toppings']
                    }
                }
            };
            console.log("Database connected.");
            database.collection('activeSessions').updateOne(query, updt, function (err, res) {
                if (err) throw err;
                console.log("updates");
            })
            msg.fulfillmentMessages[0].text.text.push(`I have updated the size to ${prm['pizza-size']}`);
            msg.fulfillmentMessages.push({
                'text': {
                    'text': ['Would you like to continue?']
                }
            });
            msg.fulfillmentMessages.push({
                "quickReplies": {
                    "quickReplies": [
                        "Yes",
                        "No",
                        "Change the size of pizza"
                    ]
                },
            });
            msg.fulfillmentMessages.push({
                "platforms": ['FACEBOOK', 'PLATFORM_UNSPECIFIED', 'TELEGRAM']
            });
            msg['outputContexts'] = [{
                "name": `projects/test-agent2-waqh/agent/sessions/${sessid}/contexts/order_yes`,
                "lifespanCount": 1
            }, {
                "name": `projects/test-agent2-waqh/agent/sessions/${sessid}/contexts/order_no`,
                "lifespanCount": 1
            }, {
                "name": `projects/test-agent2-waqh/agent/sessions/${sessid}/contexts/update_pizza`,
                "lifespanCount": 1
            }]
            res.send(msg);
        });

    } else if (intent == 'logout') {
        let sessid = req.body.session.split('/').pop();
        mongoClient.connect("mongodb://localhost:27017", function (error, client) {

            let database = client.db("chatbot");
            console.log("Database connected.");
            let query = {
                'sessionid': sessid
            };
            database.collection('activeSessions').deleteOne(query, function (err, res) {
                if (err) throw err;
                console.log('logged out');
            });
            msg.fulfillmentMessages[0].text['text'].push('Logged out successfully.');
            msg.fulfillmentMessages.push({
                'text': {
                    'text': ['Hope to see you again 🙂']
                }
            })
            msg.fulfillmentMessages.push({
                "card": {
                    "title": "Nagarro",
                    "subtitle": "Connect with us on Social Media",
                    "imageUri": "https://upload.wikimedia.org/wikipedia/en/thumb/c/c0/Nagarro_logo_new.svg/1200px-Nagarro_logo_new.svg.png",
                    "buttons": [{
                        "text": "Nagarro on Facebook",
                        "postback": "https://www.facebook.com/pages/category/Local-Business/Nagarro-Plot-13-Gurgaon-377432165944252/"
                    }, {
                        'text': 'Nagarro on Twitter',
                        'postback': 'https://www.twitter.com/nagarro'
                    }]
                },
                "platforms": ['FACEBOOK', 'PLATFORM_UNSPECIFIED', 'TELEGRAM']
            });
            msg['outputContexts'] = [{
                "name": `projects/test-agent2-waqh/agent/sessions/${sessid}/contexts/user`,
                "lifespanCount": 0,
            }]
            res.send(msg);
        });
    } else if (intent == 'social_media') {
        let card = {
            "fulfillmentMessages": [{
                "card": {
                    "title": "Nagarro",
                    "subtitle": "Connect with us on Social Media",
                    "imageUri": "https://upload.wikimedia.org/wikipedia/en/thumb/c/c0/Nagarro_logo_new.svg/1200px-Nagarro_logo_new.svg.png",
                    "buttons": [{
                        "text": "Nagarro on Facebook",
                        "postback": "https://www.facebook.com/pages/category/Local-Business/Nagarro-Plot-13-Gurgaon-377432165944252/"
                    }, {
                        'text': 'Nagarro on Twitter',
                        'postback': 'https://www.twitter.com/nagarro'
                    }]
                },
                "platforms": ['FACEBOOK', 'PLATFORM_UNSPECIFIED', 'TELEGRAM']
            }]
        };
        res.send(card);
    } else if (intent == 'logout_none') {
        msg.fulfillmentMessages[0].text['text'].push('You have not signed in yet.');
        msg.fulfillmentMessages.push({
            "card": {
                "title": "Nagarro",
                "subtitle": "Connect with Nagarro on twitter.",
                "imageUri": "https://upload.wikimedia.org/wikipedia/en/thumb/c/c0/Nagarro_logo_new.svg/1200px-Nagarro_logo_new.svg.png",
                "buttons": [{
                    "text": "Go to twitter",
                    "postback": "https://twitter.com/nagarro"
                }]
            }
        });
        msg.fulfillmentMessages.push({
            "platforms": ['FACEBOOK', 'PLATFORM_UNSPECIFIED', 'TELEGRAM']
        })
        res.send(msg);
    }
})

function updateOrder(sessid) {
    mongoClient.connect("mongodb://localhost:27017", function (error, client) {
        let database = client.db("chatbot");
        console.log("Database connected.");
        let query = {
            'sessionid': sessid
        };
        let updt = {
            $set: {
                'ordering': 'false',
                "orderDetails": {
                    "pizza-size": null,
                    "pizza-quantity": null,
                    "pizza-toppings": null
                }
            }
        };
        database.collection('activeSessions').updateOne(query, updt, function (err, res) {
            if (err) throw err;
            console.log("updates");
            // console.log(res);
            // client.close();
        });
        console.log('almost');
    });
}

app.listen(port, () => {
    console.log(`Server started at http://localhost:${port}`);
});
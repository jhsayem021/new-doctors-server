const { MongoClient, ServerApiVersion } = require('mongodb');
const express = require('express');
const cors = require('cors');
const { query } = require('express');
const jwt = require('jsonwebtoken');
const app = express();
require('dotenv').config();
const port = process.env.PORT || 5000;

// Middleware

app.use(cors());
app.use(express.json());

// MongoDB connection


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.sezawpu.mongodb.net/?retryWrites=true&w=majority`;

console.log(uri);
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

async function run(){

    try{

        
        const appointmentOptionsCollection = client.db("newDoctors").collection("appointmentOptions");
        const bookingsCollection = client.db("newDoctors").collection("bookings");
        const usersCollection = client.db("newDoctors").collection("users");
        
        app.get('/appointmentoptions' , async (req,res)=>{
            const date = req.query.date;
            console.log(date);
            const query = {};
            const options = await appointmentOptionsCollection.find(query).toArray();
            const bookingQuery = {appointmentDate: date}
            const alreadyBooked = await bookingsCollection.find(bookingQuery).toArray();
            options.forEach(option=>{
                const optionBooked = alreadyBooked.filter(book => book.treatment === option.name);
                const bookedSlots = optionBooked.map(book => book.slot);
                const remainingSlots = option.slots.filter(slot => !bookedSlots.includes(slot))
                option.slots = remainingSlots;
                console.log(date , option.name , remainingSlots.length);
            })
            res.send(options);
        })

        app.get('/userbookings', async (req, res)=>{
            const email = req.query.email;
            console.log('token' , req.headers.authorization);
            const query = {
                email: email
            }
            const alreadyBooked = await bookingsCollection.find(query).toArray();
            res.send(alreadyBooked)
        })

        app.post('/bookings' , async (req, res)=>{

            const bookings = req.body;
            
            const query = {
                appointmentDate: bookings.appointmentDate,
                treatment: bookings.treatment,
                email: bookings.email
            }

            const alreadyBooked = await bookingsCollection.find(query).toArray()

            if(alreadyBooked.length>0){
                const message = `Oops! You have already an "${bookings.treatment}" service on ${bookings.appointmentDate}.`
                return res.send({acknowledged:false , message})
            }

            const result =  await bookingsCollection.insertOne(bookings)
            res.send(result);


        } )

        app.get('/jwt', async (req,res) =>{
            const email = req.query.email;
            const query = { email: email }
            const user = await usersCollection.findOne(query);
            if(user){
                const token = jwt.sign({email}, process.env.ACCESS_TOKEN , {expiresIn: '1h'} );
                // console.log(token);
                return res.send({accessToken: token})
                
            }
            res.status(403).send({accessToken:'access_token'})
            
        })

        app.post('/users', async (req,res)=>{

            const user = req.body;
            console.log(user)
            const result = await usersCollection.insertOne(user);
            res.send(result);

        })

    }
    finally{

    }

}
run().catch(console.log);



// Default route
app.get('/', async(req,res)=>{ 
    res.send('New Doctors Server Running')
})





// Listen
app.listen(port, ()=>{
    console.log(`Server is running ${port}`);
})
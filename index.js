const { MongoClient, ServerApiVersion } = require('mongodb');
const express = require('express');
const cors = require('cors');
const { query } = require('express');
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

        app.post('/bookings' , async (req, res)=>{

            const bookings = req.body;
            

            const result =  await bookingsCollection.insertOne(bookings)
            res.send(result);


        } )

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
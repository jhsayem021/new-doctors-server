const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
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


function verifyJWT(req, res, next) {

    console.log('token', req.headers.authorization);
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).send('Unauthorized access')
    }
    const token = authHeader.split(' ')[1];
    jwt.verify(token, process.env.ACCESS_TOKEN, function (err, decoded) {
        if (err) {
            return res.status(403).send({ message: 'forbidden access' })
        }
        req.decoded = decoded;
        next()
    })
}


async function run() {

    try {
        const appointmentOptionsCollection = client.db("newDoctors").collection("appointmentOptions");
        const bookingsCollection = client.db("newDoctors").collection("bookings");
        const usersCollection = client.db("newDoctors").collection("users");
        const doctorsCollection = client.db("newDoctors").collection("doctors");

        const verifyAdmin = async (req, res, next) => {
            console.log(req.decoded.email)
            const decodedEmail = req.decoded.email;
            const query = { email: decodedEmail };
            const user = await usersCollection.findOne(query);

            if (user?.role !== 'admin') {
                return res.status(403).send({ message: 'forbidden access' })
            }
            next();
        }

        app.get('/appointmentoptions', async (req, res) => {
            const date = req.query.date;
            console.log(date);
            const query = {};
            const options = await appointmentOptionsCollection.find(query).toArray();
            const bookingQuery = { appointmentDate: date }
            const alreadyBooked = await bookingsCollection.find(bookingQuery).toArray();
            options.forEach(option => {
                const optionBooked = alreadyBooked.filter(book => book.treatment === option.name);
                const bookedSlots = optionBooked.map(book => book.slot);
                const remainingSlots = option.slots.filter(slot => !bookedSlots.includes(slot))
                option.slots = remainingSlots;
                console.log(date, option.name, remainingSlots.length);
            })
            res.send(options);
        })
        app.get('/users', async (req, res) => {
            const query = {};
            const users = await usersCollection.find(query).toArray();
            console.log(users);
            res.send(users);
        })

        app.get('/users/admin/:email', async (req, res) => {
            const email = req.params.email;
            const query = { email };
            const user = await usersCollection.findOne(query);
            res.send({ isAdmin: user?.role === 'admin' })
        })
        app.put('/users/admin/:id', verifyJWT, verifyAdmin, async (req, res) => {
            
            const id = req.params.id;

            console.log(id);
            const filter = { _id: ObjectId(id) };
            const options = { upsert: true };
            const updateDoc = {
                $set: {
                    role: 'admin'
                }
            }
            const result = await usersCollection.updateOne(filter, updateDoc, options)
            res.send(result);
        })


        // temporary API for update appointmentOptionsCollection data 

        // app.get('/addprice', async (req,res)=>{
        //     const filter = {}
        //     const options = {upsert:true};
        //     const updateDoc = {
        //         $set: {
        //             price: 99
        //         }
        //     }
        //     const result = await appointmentOptionsCollection.updateMany( filter,updateDoc,options)
        //     res.send(result);
        // })

        app.get('/userbookings', verifyJWT,  async (req, res) => {
            const email = req.query.email;
            const decodedEmail = req.decoded.email;
            if (email !== decodedEmail) {
                return res.status(403).send({ message: 'forbidden access' });
            }
            const query = {
                email: email
            }
            const alreadyBooked = await bookingsCollection.find(query).toArray();
            res.send(alreadyBooked)
        })

        app.get('/appointmentSpeciality', async (req, res) => {
            const query = {}
            const result = await appointmentOptionsCollection.find(query).project({ name: 1 }).toArray()
            res.send(result);
        })

        app.get('/booking/:id', async(req,res)=>{
            const id = req.params.id;
            const query = {_id: ObjectId(id) }
            const booking = await bookingsCollection.findOne(query)
            res.send(booking);
        })

        app.post('/bookings', async (req, res) => {

            const bookings = req.body;

            const query = {
                appointmentDate: bookings.appointmentDate,
                treatment: bookings.treatment,
                email: bookings.email
            }

            const alreadyBooked = await bookingsCollection.find(query).toArray()

            if (alreadyBooked.length > 0) {
                const message = `Oops! You have already an "${bookings.treatment}" service on ${bookings.appointmentDate}.`
                return res.send({ acknowledged: false, message })
            }

            const result = await bookingsCollection.insertOne(bookings)
            res.send(result);


        })

        app.get('/jwt', async (req, res) => {
            const email = req.query.email;
            const query = { email: email }
            const user = await usersCollection.findOne(query);
            if (user) {
                const token = jwt.sign({ email }, process.env.ACCESS_TOKEN, { expiresIn: '10h' });
                // console.log(token);
                return res.send({ accessToken: token })

            }
            res.status(403).send({ accessToken: 'access_token' })

        })

        app.post('/users', async (req, res) => {

            const user = req.body;
            console.log(user)
            const result = await usersCollection.insertOne(user);
            res.send(result);

        })

        app.get('/doctors', verifyJWT, verifyAdmin, async (req, res) => {
            const query = {}
            const doctors = await doctorsCollection.find(query).toArray();
            res.send(doctors);
        })

        app.post('/doctors', verifyJWT, verifyAdmin, async (req, res) => {
            const doctors = req.body;
            const result = await doctorsCollection.insertOne(doctors);
            res.send(result);
        })
        app.delete('/doctors/:id', verifyJWT, verifyAdmin, async (req, res) => {
            const id = req.params.id
            const filter = { _id: ObjectId(id) };
            const result = await doctorsCollection.deleteOne(filter);
            res.send(result);
        })

    }
    finally {

    }

}
run().catch(console.log);



// Default route
app.get('/', async (req, res) => {
    res.send('New Doctors Server Running')
})





// Listen
app.listen(port, () => {
    console.log(`Server is running ${port}`);
})
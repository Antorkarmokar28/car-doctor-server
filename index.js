const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config()
const app = express();
const port = process.env.PORT || 5000;

// medailware
app.use(cors({
    origin: ['http://localhost:5173'],
    credentials: true
}));
app.use(express.json());
app.use(cookieParser());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.pctvl.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});
// create a middleware for verifyToken
const verifyToken = async (req, res, next) =>{
    const token = req.cookies?.token;
    if(!token){
        return res.status(401).send({message: 'Unauthorized'});
    }
    // user verify token
    jwt.verify(token, process.env.USER_SCREETE_TOKEN, (err, decoded) => {
        // error
        if(err){
            return res.status(401).send({message: 'Unauthorized access'});
        }
        // if user is valid then it would decoded
        req.user = decoded;
        next()
    })
}
async function run() {
    try {
        // Connect the client to the server	(optional starting in v4.7)
        await client.connect();
        const servicesCollection = client.db("carDoctor").collection('services');
        const bookingsCollection = client.db("carDoctor").collection('bookings');
        // auth related api
        app.post('/jwt', async (req, res) => {
            const user = req.body;
            console.log(user);
            const token = jwt.sign(user, process.env.USER_SCREETE_TOKEN, {
                expiresIn: '1h',
            })
            res.cookie('token', token, {
                httpOnly: true,
                secure: false,
            }).send({ success: true })
        })
        // services related api
        app.get('/services', async (req, res) => {
            const cursor = servicesCollection.find();
            const result = await cursor.toArray();
            res.send(result)
        })
        app.get('/services/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const options = {
                // Include only the `title` and `imdb` fields in the returned document
                projection: {
                    service_id: 1, title: 1, img: 1, description: 1, price: 1,
                },
            };
            const result = await servicesCollection.findOne(query, options);
            res.send(result);
        })
        app.post('/bookings', async (req, res) => {
            const booking = req.body;
            console.log(booking)
            const result = await bookingsCollection.insertOne(booking);
            res.send(result)
        })
        app.get('/bookings', verifyToken, async (req, res) => {
            console.log(req.query.email);
            console.log('user in the valid token', req.user);

            if(req.query.email !== req.user.email){
                return res.status(403).send({message: 'forbidden access'})
            }

            let query = {}
            // console.log('ttt token', req.cookies.token)
            if (req.query?.email) {
                query = { email: req.query.email }
            }
            const result = await bookingsCollection.find(query).toArray();
            res.send(result)
        })
        // update the bookings items from mongo db database
        app.patch('/bookings/:id', async (req, res) => {
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) }
            const updateBookings = req.body;
            console.log(updateBookings);
            const updateDoc = {
                $set: {
                    status: updateBookings.status
                },
            };
            const result = await bookingsCollection.updateOne(filter, updateDoc);
            res.send(result);
        })
        // delete bookings items from mongodb database
        app.delete('/bookings/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await bookingsCollection.deleteOne(query);
            res.send(result);
        })
        // Send a ping to confirm a successful connection
        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir);


app.get('/', (req, res) => {
    res.send('Car doctor is running');
})

app.listen(port, () => {
    console.log(`Car doctor server is running on the port ${port}`)
})
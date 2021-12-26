const express = require("express");
const app = express();
const cors = require("cors");
const PORT = process.env.PORT || 5000;
const { MongoClient } = require("mongodb");
const { response } = require("express");
const admin = require("firebase-admin");
const serviceAccount = require("./ema-john-29ae8-firebase-adminsdk-xgf5e-ef0baa6e6b.json");

require("dotenv").config();

// firebase admin

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

app.use(express.json());
app.use(cors());

app.get("/", (req, res) => {
  res.send("server of ema john");
});

async function verifyToken(req, res, next) {
  if (req.headers?.authorization?.startsWith("Bearer ")) {
    const idToken = req.headers.authorization.split("Bearer ")[1];
    try {
      const decodedUser = await admin.auth().verifyIdToken(idToken);
      req.decodedUserEmail = decodedUser.email;
    } catch {}
  }
  next();
}

async function run() {
  const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.dsdfh.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`;
  const client = new MongoClient(uri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });

  try {
    await client.connect();

    const database = client.db("ema-john");
    const productCollection = database.collection("products");
    const orderCollection = database.collection("orders");

    app.get("/products", async (req, res) => {
      const cursor = productCollection.find({});
      const page = req.query.page;
      const size = req.query.size;
      let products;
      const count = await cursor.count();
      if (page) {
        products = await cursor
          .skip(page * size)
          .limit(parseInt(size))
          .toArray();
      } else {
        const products = await cursor.toArray();
      }
      res.send({
        count,
        products,
      });
    });

    app.post("/products/bykeys", async (req, res) => {
      const query = { key: { $in: req.body } };
      const products = await productCollection.find(query).toArray();
      res.json(products);
    });

    app.post("/order/confirm", async (req, res) => {
      const result = await orderCollection.insertOne(req.body);
      res.send(result);
    });

    app.get("/order", verifyToken, async (req, res) => {
      const email = req.query.email;
      if (req.decodedUserEmail === email) {
        const result = await orderCollection.find({ email: email }).toArray();
        res.json(result);
      } else {
        res.status(401).json({ message: "user not authorized" });
      }
    });
  } finally {
    //   await client.close()
  }
}

run().catch(console.dir);

app.listen(PORT, () => {
  console.log("listening to port", PORT);
});

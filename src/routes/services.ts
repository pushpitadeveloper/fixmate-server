import { Router } from "express";
import { ObjectId } from "mongodb";
import { getDb } from "../config/db";
import { verifyRole, verifyToken } from "../middlewares/auth";

const router = Router();

// Sob service - public
router.get("/", async (req, res) => {
  const db = await getDb();
  const services = await db.collection("services").find().toArray();
  res.json(services);
});

// Ekta service
router.get("/:id", async (req, res) => {
  const db = await getDb();
  const service = await db.collection("services").findOne({ _id: new ObjectId(req.params.id) });
  if (!service) return res.status(404).json({ message: "Service pai nai" });
  res.json(service);
});

// Service banano - sudhu admin
router.post("/", verifyToken, verifyRole("admin"), async (req, res) => {
  const db = await getDb();
  const { title, category, price, description, image, duration } = req.body;
  const result = await db.collection("services").insertOne({
    title, category, price: Number(price), description, image, duration,
    createdAt: new Date(),
  });
  res.status(201).json({ insertedId: result.insertedId });
});

export default router;

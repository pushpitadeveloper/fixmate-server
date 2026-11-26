import { Router } from "express";
import { ObjectId } from "mongodb";
import { getDb } from "../config/db";
import { verifyRole, verifyToken } from "../middlewares/auth";

const router = Router();

// Helper - ID jekono format ei khujbe
function idQuery(id: string): any {
  if (ObjectId.isValid(id)) {
    return { $or: [{ _id: new ObjectId(id) }, { _id: id as any }] };
  }
  return { _id: id };
}

// All services - public, with SERVER-SIDE filter / search / sort
router.get("/", async (req, res) => {
  try {
    const db = await getDb();
    const { search, category, mode, serviceMode, sort, status } = req.query as any;
    const query: any = {};
    if (category && category !== "All") query.category = category;
    const modeVal = mode || serviceMode;
    if (modeVal && modeVal !== "All") query.serviceMode = modeVal;
    if (status && status !== "All") query.status = status;
    if (search) {
      const regex = { $regex: String(search), $options: "i" };
      query.$or = [{ title: regex }, { description: regex }, { category: regex }];
    }
    let sortBy: any = { createdAt: -1 };
    if (sort === "low") sortBy = { price: 1 };
    if (sort === "high") sortBy = { price: -1 };
    if (sort === "newest") sortBy = { createdAt: -1 };
    const services = await db.collection("services").find(query).sort(sortBy).toArray();
    res.json(services);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

// One service
router.get("/:id", async (req, res) => {
  try {
    const db = await getDb();
    const service = await db.collection("services").findOne(idQuery(req.params.id));
    if (!service) return res.status(404).json({ message: "Service not found" });
    res.json(service);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

// Create service - admin + technician
router.post("/", verifyToken, verifyRole("admin", "technician"), async (req: any, res) => {
  try {
    const db = await getDb();
    const { title, category, price, basePrice, description, image, imageUrl, duration, estimatedDuration, serviceMode, serviceArea, technicianName, technicianEmail } = req.body;
    if (!title || !category || !description) return res.status(400).json({ message: "Title, category and description are required" });
    if (String(description).trim().length < 20) return res.status(400).json({ message: "Description must be at least 20 characters" });
    const finalPrice = Number(basePrice ?? price);
    if (!finalPrice || finalPrice <= 0) return res.status(400).json({ message: "Valid price is required" });
    const userRole = req.user?.role || req.user?.user?.role;
    const status = userRole === "admin" ? (req.body.status || "Approved") : "Pending";
    const result = await db.collection("services").insertOne({
      title, category,
      price: finalPrice, basePrice: finalPrice,
      description,
      image: image || imageUrl || "",
      imageUrl: imageUrl || image || "",
      duration: estimatedDuration || duration || "1 hour",
      estimatedDuration: estimatedDuration || duration || "1 hour",
      serviceMode: serviceMode || "Home Visit",
      serviceArea: serviceArea || "Dhaka",
      technicianName: technicianName || req.user?.name || req.user?.user?.name || "Verified Technician",
      technicianEmail: technicianEmail || req.user?.email || req.user?.user?.email || "",
      status,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    res.status(201).json({ insertedId: result.insertedId, status });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

// Update service - admin can Approve/Reject, technician can edit own -> Pending again
router.patch("/:id", verifyToken, verifyRole("admin", "technician"), async (req: any, res) => {
  try {
    const db = await getDb();
    const existing: any = await db.collection("services").findOne(idQuery(req.params.id));
    if (!existing) return res.status(404).json({ message: "Service not found" });
    const userRole = req.user?.role || req.user?.user?.role;
    const userEmail = req.user?.email || req.user?.user?.email;
    const userName = req.user?.name || req.user?.user?.name;
    if (userRole === "technician" && existing.technicianEmail && existing.technicianEmail !== userEmail && existing.technicianName !== userName) {
      return res.status(403).json({ message: "You do not have permission to edit this service" });
    }
    if ((req.body.status === "Approved" || req.body.status === "Rejected") && userRole !== "admin") {
      return res.status(403).json({ message: "Only admin can approve or reject a service" });
    }
    const update: any = { ...req.body, updatedAt: new Date() };
    if (update.price) update.price = Number(update.price);
    if (update.basePrice) update.basePrice = Number(update.basePrice);
    if (userRole === "technician" && (update.title || update.description || update.price || update.basePrice)) {
      update.status = "Pending";
    }
    delete update._id;
    await db.collection("services").updateOne(idQuery(req.params.id), { $set: update });
    res.json({ message: "Service updated successfully" });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

// Delete service - admin any, technician own only
router.delete("/:id", verifyToken, verifyRole("admin", "technician"), async (req: any, res) => {
  try {
    const db = await getDb();
    const existing: any = await db.collection("services").findOne(idQuery(req.params.id));
    if (!existing) return res.status(404).json({ message: "Service not found" });
    const userRole = req.user?.role || req.user?.user?.role;
    const userEmail = req.user?.email || req.user?.user?.email;
    if (userRole === "technician" && existing.technicianEmail && existing.technicianEmail !== userEmail) {
      return res.status(403).json({ message: "You do not have permission to delete this service" });
    }
    await db.collection("services").deleteOne(idQuery(req.params.id));
    res.json({ message: "Service deleted successfully" });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

export default router;

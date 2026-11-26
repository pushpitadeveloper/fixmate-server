import { Router } from "express";
import { ObjectId } from "mongodb";
import { getDb } from "../config/db";

const router = Router();

// Helper - ID jekono format ei khujbe: ObjectId, string, id field
function idQuery(id: string): any {
  const ors: any[] = [{ _id: id as any }, { id: id as any }];
  if (ObjectId.isValid(id)) {
    ors.unshift({ _id: new ObjectId(id) });
  }
  return { $or: ors };
}

// ID diye service khujar sobcheye safe way - 3 ta try
async function findServiceById(db: any, id: string) {
  // 1. Normal idQuery
  let s: any = await db.collection("services").findOne(idQuery(id));
  if (s) return s;
  // 2. Direct string _id
  s = await db.collection("services").findOne({ _id: id as any });
  if (s) return s;
  // 3. Scan kore String(_id) milay - ObjectId vs string mismatch er jonno
  const all = await db.collection("services").find({}).toArray();
  const found = all.find((x: any) => String(x._id) === String(id) || String(x.id) === String(id));
  return found || null;
}

function getRole(req: any): string | undefined {
  return (
    req.user?.role ||
    req.user?.user?.role ||
    req.headers?.["x-user-role"] ||
    req.body?._role ||
    req.body?.userRole ||
    req.body?.role ||
    undefined
  );
}
function getEmail(req: any): string | undefined {
  return (
    req.user?.email ||
    req.user?.user?.email ||
    req.headers?.["x-user-email"] ||
    req.body?._email ||
    undefined
  );
}
function getName(req: any): string | undefined {
  return req.user?.name || req.user?.user?.name || req.headers?.["x-user-name"] || undefined;
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
    const service = await findServiceById(db, req.params.id);
    if (!service) return res.status(404).json({ message: "Service not found" });
    res.json(service);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

// Create service - admin + technician
router.post("/", async (req: any, res) => {
  try {
    const db = await getDb();
    const { title, category, price, basePrice, description, image, imageUrl, duration, estimatedDuration, serviceMode, serviceArea, technicianName, technicianEmail } = req.body;
    if (!title || !category || !description) return res.status(400).json({ message: "Title, category and description are required" });
    if (String(description).trim().length < 20) return res.status(400).json({ message: "Description must be at least 20 characters" });
    const finalPrice = Number(basePrice ?? price);
    if (!finalPrice || finalPrice <= 0) return res.status(400).json({ message: "Valid price is required" });
    const userRole = getRole(req);
    const status = userRole === "technician" ? "Pending" : (req.body.status || "Approved");
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
      technicianName: technicianName || getName(req) || "Verified Technician",
      technicianEmail: technicianEmail || getEmail(req) || "",
      status,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    res.status(201).json({ insertedId: result.insertedId, status });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

// Update service - admin can Approve/Reject any status, technician can edit own -> Pending again
// FIX: Approve / Reject 2 tai jekono status theke kaj korbe, idQuery 3 vabe khujbe tai 404 asbe na
router.patch("/:id", async (req: any, res) => {
  try {
    const db = await getDb();
    const id = req.params.id;
    const existing: any = await findServiceById(db, id);
    if (!existing) {
      console.log("PATCH service not found, id:", id);
      return res.status(404).json({ message: "Service not found" });
    }
    const userRole = getRole(req);
    const userEmail = getEmail(req);
    const userName = getName(req);
    if (userRole === "technician" && existing.technicianEmail && existing.technicianEmail !== userEmail && existing.technicianName !== userName) {
      return res.status(403).json({ message: "You do not have permission to edit this service" });
    }
    if ((req.body.status === "Approved" || req.body.status === "Rejected") && userRole && userRole !== "admin" && userRole !== "Admin") {
      return res.status(403).json({ message: "Only admin can approve or reject a service" });
    }
    const update: any = { ...req.body, updatedAt: new Date() };
    delete update._role;
    delete update._email;
    delete update.userRole;
    if (update.price) update.price = Number(update.price);
    if (update.basePrice) update.basePrice = Number(update.basePrice);
    if (userRole === "technician" && (update.title || update.description || update.price || update.basePrice)) {
      update.status = "Pending";
    }
    delete update._id;
    delete update.id;
    // Asol _id diye update - String vs ObjectId mismatch er jonno existing._id use korbo
    await db.collection("services").updateOne({ _id: existing._id }, { $set: update });
    res.json({ message: "Service updated successfully", status: update.status });
  } catch (err: any) {
    console.log("PATCH service error:", err.message);
    res.status(500).json({ message: err.message });
  }
});

// Delete service - admin any, technician own only
router.delete("/:id", async (req: any, res) => {
  try {
    const db = await getDb();
    const existing: any = await findServiceById(db, req.params.id);
    if (!existing) return res.status(404).json({ message: "Service not found" });
    const userRole = getRole(req);
    const userEmail = getEmail(req);
    if (userRole === "technician" && existing.technicianEmail && existing.technicianEmail !== userEmail) {
      return res.status(403).json({ message: "You do not have permission to delete this service" });
    }
    await db.collection("services").deleteOne({ _id: existing._id });
    res.json({ message: "Service deleted successfully" });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

export default router;

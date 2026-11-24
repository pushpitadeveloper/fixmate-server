import { MongoClient } from "mongodb";

let client: MongoClient | null = null;

export async function getDb() {
  if (!client) {
    client = new MongoClient(process.env.MONGODB_URI!);
    await client.connect();
    console.log("MongoDB Connected");
  }
  return client.db("fixmate");
}

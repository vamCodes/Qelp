import "dotenv/config";
import { connectDB } from "./config/db.js";
import { createApp } from "./app.js";


const port = Number(process.env.PORT ?? 4000);

await connectDB();
createApp().listen(port, () => console.log(`Qelp API listening on :${port}`));
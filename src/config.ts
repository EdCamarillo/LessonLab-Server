import dotenv from "dotenv";
import * as process from "node:process"
dotenv.config();

interface Config {
  pineconeApiKey: string;
  pineconeIndexName: string;
  openAiApiKey: string;
  openAiOrganizationId: string;
}

const config: Config = {
  pineconeApiKey: process.env.PINECONE_API_KEY || "",
  pineconeIndexName:
    process.env.PINECONE_INDEX_NAME || "namespace-notes",
  openAiApiKey: process.env.OPENAI_API_KEY || "",
  openAiOrganizationId: process.env.OPENAI_ORGANIZATION_ID || ""
};

export default config;

export const corsOptions = {
  origin: process.env.NODE_ENV === "production" // Set deployment env var to production
  ? "https://lesson-lab-client.vercel.app"
  : "http://localhost:4000",
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
};

console.log("LOADED NODE_ENV: ", process.env.NODE_ENV);

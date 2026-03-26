// Run: npx tsx scripts/setup-cors.ts
import { S3Client, PutBucketCorsCommand } from "@aws-sdk/client-s3";

const r2 = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});

async function main() {
  await r2.send(
    new PutBucketCorsCommand({
      Bucket: process.env.R2_BUCKET || "onezi-screen",
      CORSConfiguration: {
        CORSRules: [
          {
            AllowedOrigins: ["https://screen.onezi.com.br", "http://localhost:3000"],
            AllowedMethods: ["GET", "PUT", "HEAD"],
            AllowedHeaders: ["*"],
            MaxAgeSeconds: 3600,
          },
        ],
      },
    })
  );
  console.log("CORS configurado com sucesso!");
}

main().catch(console.error);

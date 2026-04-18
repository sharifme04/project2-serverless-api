// LOCAL DEV VERSION of uploadImage Lambda
// In production this runs on AWS Lambda with S3 + DynamoDB
// Locally: saves to /uploads folder + in-memory metadata store

const { randomUUID } = require('crypto');
const fs = require('fs');
const path = require('path');

const UPLOADS_DIR = path.join(__dirname, '../../uploads');

// This is called by the local-server to simulate Lambda
exports.handler = async (event) => {
  try {
    const body = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;

    if (!body.file || !body.fileName) {
      return { statusCode: 400, body: JSON.stringify({ error: 'file and fileName required' }) };
    }

    const fileContent = Buffer.from(body.file, 'base64');
    const imageId = randomUUID();
    const fileName = `${imageId}-${body.fileName}`;
    const filePath = path.join(UPLOADS_DIR, fileName);

    if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });
    fs.writeFileSync(filePath, fileContent);

    const metadata = {
      imageId,
      fileName,
      originalName: body.fileName,
      uploadedAt: new Date().toISOString(),
      size: fileContent.length,
    };

    // In production: DynamoDB.PutItem — locally: write to metadata.json
    const metaFile = path.join(UPLOADS_DIR, 'metadata.json');
    const existing = fs.existsSync(metaFile) ? JSON.parse(fs.readFileSync(metaFile)) : [];
    existing.push(metadata);
    fs.writeFileSync(metaFile, JSON.stringify(existing, null, 2));

    return {
      statusCode: 201,
      // PRODUCTION NOTE: Replace '*' with your actual frontend S3 URL
      // e.g. 'https://your-frontend-bucket.s3-website-us-east-1.amazonaws.com'
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ imageId, fileName }),
    };
  } catch (err) {
    console.error(err);
    return { statusCode: 500, headers: { 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify({ error: 'Upload failed' }) };
  }
};

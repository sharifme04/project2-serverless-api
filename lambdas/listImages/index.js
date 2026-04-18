// LOCAL DEV VERSION of listImages Lambda
// In production: reads from DynamoDB — locally: reads metadata.json

const fs = require('fs');
const path = require('path');

const UPLOADS_DIR = path.join(__dirname, '../../uploads');

exports.handler = async () => {
  const metaFile = path.join(UPLOADS_DIR, 'metadata.json');
  const images = fs.existsSync(metaFile) ? JSON.parse(fs.readFileSync(metaFile)) : [];

  return {
    statusCode: 200,
    // PRODUCTION NOTE: Replace '*' with your actual frontend S3 URL
    headers: { 'Access-Control-Allow-Origin': '*' },
    body: JSON.stringify(images),
  };
};

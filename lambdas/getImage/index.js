// LOCAL DEV VERSION of getImage Lambda
// In production: looks up DynamoDB + generates S3 pre-signed URL
// Locally: looks up metadata.json + returns a local file URL

const fs = require('fs');
const path = require('path');

const UPLOADS_DIR = path.join(__dirname, '../../uploads');
const LOCAL_SERVER_PORT = 3002;

exports.handler = async (event) => {
  const id = event.pathParameters?.id;
  if (!id) {
    return { statusCode: 400, headers: { 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify({ error: 'id required' }) };
  }

  const metaFile = path.join(UPLOADS_DIR, 'metadata.json');
  const images = fs.existsSync(metaFile) ? JSON.parse(fs.readFileSync(metaFile)) : [];
  const image = images.find(img => img.imageId === id);

  if (!image) {
    return { statusCode: 404, headers: { 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify({ error: 'Not found' }) };
  }

  // In production: S3 pre-signed URL (expires in 1 hour)
  // Locally: serve the file directly from the local server
  const url = `http://localhost:${LOCAL_SERVER_PORT}/files/${image.fileName}`;

  return {
    statusCode: 200,
    // PRODUCTION NOTE: Replace '*' with your actual frontend S3 URL
    headers: { 'Access-Control-Allow-Origin': '*' },
    body: JSON.stringify({ url, metadata: image }),
  };
};

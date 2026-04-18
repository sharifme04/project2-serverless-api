// LOCAL DEV SERVER — simulates API Gateway routing Lambda functions
// This replaces API Gateway + Lambda when running locally
// In production: delete this file — everything runs on AWS

const express = require('express');
const cors = require('cors');
const path = require('path');

const uploadHandler = require('../lambdas/uploadImage');
const listHandler = require('../lambdas/listImages');
const getHandler = require('../lambdas/getImage');

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Serve uploaded files statically (simulates S3 public access for local dev)
app.use('/files', express.static(path.join(__dirname, '../uploads')));

// Simulate API Gateway routes → Lambda handlers
app.post('/upload', async (req, res) => {
  const result = await uploadHandler.handler({ body: JSON.stringify(req.body) });
  res.status(result.statusCode).json(JSON.parse(result.body));
});

app.get('/images', async (req, res) => {
  const result = await listHandler.handler();
  res.status(result.statusCode).json(JSON.parse(result.body));
});

app.get('/images/:id', async (req, res) => {
  const result = await getHandler.handler({ pathParameters: { id: req.params.id } });
  res.status(result.statusCode).json(JSON.parse(result.body));
});

const PORT = 3002;
app.listen(PORT, () => {
  console.log(`[Project 2] Serverless API local server running on http://localhost:${PORT}`);
  console.log('  Simulating API Gateway + Lambda locally');
  console.log('  POST   /upload   { file: <base64>, fileName: "name.jpg", contentType: "image/jpeg" }');
  console.log('  GET    /images');
  console.log('  GET    /images/:id');
  console.log('  Files: ./uploads/');
  console.log('\n  In production these routes become:');
  console.log('  API Gateway → Lambda → S3 + DynamoDB');
});

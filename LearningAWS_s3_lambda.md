## ✅ Project 2 - Complete AWS Setup Guide (Step-by-Step)

Here's everything we did in AWS, so you can recreate it yourself later.

---

## 📋 Prerequisites

- AWS account (free tier)
- AWS CLI installed (optional)
- Basic understanding of IAM

---

## 🔧 Step 1: Create S3 Buckets

### Bucket 1: Image Storage (Private)

1. Go to **S3** → **Create bucket**
2. **Bucket name:** `task-images-sharif` (must be unique)
3. **Region:** `us-east-1`
4. **Object Ownership:** ACLs disabled
5. **Block all public access:** ✅ Checked (ON)
6. Click **Create bucket**

### Bucket 2: Frontend Hosting (Public)

1. Go to **S3** → **Create bucket**
2. **Bucket name:** `task-frontend-sharif`
3. **Region:** `us-east-1`
4. **Object Ownership:** ACLs disabled
5. **Block all public access:** ❌ Unchecked (OFF)
6. Click **Create bucket**

### Enable Static Website Hosting (Bucket 2)

1. Click on `task-frontend-sharif`
2. **Properties** tab
3. **Static website hosting** → **Edit**
4. **Enable** → Index document: `index.html` → Error document: `error.html`
5. **Save changes**

### Add Bucket Policy (Bucket 2 - Public Read)

1. **Permissions** tab → **Bucket policy** → **Edit**
2. Paste this policy:

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "PublicReadGetObject",
            "Effect": "Allow",
            "Principal": "*",
            "Action": "s3:GetObject",
            "Resource": "arn:aws:s3:::task-frontend-sharif/*"
        }
    ]
}
```

3. **Save changes**

---

## 🗄️ Step 2: Create DynamoDB Table

1. Go to **DynamoDB** → **Create table**
2. **Table name:** `ImageMetadata`
3. **Partition key:** `imageId` (Type: String)
4. **Table settings:** Default (On-demand capacity)
5. Click **Create table**

---

## 👤 Step 3: Create IAM Role for Lambda

1. Go to **IAM** → **Roles** → **Create role**
2. **Trusted entity type:** AWS service
3. **Use case:** Lambda
4. Click **Next**

### Attach Policies:

Search and check these 3 policies:
- ✅ `AWSLambdaBasicExecutionRole`
- ✅ `AmazonS3FullAccess`
- ✅ `AmazonDynamoDBFullAccess`

5. Click **Next**
6. **Role name:** `lambda-image-api-role`
7. Click **Create role**

---

## ⚡ Step 4: Create Lambda Functions

### Function 1: uploadImage

1. Go to **Lambda** → **Create function**
2. **Function name:** `uploadImage`
3. **Runtime:** `Node.js 20.x`
4. **Architecture:** `x86_64`
5. **Permissions:** Choose existing role → `lambda-image-api-role`
6. Click **Create function**

#### Add Environment Variables:

**Configuration** tab → **Environment variables** → **Edit** → **Add environment variable**

| Key | Value |
|-----|-------|
| `TABLE_NAME` | `ImageMetadata` |
| `BUCKET_NAME` | `task-images-sharif` |
| `REGION` | `us-east-1` |

#### Add Code:

**Code** tab → Replace with:

```javascript
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { DynamoDBClient, PutItemCommand } from '@aws-sdk/client-dynamodb';
import { randomUUID } from 'crypto';

const s3 = new S3Client({ region: process.env.REGION });
const dynamoDB = new DynamoDBClient({ region: process.env.REGION });

export const handler = async (event) => {
    try {
        const body = JSON.parse(event.body);
        const { file, fileName, contentType } = body;

        const imageId = randomUUID();
        const s3Key = `${imageId}-${fileName}`;
        const buffer = Buffer.from(file, 'base64');

        await s3.send(new PutObjectCommand({
            Bucket: process.env.BUCKET_NAME,
            Key: s3Key,
            Body: buffer,
            ContentType: contentType || 'image/jpeg'
        }));

        await dynamoDB.send(new PutItemCommand({
            TableName: process.env.TABLE_NAME,
            Item: {
                imageId: { S: imageId },
                fileName: { S: fileName },
                s3Key: { S: s3Key },
                uploadedAt: { S: new Date().toISOString() },
                size: { N: buffer.length.toString() }
            }
        }));

        return {
            statusCode: 201,
            headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' },
            body: JSON.stringify({ imageId, fileName, message: 'Upload successful' })
        };
    } catch (error) {
        console.error(error);
        return {
            statusCode: 500,
            headers: { 'Access-Control-Allow-Origin': '*' },
            body: JSON.stringify({ error: error.message })
        };
    }
};
```

Click **Deploy**

### Function 2: listImages

1. **Create function** → `listImages` (same settings)
2. Add same Environment Variables
3. Add Code:

```javascript
import { DynamoDBClient, ScanCommand } from '@aws-sdk/client-dynamodb';

const dynamoDB = new DynamoDBClient({ region: process.env.REGION });

export const handler = async () => {
    try {
        const result = await dynamoDB.send(new ScanCommand({
            TableName: process.env.TABLE_NAME
        }));

        const images = result.Items.map(item => ({
            imageId: item.imageId.S,
            fileName: item.fileName.S,
            uploadedAt: item.uploadedAt.S,
            size: parseInt(item.size.N)
        }));

        return {
            statusCode: 200,
            headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' },
            body: JSON.stringify(images)
        };
    } catch (error) {
        console.error(error);
        return {
            statusCode: 500,
            headers: { 'Access-Control-Allow-Origin': '*' },
            body: JSON.stringify({ error: error.message })
        };
    }
};
```

Click **Deploy**

### Function 3: getImage

1. **Create function** → `getImage` (same settings)
2. Add same Environment Variables
3. Add Code:

```javascript
import { DynamoDBClient, GetItemCommand } from '@aws-sdk/client-dynamodb';

const dynamoDB = new DynamoDBClient({ region: process.env.REGION });

export const handler = async (event) => {
    try {
        const imageId = event.pathParameters?.id;
        
        if (!imageId) {
            return {
                statusCode: 400,
                headers: { 'Access-Control-Allow-Origin': '*' },
                body: JSON.stringify({ error: 'Image ID required' })
            };
        }

        const result = await dynamoDB.send(new GetItemCommand({
            TableName: process.env.TABLE_NAME,
            Key: { imageId: { S: imageId } }
        }));

        if (!result.Item) {
            return {
                statusCode: 404,
                headers: { 'Access-Control-Allow-Origin': '*' },
                body: JSON.stringify({ error: 'Image not found' })
            };
        }

        const imageUrl = `https://${process.env.BUCKET_NAME}.s3.amazonaws.com/${result.Item.s3Key.S}`;

        return {
            statusCode: 200,
            headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' },
            body: JSON.stringify({
                imageId: result.Item.imageId.S,
                fileName: result.Item.fileName.S,
                uploadedAt: result.Item.uploadedAt.S,
                size: parseInt(result.Item.size.N),
                url: imageUrl
            })
        };
    } catch (error) {
        console.error(error);
        return {
            statusCode: 500,
            headers: { 'Access-Control-Allow-Origin': '*' },
            body: JSON.stringify({ error: error.message })
        };
    }
};
```

Click **Deploy**

---

## 🔗 Step 5: Create API Gateway

### Create REST API

1. Go to **API Gateway** → **Create API**
2. Choose **REST API** → **Build**
3. **API name:** `ImageUploadAPI`
4. **Endpoint type:** Regional
5. Click **Create API**

### Create Resources and Methods

#### Resource 1: /upload (POST)

1. **Actions** → **Create Resource**
2. **Resource name:** `upload` → **CORS:** ✅ Check
3. Click **Create Resource**
4. With `/upload` selected → **Actions** → **Create Method**
5. Select **POST** → ✅
6. **Integration type:** Lambda → **Use Lambda Proxy integration:** ✅ Check
7. **Lambda function:** `uploadImage`
8. Click **Save** → **OK**

#### Resource 2: /images (GET)

1. **Actions** → **Create Resource**
2. **Resource name:** `images` → **CORS:** ✅ Check
3. Click **Create Resource**
4. With `/images` selected → **Actions** → **Create Method**
5. Select **GET** → ✅
6. **Lambda function:** `listImages`
7. Click **Save**

#### Resource 3: /images/{id} (GET)

1. Select `/images` → **Actions** → **Create Resource**
2. **Resource name:** `id` → **Resource path:** `{id}` → **CORS:** ✅ Check
3. Click **Create Resource**
4. With `/{id}` selected → **Actions** → **Create Method**
5. Select **GET** → ✅
6. **Lambda function:** `getImage`
7. Click **Save**

### Deploy API

1. **Actions** → **Deploy API**
2. **Deployment stage:** `[New Stage]`
3. **Stage name:** `prod`
4. Click **Deploy**
5. **Copy Invoke URL** (e.g., `https://xxxx.execute-api.us-east-1.amazonaws.com/prod`)

---

## 👤 Step 6: Create IAM User for GitHub Actions

1. Go to **IAM** → **Users** → **Create user**
2. **User name:** `github-actions`
3. **Provide user access to AWS Management Console:** ❌ Uncheck
4. Click **Next**

### Attach Policies:

- ✅ `AmazonS3FullAccess`

5. Click **Next** → **Create user**

### Create Access Keys:

1. Click on user `github-actions`
2. **Security credentials** tab
3. **Access keys** → **Create access key**
4. **Use case:** Command Line Interface (CLI)
5. Click **Next** → **Create access key**
6. **Download .csv file** (contains Access Key ID and Secret Access Key)

---

## 🔐 Step 7: Add GitHub Secrets

1. Go to GitHub repository → **Settings** → **Secrets and variables** → **Actions**
2. Click **New repository secret**

| Secret Name | Value |
|-------------|-------|
| `AWS_ACCESS_KEY_ID` | Access Key ID from CSV |
| `AWS_SECRET_ACCESS_KEY` | Secret Access Key from CSV |

---

## 📁 Step 8: React Frontend Setup

### Create `.env` file in `frontend/` folder:

```
VITE_API_URL=https://your-api-id.execute-api.us-east-1.amazonaws.com/prod
```

### Sample `App.jsx`:

```jsx
import { useState, useEffect } from 'react'

const API_URL = import.meta.env.VITE_API_URL

function App() {
  const [images, setImages] = useState([])
  const [uploading, setUploading] = useState(false)

  useEffect(() => {
    fetch(`${API_URL}/images`)
      .then(r => r.json())
      .then(setImages)
  }, [])

  const handleUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return

    setUploading(true)
    const reader = new FileReader()
    reader.onload = async () => {
      const base64 = reader.result.split(',')[1]
      await fetch(`${API_URL}/upload`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ file: base64, fileName: file.name, contentType: file.type })
      })
      setUploading(false)
      window.location.reload()
    }
    reader.readAsDataURL(file)
  }

  return (
    <div>
      <h1>Image Upload</h1>
      <input type="file" onChange={handleUpload} disabled={uploading} />
      {images.map(img => (
        <div key={img.imageId}>
          <img src={`https://task-images-sharif.s3.amazonaws.com/${img.imageId}-${img.fileName}`} width="200" />
          <p>{img.fileName}</p>
        </div>
      ))}
    </div>
  )
}

export default App
```

---

## 🔄 Step 9: GitHub Actions Workflow

Create `.github/workflows/deploy-frontend.yml`:

```yaml
name: Deploy Frontend to S3

on:
  push:
    branches: [ main ]

jobs:
  deploy:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v4
      
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      
      - name: Install dependencies
        working-directory: ./frontend
        run: npm ci
      
      - name: Build frontend
        working-directory: ./frontend
        run: npx vite build
        env:
          VITE_API_URL: https://your-api-id.execute-api.us-east-1.amazonaws.com/prod
      
      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: us-east-1
      
      - name: Deploy to S3
        run: aws s3 sync frontend/dist/ s3://task-frontend-sharif/ --delete
```

---

## ✅ Final Checklist

- [ ] S3 bucket for images (private)
- [ ] S3 bucket for frontend (public + static hosting)
- [ ] DynamoDB table `ImageMetadata`
- [ ] IAM role `lambda-image-api-role`
- [ ] 3 Lambda functions (uploadImage, listImages, getImage)
- [ ] API Gateway with 3 endpoints
- [ ] IAM user `github-actions` with S3 access
- [ ] GitHub Secrets added
- [ ] React frontend with `.env` file
- [ ] GitHub Actions workflow

---

## 🌐 Live URLs After Deployment

| Resource | URL |
|----------|-----|
| **Frontend App** | `http://task-frontend-sharif.s3-website-us-east-1.amazonaws.com` |
| **API Gateway** | `https://your-api-id.execute-api.us-east-1.amazonaws.com/prod` |

---

## 🎉 You can now do Project 2 alone!

Save this guide and follow the steps whenever you need to recreate it.
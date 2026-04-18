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
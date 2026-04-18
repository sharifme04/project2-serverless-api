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
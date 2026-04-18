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
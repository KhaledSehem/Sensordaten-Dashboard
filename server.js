import express from 'express';
import fetch from 'node-fetch';
import cors from 'cors';

const app = express();
const PORT = 3000;

const url = 'https://us-east-1-1.aws.cloud2.influxdata.com';
const token = 'PLJ6xqkkj3rWlaf95D0Te4snPZVYxM6oeBNI9DuUjngntTDZcI9LiRukYWqIHEFmkZUWEKMncMa9OHp_CfZgDw==';
const org = 'Sensorik';
const bucket = 'Seria Daten';

app.use(cors());

// Endpoint to fetch sensor IDs
app.get('/sensors', async (req, res) => {
    const query = `from(bucket: "${bucket}") |> range(start: -1y) |> filter(fn: (r) => r._measurement == "sensor_data") |> keep(columns: ["sensor_id"]) |> distinct(column: "sensor_id")`;
    const headers = {
        'Authorization': `Token ${token}`,
        'Content-type': 'application/vnd.flux',
        'Accept': 'application/csv'
    };

    try {
        console.log('Fetching sensor IDs with query:', query); // Log the query
        const response = await fetch(`${url}/api/v2/query?org=${org}`, {
            method: 'POST',
            headers: headers,
            body: query
        });

        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }
        const text = await response.text();
        console.log('Fetched sensor IDs:', text); // Log the fetched data

        // Convert CSV to JSON
        const lines = text.trim().split('\n');
        const sensorIds = lines.slice(1).map(line => line.split(',')[3]); // Assuming sensor_id is in the 4th column
        res.json(sensorIds);
    } catch (error) {
        console.error('Error fetching sensor IDs:', error);
        res.status(500).json({ error: 'Error fetching sensor IDs', details: error.message });
    }
});

// Endpoint to fetch sensor data by ID
app.get('/sensor-data/:sensorId', async (req, res) => {
    const sensorId = encodeURIComponent(req.params.sensorId);
    const start = req.query.start ? new Date(req.query.start).toISOString() : '-1y';
    const end = req.query.end ? new Date(req.query.end).toISOString() : 'now()';
    const query = `from(bucket: "${bucket}") |> range(start: ${start}, stop: ${end}) |> filter(fn: (r) => r._measurement == "sensor_data" and r.sensor_id == "${sensorId}") |> pivot(rowKey:["_time"], columnKey: ["_field"], valueColumn: "_value") |> keep(columns: ["_time", "original_hex", "presence"])`;
    const headers = {
        'Authorization': `Token ${token}`,
        'Content-type': 'application/vnd.flux',
        'Accept': 'application/csv'
    };

    try {
        console.log('Fetching sensor data for ID', sensorId, 'with query:', query); // Log sensor ID and query
        const response = await fetch(`${url}/api/v2/query?org=${org}`, {
            method: 'POST',
            headers: headers,
            body: query
        });

        const text = await response.text(); // Always read the text, regardless of response status
        if (!response.ok) {
            console.error('Failed to fetch sensor data:', text); // Log the error response
            throw new Error(`HTTP error! Status: ${response.status} - ${text}`);
        }
        console.log('Fetched sensor data:', text); // Log the successful data

        // Convert CSV to JSON
        const lines = text.trim().split('\n');
        const headersLine = lines[0].split(',');
        const data = lines.slice(1).map(line => {
            const values = line.split(',');
            return headersLine.reduce((obj, header, index) => {
                obj[header] = values[index];
                return obj;
            }, {});
        });
        res.json(data);
    } catch (error) {
        console.error('Error querying sensor data:', error);
        res.status(500).json({ error: 'Error querying sensor data', details: error.message });
    }
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

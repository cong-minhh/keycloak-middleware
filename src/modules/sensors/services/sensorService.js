const { Kafka } = require('kafkajs');

class SensorService {
    constructor(kafkaConfig) {
        this.kafka = new Kafka({
            clientId: 'sensor-service',
            brokers: kafkaConfig.brokers || ['localhost:9092']
        });
        this.producer = this.kafka.producer();
        this.isConnected = false;
    }

    async connect() {
        if (!this.isConnected) {
            await this.producer.connect();
            this.isConnected = true;
        }
    }

    async disconnect() {
        if (this.isConnected) {
            await this.producer.disconnect();
            this.isConnected = false;
        }
    }

    async getSensorData() {
        // Simulated sensor data (replace with actual data source integration)
        return {
            robotId: 'robot-001',
            position: { x: Math.floor(Math.random() * 100), y: Math.floor(Math.random() * 100) },
            taskStatus: ['assigned', 'in_progress', 'completed'][Math.floor(Math.random() * 3)],
            timestamp: new Date().toISOString()
        };
    }

    validateSensorData(data) {
        const required = ['robotId', 'position', 'taskStatus'];
        const missing = required.filter(field => !data[field]);
        
        if (missing.length > 0) {
            throw new Error(`Missing required fields: ${missing.join(', ')}`);
        }

        if (typeof data.position !== 'object' || 
            typeof data.position.x !== 'number' || 
            typeof data.position.y !== 'number') {
            throw new Error('Invalid position format');
        }

        const validStatuses = ['assigned', 'in_progress', 'completed'];
        if (!validStatuses.includes(data.taskStatus)) {
            throw new Error('Invalid task status');
        }

        return true;
    }

    async recordSensorData(sensorData) {
        try {
            this.validateSensorData(sensorData);
            
            const data = {
                ...sensorData,
                timestamp: new Date().toISOString()
            };

            await this.connect();
            await this.producer.send({
                topic: 'sensor_data',
                messages: [{
                    key: data.robotId,
                    value: JSON.stringify(data)
                }]
            });

            return data;
        } catch (error) {
            throw new Error(`Failed to record sensor data: ${error.message}`);
        }
    }

    async getSensorHistory(robotId, timeRange = { start: null, end: null }) {
        // This would typically integrate with a time-series database
        // For now, return mock historical data
        const endTime = timeRange.end ? new Date(timeRange.end) : new Date();
        const startTime = timeRange.start ? new Date(timeRange.start) : new Date(endTime - 3600000); // Last hour by default

        return {
            robotId,
            readings: Array(5).fill(null).map((_, i) => ({
                timestamp: new Date(startTime.getTime() + (i * 720000)).toISOString(), // 12-minute intervals
                position: {
                    x: Math.floor(Math.random() * 100),
                    y: Math.floor(Math.random() * 100)
                },
                taskStatus: ['assigned', 'in_progress', 'completed'][Math.floor(Math.random() * 3)]
            }))
        };
    }
}

module.exports = SensorService;
import express from 'express';
import mongoose from 'mongoose';
import pino from 'pino';
import pinoHttp from 'pino-http';

const PORT = process.env.PORT || 3016;
const MONGO_URL = process.env.MONGO_URL || 'mongodb://localhost:27017/keephy_exports';
const logger = pino({ level: process.env.LOG_LEVEL || 'info' });

mongoose.set('strictQuery', true);
mongoose.connect(MONGO_URL).then(() => logger.info('Connected to MongoDB')).catch((e) => { logger.error(e); process.exit(1); });

const scheduleSchema = new mongoose.Schema({ tenantId: String, cron: String, target: String, active: Boolean, lastRunAt: Date, lastStatus: String }, { timestamps: true });
const Schedule = mongoose.model('Schedule', scheduleSchema);
const logSchema = new mongoose.Schema({ tenantId: String, scheduleId: String, status: String, info: {}, deliveredAt: Date }, { timestamps: true });
const DeliveryLog = mongoose.model('DeliveryLog', logSchema);

const app = express();
app.use(express.json());
app.use(pinoHttp({ logger }));

app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'export-scheduler-service' }));
app.get('/ready', (_req, res) => { const s = mongoose.connection.readyState; res.status(s === 1 ? 200 : 503).json({ ready: s === 1 }); });

// CRUD schedules (skeleton)
app.post('/schedules', async (req, res) => res.status(201).json(await Schedule.create(req.body || {})));
app.get('/schedules', async (req, res) => res.json(await Schedule.find(req.query).lean()));
app.get('/delivery-logs', async (req, res) => res.json(await DeliveryLog.find(req.query).sort({ createdAt: -1 }).limit(100).lean()));

app.listen(PORT, () => logger.info(`export-scheduler-service listening on ${PORT}`));



import express from 'express';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { db } from './db';

const app = express();
app.use(cors());
app.use(express.json());

const JWT_SECRET = 'supersecret_autospyc';

// Utility for queries
const runQuery = (query: string, params: any[] = []): Promise<any> => {
    return new Promise((resolve, reject) => {
        db.run(query, params, function (err) {
            if (err) reject(err);
            else resolve(this);
        });
    });
};

const getQuery = (query: string, params: any[] = []): Promise<any[]> => {
    return new Promise((resolve, reject) => {
        db.all(query, params, (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
        });
    });
};

// Middleware
const auth = (req: any, res: any, next: any) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'No token' });
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        next();
    } catch (e) {
        res.status(401).json({ error: 'Invalid token' });
    }
};

// --- AUTH ---
app.post('/api/register', async (req, res) => {
    try {
        const { name, email, password, role, lat, lng, slots_per_day } = req.body;
        const hash = await bcrypt.hash(password, 10);
        const result = await runQuery(
            'INSERT INTO users (name, email, password, role, lat, lng, slots_per_day) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [name, email, hash, role, lat, lng, role === 'vendor' ? (slots_per_day || 10) : null]
        );
        res.json({ success: true, id: result.lastID });
    } catch (e: any) {
        res.status(400).json({ error: e.message });
    }
});

app.post('/api/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const users = await getQuery('SELECT * FROM users WHERE email = ?', [email]);
        if (users.length === 0) return res.status(400).json({ error: 'User not found' });
        
        const user = users[0];
        const match = await bcrypt.compare(password, user.password);
        if (!match) return res.status(400).json({ error: 'Wrong password' });
        
        const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: '1d' });
        res.json({ token, user: { id: user.id, name: user.name, role: user.role } });
    } catch (e: any) {
        res.status(400).json({ error: e.message });
    }
});

// --- CUSTOMER APIs ---
// Search vendors/services
app.get('/api/search', auth, async (req, res) => {
    try {
        const query = req.query.q as string || '';
        const vtype = req.query.vtype as string || '';
        // In a real app we'd calculate distance based on lat/lng. For now just search by name.
        let sql = `
            SELECT s.*, u.name as vendor_name, u.lat, u.lng, u.slots_per_day 
            FROM services s 
            JOIN users u ON s.vendor_id = u.id 
            WHERE (s.name LIKE ? OR s.description LIKE ?)
        `;
        let params: any[] = [`%${query}%`, `%${query}%`];
        
        if (vtype && vtype !== 'both') {
            sql += ` AND (s.vehicle_type = ? OR s.vehicle_type = 'both')`;
            params.push(vtype);
        }

        const services = await getQuery(sql, params);
        res.json(services);
    } catch (e: any) {
        res.status(400).json({ error: e.message });
    }
});

app.post('/api/bookings', auth, async (req: any, res) => {
    try {
        const { vendor_id, service_id, date, slot_time } = req.body;
        const customer_id = req.user.id;
        await runQuery(
            'INSERT INTO bookings (customer_id, vendor_id, service_id, date, slot_time) VALUES (?, ?, ?, ?, ?)',
            [customer_id, vendor_id, service_id, date, slot_time]
        );
        res.json({ success: true });
    } catch (e: any) {
        res.status(400).json({ error: e.message });
    }
});

app.get('/api/customer/bookings', auth, async (req: any, res) => {
    try {
        const bookings = await getQuery(`
            SELECT b.*, s.name as service_name, u.name as vendor_name
            FROM bookings b
            JOIN services s ON b.service_id = s.id
            JOIN users u ON b.vendor_id = u.id
            WHERE b.customer_id = ?`, 
            [req.user.id]
        );
        res.json(bookings);
    } catch (e: any) {
        res.status(400).json({ error: e.message });
    }
});

// --- VENDOR APIs ---
app.get('/api/vendor/services', auth, async (req: any, res) => {
    try {
        const services = await getQuery('SELECT * FROM services WHERE vendor_id = ?', [req.user.id]);
        res.json(services);
    } catch (e: any) {
        res.status(400).json({ error: e.message });
    }
});

app.post('/api/vendor/services', auth, async (req: any, res) => {
    try {
        const { name, description, price, time_taken_minutes, vehicle_type } = req.body;
        await runQuery(
            'INSERT INTO services (vendor_id, name, description, price, time_taken_minutes, vehicle_type) VALUES (?, ?, ?, ?, ?, ?)',
            [req.user.id, name, description, price, time_taken_minutes, vehicle_type || 'both']
        );
        res.json({ success: true });
    } catch (e: any) {
        res.status(400).json({ error: e.message });
    }
});

app.get('/api/vendor/bookings', auth, async (req: any, res) => {
    try {
        const bookings = await getQuery(`
            SELECT b.*, s.name as service_name, u.name as customer_name
            FROM bookings b
            JOIN services s ON b.service_id = s.id
            JOIN users u ON b.customer_id = u.id
            WHERE b.vendor_id = ?`, 
            [req.user.id]
        );
        res.json(bookings);
    } catch (e: any) {
        res.status(400).json({ error: e.message });
    }
});

app.put('/api/vendor/bookings/:id', auth, async (req: any, res) => {
    try {
        const { status } = req.body;
        await runQuery('UPDATE bookings SET status = ? WHERE id = ? AND vendor_id = ?', [status, req.params.id, req.user.id]);
        res.json({ success: true });
    } catch (e: any) {
        res.status(400).json({ error: e.message });
    }
});

app.get('/api/vendor/slots/:date', auth, async (req: any, res) => {
    try {
        const date = req.params.date;
        const vendor_id = req.user.id;
        const bookings = await getQuery('SELECT count(*) as count FROM bookings WHERE vendor_id = ? AND date = ? AND status != "rejected"', [vendor_id, date]);
        const user = await getQuery('SELECT slots_per_day FROM users WHERE id = ?', [vendor_id]);
        const total = user[0]?.slots_per_day || 10;
        const booked = bookings[0].count;
        res.json({ total, booked, remaining: total - booked });
    } catch (e: any) {
        res.status(400).json({ error: e.message });
    }
});

app.get('/api/b2b/parts', auth, async (req, res) => {
    try {
        const parts = await getQuery(`
            SELECT p.*, u.name as distributor_name 
            FROM parts p 
            JOIN users u ON p.distributor_id = u.id
        `);
        res.json(parts);
    } catch (e: any) {
        res.status(400).json({ error: e.message });
    }
});

app.post('/api/b2b/orders', auth, async (req: any, res) => {
    try {
        const { distributor_id, part_id, quantity } = req.body;
        await runQuery(
            'INSERT INTO orders (vendor_id, distributor_id, part_id, quantity) VALUES (?, ?, ?, ?)',
            [req.user.id, distributor_id, part_id, quantity]
        );
        res.json({ success: true });
    } catch (e: any) {
        res.status(400).json({ error: e.message });
    }
});

// --- DISTRIBUTOR APIs ---
app.get('/api/distributor/parts', auth, async (req: any, res) => {
    try {
        const parts = await getQuery('SELECT * FROM parts WHERE distributor_id = ?', [req.user.id]);
        res.json(parts);
    } catch (e: any) {
        res.status(400).json({ error: e.message });
    }
});

app.post('/api/distributor/parts', auth, async (req: any, res) => {
    try {
        const { name, description, price, min_order_req, delivery_time_days, vehicle_type } = req.body;
        await runQuery(
            'INSERT INTO parts (distributor_id, name, description, price, min_order_req, delivery_time_days, vehicle_type) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [req.user.id, name, description, price, min_order_req, delivery_time_days, vehicle_type || 'both']
        );
        res.json({ success: true });
    } catch (e: any) {
        res.status(400).json({ error: e.message });
    }
});

app.get('/api/distributor/orders', auth, async (req: any, res) => {
    try {
        const orders = await getQuery(`
            SELECT o.*, p.name as part_name, u.name as vendor_name
            FROM orders o
            JOIN parts p ON o.part_id = p.id
            JOIN users u ON o.vendor_id = u.id
            WHERE o.distributor_id = ?`, 
            [req.user.id]
        );
        res.json(orders);
    } catch (e: any) {
        res.status(400).json({ error: e.message });
    }
});

app.put('/api/distributor/orders/:id', auth, async (req: any, res) => {
    try {
        const { status } = req.body;
        await runQuery('UPDATE orders SET status = ? WHERE id = ? AND distributor_id = ?', [status, req.params.id, req.user.id]);
        res.json({ success: true });
    } catch (e: any) {
        res.status(400).json({ error: e.message });
    }
});

const PORT = 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

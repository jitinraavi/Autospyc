import sqlite3 from 'sqlite3';
import path from 'path';

const dbPath = path.resolve(__dirname, '../autospyc.db');

export const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error opening database', err.message);
    } else {
        console.log('Connected to the SQLite database.');
        initDb();
    }
});

function initDb() {
    db.serialize(() => {
        // Users Table
        db.run(`CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            role TEXT NOT NULL CHECK(role IN ('customer', 'vendor', 'distributor')),
            lat REAL,
            lng REAL,
            slots_per_day INTEGER DEFAULT 10
        )`);

        // Services Table
        db.run(`CREATE TABLE IF NOT EXISTS services (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            vendor_id INTEGER NOT NULL,
            name TEXT NOT NULL,
            description TEXT,
            price REAL NOT NULL,
            time_taken_minutes INTEGER NOT NULL,
            vehicle_type TEXT,
            FOREIGN KEY(vendor_id) REFERENCES users(id)
        )`);

        // Bookings Table
        db.run(`CREATE TABLE IF NOT EXISTS bookings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            customer_id INTEGER NOT NULL,
            vendor_id INTEGER NOT NULL,
            service_id INTEGER NOT NULL,
            date TEXT NOT NULL,
            slot_time TEXT NOT NULL,
            status TEXT NOT NULL DEFAULT 'pending',
            FOREIGN KEY(customer_id) REFERENCES users(id),
            FOREIGN KEY(vendor_id) REFERENCES users(id),
            FOREIGN KEY(service_id) REFERENCES services(id)
        )`);

        // Parts Table (Distributor side)
        db.run(`CREATE TABLE IF NOT EXISTS parts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            distributor_id INTEGER NOT NULL,
            name TEXT NOT NULL,
            description TEXT,
            price REAL NOT NULL,
            min_order_req INTEGER NOT NULL DEFAULT 1,
            delivery_time_days INTEGER NOT NULL,
            vehicle_type TEXT,
            FOREIGN KEY(distributor_id) REFERENCES users(id)
        )`);

        // Orders Table (Vendor buying from Distributor)
        db.run(`CREATE TABLE IF NOT EXISTS orders (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            vendor_id INTEGER NOT NULL,
            distributor_id INTEGER NOT NULL,
            part_id INTEGER NOT NULL,
            quantity INTEGER NOT NULL,
            status TEXT NOT NULL DEFAULT 'pending',
            FOREIGN KEY(vendor_id) REFERENCES users(id),
            FOREIGN KEY(distributor_id) REFERENCES users(id),
            FOREIGN KEY(part_id) REFERENCES parts(id)
        )`);
    });
}

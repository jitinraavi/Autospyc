import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import axios from 'axios';

const API_URL = 'http://localhost:5000/api';

// --- AUTH COMPONENTS ---
const Login = ({ setAuth }: any) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const navigate = useNavigate();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const res = await axios.post(`${API_URL}/login`, { email, password });
            localStorage.setItem('token', res.data.token);
            localStorage.setItem('user', JSON.stringify(res.data.user));
            setAuth(res.data.user);
            navigate('/');
        } catch (err: any) {
            alert(err.response?.data?.error || 'Login failed');
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-100">
            <form onSubmit={handleLogin} className="bg-white p-8 rounded shadow-md w-96">
                <h2 className="text-2xl font-bold mb-4">Login to Autospyc</h2>
                <input type="email" placeholder="Email" className="w-full p-2 border mb-4 rounded" value={email} onChange={e => setEmail(e.target.value)} required />
                <input type="password" placeholder="Password" className="w-full p-2 border mb-4 rounded" value={password} onChange={e => setPassword(e.target.value)} required />
                <button type="submit" className="w-full bg-blue-500 text-white p-2 rounded">Login</button>
                <p className="mt-4 text-sm text-center">Don't have an account? <a href="/register" className="text-blue-500">Register</a></p>
            </form>
        </div>
    );
};

const Register = ({ setAuth }: any) => {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [role, setRole] = useState('customer');
    const navigate = useNavigate();

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await axios.post(`${API_URL}/register`, { name, email, password, role });
            navigate('/login');
        } catch (err: any) {
            alert(err.response?.data?.error || 'Registration failed');
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-100">
            <form onSubmit={handleRegister} className="bg-white p-8 rounded shadow-md w-96">
                <h2 className="text-2xl font-bold mb-4">Register for Autospyc</h2>
                <input type="text" placeholder="Name" className="w-full p-2 border mb-4 rounded" value={name} onChange={e => setName(e.target.value)} required />
                <input type="email" placeholder="Email" className="w-full p-2 border mb-4 rounded" value={email} onChange={e => setEmail(e.target.value)} required />
                <input type="password" placeholder="Password" className="w-full p-2 border mb-4 rounded" value={password} onChange={e => setPassword(e.target.value)} required />
                <select className="w-full p-2 border mb-4 rounded" value={role} onChange={e => setRole(e.target.value)}>
                    <option value="customer">Customer</option>
                    <option value="vendor">Vendor (Workshop)</option>
                    <option value="distributor">Distributor (Parts)</option>
                </select>
                <button type="submit" className="w-full bg-green-500 text-white p-2 rounded">Register</button>
                <p className="mt-4 text-sm text-center">Already have an account? <a href="/login" className="text-blue-500">Login</a></p>
            </form>
        </div>
    );
};

// --- CUSTOMER DASHBOARD ---
const CustomerDashboard = () => {
    const [search, setSearch] = useState('');
    const [services, setServices] = useState<any[]>([]);
    const [bookings, setBookings] = useState<any[]>([]);

    const fetchBookings = async () => {
        try {
            const res = await axios.get(`${API_URL}/customer/bookings`, {
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
            });
            setBookings(res.data);
        } catch (err) { console.error(err); }
    };

    useEffect(() => { fetchBookings(); }, []);

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const res = await axios.get(`${API_URL}/search?q=${search}`, {
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
            });
            setServices(res.data);
        } catch (err) { console.error(err); }
    };

    const bookAppointment = async (service: any) => {
        const date = prompt("Enter Date (YYYY-MM-DD):", new Date().toISOString().split('T')[0]);
        if (!date) return;
        const time = prompt("Enter Time (HH:MM):", "10:00");
        if (!time) return;

        try {
            await axios.post(`${API_URL}/bookings`, {
                vendor_id: service.vendor_id,
                service_id: service.id,
                date,
                slot_time: time
            }, {
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
            });
            alert('Booked successfully!');
            fetchBookings();
        } catch (err: any) {
            alert('Booking failed');
        }
    };

    return (
        <div className="p-8">
            <h1 className="text-3xl font-bold mb-6">Customer Dashboard</h1>
            
            <div className="mb-8 bg-white p-6 rounded shadow">
                <h2 className="text-xl font-bold mb-4">Find a Service</h2>
                <form onSubmit={handleSearch} className="flex gap-4">
                    <input type="text" placeholder="Search services (e.g., Oil Change, Brake Fix)" className="flex-1 p-2 border rounded" value={search} onChange={e => setSearch(e.target.value)} />
                    <button type="submit" className="bg-blue-500 text-white px-4 py-2 rounded">Search</button>
                </form>
                <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                    {services.map(s => (
                        <div key={s.id} className="border p-4 rounded flex justify-between items-center">
                            <div>
                                <h3 className="font-bold text-lg">{s.name}</h3>
                                <p className="text-sm text-gray-600">{s.description}</p>
                                <p className="text-sm font-semibold mt-2">Workshop: {s.vendor_name}</p>
                                <p className="text-sm">Price: ${s.price} | Time: {s.time_taken_minutes} mins</p>
                            </div>
                            <button onClick={() => bookAppointment(s)} className="bg-green-500 text-white px-4 py-2 rounded">Book</button>
                        </div>
                    ))}
                </div>
            </div>

            <div className="bg-white p-6 rounded shadow">
                <h2 className="text-xl font-bold mb-4">My Bookings</h2>
                <ul>
                    {bookings.map(b => (
                        <li key={b.id} className="border-b py-2 flex justify-between">
                            <span><strong>{b.service_name}</strong> at {b.vendor_name} ({b.date} {b.slot_time})</span>
                            <span className={`px-2 py-1 rounded text-white text-xs ${b.status === 'pending' ? 'bg-yellow-500' : b.status === 'accepted' ? 'bg-green-500' : 'bg-red-500'}`}>{b.status.toUpperCase()}</span>
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    );
};

// --- VENDOR DASHBOARD ---
const VendorDashboard = () => {
    const [services, setServices] = useState<any[]>([]);
    const [bookings, setBookings] = useState<any[]>([]);
    const [parts, setParts] = useState<any[]>([]);
    const [slots, setSlots] = useState<any>(null);

    const [newService, setNewService] = useState({ name: '', description: '', price: 0, time_taken_minutes: 30 });

    const token = localStorage.getItem('token');
    const headers = { Authorization: `Bearer ${token}` };

    const fetchData = async () => {
        try {
            const [srvRes, bkgRes, partsRes, slotsRes] = await Promise.all([
                axios.get(`${API_URL}/vendor/services`, { headers }),
                axios.get(`${API_URL}/vendor/bookings`, { headers }),
                axios.get(`${API_URL}/b2b/parts`, { headers }),
                axios.get(`${API_URL}/vendor/slots/${new Date().toISOString().split('T')[0]}`, { headers })
            ]);
            setServices(srvRes.data);
            setBookings(bkgRes.data);
            setParts(partsRes.data);
            setSlots(slotsRes.data);
        } catch (err) { console.error(err); }
    };

    useEffect(() => { fetchData(); }, []);

    const handleAddService = async (e: React.FormEvent) => {
        e.preventDefault();
        await axios.post(`${API_URL}/vendor/services`, newService, { headers });
        fetchData();
        setNewService({ name: '', description: '', price: 0, time_taken_minutes: 30 });
    };

    const updateBooking = async (id: number, status: string) => {
        await axios.put(`${API_URL}/vendor/bookings/${id}`, { status }, { headers });
        fetchData();
    };

    const orderPart = async (part: any) => {
        const qty = prompt(`Enter quantity (Min: ${part.min_order_req}):`, part.min_order_req.toString());
        if (!qty) return;
        await axios.post(`${API_URL}/b2b/orders`, { distributor_id: part.distributor_id, part_id: part.id, quantity: parseInt(qty) }, { headers });
        alert('Order placed!');
    };

    return (
        <div className="p-8">
            <h1 className="text-3xl font-bold mb-6">Vendor Dashboard</h1>
            
            {slots && (
                <div className="mb-6 p-4 bg-blue-100 rounded text-blue-800">
                    <p className="font-bold">Today's Slots (Date: {new Date().toISOString().split('T')[0]})</p>
                    <p>Total: {slots.total} | Booked: {slots.booked} | Remaining: {slots.remaining}</p>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                    <div className="bg-white p-6 rounded shadow mb-8">
                        <h2 className="text-xl font-bold mb-4">My Services</h2>
                        <form onSubmit={handleAddService} className="mb-4 flex flex-col gap-2">
                            <input type="text" placeholder="Service Name" className="border p-2" value={newService.name} onChange={e => setNewService({...newService, name: e.target.value})} required />
                            <input type="text" placeholder="Description" className="border p-2" value={newService.description} onChange={e => setNewService({...newService, description: e.target.value})} />
                            <div className="flex gap-2">
                                <input type="number" placeholder="Price" className="border p-2 w-1/2" value={newService.price} onChange={e => setNewService({...newService, price: parseFloat(e.target.value)})} required />
                                <input type="number" placeholder="Time (mins)" className="border p-2 w-1/2" value={newService.time_taken_minutes} onChange={e => setNewService({...newService, time_taken_minutes: parseInt(e.target.value)})} required />
                            </div>
                            <button className="bg-blue-500 text-white p-2 rounded">Add Service</button>
                        </form>
                        <ul>
                            {services.map(s => <li key={s.id} className="border-b py-1">{s.name} - ${s.price} ({s.time_taken_minutes}m)</li>)}
                        </ul>
                    </div>

                    <div className="bg-white p-6 rounded shadow">
                        <h2 className="text-xl font-bold mb-4">Bookings</h2>
                        <ul>
                            {bookings.map(b => (
                                <li key={b.id} className="border-b py-2">
                                    <p><strong>{b.service_name}</strong> for {b.customer_name} ({b.date} {b.slot_time}) - <span className="uppercase text-sm font-bold">{b.status}</span></p>
                                    {b.status === 'pending' && (
                                        <div className="mt-2 flex gap-2">
                                            <button onClick={() => updateBooking(b.id, 'accepted')} className="bg-green-500 text-white px-2 py-1 rounded text-sm">Accept</button>
                                            <button onClick={() => updateBooking(b.id, 'rejected')} className="bg-red-500 text-white px-2 py-1 rounded text-sm">Reject</button>
                                        </div>
                                    )}
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>

                <div className="bg-white p-6 rounded shadow">
                    <h2 className="text-xl font-bold mb-4">B2B: Buy Parts & Spares</h2>
                    <div className="grid grid-cols-1 gap-4">
                        {parts.map(p => (
                            <div key={p.id} className="border p-4 rounded">
                                <h3 className="font-bold">{p.name}</h3>
                                <p className="text-sm text-gray-600">{p.description}</p>
                                <p className="text-sm mt-1">Distributor: {p.distributor_name}</p>
                                <p className="text-sm font-semibold">Price: ${p.price} | Min Order: {p.min_order_req} | Delivery: {p.delivery_time_days} days</p>
                                <button onClick={() => orderPart(p)} className="mt-2 bg-purple-500 text-white px-4 py-1 rounded">Order</button>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

// --- DISTRIBUTOR DASHBOARD ---
const DistributorDashboard = () => {
    const [parts, setParts] = useState<any[]>([]);
    const [orders, setOrders] = useState<any[]>([]);
    const [newPart, setNewPart] = useState({ name: '', description: '', price: 0, min_order_req: 1, delivery_time_days: 1 });

    const token = localStorage.getItem('token');
    const headers = { Authorization: `Bearer ${token}` };

    const fetchData = async () => {
        try {
            const [pRes, oRes] = await Promise.all([
                axios.get(`${API_URL}/distributor/parts`, { headers }),
                axios.get(`${API_URL}/distributor/orders`, { headers })
            ]);
            setParts(pRes.data);
            setOrders(oRes.data);
        } catch (err) { console.error(err); }
    };

    useEffect(() => { fetchData(); }, []);

    const handleAddPart = async (e: React.FormEvent) => {
        e.preventDefault();
        await axios.post(`${API_URL}/distributor/parts`, newPart, { headers });
        fetchData();
        setNewPart({ name: '', description: '', price: 0, min_order_req: 1, delivery_time_days: 1 });
    };

    const updateOrder = async (id: number, status: string) => {
        await axios.put(`${API_URL}/distributor/orders/${id}`, { status }, { headers });
        fetchData();
    };

    return (
        <div className="p-8">
            <h1 className="text-3xl font-bold mb-6">Distributor Dashboard</h1>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="bg-white p-6 rounded shadow">
                    <h2 className="text-xl font-bold mb-4">My Parts Catalog</h2>
                    <form onSubmit={handleAddPart} className="mb-4 flex flex-col gap-2">
                        <input type="text" placeholder="Part Name" className="border p-2" value={newPart.name} onChange={e => setNewPart({...newPart, name: e.target.value})} required />
                        <input type="text" placeholder="Description" className="border p-2" value={newPart.description} onChange={e => setNewPart({...newPart, description: e.target.value})} />
                        <div className="flex gap-2">
                            <input type="number" placeholder="Price" className="border p-2 w-1/3" value={newPart.price} onChange={e => setNewPart({...newPart, price: parseFloat(e.target.value)})} required />
                            <input type="number" placeholder="Min Order" className="border p-2 w-1/3" value={newPart.min_order_req} onChange={e => setNewPart({...newPart, min_order_req: parseInt(e.target.value)})} required />
                            <input type="number" placeholder="Delivery (Days)" className="border p-2 w-1/3" value={newPart.delivery_time_days} onChange={e => setNewPart({...newPart, delivery_time_days: parseInt(e.target.value)})} required />
                        </div>
                        <button className="bg-purple-500 text-white p-2 rounded">Add Part</button>
                    </form>
                    <ul>
                        {parts.map(p => <li key={p.id} className="border-b py-1">{p.name} - ${p.price}</li>)}
                    </ul>
                </div>

                <div className="bg-white p-6 rounded shadow">
                    <h2 className="text-xl font-bold mb-4">Vendor Orders</h2>
                    <ul>
                        {orders.map(o => (
                            <li key={o.id} className="border-b py-2">
                                <p><strong>{o.part_name}</strong> (Qty: {o.quantity}) by {o.vendor_name} - <span className="uppercase text-sm font-bold">{o.status}</span></p>
                                {o.status === 'pending' && (
                                    <div className="mt-2 flex gap-2">
                                        <button onClick={() => updateOrder(o.id, 'shipped')} className="bg-green-500 text-white px-2 py-1 rounded text-sm">Ship</button>
                                    </div>
                                )}
                            </li>
                        ))}
                    </ul>
                </div>
            </div>
        </div>
    );
};

// --- APP ROUTER ---
const App = () => {
    const [user, setUser] = useState<any>(null);

    useEffect(() => {
        const storedUser = localStorage.getItem('user');
        if (storedUser) setUser(JSON.parse(storedUser));
    }, []);

    const logout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setUser(null);
    };

    return (
        <Router>
            <div className="min-h-screen flex flex-col">
                <header className="bg-gray-800 text-white p-4 flex justify-between items-center">
                    <h1 className="text-2xl font-bold">Autospyc</h1>
                    {user && (
                        <div className="flex gap-4 items-center">
                            <span>Welcome, {user.name} ({user.role})</span>
                            <button onClick={logout} className="bg-red-500 px-3 py-1 rounded text-sm">Logout</button>
                        </div>
                    )}
                </header>
                <main className="flex-1 bg-gray-50">
                    <Routes>
                        <Route path="/login" element={!user ? <Login setAuth={setUser} /> : <Navigate to="/" />} />
                        <Route path="/register" element={!user ? <Register setAuth={setUser} /> : <Navigate to="/" />} />
                        <Route path="/" element={
                            !user ? <Navigate to="/login" /> :
                            user.role === 'customer' ? <CustomerDashboard /> :
                            user.role === 'vendor' ? <VendorDashboard /> :
                            <DistributorDashboard />
                        } />
                    </Routes>
                </main>
            </div>
        </Router>
    );
};

export default App;

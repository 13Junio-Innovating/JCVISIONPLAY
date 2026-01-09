const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const { query, checkConnection } = require('./db.cjs');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const multer = require('multer');

const app = express();
const PORT = 3001;

app.use(cors());
app.use(bodyParser.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Configure Multer
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, 'uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname);
  }
});

const upload = multer({ storage: storage });

// Initialize Database
async function initDB() {
  const isConnected = await checkConnection();
  if (isConnected) {
    try {
      const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
      const statements = schema.split(';').filter(stmt => stmt.trim().length > 0);
      
      for (const statement of statements) {
        await query(statement);
      }
      console.log('Database schema initialized');
    } catch (error) {
      console.error('Error initializing database schema:', error);
    }
  }
}

initDB();

// --- AUTHENTICATION ---

app.post('/auth/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const users = await query('SELECT * FROM app_users WHERE email = ?', [email]);
    if (users.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    const user = users[0];
    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    res.json({
      user: {
        id: user.id,
        email: user.email,
        user_metadata: {
          full_name: user.full_name,
          avatar_url: user.avatar_url
        }
      },
      session: {
        access_token: 'dummy-jwt-token-' + user.id,
        user: {
            id: user.id,
            email: user.email
        }
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/*
app.post('/auth/signup', async (req, res) => {
    const { email, password, full_name } = req.body;
    try {
        const existing = await query('SELECT id FROM app_users WHERE email = ?', [email]);
        if (existing.length > 0) {
            return res.status(400).json({ error: 'User already exists' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const id = uuidv4();
        
        await query('INSERT INTO app_users (id, email, password_hash, full_name) VALUES (?, ?, ?, ?)', 
            [id, email, hashedPassword, full_name]);
        
        res.json({ user: { id, email, full_name } });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
*/

app.put('/auth/user', async (req, res) => {
    const { id, password } = req.body;
    if (!id) return res.status(400).json({ error: 'User ID required' });
    
    try {
        if (password) {
            const hashedPassword = await bcrypt.hash(password, 10);
            await query('UPDATE app_users SET password_hash = ? WHERE id = ?', [hashedPassword, id]);
        }
        res.json({ success: true });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// --- MEDIA ---

app.get('/api/media', async (req, res) => {
    try {
        const media = await query('SELECT * FROM media ORDER BY created_at DESC');
        res.json(media);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/media', upload.single('file'), async (req, res) => {
    const { name, type, duration, rotation, uploaded_by, url: providedUrl } = req.body;
    
    let url = providedUrl;
    
    if (!req.file && !providedUrl) {
        return res.status(400).json({ error: 'No file uploaded and no URL provided' });
    }

    const id = uuidv4();
    
    if (req.file) {
        // URL relative to the server
        url = `/uploads/${req.file.filename}`;
    }

    try {
        await query(
            'INSERT INTO media (id, name, url, type, duration, rotation, uploaded_by) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [id, name, url, type, duration, rotation, uploaded_by]
        );
        res.json({ id, name, url, type, duration, rotation, uploaded_by });
    } catch (error) {
        // Clean up file if database insert fails
        if (req.file) {
            fs.unlinkSync(req.file.path);
        }
        res.status(500).json({ error: error.message });
    }
});

app.delete('/api/media/:id', async (req, res) => {
    try {
        // Get media info first to delete file
        const media = await query('SELECT url FROM media WHERE id = ?', [req.params.id]);
        
        if (media.length > 0) {
            const url = media[0].url;
            // Check if it's a local file (starts with /uploads/)
            if (url && url.startsWith('/uploads/')) {
                const filePath = path.join(__dirname, url);
                if (fs.existsSync(filePath)) {
                    fs.unlinkSync(filePath);
                }
            }
        }

        await query('DELETE FROM media WHERE id = ?', [req.params.id]);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// --- PLAYLISTS ---

app.get('/api/playlists', async (req, res) => {
    try {
        const playlists = await query('SELECT * FROM playlists ORDER BY name');
        const parsed = playlists.map(p => ({
            ...p,
            items: typeof p.items === 'string' ? JSON.parse(p.items) : p.items
        }));
        res.json(parsed);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/playlists/:id', async (req, res) => {
    try {
        const playlists = await query('SELECT * FROM playlists WHERE id = ?', [req.params.id]);
        if (playlists.length === 0) return res.status(404).json({ error: 'Not found' });
        const p = playlists[0];
        p.items = typeof p.items === 'string' ? JSON.parse(p.items) : p.items;
        res.json(p);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/playlists', async (req, res) => {
    const { name, items, created_by } = req.body;
    const id = uuidv4();
    try {
        await query(
            'INSERT INTO playlists (id, name, items, created_by) VALUES (?, ?, ?, ?)',
            [id, name, JSON.stringify(items), created_by]
        );
        res.json({ id, name, items, created_by });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.put('/api/playlists/:id', async (req, res) => {
    const { name, items } = req.body;
    try {
        if (name) await query('UPDATE playlists SET name = ? WHERE id = ?', [name, req.params.id]);
        if (items) await query('UPDATE playlists SET items = ? WHERE id = ?', [JSON.stringify(items), req.params.id]);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.delete('/api/playlists/:id', async (req, res) => {
    try {
        await query('DELETE FROM playlists WHERE id = ?', [req.params.id]);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// --- SCREENS ---

app.get('/api/screens', async (req, res) => {
    try {
        const screens = await query('SELECT * FROM screens ORDER BY created_at DESC');
        res.json(screens);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/screens', async (req, res) => {
    const { name, player_key, created_by, assigned_playlist } = req.body;
    const id = uuidv4();
    try {
        if (!name || !created_by) {
            return res.status(400).json({ error: 'Missing required fields' });
        }
        let key = (player_key || '').toString().trim().toUpperCase();
        if (!key) {
            const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
            const gen = () => Array.from({ length: 6 }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join('');
            let exists = true;
            while (exists) {
                key = gen();
                const rows = await query('SELECT id FROM screens WHERE player_key = ?', [key]);
                exists = rows.length > 0;
            }
        } else {
            const rows = await query('SELECT id FROM screens WHERE player_key = ?', [key]);
            if (rows.length > 0) {
                return res.status(409).json({ error: 'Player key already in use' });
            }
        }
        await query(
            'INSERT INTO screens (id, name, player_key, created_by, assigned_playlist) VALUES (?, ?, ?, ?, ?)',
            [id, name, key, created_by, assigned_playlist || null]
        );
        res.json({ id, name, player_key: key });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.put('/api/screens/:id', async (req, res) => {
    const { name, assigned_playlist, last_seen } = req.body;
    const updates = [];
    const params = [];
    
    if (name) { updates.push('name = ?'); params.push(name); }
    if (assigned_playlist !== undefined) { updates.push('assigned_playlist = ?'); params.push(assigned_playlist); }
    if (last_seen) { updates.push('last_seen = ?'); params.push(last_seen); }
    
    if (updates.length === 0) return res.json({ success: true });
    
    params.push(req.params.id);
    
    try {
        await query(`UPDATE screens SET ${updates.join(', ')} WHERE id = ?`, params);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.delete('/api/screens/:id', async (req, res) => {
    try {
        await query('DELETE FROM screens WHERE id = ?', [req.params.id]);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// --- LOGS ---

app.post('/api/logs/activity', async (req, res) => {
    const { user_id, action, resource, resource_id, details, ip_address, user_agent } = req.body;
    try {
        await query(
            'INSERT INTO user_activity_logs (user_id, action, resource, resource_id, details, ip_address, user_agent) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [user_id, action, resource, resource_id, JSON.stringify(details), ip_address, user_agent]
        );
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/logs/activity', async (req, res) => {
    const { user_id, limit = 50, offset = 0 } = req.query;
    try {
        let sql = 'SELECT * FROM user_activity_logs';
        const params = [];
        
        if (user_id) {
            sql += ' WHERE user_id = ?';
            params.push(user_id);
        }
        
        sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
        params.push(parseInt(limit), parseInt(offset));
        
        const logs = await query(sql, params);
        const parsed = logs.map(log => ({
            ...log,
            details: typeof log.details === 'string' ? JSON.parse(log.details) : log.details
        }));
        res.json(parsed);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/logs/error', async (req, res) => {
    const { user_id, error_type, error_message, stack_trace, url, user_agent, ip_address, context, severity } = req.body;
    try {
        await query(
            'INSERT INTO error_logs (user_id, error_type, error_message, stack_trace, url, user_agent, ip_address, context, severity) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [user_id, error_type, error_message, stack_trace, url, user_agent, ip_address, JSON.stringify(context), severity]
        );
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/logs/error', async (req, res) => {
    const { user_id, limit = 50, offset = 0 } = req.query;
    try {
        let sql = 'SELECT * FROM error_logs';
        const params = [];
        
        if (user_id) {
            sql += ' WHERE (user_id = ? OR user_id IS NULL)';
            params.push(user_id);
        }
        
        sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
        params.push(parseInt(limit), parseInt(offset));
        
        const logs = await query(sql, params);
        const parsed = logs.map(log => ({
            ...log,
            context: typeof log.context === 'string' ? JSON.parse(log.context) : log.context
        }));
        res.json(parsed);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.put('/api/logs/error/:id/resolve', async (req, res) => {
    try {
        await query('UPDATE error_logs SET resolved = TRUE WHERE id = ?', [req.params.id]);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/logs/stats', async (req, res) => {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const weekAgo = new Date(today);
        weekAgo.setDate(weekAgo.getDate() - 7);

        const activities = await query('SELECT created_at FROM user_activity_logs WHERE created_at >= ?', [weekAgo]);
        const errors = await query('SELECT created_at, resolved FROM error_logs WHERE created_at >= ?', [weekAgo]);

        const stats = {
            user_activities_today: activities.filter(a => new Date(a.created_at) >= today).length,
            user_activities_week: activities.length,
            errors_today: errors.filter(e => new Date(e.created_at) >= today).length,
            errors_week: errors.length,
            unresolved_errors: errors.filter(e => !e.resolved).length
        };
        
        res.json(stats);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// --- SCHEDULED TASKS ---

// Check every hour if it's Saturday and clean logs
setInterval(async () => {
    const now = new Date();
    // 6 = Saturday. Run only at 3 AM to avoid running every hour of Saturday
    if (now.getDay() === 6 && now.getHours() === 3) {
        console.log('Running scheduled log cleanup...');
        try {
            await query('DELETE FROM user_activity_logs');
            await query('DELETE FROM error_logs');
            console.log('Logs cleaned successfully.');
        } catch (error) {
            console.error('Error cleaning logs:', error);
        }
    }
}, 60 * 60 * 1000); // Check every hour

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

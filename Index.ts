import express, { Request, Response } from 'express';
import mysql from 'mysql2/promise';
import session from 'express-session';
import bodyParser from 'body-parser';
import axios from 'axios';
import multer from 'multer';
import path from 'path';
import cors from 'cors';
import crypto from 'crypto';

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));
app.use(session({
  secret: 'dewata-nationrp-secret-key-2024',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false, maxAge: 24 * 60 * 60 * 1000 }
}));

// Multer setup for file uploads
const storage = multer.diskStorage({
  destination: './public/uploads/',
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  }
});
const upload = multer({ storage });

// Database configuration
const dbConfig = {
  host: process.env.MYSQL_HOST || "208.84.103.75",
  user: process.env.MYSQL_USER || "u1649_NtHPQzNRvz",
  password: process.env.MYSQL_PASSWORD || "qJHEEZZraPLuQGGOtHPSvWT=",
  database: process.env.MYSQL_DATABASE || "s1649_Dewata",
  port: parseInt(process.env.MYSQL_PORT || "3306")
};

// Create database connection pool
const pool = mysql.createPool({
  ...dbConfig,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// MD5 Hash function
function MD5_Hash(str: string): string {
  return crypto.createHash('md5').update(str).digest('hex');
}

// Hashit function (dari SAMP)
function hashit(salt: string, password: string): string {
  const step3 = MD5_Hash(salt) + MD5_Hash(password);
  const step4 = MD5_Hash(step3.toLowerCase());
  return step4.toLowerCase();
}

// Session type declaration
declare module 'express-session' {
  interface SessionData {
    user?: {
      username: string;
      id: number;
    };
    loginTime?: number;
  }
}

// Initialize database tables
async function initDatabase() {
  const connection = await pool.getConnection();
  try {
    // Create whitelist_player table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS whitelist_player (
        id INT AUTO_INCREMENT PRIMARY KEY,
        Name VARCHAR(50) UNIQUE NOT NULL,
        phone VARCHAR(20) UNIQUE NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create admins_website table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS admins_website (
        id INT AUTO_INCREMENT PRIMARY KEY,
        aName VARCHAR(50) UNIQUE NOT NULL,
        aLevel INT NOT NULL,
        aKey VARCHAR(100) NOT NULL
      )
    `);

    // Create marketplace table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS marketplace (
        id INT AUTO_INCREMENT PRIMARY KEY,
        photo_url VARCHAR(255),
        username VARCHAR(50) NOT NULL,
        product_name VARCHAR(100) NOT NULL,
        product_type ENUM('legal', 'illegal') NOT NULL,
        price INT NOT NULL,
        phone VARCHAR(20) NOT NULL,
        samp_id INT NOT NULL,
        status ENUM('active', 'sold') DEFAULT 'active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_status (status)
      )
    `);

    // Create market_digital table for houses, business, vehicles, motorcycles
    await connection.query(`
      CREATE TABLE IF NOT EXISTS market_digital (
        id INT AUTO_INCREMENT PRIMARY KEY,
        photo_url VARCHAR(255),
        username VARCHAR(50) NOT NULL,
        asset_name VARCHAR(100) NOT NULL,
        asset_type ENUM('house', 'business', 'vehicle', 'motorcycle') NOT NULL,
        description TEXT,
        price INT NOT NULL,
        location VARCHAR(255),
        phone VARCHAR(20) NOT NULL,
        samp_id INT NOT NULL,
        features JSON,
        status ENUM('active', 'sold', 'reserved') DEFAULT 'active',
        views INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_asset_type (asset_type),
        INDEX idx_status (status),
        INDEX idx_price (price)
      )
    `);

    // Create item_templates table (for admin item manager)
    await connection.query(`
      CREATE TABLE IF NOT EXISTS item_templates (
        id INT AUTO_INCREMENT PRIMARY KEY,
        item_code VARCHAR(50) UNIQUE NOT NULL,
        item_name VARCHAR(100) NOT NULL,
        item_category ENUM('legal', 'illegal') NOT NULL,
        item_type VARCHAR(50),
        icon_url VARCHAR(255),
        description TEXT,
        max_limit INT DEFAULT 999,
        is_tradeable BOOLEAN DEFAULT TRUE,
        rarity ENUM('common', 'uncommon', 'rare', 'epic', 'legendary') DEFAULT 'common',
        base_price INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

    // Create item_spawn_history table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS item_spawn_history (
        id INT AUTO_INCREMENT PRIMARY KEY,
        item_code VARCHAR(50) NOT NULL,
        username VARCHAR(50) NOT NULL,
        quantity INT NOT NULL,
        spawned_by VARCHAR(50) NOT NULL,
        reason VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_item_code (item_code),
        INDEX idx_username (username)
      )
    `);

    // Insert default item templates
    await connection.query(`
      INSERT IGNORE INTO item_templates (item_code, item_name, item_category, item_type, max_limit, rarity, base_price) VALUES
      ('pBatu', 'Batu Bersih', 'legal', 'resource', 999, 'common', 5000),
      ('pBatuk', 'Batu Kotor', 'legal', 'resource', 999, 'common', 3000),
      ('pFish', 'Ikan Biasa', 'legal', 'food', 999, 'common', 2000),
      ('pPenyu', 'Penyu', 'legal', 'food', 999, 'uncommon', 15000),
      ('pDolphin', 'Dolphin', 'legal', 'food', 999, 'rare', 25000),
      ('pHiu', 'Ikan Hiu', 'legal', 'food', 999, 'rare', 30000),
      ('pMegalodon', 'Ikan Megalodon', 'legal', 'food', 999, 'legendary', 100000),
      ('pCaught', 'Cacing/Umpan', 'legal', 'tool', 999, 'common', 500),
      ('pPadi', 'Padi', 'legal', 'resource', 999, 'common', 3000),
      ('pAyam', 'Ayam', 'legal', 'food', 999, 'common', 5000),
      ('pSemen', 'Semen', 'legal', 'resource', 999, 'common', 8000),
      ('pEmas', 'Emas', 'legal', 'valuable', 500, 'epic', 50000),
      ('pSusu', 'Susu', 'legal', 'food', 999, 'common', 4000),
      ('pMinyak', 'Minyak', 'legal', 'resource', 999, 'uncommon', 10000),
      ('pDrugs', 'Drugs', 'illegal', 'narcotics', 100, 'rare', 100000),
      ('pMicin', 'Marijuana', 'illegal', 'narcotics', 100, 'rare', 80000),
      ('pSteroid', 'Steroid', 'illegal', 'narcotics', 50, 'epic', 150000),
      ('pComponent', 'Component', 'illegal', 'material', 200, 'uncommon', 20000)
    `);

    // Create global_chat table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS global_chat (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(50) NOT NULL,
        message TEXT NOT NULL,
        photo_url VARCHAR(255),
        video_url VARCHAR(255),
        reply_to INT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create private_chat table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS private_chat (
        id INT AUTO_INCREMENT PRIMARY KEY,
        sender VARCHAR(50) NOT NULL,
        receiver VARCHAR(50) NOT NULL,
        message TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create guides table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS guides (
        id INT AUTO_INCREMENT PRIMARY KEY,
        guide_name VARCHAR(100) UNIQUE NOT NULL,
        captain VARCHAR(50) NOT NULL,
        representative1 VARCHAR(50),
        representative2 VARCHAR(50),
        max_members INT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create guide_members table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS guide_members (
        id INT AUTO_INCREMENT PRIMARY KEY,
        guide_id INT NOT NULL,
        username VARCHAR(50) NOT NULL,
        role ENUM('captain', 'representative', 'member') NOT NULL,
        FOREIGN KEY (guide_id) REFERENCES guides(id) ON DELETE CASCADE
      )
    `);

    // Create guide_invites table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS guide_invites (
        id INT AUTO_INCREMENT PRIMARY KEY,
        guide_id INT NOT NULL,
        username VARCHAR(50) NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (guide_id) REFERENCES guides(id) ON DELETE CASCADE
      )
    `);

    // Create guide_chat table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS guide_chat (
        id INT AUTO_INCREMENT PRIMARY KEY,
        guide_id INT NOT NULL,
        username VARCHAR(50) NOT NULL,
        message TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (guide_id) REFERENCES guides(id) ON DELETE CASCADE
      )
    `);

    // Create transfer_history table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS transfer_history (
        id INT AUTO_INCREMENT PRIMARY KEY,
        sender VARCHAR(50) NOT NULL,
        receiver VARCHAR(50) NOT NULL,
        amount INT NOT NULL,
        transfer_type ENUM('pCash', 'pBank') NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create otp_codes table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS otp_codes (
        id INT AUTO_INCREMENT PRIMARY KEY,
        phone VARCHAR(20) NOT NULL,
        code VARCHAR(6) NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create blacklist table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS blacklist (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(50) NOT NULL,
        blocked_user VARCHAR(50) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create last_message table for delay
    await connection.query(`
      CREATE TABLE IF NOT EXISTS last_message (
        username VARCHAR(50) PRIMARY KEY,
        last_sent TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create faction_members table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS faction_members (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(50) NOT NULL UNIQUE,
        faction ENUM('godside', 'badside') NOT NULL,
        job ENUM('police', 'hospital', 'sannews', 'trader', 'grove', 'ballas', 'vagos', 'aztecaz', 'riffa') NOT NULL,
        rank ENUM('leader', 'co_leader', 'member') DEFAULT 'member',
        invited_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        is_online BOOLEAN DEFAULT FALSE,
        last_active TIMESTAMP NULL,
        INDEX idx_faction (faction),
        INDEX idx_job (job),
        INDEX idx_rank (rank),
        INDEX idx_username (username)
      )
    `);

    // Create faction_chat table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS faction_chat (
        id INT AUTO_INCREMENT PRIMARY KEY,
        job ENUM('police', 'hospital', 'sannews', 'trader', 'grove', 'ballas', 'vagos', 'aztecaz', 'riffa') NOT NULL,
        username VARCHAR(50) NOT NULL,
        message TEXT NOT NULL,
        message_type ENUM('text', 'photo', 'video') DEFAULT 'text',
        media_url VARCHAR(500),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_job (job),
        INDEX idx_username (username),
        INDEX idx_created (created_at DESC)
      )
    `);

    console.log('Database tables initialized successfully');
  } catch (error) {
    console.error('Error initializing database:', error);
  } finally {
    connection.release();
  }
}

// Check if username format is valid
function isValidUsername(username: string): boolean {
  const regex = /^[A-Z][a-z]+_[A-Z][a-z]+$/;
  return regex.test(username);
}

// Check if phone format is valid
function isValidPhone(phone: string): boolean {
  return phone.startsWith('628') && phone.length >= 10;
}

// Send OTP via Fonnte
async function sendOTP(phone: string, code: string): Promise<boolean> {
  try {
    const response = await axios.post('https://api.fonnte.com/send', {
      target: phone,
      message: `Kode OTP Dewata NationRP: ${code}\nKode akan expired dalam 5 menit.`,
      countryCode: '62'
    }, {
      headers: {
        'Authorization': 'rAi9rzrezVBFFfe5w1Gp'
      }
    });
    return response.data.status === true;
  } catch (error) {
    console.error('Error sending OTP:', error);
    return false;
  }
}

// API Routes

// Register - Send OTP
app.post('/api/register/send-otp', async (req: Request, res: Response) => {
  const { username, phone } = req.body;

  if (!isValidUsername(username)) {
    return res.json({ success: false, message: 'Format username salah! Harus seperti: Renzy_Takashi' });
  }

  if (!isValidPhone(phone)) {
    return res.json({ success: false, message: 'Nomor WhatsApp harus diawali dengan 628' });
  }

  const connection = await pool.getConnection();
  try {
    // Check if username already exists in whitelist
    const [existingUser]: any = await connection.query(
      'SELECT * FROM whitelist_player WHERE Name = ?',
      [username]
    );

    if (existingUser.length > 0) {
      return res.json({ success: false, message: 'Username sudah terdaftar!' });
    }

    // Check if phone already exists in whitelist
    const [existingPhone]: any = await connection.query(
      'SELECT * FROM whitelist_player WHERE phone = ?',
      [phone]
    );

    if (existingPhone.length > 0) {
      return res.json({ success: false, message: 'Nomor WhatsApp sudah terdaftar!' });
    }

    // Generate 6 digit OTP
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();

    // Send OTP
    const sent = await sendOTP(phone, otpCode);
    if (!sent) {
      return res.json({ success: false, message: 'Gagal mengirim OTP' });
    }

    // Delete old OTP for this phone first
    await connection.query('DELETE FROM otp_codes WHERE phone = ?', [phone]);

    // Save OTP - biarkan MySQL yang hitung expires_at agar timezone konsisten
    await connection.query(
      'INSERT INTO otp_codes (phone, code, expires_at) VALUES (?, ?, DATE_ADD(NOW(), INTERVAL 5 MINUTE))',
      [phone, otpCode]
    );

    res.json({ success: true, message: 'OTP telah dikirim ke WhatsApp Anda' });
  } catch (error) {
    console.error('Error sending OTP:', error);
    res.json({ success: false, message: 'Terjadi kesalahan server' });
  } finally {
    connection.release();
  }
});

// Register - Verify OTP
app.post('/api/register/verify-otp', async (req: Request, res: Response) => {
  const { username, phone, otp } = req.body;

  const connection = await pool.getConnection();
  try {
    // Gunakan TIMESTAMPDIFF langsung di MySQL agar tidak ada konversi timezone dari Node.js
    // Kalau sisa waktu >= 0 berarti belum expired
    const [otpRows]: any = await connection.query(
      `SELECT *,
        TIMESTAMPDIFF(SECOND, NOW(), expires_at) AS seconds_left
       FROM otp_codes
       WHERE phone = ? AND code = ?
       ORDER BY created_at DESC
       LIMIT 1`,
      [phone, otp]
    );

    if (otpRows.length === 0) {
      // Bisa salah kode atau belum kirim OTP — bedain pesannya
      const [phoneRows]: any = await connection.query(
        'SELECT 1 FROM otp_codes WHERE phone = ? LIMIT 1',
        [phone]
      );
      if (phoneRows.length > 0) {
        return res.json({ success: false, message: 'Kode OTP salah! Periksa kembali kode yang dikirim.' });
      }
      return res.json({ success: false, message: 'Tidak ada OTP untuk nomor ini. Silakan kirim ulang.' });
    }

    const secondsLeft = otpRows[0].seconds_left;

    // seconds_left < 0 berarti sudah melewati expires_at
    if (secondsLeft < 0) {
      await connection.query('DELETE FROM otp_codes WHERE phone = ?', [phone]);
      return res.json({ success: false, message: 'Kode OTP sudah expired! Silakan kirim ulang kode OTP.' });
    }

    // OTP valid — daftarkan ke whitelist
    await connection.query(
      'INSERT INTO whitelist_player (Name, phone) VALUES (?, ?)',
      [username, phone]
    );

    // Hapus OTP yang sudah dipakai
    await connection.query('DELETE FROM otp_codes WHERE phone = ?', [phone]);

    res.json({ success: true, message: 'Registrasi berhasil! Silakan login.' });
  } catch (error) {
    console.error('Error verifying OTP:', error);
    res.json({ success: false, message: 'Terjadi kesalahan server' });
  } finally {
    connection.release();
  }
});

// Login
app.post('/api/login', async (req: Request, res: Response) => {
  const { username, password } = req.body;

  const connection = await pool.getConnection();
  try {
    // Check if user exists in accounts
    const [users]: any = await connection.query(
      'SELECT * FROM accounts WHERE pName = ?',
      [username]
    );

    if (users.length === 0) {
      return res.json({ success: false, message: 'Username tidak ditemukan!' });
    }

    const user = users[0];

    // Check if password is set
    if (!user.pPassword || user.pPassword === '') {
      return res.json({ success: false, message: 'Password belum di-set! Silakan hubungi admin.' });
    }

    // Verify password using hashit
    const hashedPassword = hashit(user.pass_salt, password);
    if (hashedPassword !== user.pPassword) {
      return res.json({ success: false, message: 'Password salah!' });
    }

    // Check if already logged in (dual account detection)
    if (req.session.user && req.session.user.username === username) {
      return res.json({ success: false, message: 'Akun ini sudah login!' });
    }

    // Set session
    req.session.user = {
      username: user.pName,
      id: user.pID
    };
    req.session.loginTime = Date.now();

    res.json({ success: true, message: 'Login berhasil!', username: user.pName });
  } catch (error) {
    console.error('Error logging in:', error);
    res.json({ success: false, message: 'Terjadi kesalahan server' });
  } finally {
    connection.release();
  }
});

// Logout
app.post('/api/logout', (req: Request, res: Response) => {
  req.session.destroy((err) => {
    if (err) {
      return res.json({ success: false, message: 'Gagal logout' });
    }
    res.json({ success: true, message: 'Logout berhasil' });
  });
});

// Get current user
app.get('/api/user', (req: Request, res: Response) => {
  if (!req.session.user) {
    return res.json({ loggedIn: false });
  }
  res.json({ loggedIn: true, username: req.session.user.username });
});

// Get account info
app.get('/api/account-info', async (req: Request, res: Response) => {
  if (!req.session.user) {
    return res.json({ success: false, message: 'Not logged in' });
  }

  const connection = await pool.getConnection();
  try {
    const [users]: any = await connection.query(
      `SELECT pID, pName, pLevel, pCash, pBank, pMaskID, 
              pBatu, pBatuk, pFish, pPenyu, pDolphin, pHiu, pMegalodon, pCaught,
              pPadi, pAyam, pSemen, pEmas, pSusu, pMinyak,
              pDrugs, pMicin, pSteroid, pComponent
       FROM accounts WHERE pName = ?`,
      [req.session.user.username]
    );

    if (users.length === 0) {
      return res.json({ success: false, message: 'User not found' });
    }

    res.json({ success: true, data: users[0] });
  } catch (error) {
    console.error('Error fetching account info:', error);
    res.json({ success: false, message: 'Server error' });
  } finally {
    connection.release();
  }
});

// Check if user is admin
app.get('/api/check-admin', async (req: Request, res: Response) => {
  if (!req.session.user) {
    return res.json({ isAdmin: false });
  }

  const connection = await pool.getConnection();
  try {
    const [admins]: any = await connection.query(
      'SELECT aLevel FROM admins_website WHERE aName = ?',
      [req.session.user.username]
    );

    res.json({ isAdmin: admins.length > 0, level: admins.length > 0 ? admins[0].aLevel : 0 });
  } catch (error) {
    res.json({ isAdmin: false });
  } finally {
    connection.release();
  }
});

// Verify admin key
app.post('/api/verify-admin-key', async (req: Request, res: Response) => {
  if (!req.session.user) {
    return res.json({ success: false, message: 'Not logged in' });
  }

  const { key } = req.body;
  const connection = await pool.getConnection();
  try {
    const [admins]: any = await connection.query(
      'SELECT * FROM admins_website WHERE aName = ? AND aKey = ?',
      [req.session.user.username, key]
    );

    if (admins.length === 0) {
      return res.json({ success: false, message: 'Key salah!' });
    }

    res.json({ success: true, level: admins[0].aLevel });
  } catch (error) {
    res.json({ success: false, message: 'Server error' });
  } finally {
    connection.release();
  }
});

// Marketplace - Create Product
app.post('/api/marketplace/create', upload.single('photo'), async (req: Request, res: Response) => {
  if (!req.session.user) {
    return res.json({ success: false, message: 'Not logged in' });
  }

  const { product_name, product_type, price, phone, samp_id } = req.body;
  const photo_url = req.file ? `/uploads/${req.file.filename}` : null;

  if (parseInt(price) < 5000000 || parseInt(price) > 300000000) {
    return res.json({ success: false, message: 'Harga harus antara 5jt - 300jt' });
  }

  const connection = await pool.getConnection();
  try {
    await connection.query(
      'INSERT INTO marketplace (photo_url, username, product_name, product_type, price, phone, samp_id) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [photo_url, req.session.user.username, product_name, product_type, price, phone, samp_id]
    );

    res.json({ success: true, message: 'Produk berhasil ditambahkan!' });
  } catch (error) {
    console.error('Error creating product:', error);
    res.json({ success: false, message: 'Server error' });
  } finally {
    connection.release();
  }
});

// Marketplace - Get Products
app.get('/api/marketplace', async (req: Request, res: Response) => {
  const { type, search } = req.query;
  const connection = await pool.getConnection();
  try {
    let query = 'SELECT * FROM marketplace WHERE 1=1';
    const params: any[] = [];

    if (type && type !== 'all') {
      query += ' AND product_type = ?';
      params.push(type);
    }

    if (search) {
      query += ' AND product_name LIKE ?';
      params.push(`%${search}%`);
    }

    query += ' ORDER BY created_at DESC';

    const [products] = await connection.query(query, params);
    res.json({ success: true, products });
  } catch (error) {
    res.json({ success: false, message: 'Server error' });
  } finally {
    connection.release();
  }
});

// Global Chat - Send Message
app.post('/api/chat/global/send', async (req: Request, res: Response) => {
  if (!req.session.user) {
    return res.json({ success: false, message: 'Not logged in' });
  }

  const { message, reply_to } = req.body;
  const username = req.session.user.username;

  const connection = await pool.getConnection();
  try {
    // Check last message time (3 seconds delay)
    const [lastMsg]: any = await connection.query(
      'SELECT * FROM last_message WHERE username = ? AND last_sent > DATE_SUB(NOW(), INTERVAL 3 SECOND)',
      [username]
    );

    if (lastMsg.length > 0) {
      return res.json({ success: false, message: 'Tunggu 3 detik untuk mengirim pesan lagi!' });
    }

    // Insert message
    await connection.query(
      'INSERT INTO global_chat (username, message, reply_to) VALUES (?, ?, ?)',
      [username, message, reply_to || null]
    );

    // Update last message time
    await connection.query(
      'INSERT INTO last_message (username, last_sent) VALUES (?, NOW()) ON DUPLICATE KEY UPDATE last_sent = NOW()',
      [username]
    );

    res.json({ success: true, message: 'Pesan terkirim!' });
  } catch (error) {
    console.error('Error sending message:', error);
    res.json({ success: false, message: 'Server error' });
  } finally {
    connection.release();
  }
});

// Global Chat - Get Messages
app.get('/api/chat/global', async (req: Request, res: Response) => {
  const connection = await pool.getConnection();
  try {
    const [messages]: any = await connection.query(`
      SELECT gc.*, 
             COALESCE(
               (SELECT aLevel FROM admins_website WHERE aName = gc.username),
               0
             ) as admin_level
      FROM global_chat gc
      ORDER BY created_at DESC
      LIMIT 100
    `);

    res.json({ success: true, messages });
  } catch (error) {
    res.json({ success: false, message: 'Server error' });
  } finally {
    connection.release();
  }
});

// Global Chat - Clear All
app.post('/api/chat/global/clear', async (req: Request, res: Response) => {
  if (!req.session.user) {
    return res.json({ success: false, message: 'Not logged in' });
  }

  const connection = await pool.getConnection();
  try {
    await connection.query('DELETE FROM global_chat');
    res.json({ success: true, message: 'Semua chat global telah dihapus!' });
  } catch (error) {
    res.json({ success: false, message: 'Server error' });
  } finally {
    connection.release();
  }
});

// Transfer - Send Money
app.post('/api/transfer/send', async (req: Request, res: Response) => {
  if (!req.session.user) {
    return res.json({ success: false, message: 'Not logged in' });
  }

  const { receiver, amount, transfer_type } = req.body;
  const sender = req.session.user.username;

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    // Check if receiver exists
    const [receivers]: any = await connection.query(
      'SELECT * FROM accounts WHERE pName = ?',
      [receiver]
    );

    if (receivers.length === 0) {
      await connection.rollback();
      return res.json({ success: false, message: 'Penerima tidak ditemukan!' });
    }

    // Check sender balance
    const [senders]: any = await connection.query(
      'SELECT * FROM accounts WHERE pName = ?',
      [sender]
    );

    const senderData = senders[0];
    const currentBalance = transfer_type === 'pCash' ? senderData.pCash : senderData.pBank;

    if (currentBalance < amount) {
      await connection.rollback();
      return res.json({ success: false, message: 'Saldo tidak cukup!' });
    }

    // Deduct from sender
    const deductField = transfer_type === 'pCash' ? 'pCash' : 'pBank';
    await connection.query(
      `UPDATE accounts SET ${deductField} = ${deductField} - ? WHERE pName = ?`,
      [amount, sender]
    );

    // Add to receiver
    await connection.query(
      `UPDATE accounts SET ${deductField} = ${deductField} + ? WHERE pName = ?`,
      [amount, receiver]
    );

    // Record transfer history
    await connection.query(
      'INSERT INTO transfer_history (sender, receiver, amount, transfer_type) VALUES (?, ?, ?, ?)',
      [sender, receiver, amount, transfer_type]
    );

    await connection.commit();
    res.json({ success: true, message: 'Transfer berhasil!' });
  } catch (error) {
    await connection.rollback();
    console.error('Error transferring:', error);
    res.json({ success: false, message: 'Server error' });
  } finally {
    connection.release();
  }
});

// Transfer - Get History Sent
app.get('/api/transfer/history-sent', async (req: Request, res: Response) => {
  if (!req.session.user) {
    return res.json({ success: false, message: 'Not logged in' });
  }

  const connection = await pool.getConnection();
  try {
    const [history] = await connection.query(
      'SELECT * FROM transfer_history WHERE sender = ? ORDER BY created_at DESC',
      [req.session.user.username]
    );

    res.json({ success: true, history });
  } catch (error) {
    res.json({ success: false, message: 'Server error' });
  } finally {
    connection.release();
  }
});

// Transfer - Get History Received
app.get('/api/transfer/history-received', async (req: Request, res: Response) => {
  if (!req.session.user) {
    return res.json({ success: false, message: 'Not logged in' });
  }

  const connection = await pool.getConnection();
  try {
    const [history] = await connection.query(
      'SELECT * FROM transfer_history WHERE receiver = ? ORDER BY created_at DESC',
      [req.session.user.username]
    );

    res.json({ success: true, history });
  } catch (error) {
    res.json({ success: false, message: 'Server error' });
  } finally {
    connection.release();
  }
});

// Guide - Create Guide
app.post('/api/guide/create', async (req: Request, res: Response) => {
  if (!req.session.user) {
    return res.json({ success: false, message: 'Not logged in' });
  }

  const { guide_name, max_members, representative1, representative2 } = req.body;
  const captain = req.session.user.username;

  if (!isValidUsername(representative1) || !isValidUsername(representative2)) {
    return res.json({ success: false, message: 'Format username representative salah!' });
  }

  const connection = await pool.getConnection();
  try {
    // Check if representatives exist
    const [rep1]: any = await connection.query('SELECT * FROM accounts WHERE pName = ?', [representative1]);
    const [rep2]: any = await connection.query('SELECT * FROM accounts WHERE pName = ?', [representative2]);

    if (rep1.length === 0 || rep2.length === 0) {
      return res.json({ success: false, message: 'Username representative tidak ditemukan!' });
    }

    // Create guide
    const [result]: any = await connection.query(
      'INSERT INTO guides (guide_name, captain, representative1, representative2, max_members) VALUES (?, ?, ?, ?, ?)',
      [guide_name, captain, representative1, representative2, max_members]
    );

    const guideId = result.insertId;

    // Add captain and representatives as members
    await connection.query(
      'INSERT INTO guide_members (guide_id, username, role) VALUES (?, ?, ?), (?, ?, ?), (?, ?, ?)',
      [guideId, captain, 'captain', guideId, representative1, 'representative', guideId, representative2, 'representative']
    );

    res.json({ success: true, message: 'Guide berhasil dibuat!' });
  } catch (error) {
    console.error('Error creating guide:', error);
    res.json({ success: false, message: 'Server error' });
  } finally {
    connection.release();
  }
});

// Guide - Invite Member
app.post('/api/guide/invite', async (req: Request, res: Response) => {
  if (!req.session.user) {
    return res.json({ success: false, message: 'Not logged in' });
  }

  const { guide_id, username } = req.body;

  const connection = await pool.getConnection();
  try {
    // Check if user is captain or representative
    const [members]: any = await connection.query(
      'SELECT * FROM guide_members WHERE guide_id = ? AND username = ? AND role IN ("captain", "representative")',
      [guide_id, req.session.user.username]
    );

    if (members.length === 0) {
      return res.json({ success: false, message: 'Hanya kapten/wakil yang bisa invite!' });
    }

    // Check if username exists
    const [users]: any = await connection.query('SELECT * FROM accounts WHERE pName = ?', [username]);
    if (users.length === 0) {
      return res.json({ success: false, message: 'Username tidak ditemukan!' });
    }

    // Create invite (expires in 5 days)
    const expiresAt = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000);
    await connection.query(
      'INSERT INTO guide_invites (guide_id, username, expires_at) VALUES (?, ?, ?)',
      [guide_id, username, expiresAt]
    );

    res.json({ success: true, message: 'Invite terkirim!' });
  } catch (error) {
    res.json({ success: false, message: 'Server error' });
  } finally {
    connection.release();
  }
});

// Guide - Get My Guides
app.get('/api/guide/my-guides', async (req: Request, res: Response) => {
  if (!req.session.user) {
    return res.json({ success: false, message: 'Not logged in' });
  }

  const connection = await pool.getConnection();
  try {
    const [guides] = await connection.query(`
      SELECT g.*, gm.role, 
             (SELECT COUNT(*) FROM guide_members WHERE guide_id = g.id) as member_count
      FROM guides g
      JOIN guide_members gm ON g.id = gm.guide_id
      WHERE gm.username = ?
    `, [req.session.user.username]);

    res.json({ success: true, guides });
  } catch (error) {
    res.json({ success: false, message: 'Server error' });
  } finally {
    connection.release();
  }
});

// Guide - Get Guide Details
app.get('/api/guide/details/:guide_id', async (req: Request, res: Response) => {
  if (!req.session.user) {
    return res.json({ success: false, message: 'Not logged in' });
  }

  const { guide_id } = req.params;
  const connection = await pool.getConnection();
  try {
    // Get guide info
    const [guides]: any = await connection.query(
      'SELECT * FROM guides WHERE id = ?',
      [guide_id]
    );

    if (guides.length === 0) {
      return res.json({ success: false, message: 'Guide not found' });
    }

    // Get members
    const [members] = await connection.query(
      'SELECT username, role, joined_at FROM guide_members WHERE guide_id = ? ORDER BY FIELD(role, "captain", "representative", "member"), joined_at',
      [guide_id]
    );

    // Get pending invites
    const [invites] = await connection.query(
      'SELECT username, expires_at, created_at FROM guide_invites WHERE guide_id = ? AND status = "pending" AND expires_at > NOW()',
      [guide_id]
    );

    // Get user role
    const [userRole]: any = await connection.query(
      'SELECT role FROM guide_members WHERE guide_id = ? AND username = ?',
      [guide_id, req.session.user.username]
    );

    res.json({ 
      success: true, 
      guide: guides[0],
      members,
      invites,
      userRole: userRole.length > 0 ? userRole[0].role : null
    });
  } catch (error) {
    res.json({ success: false, message: 'Server error' });
  } finally {
    connection.release();
  }
});

// Guide - Leave Guide
app.post('/api/guide/leave', async (req: Request, res: Response) => {
  if (!req.session.user) {
    return res.json({ success: false, message: 'Not logged in' });
  }

  const { guide_id } = req.body;
  const connection = await pool.getConnection();
  try {
    // Check if user is member
    const [members]: any = await connection.query(
      'SELECT role FROM guide_members WHERE guide_id = ? AND username = ?',
      [guide_id, req.session.user.username]
    );

    if (members.length === 0) {
      return res.json({ success: false, message: 'Anda bukan anggota guide ini!' });
    }

    // Cannot leave if captain
    if (members[0].role === 'captain') {
      return res.json({ success: false, message: 'Captain tidak bisa keluar! Transfer leadership terlebih dahulu.' });
    }

    await connection.beginTransaction();

    // Remove from members
    await connection.query(
      'DELETE FROM guide_members WHERE guide_id = ? AND username = ?',
      [guide_id, req.session.user.username]
    );

    // If representative, update guide table
    if (members[0].role === 'representative') {
      const [guide]: any = await connection.query(
        'SELECT representative1, representative2 FROM guides WHERE id = ?',
        [guide_id]
      );

      if (guide[0].representative1 === req.session.user.username) {
        await connection.query(
          'UPDATE guides SET representative1 = NULL WHERE id = ?',
          [guide_id]
        );
      } else if (guide[0].representative2 === req.session.user.username) {
        await connection.query(
          'UPDATE guides SET representative2 = NULL WHERE id = ?',
          [guide_id]
        );
      }
    }

    await connection.commit();
    res.json({ success: true, message: 'Berhasil keluar dari guide!' });
  } catch (error) {
    await connection.rollback();
    console.error('Error leaving guide:', error);
    res.json({ success: false, message: 'Server error' });
  } finally {
    connection.release();
  }
});

// Guide - Get Pending Invites
app.get('/api/guide/my-invites', async (req: Request, res: Response) => {
  if (!req.session.user) {
    return res.json({ success: false, message: 'Not logged in' });
  }

  const connection = await pool.getConnection();
  try {
    const [invites] = await connection.query(`
      SELECT gi.*, g.guide_name, g.captain
      FROM guide_invites gi
      JOIN guides g ON gi.guide_id = g.id
      WHERE gi.username = ? AND gi.status = 'pending' AND gi.expires_at > NOW()
    `, [req.session.user.username]);

    res.json({ success: true, invites });
  } catch (error) {
    res.json({ success: false, message: 'Server error' });
  } finally {
    connection.release();
  }
});

// Guide - Accept/Reject Invite
app.post('/api/guide/respond-invite', async (req: Request, res: Response) => {
  if (!req.session.user) {
    return res.json({ success: false, message: 'Not logged in' });
  }

  const { invite_id, action } = req.body; // action: 'accept' or 'reject'
  const connection = await pool.getConnection();
  try {
    // Get invite details
    const [invites]: any = await connection.query(
      'SELECT * FROM guide_invites WHERE id = ? AND username = ? AND status = "pending" AND expires_at > NOW()',
      [invite_id, req.session.user.username]
    );

    if (invites.length === 0) {
      return res.json({ success: false, message: 'Invite tidak valid atau sudah expired!' });
    }

    const invite = invites[0];

    await connection.beginTransaction();

    if (action === 'accept') {
      // Check member count
      const [guide]: any = await connection.query(
        'SELECT max_members FROM guides WHERE id = ?',
        [invite.guide_id]
      );

      const [memberCount]: any = await connection.query(
        'SELECT COUNT(*) as count FROM guide_members WHERE guide_id = ?',
        [invite.guide_id]
      );

      if (memberCount[0].count >= guide[0].max_members) {
        await connection.rollback();
        return res.json({ success: false, message: 'Guide sudah penuh!' });
      }

      // Add to members
      await connection.query(
        'INSERT INTO guide_members (guide_id, username, role) VALUES (?, ?, ?)',
        [invite.guide_id, req.session.user.username, 'member']
      );

      // Update invite status
      await connection.query(
        'UPDATE guide_invites SET status = "accepted" WHERE id = ?',
        [invite_id]
      );

      await connection.commit();
      res.json({ success: true, message: 'Berhasil bergabung dengan guide!' });
    } else {
      // Update invite status
      await connection.query(
        'UPDATE guide_invites SET status = "rejected" WHERE id = ?',
        [invite_id]
      );

      await connection.commit();
      res.json({ success: true, message: 'Invite ditolak!' });
    }
  } catch (error) {
    await connection.rollback();
    console.error('Error responding to invite:', error);
    res.json({ success: false, message: 'Server error' });
  } finally {
    connection.release();
  }
});

// Guide - Add Representative
app.post('/api/guide/add-representative', async (req: Request, res: Response) => {
  if (!req.session.user) {
    return res.json({ success: false, message: 'Not logged in' });
  }

  const { guide_id, username, slot } = req.body; // slot: 1 or 2
  const connection = await pool.getConnection();
  try {
    // Check if user is captain
    const [userRole]: any = await connection.query(
      'SELECT role FROM guide_members WHERE guide_id = ? AND username = ?',
      [guide_id, req.session.user.username]
    );

    if (userRole.length === 0 || userRole[0].role !== 'captain') {
      return res.json({ success: false, message: 'Hanya captain yang bisa menambah representative!' });
    }

    // Check if username exists in accounts
    const [users]: any = await connection.query(
      'SELECT * FROM accounts WHERE pName = ?',
      [username]
    );

    if (users.length === 0) {
      return res.json({ success: false, message: 'Username tidak ditemukan!' });
    }

    // Check if user is member of guide
    const [members]: any = await connection.query(
      'SELECT role FROM guide_members WHERE guide_id = ? AND username = ?',
      [guide_id, username]
    );

    if (members.length === 0) {
      return res.json({ success: false, message: 'User bukan anggota guide!' });
    }

    if (members[0].role === 'captain') {
      return res.json({ success: false, message: 'Captain tidak bisa dijadikan representative!' });
    }

    await connection.beginTransaction();

    // Update guide table
    const field = slot === 1 ? 'representative1' : 'representative2';
    await connection.query(
      `UPDATE guides SET ${field} = ? WHERE id = ?`,
      [username, guide_id]
    );

    // Update member role
    await connection.query(
      'UPDATE guide_members SET role = ? WHERE guide_id = ? AND username = ?',
      ['representative', guide_id, username]
    );

    await connection.commit();
    res.json({ success: true, message: 'Representative berhasil ditambahkan!' });
  } catch (error) {
    await connection.rollback();
    console.error('Error adding representative:', error);
    res.json({ success: false, message: 'Server error' });
  } finally {
    connection.release();
  }
});

// Guide - Remove Representative
app.post('/api/guide/remove-representative', async (req: Request, res: Response) => {
  if (!req.session.user) {
    return res.json({ success: false, message: 'Not logged in' });
  }

  const { guide_id, username } = req.body;
  const connection = await pool.getConnection();
  try {
    // Check if user is captain
    const [userRole]: any = await connection.query(
      'SELECT role FROM guide_members WHERE guide_id = ? AND username = ?',
      [guide_id, req.session.user.username]
    );

    if (userRole.length === 0 || userRole[0].role !== 'captain') {
      return res.json({ success: false, message: 'Hanya captain yang bisa menghapus representative!' });
    }

    await connection.beginTransaction();

    // Get guide info
    const [guide]: any = await connection.query(
      'SELECT representative1, representative2 FROM guides WHERE id = ?',
      [guide_id]
    );

    // Update guide table
    if (guide[0].representative1 === username) {
      await connection.query(
        'UPDATE guides SET representative1 = NULL WHERE id = ?',
        [guide_id]
      );
    } else if (guide[0].representative2 === username) {
      await connection.query(
        'UPDATE guides SET representative2 = NULL WHERE id = ?',
        [guide_id]
      );
    } else {
      await connection.rollback();
      return res.json({ success: false, message: 'User bukan representative!' });
    }

    // Update member role to member
    await connection.query(
      'UPDATE guide_members SET role = ? WHERE guide_id = ? AND username = ?',
      ['member', guide_id, username]
    );

    await connection.commit();
    res.json({ success: true, message: 'Representative berhasil dihapus!' });
  } catch (error) {
    await connection.rollback();
    console.error('Error removing representative:', error);
    res.json({ success: false, message: 'Server error' });
  } finally {
    connection.release();
  }
});

// Guide - Send Chat
app.post('/api/guide/chat/send', async (req: Request, res: Response) => {
  if (!req.session.user) {
    return res.json({ success: false, message: 'Not logged in' });
  }

  const { guide_id, message } = req.body;

  const connection = await pool.getConnection();
  try {
    // Check if user is member
    const [members]: any = await connection.query(
      'SELECT * FROM guide_members WHERE guide_id = ? AND username = ?',
      [guide_id, req.session.user.username]
    );

    if (members.length === 0) {
      return res.json({ success: false, message: 'Anda bukan anggota guide ini!' });
    }

    // Check delay (5 seconds)
    const [lastMsg]: any = await connection.query(
      'SELECT * FROM last_message WHERE username = ? AND last_sent > DATE_SUB(NOW(), INTERVAL 5 SECOND)',
      [req.session.user.username]
    );

    if (lastMsg.length > 0) {
      return res.json({ success: false, message: 'Tunggu 5 detik untuk mengirim pesan lagi!' });
    }

    // Insert message
    await connection.query(
      'INSERT INTO guide_chat (guide_id, username, message) VALUES (?, ?, ?)',
      [guide_id, req.session.user.username, message]
    );

    // Update last message time
    await connection.query(
      'INSERT INTO last_message (username, last_sent) VALUES (?, NOW()) ON DUPLICATE KEY UPDATE last_sent = NOW()',
      [req.session.user.username]
    );

    res.json({ success: true, message: 'Pesan terkirim!' });
  } catch (error) {
    res.json({ success: false, message: 'Server error' });
  } finally {
    connection.release();
  }
});

// Guide - Change Leader
app.post('/api/guide/change-leader', async (req: Request, res: Response) => {
  if (!req.session.user) {
    return res.json({ success: false, message: 'Not logged in' });
  }

  const { guide_id, new_leader } = req.body;
  const connection = await pool.getConnection();
  try {
    // Check if user is captain
    const [userRole]: any = await connection.query(
      'SELECT role FROM guide_members WHERE guide_id = ? AND username = ?',
      [guide_id, req.session.user.username]
    );

    if (userRole.length === 0 || userRole[0].role !== 'captain') {
      return res.json({ success: false, message: 'Hanya captain yang bisa transfer leadership!' });
    }

    // Check if new leader is member
    const [newLeaderRole]: any = await connection.query(
      'SELECT role FROM guide_members WHERE guide_id = ? AND username = ?',
      [guide_id, new_leader]
    );

    if (newLeaderRole.length === 0) {
      return res.json({ success: false, message: 'User bukan anggota guide!' });
    }

    await connection.beginTransaction();

    // Update old captain to member
    await connection.query(
      'UPDATE guide_members SET role = ? WHERE guide_id = ? AND username = ?',
      ['member', guide_id, req.session.user.username]
    );

    // Update new captain
    await connection.query(
      'UPDATE guide_members SET role = ? WHERE guide_id = ? AND username = ?',
      ['captain', guide_id, new_leader]
    );

    // Update guide table
    await connection.query(
      'UPDATE guides SET captain = ? WHERE id = ?',
      [new_leader, guide_id]
    );

    // If new leader was representative, remove from rep position
    const [guide]: any = await connection.query(
      'SELECT representative1, representative2 FROM guides WHERE id = ?',
      [guide_id]
    );

    if (guide[0].representative1 === new_leader) {
      await connection.query(
        'UPDATE guides SET representative1 = NULL WHERE id = ?',
        [guide_id]
      );
    } else if (guide[0].representative2 === new_leader) {
      await connection.query(
        'UPDATE guides SET representative2 = NULL WHERE id = ?',
        [guide_id]
      );
    }

    await connection.commit();
    res.json({ success: true, message: 'Leadership berhasil ditransfer!' });
  } catch (error) {
    await connection.rollback();
    console.error('Error changing leader:', error);
    res.json({ success: false, message: 'Server error' });
  } finally {
    connection.release();
  }
});

// Guide - Remove Guide (Delete)
app.post('/api/guide/remove', async (req: Request, res: Response) => {
  if (!req.session.user) {
    return res.json({ success: false, message: 'Not logged in' });
  }

  const { guide_id } = req.body;
  const connection = await pool.getConnection();
  try {
    // Check if user is captain
    const [userRole]: any = await connection.query(
      'SELECT role FROM guide_members WHERE guide_id = ? AND username = ?',
      [guide_id, req.session.user.username]
    );

    if (userRole.length === 0 || userRole[0].role !== 'captain') {
      return res.json({ success: false, message: 'Hanya captain yang bisa menghapus guide!' });
    }

    // Delete guide (cascade will delete members, invites, and chat)
    await connection.query('DELETE FROM guides WHERE id = ?', [guide_id]);

    res.json({ success: true, message: 'Guide berhasil dihapus!' });
  } catch (error) {
    console.error('Error removing guide:', error);
    res.json({ success: false, message: 'Server error' });
  } finally {
    connection.release();
  }
});

// Guide - Kick Member
app.post('/api/guide/kick-member', async (req: Request, res: Response) => {
  if (!req.session.user) {
    return res.json({ success: false, message: 'Not logged in' });
  }

  const { guide_id, username } = req.body;
  const connection = await pool.getConnection();
  try {
    // Check if user is captain or representative
    const [userRole]: any = await connection.query(
      'SELECT role FROM guide_members WHERE guide_id = ? AND username = ?',
      [guide_id, req.session.user.username]
    );

    if (userRole.length === 0 || !['captain', 'representative'].includes(userRole[0].role)) {
      return res.json({ success: false, message: 'Hanya captain/representative yang bisa kick member!' });
    }

    // Check target role
    const [targetRole]: any = await connection.query(
      'SELECT role FROM guide_members WHERE guide_id = ? AND username = ?',
      [guide_id, username]
    );

    if (targetRole.length === 0) {
      return res.json({ success: false, message: 'User bukan anggota guide!' });
    }

    if (targetRole[0].role === 'captain') {
      return res.json({ success: false, message: 'Tidak bisa kick captain!' });
    }

    // Representative can only kick regular members
    if (userRole[0].role === 'representative' && targetRole[0].role === 'representative') {
      return res.json({ success: false, message: 'Representative tidak bisa kick representative lain!' });
    }

    await connection.beginTransaction();

    // Remove from members
    await connection.query(
      'DELETE FROM guide_members WHERE guide_id = ? AND username = ?',
      [guide_id, username]
    );

    // If target was representative, update guide table
    if (targetRole[0].role === 'representative') {
      const [guide]: any = await connection.query(
        'SELECT representative1, representative2 FROM guides WHERE id = ?',
        [guide_id]
      );

      if (guide[0].representative1 === username) {
        await connection.query(
          'UPDATE guides SET representative1 = NULL WHERE id = ?',
          [guide_id]
        );
      } else if (guide[0].representative2 === username) {
        await connection.query(
          'UPDATE guides SET representative2 = NULL WHERE id = ?',
          [guide_id]
        );
      }
    }

    await connection.commit();
    res.json({ success: true, message: 'Member berhasil di-kick!' });
  } catch (error) {
    await connection.rollback();
    console.error('Error kicking member:', error);
    res.json({ success: false, message: 'Server error' });
  } finally {
    connection.release();
  }
});

// Guide - Get Chat
app.get('/api/guide/chat/:guide_id', async (req: Request, res: Response) => {
  if (!req.session.user) {
    return res.json({ success: false, message: 'Not logged in' });
  }

  const { guide_id } = req.params;

  const connection = await pool.getConnection();
  try {
    const [messages]: any = await connection.query(`
      SELECT gc.*, gm.role
      FROM guide_chat gc
      JOIN guide_members gm ON gc.guide_id = gm.guide_id AND gc.username = gm.username
      WHERE gc.guide_id = ?
      ORDER BY gc.created_at DESC
      LIMIT 100
    `, [guide_id]);

    res.json({ success: true, messages });
  } catch (error) {
    res.json({ success: false, message: 'Server error' });
  } finally {
    connection.release();
  }
});

// Admin - Add/Remove Money
app.post('/api/admin/manage-money', async (req: Request, res: Response) => {
  if (!req.session.user) {
    return res.json({ success: false, message: 'Not logged in' });
  }

  const { username, amount, type, action } = req.body;

  const connection = await pool.getConnection();
  try {
    // Check if admin
    const [admins]: any = await connection.query(
      'SELECT * FROM admins_website WHERE aName = ?',
      [req.session.user.username]
    );

    if (admins.length === 0) {
      return res.json({ success: false, message: 'Unauthorized' });
    }

    // Check if target user exists
    const [users]: any = await connection.query(
      'SELECT * FROM accounts WHERE pName = ?',
      [username]
    );

    if (users.length === 0) {
      return res.json({ success: false, message: 'Username tidak ditemukan!' });
    }

    const operator = action === 'add' ? '+' : '-';
    const field = type === 'cash' ? 'pCash' : 'pBank';

    await connection.query(
      `UPDATE accounts SET ${field} = ${field} ${operator} ? WHERE pName = ?`,
      [amount, username]
    );

    res.json({ success: true, message: `Berhasil ${action === 'add' ? 'menambahkan' : 'mengurangi'} money!` });
  } catch (error) {
    res.json({ success: false, message: 'Server error' });
  } finally {
    connection.release();
  }
});

// Admin - Delete Account
app.post('/api/admin/delete-account', async (req: Request, res: Response) => {
  if (!req.session.user) {
    return res.json({ success: false, message: 'Not logged in' });
  }

  const { username } = req.body;

  const connection = await pool.getConnection();
  try {
    // Check if admin
    const [admins]: any = await connection.query(
      'SELECT * FROM admins_website WHERE aName = ?',
      [req.session.user.username]
    );

    if (admins.length === 0) {
      return res.json({ success: false, message: 'Unauthorized' });
    }

    await connection.query('DELETE FROM accounts WHERE pName = ?', [username]);
    res.json({ success: true, message: 'Akun berhasil dihapus!' });
  } catch (error) {
    res.json({ success: false, message: 'Server error' });
  } finally {
    connection.release();
  }
});

// Admin - Clear Marketplace
app.post('/api/admin/clear-marketplace', async (req: Request, res: Response) => {
  if (!req.session.user) {
    return res.json({ success: false, message: 'Not logged in' });
  }

  const connection = await pool.getConnection();
  try {
    await connection.query('DELETE FROM marketplace');
    res.json({ success: true, message: 'Marketplace dibersihkan!' });
  } catch (error) {
    res.json({ success: false, message: 'Server error' });
  } finally {
    connection.release();
  }
});

// Admin - Clear Guide Chat
app.post('/api/admin/clear-guide-chat', async (req: Request, res: Response) => {
  if (!req.session.user) {
    return res.json({ success: false, message: 'Not logged in' });
  }

  const { guide_name } = req.body;

  const connection = await pool.getConnection();
  try {
    const [guides]: any = await connection.query(
      'SELECT id FROM guides WHERE guide_name = ?',
      [guide_name]
    );

    if (guides.length === 0) {
      return res.json({ success: false, message: 'Guide tidak ditemukan!' });
    }

    await connection.query('DELETE FROM guide_chat WHERE guide_id = ?', [guides[0].id]);
    res.json({ success: true, message: 'Chat guide dibersihkan!' });
  } catch (error) {
    res.json({ success: false, message: 'Server error' });
  } finally {
    connection.release();
  }
});

// ===================================
// MARKET DIGITAL ENDPOINTS
// ===================================

// Market Digital - Create Listing
app.post('/api/market-digital/create', upload.single('photo'), async (req: Request, res: Response) => {
  if (!req.session.user) {
    return res.json({ success: false, message: 'Not logged in' });
  }

  const { asset_name, asset_type, description, price, location, phone, samp_id, features } = req.body;
  const photo_url = req.file ? `/uploads/${req.file.filename}` : null;

  const connection = await pool.getConnection();
  try {
    await connection.query(
      'INSERT INTO market_digital (photo_url, username, asset_name, asset_type, description, price, location, phone, samp_id, features) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [photo_url, req.session.user.username, asset_name, asset_type, description, price, location, phone, samp_id, features]
    );

    res.json({ success: true, message: 'Asset berhasil ditambahkan!' });
  } catch (error) {
    console.error('Error creating digital asset:', error);
    res.json({ success: false, message: 'Server error' });
  } finally {
    connection.release();
  }
});

// Market Digital - Get Listings
app.get('/api/market-digital', async (req: Request, res: Response) => {
  const { type, search, sort } = req.query;
  const connection = await pool.getConnection();
  try {
    let query = 'SELECT * FROM market_digital WHERE status = "active"';
    const params: any[] = [];

    if (type && type !== 'all') {
      query += ' AND asset_type = ?';
      params.push(type);
    }

    if (search) {
      query += ' AND (asset_name LIKE ? OR location LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }

    // Sorting
    if (sort === 'price_asc') {
      query += ' ORDER BY price ASC';
    } else if (sort === 'price_desc') {
      query += ' ORDER BY price DESC';
    } else if (sort === 'popular') {
      query += ' ORDER BY views DESC';
    } else {
      query += ' ORDER BY created_at DESC';
    }

    const [assets] = await connection.query(query, params);
    res.json({ success: true, assets });
  } catch (error) {
    res.json({ success: false, message: 'Server error' });
  } finally {
    connection.release();
  }
});

// Market Digital - View Asset (increment views)
app.post('/api/market-digital/view/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  const connection = await pool.getConnection();
  try {
    await connection.query(
      'UPDATE market_digital SET views = views + 1 WHERE id = ?',
      [id]
    );
    res.json({ success: true });
  } catch (error) {
    res.json({ success: false });
  } finally {
    connection.release();
  }
});

// Market Digital - Mark as Sold
app.post('/api/market-digital/mark-sold/:id', async (req: Request, res: Response) => {
  if (!req.session.user) {
    return res.json({ success: false, message: 'Not logged in' });
  }

  const { id } = req.params;
  const connection = await pool.getConnection();
  try {
    // Check if user owns the listing
    const [assets]: any = await connection.query(
      'SELECT username FROM market_digital WHERE id = ?',
      [id]
    );

    if (assets.length === 0 || assets[0].username !== req.session.user.username) {
      return res.json({ success: false, message: 'Unauthorized' });
    }

    await connection.query(
      'UPDATE market_digital SET status = "sold" WHERE id = ?',
      [id]
    );

    res.json({ success: true, message: 'Asset ditandai sebagai terjual!' });
  } catch (error) {
    res.json({ success: false, message: 'Server error' });
  } finally {
    connection.release();
  }
});

// ===================================
// ITEM MANAGER ENDPOINTS (ADMIN ONLY)
// ===================================

// Get All Item Templates
app.get('/api/admin/items/templates', async (req: Request, res: Response) => {
  if (!req.session.user) {
    return res.json({ success: false, message: 'Not logged in' });
  }

  const connection = await pool.getConnection();
  try {
    // Check if admin
    const [admins]: any = await connection.query(
      'SELECT * FROM admins_website WHERE aName = ?',
      [req.session.user.username]
    );

    if (admins.length === 0) {
      return res.json({ success: false, message: 'Unauthorized' });
    }

    const [templates] = await connection.query(
      'SELECT * FROM item_templates ORDER BY item_category, item_name'
    );

    res.json({ success: true, templates });
  } catch (error) {
    res.json({ success: false, message: 'Server error' });
  } finally {
    connection.release();
  }
});

// Create Item Template
app.post('/api/admin/items/create', async (req: Request, res: Response) => {
  if (!req.session.user) {
    return res.json({ success: false, message: 'Not logged in' });
  }

  const { item_code, item_name, item_category, item_type, max_limit, rarity, base_price, description } = req.body;
  const connection = await pool.getConnection();
  try {
    // Check if admin
    const [admins]: any = await connection.query(
      'SELECT * FROM admins_website WHERE aName = ?',
      [req.session.user.username]
    );

    if (admins.length === 0) {
      return res.json({ success: false, message: 'Unauthorized' });
    }

    await connection.query(
      'INSERT INTO item_templates (item_code, item_name, item_category, item_type, max_limit, rarity, base_price, description) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [item_code, item_name, item_category, item_type, max_limit, rarity, base_price, description]
    );

    res.json({ success: true, message: 'Item template berhasil dibuat!' });
  } catch (error) {
    console.error('Error creating item:', error);
    res.json({ success: false, message: 'Server error atau item code sudah ada' });
  } finally {
    connection.release();
  }
});

// Update Item Template
app.post('/api/admin/items/update/:id', async (req: Request, res: Response) => {
  if (!req.session.user) {
    return res.json({ success: false, message: 'Not logged in' });
  }

  const { id } = req.params;
  const { item_name, item_type, max_limit, rarity, base_price, description, is_tradeable } = req.body;
  const connection = await pool.getConnection();
  try {
    // Check if admin
    const [admins]: any = await connection.query(
      'SELECT * FROM admins_website WHERE aName = ?',
      [req.session.user.username]
    );

    if (admins.length === 0) {
      return res.json({ success: false, message: 'Unauthorized' });
    }

    await connection.query(
      'UPDATE item_templates SET item_name = ?, item_type = ?, max_limit = ?, rarity = ?, base_price = ?, description = ?, is_tradeable = ? WHERE id = ?',
      [item_name, item_type, max_limit, rarity, base_price, description, is_tradeable, id]
    );

    res.json({ success: true, message: 'Item template berhasil diupdate!' });
  } catch (error) {
    res.json({ success: false, message: 'Server error' });
  } finally {
    connection.release();
  }
});

// Delete Item Template
app.post('/api/admin/items/delete/:id', async (req: Request, res: Response) => {
  if (!req.session.user) {
    return res.json({ success: false, message: 'Not logged in' });
  }

  const { id } = req.params;
  const connection = await pool.getConnection();
  try {
    // Check if admin
    const [admins]: any = await connection.query(
      'SELECT * FROM admins_website WHERE aName = ?',
      [req.session.user.username]
    );

    if (admins.length === 0) {
      return res.json({ success: false, message: 'Unauthorized' });
    }

    await connection.query('DELETE FROM item_templates WHERE id = ?', [id]);

    res.json({ success: true, message: 'Item template berhasil dihapus!' });
  } catch (error) {
    res.json({ success: false, message: 'Server error' });
  } finally {
    connection.release();
  }
});

// Give Item to Player
app.post('/api/admin/items/give', async (req: Request, res: Response) => {
  if (!req.session.user) {
    return res.json({ success: false, message: 'Not logged in' });
  }

  const { username, item_code, quantity } = req.body;

  const validItems: Record<string, string> = {
    pBatu: 'Batu Bersih',
    pBatuk: 'Batu Kotor',
    pFish: 'Ikan Biasa',
    pPenyu: 'Penyu',
    pDolphin: 'Dolphin',
    pHiu: 'Ikan Hiu',
    pMegalodon: 'Ikan Megalodon',
    pCaught: 'Cacing/Umpan',
    pPadi: 'Padi',
    pAyam: 'Ayam',
    pSemen: 'Semen',
    pEmas: 'Emas',
    pSusu: 'Susu',
    pMinyak: 'Minyak'
  };

  if (!validItems[item_code]) {
    return res.json({ success: false, message: 'Item tidak valid!' });
  }

  const connection = await pool.getConnection();
  try {
    // Check if admin
    const [admins]: any = await connection.query(
      'SELECT * FROM admins_website WHERE aName = ?',
      [req.session.user.username]
    );

    if (admins.length === 0) {
      return res.json({ success: false, message: 'Unauthorized' });
    }

    // Check if target user exists
    const [users]: any = await connection.query(
      'SELECT pName FROM accounts WHERE pName = ?',
      [username]
    );

    if (users.length === 0) {
      return res.json({ success: false, message: 'Username tidak ditemukan!' });
    }

    await connection.beginTransaction();

    // Update player item
    await connection.query(
      `UPDATE accounts SET ${item_code} = ${item_code} + ? WHERE pName = ?`,
      [quantity, username]
    );

    // Log to item_spawn_history
    await connection.query(
      'INSERT INTO item_spawn_history (item_code, username, quantity, spawned_by, reason) VALUES (?, ?, ?, ?, ?)',
      [item_code, username, quantity, req.session.user.username, `Give Items oleh Admin`]
    );

    await connection.commit();
    res.json({
      success: true,
      message: `Berhasil give ${quantity}x ${validItems[item_code]} ke ${username}!`
    });
  } catch (error) {
    await connection.rollback();
    console.error('Error giving item:', error);
    res.json({ success: false, message: 'Server error' });
  } finally {
    connection.release();
  }
});

// Get Give Items History
app.get('/api/admin/items/give-history', async (req: Request, res: Response) => {
  if (!req.session.user) {
    return res.json({ success: false, message: 'Not logged in' });
  }

  const { username, item_code } = req.query;
  const connection = await pool.getConnection();
  try {
    // Check if admin
    const [admins]: any = await connection.query(
      'SELECT * FROM admins_website WHERE aName = ?',
      [req.session.user.username]
    );

    if (admins.length === 0) {
      return res.json({ success: false, message: 'Unauthorized' });
    }

    const itemNames: Record<string, string> = {
      pBatu: 'Batu Bersih', pBatuk: 'Batu Kotor', pFish: 'Ikan Biasa',
      pPenyu: 'Penyu', pDolphin: 'Dolphin', pHiu: 'Ikan Hiu',
      pMegalodon: 'Ikan Megalodon', pCaught: 'Cacing/Umpan', pPadi: 'Padi',
      pAyam: 'Ayam', pSemen: 'Semen', pEmas: 'Emas', pSusu: 'Susu', pMinyak: 'Minyak'
    };

    let query = `SELECT * FROM item_spawn_history WHERE 1=1`;
    const params: any[] = [];

    if (username) {
      query += ' AND username LIKE ?';
      params.push(`%${username}%`);
    }

    if (item_code) {
      query += ' AND item_code = ?';
      params.push(item_code);
    }

    query += ' ORDER BY created_at DESC LIMIT 100';

    const [history]: any = await connection.query(query, params);

    // Format history
    const formatted = history.map((h: any) => ({
      ...h,
      item_name: itemNames[h.item_code] || h.item_code
    }));

    res.json({ success: true, history: formatted });
  } catch (error) {
    res.json({ success: false, message: 'Server error' });
  } finally {
    connection.release();
  }
});

// Get Item Economy Stats
app.get('/api/admin/items/economy', async (req: Request, res: Response) => {
  if (!req.session.user) {
    return res.json({ success: false, message: 'Not logged in' });
  }

  const connection = await pool.getConnection();
  try {
    // Check if admin
    const [admins]: any = await connection.query(
      'SELECT * FROM admins_website WHERE aName = ?',
      [req.session.user.username]
    );

    if (admins.length === 0) {
      return res.json({ success: false, message: 'Unauthorized' });
    }

    // Get total items in circulation
    const [itemStats] = await connection.query(`
      SELECT 
        SUM(pBatu) as total_batu,
        SUM(pBatuk) as total_batuk,
        SUM(pFish) as total_fish,
        SUM(pPenyu) as total_penyu,
        SUM(pDolphin) as total_dolphin,
        SUM(pHiu) as total_hiu,
        SUM(pMegalodon) as total_megalodon,
        SUM(pCaught) as total_caught,
        SUM(pPadi) as total_padi,
        SUM(pAyam) as total_ayam,
        SUM(pSemen) as total_semen,
        SUM(pEmas) as total_emas,
        SUM(pSusu) as total_susu,
        SUM(pMinyak) as total_minyak,
        SUM(pDrugs) as total_drugs,
        SUM(pMicin) as total_micin,
        SUM(pSteroid) as total_steroid,
        SUM(pComponent) as total_component
      FROM accounts
    `);

    res.json({ success: true, stats: itemStats });
  } catch (error) {
    res.json({ success: false, message: 'Server error' });
  } finally {
    connection.release();
  }
});

// ===================================
// PWA ENDPOINTS
// ===================================

// Subscribe to push notifications
app.post('/api/pwa/subscribe', async (req: Request, res: Response) => {
  if (!req.session.user) {
    return res.json({ success: false, message: 'Not logged in' });
  }

  const { endpoint, keys } = req.body;
  const username = req.session.user.username;

  const connection = await pool.getConnection();
  try {
    // Store subscription in database
    await connection.query(`
      CREATE TABLE IF NOT EXISTS push_subscriptions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(50) NOT NULL,
        endpoint TEXT NOT NULL,
        p256dh TEXT NOT NULL,
        auth TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY unique_subscription (username, endpoint(255))
      )
    `);

    await connection.query(
      'INSERT INTO push_subscriptions (username, endpoint, p256dh, auth) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE p256dh = ?, auth = ?',
      [username, endpoint, keys.p256dh, keys.auth, keys.p256dh, keys.auth]
    );

    res.json({ success: true, message: 'Subscription saved' });
  } catch (error) {
    console.error('Error saving push subscription:', error);
    res.json({ success: false, message: 'Server error' });
  } finally {
    connection.release();
  }
});

// Send push notification (example endpoint - for admin or automated notifications)
app.post('/api/pwa/send-notification', async (req: Request, res: Response) => {
  if (!req.session.user) {
    return res.json({ success: false, message: 'Not logged in' });
  }

  const { username, title, body, url } = req.body;

  const connection = await pool.getConnection();
  try {
    // Check if admin
    const [admins]: any = await connection.query(
      'SELECT * FROM admins_website WHERE aName = ?',
      [req.session.user.username]
    );

    if (admins.length === 0) {
      return res.json({ success: false, message: 'Unauthorized' });
    }

    // Get user's subscription
    const [subscriptions]: any = await connection.query(
      'SELECT * FROM push_subscriptions WHERE username = ?',
      [username]
    );

    if (subscriptions.length === 0) {
      return res.json({ success: false, message: 'User belum subscribe push notifications' });
    }

    // TODO: Implement actual push notification sending using web-push library
    // For now, just return success
    // const webpush = require('web-push');
    // const payload = JSON.stringify({ title, body, url });
    // await webpush.sendNotification(subscriptions[0], payload);

    res.json({ success: true, message: 'Notification sent (implementation pending)' });
  } catch (error) {
    console.error('Error sending push notification:', error);
    res.json({ success: false, message: 'Server error' });
  } finally {
    connection.release();
  }
});

// ===================================
// FACTION CHAT ENDPOINTS
// ===================================

// Get user's faction info
app.get('/api/faction/my-info', async (req: Request, res: Response) => {
  if (!req.session.user) {
    return res.json({ success: false, message: 'Not logged in' });
  }

  const connection = await pool.getConnection();
  try {
    const [faction]: any = await connection.query(
      'SELECT * FROM faction_members WHERE username = ?',
      [req.session.user.username]
    );

    if (faction.length === 0) {
      return res.json({ success: false, message: 'Not in any faction' });
    }

    res.json({ success: true, faction: faction[0] });
  } catch (error) {
    res.json({ success: false, message: 'Server error' });
  } finally {
    connection.release();
  }
});

// Get all jobs in faction side (godside/badside)
app.get('/api/faction/jobs/:side', async (req: Request, res: Response) => {
  if (!req.session.user) {
    return res.json({ success: false, message: 'Not logged in' });
  }

  const side = req.params.side; // 'godside' or 'badside'
  const connection = await pool.getConnection();
  try {
    // Get user's faction
    const [userFaction]: any = await connection.query(
      'SELECT faction FROM faction_members WHERE username = ?',
      [req.session.user.username]
    );

    if (userFaction.length === 0 || userFaction[0].faction !== side) {
      return res.json({ success: false, message: 'Access denied' });
    }

    // Get all jobs in this side with member count
    const [jobs]: any = await connection.query(`
      SELECT 
        job,
        COUNT(*) as total_members,
        SUM(CASE WHEN is_online = TRUE THEN 1 ELSE 0 END) as online_members
      FROM faction_members
      WHERE faction = ?
      GROUP BY job
    `, [side]);

    res.json({ success: true, jobs });
  } catch (error) {
    res.json({ success: false, message: 'Server error' });
  } finally {
    connection.release();
  }
});

// Get members in specific job
app.get('/api/faction/members/:job', async (req: Request, res: Response) => {
  if (!req.session.user) {
    return res.json({ success: false, message: 'Not logged in' });
  }

  const job = req.params.job;
  const connection = await pool.getConnection();
  try {
    // Check if user has access to this job
    const [access]: any = await connection.query(
      'SELECT * FROM faction_members WHERE username = ? AND job = ?',
      [req.session.user.username, job]
    );

    if (access.length === 0) {
      return res.json({ success: false, message: 'Access denied - You are not a member of this job' });
    }

    // Get all members in this job
    const [members]: any = await connection.query(`
      SELECT username, rank, invited_date, is_online, last_active
      FROM faction_members
      WHERE job = ?
      ORDER BY 
        CASE rank 
          WHEN 'leader' THEN 1 
          WHEN 'co_leader' THEN 2 
          ELSE 3 
        END,
        username
    `, [job]);

    res.json({ success: true, members });
  } catch (error) {
    res.json({ success: false, message: 'Server error' });
  } finally {
    connection.release();
  }
});

// Get chat messages for job
app.get('/api/faction/chat/:job', async (req: Request, res: Response) => {
  if (!req.session.user) {
    return res.json({ success: false, message: 'Not logged in' });
  }

  const job = req.params.job;
  const connection = await pool.getConnection();
  try {
    // Check if user has access
    const [access]: any = await connection.query(
      'SELECT * FROM faction_members WHERE username = ? AND job = ?',
      [req.session.user.username, job]
    );

    if (access.length === 0) {
      return res.json({ success: false, message: 'Access denied - You are not a member of this job' });
    }

    // Get recent messages (last 100)
    const [messages]: any = await connection.query(`
      SELECT 
        fc.id,
        fc.username,
        fm.rank,
        fc.message,
        fc.message_type,
        fc.media_url,
        fc.created_at
      FROM faction_chat fc
      LEFT JOIN faction_members fm ON fc.username = fm.username AND fc.job = fm.job
      WHERE fc.job = ?
      ORDER BY fc.created_at DESC
      LIMIT 100
    `, [job]);

    // Reverse to show oldest first
    messages.reverse();

    res.json({ success: true, messages });
  } catch (error) {
    res.json({ success: false, message: 'Server error' });
  } finally {
    connection.release();
  }
});

// Send chat message
app.post('/api/faction/chat/send', upload.single('media'), async (req: Request, res: Response) => {
  if (!req.session.user) {
    return res.json({ success: false, message: 'Not logged in' });
  }

  const { job, message, message_type } = req.body;
  const media_url = req.file ? `/uploads/${req.file.filename}` : null;

  const connection = await pool.getConnection();
  try {
    // Check if user has access
    const [access]: any = await connection.query(
      'SELECT * FROM faction_members WHERE username = ? AND job = ?',
      [req.session.user.username, job]
    );

    if (access.length === 0) {
      return res.json({ success: false, message: 'Access denied' });
    }

    // Insert message
    await connection.query(
      'INSERT INTO faction_chat (job, username, message, message_type, media_url) VALUES (?, ?, ?, ?, ?)',
      [job, req.session.user.username, message, message_type || 'text', media_url]
    );

    // Update last_active
    await connection.query(
      'UPDATE faction_members SET last_active = NOW() WHERE username = ? AND job = ?',
      [req.session.user.username, job]
    );

    res.json({ success: true, message: 'Message sent' });
  } catch (error) {
    console.error('Error sending message:', error);
    res.json({ success: false, message: 'Server error' });
  } finally {
    connection.release();
  }
});

// ===================================
// SERVER STATUS ENDPOINT
// ===================================

// Get SAMP server status
app.get('/api/server-status', async (req: Request, res: Response) => {
  const ip = '208.84.103.75';
  const port = 7103;

  try {
    // Query SA-MP server menggunakan axios ke API eksternal
    // Karena gamedig butuh native dependencies, kita pakai API sebagai proxy
    const response = await axios.get(`http://api.samp-servers.net/v2/server/${ip}:${port}`);
    
    if (response.data && response.data.online) {
      // Get region info
      let region = {};
      try {
        const geoResponse = await axios.get(`http://ip-api.com/json/${ip}`, { timeout: 3000 });
        region = {
          country: geoResponse.data.country || '-',
          countryCode: geoResponse.data.countryCode || '-',
          regionName: geoResponse.data.regionName || '-',
          city: geoResponse.data.city || '-',
          isp: geoResponse.data.isp || '-'
        };
      } catch {
        region = {
          country: '-',
          countryCode: '-',
          regionName: '-',
          city: '-',
          isp: '-'
        };
      }

      res.json({
        success: true,
        online: true,
        ip,
        port,
        hostname: response.data.hostname || '-',
        gamemode: response.data.gamemode || '-',
        mapname: response.data.mapname || '-',
        playersOnline: response.data.players || 0,
        maxPlayers: response.data.maxplayers || 0,
        passworded: response.data.password || false,
        ping: response.data.ping || 0,
        region,
        playerList: response.data.playerlist || []
      });
    } else {
      throw new Error('Server offline');
    }
  } catch (error) {
    res.json({
      success: false,
      online: false,
      ip,
      port,
      message: 'Server Offline atau Tidak Merespon'
    });
  }
});

// Start server
app.listen(PORT, async () => {
  await initDatabase();
  console.log(`Server running on port ${PORT}`);
});

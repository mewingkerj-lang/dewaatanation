import express, { Request, Response } from "express";
import mysql from "mysql2/promise";
import crypto from "crypto";
import session from "express-session";
import bodyParser from "body-parser";

const app = express();
const PORT = process.env.PORT || 3000;

// Database configuration
const dbConfig = {
  host: process.env.DB_HOST || "208.84.103.75",
  user: process.env.DB_USER || "u1649_NtHPQzNRvz",
  password: process.env.DB_PASSWORD || "qJHEEZZraPLuQGGOtHPSvWT=",
  database: process.env.DB_NAME || "s1649_Dewata",
  port: parseInt(process.env.DB_PORT || "3306"),
};

let db: mysql.Connection | null = null;

async function connectDB() {
  try {
    db = await mysql.createConnection(dbConfig);
    console.log("✅ Database connected successfully");
    return true;
  } catch (err) {
    console.error("❌ Database connection failed:", err);
    return false;
  }
}

// MD5 hash function
function md5(str: string): string {
  return crypto.createHash("md5").update(str).digest("hex").toLowerCase();
}

// Replicate SAMP hashit function
function hashit(salt: string, password: string): string {
  const step3 = (md5(salt) + md5(password)).toLowerCase();
  return md5(step3).toLowerCase();
}

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(
  session({
    secret: process.env.SESSION_SECRET || "dewatanation-secret-2024",
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false, maxAge: 24 * 60 * 60 * 1000 },
  })
);

// Auth middleware
function requireAuth(req: Request, res: Response, next: Function) {
  const sess = req.session as any;
  if (!sess.authenticated) {
    return res.status(401).json({ success: false, message: "Unauthorized" });
  }
  next();
}

// ========== API ROUTES ==========

// DB Status
app.get("/api/db-status", async (req, res) => {
  if (!db) {
    const connected = await connectDB();
    return res.json({ connected });
  }
  try {
    await db.ping();
    res.json({ connected: true });
  } catch {
    db = null;
    res.json({ connected: false });
  }
});

// Connect DB
app.post("/api/db-connect", async (req, res) => {
  const { host, user, password, database, port } = req.body;
  try {
    db = await mysql.createConnection({
      host: host || dbConfig.host,
      user: user || dbConfig.user,
      password: password || dbConfig.password,
      database: database || dbConfig.database,
      port: parseInt(port) || dbConfig.port,
    });
    res.json({ success: true, message: "Database connected!" });
  } catch (err: any) {
    res.json({ success: false, message: err.message });
  }
});

// Login - Step 1: Check account
app.post("/api/login", async (req, res) => {
  if (!db) return res.json({ success: false, message: "Database not connected" });
  const { username, password } = req.body;
  try {
    const [rows]: any = await db.execute(
      "SELECT pName, pPassword, pass_salt FROM accounts WHERE pName = ?",
      [username]
    );
    if (rows.length === 0) return res.json({ success: false, message: "Username tidak ditemukan" });
    const user = rows[0];
    const hashed = hashit(user.pass_salt, password);
    if (hashed !== user.pPassword) return res.json({ success: false, message: "Password salah" });
    const sess = req.session as any;
    sess.username = username;
    sess.step = "admin_key";
    res.json({ success: true, message: "Password benar, masukkan Admin Key" });
  } catch (err: any) {
    res.json({ success: false, message: err.message });
  }
});

// Login - Step 2: Check admin key
app.post("/api/verify-admin", async (req, res) => {
  if (!db) return res.json({ success: false, message: "Database not connected" });
  const sess = req.session as any;
  if (!sess.username) return res.json({ success: false, message: "Session expired" });
  const { adminKey } = req.body;
  try {
    const [rows]: any = await db.execute(
      "SELECT Name, pAdminKey FROM admin WHERE Name = ?",
      [sess.username]
    );
    if (rows.length === 0) return res.json({ success: false, message: "Bukan admin" });
    if (rows[0].pAdminKey !== adminKey) return res.json({ success: false, message: "Admin key salah" });
    sess.authenticated = true;
    sess.adminName = sess.username;
    res.json({ success: true, message: "Login berhasil!" });
  } catch (err: any) {
    res.json({ success: false, message: err.message });
  }
});

// Logout
app.post("/api/logout", (req, res) => {
  req.session.destroy(() => res.json({ success: true }));
});

// Session check
app.get("/api/session", (req, res) => {
  const sess = req.session as any;
  res.json({ authenticated: !!sess.authenticated, username: sess.adminName });
});

// Getcord list
app.get("/api/getcord", requireAuth, async (req, res) => {
  if (!db) return res.json({ success: false, message: "DB not connected" });
  try {
    const [rows]: any = await db.execute("SELECT id, Name, X, Y, Z, A FROM getcord ORDER BY id");
    res.json({ success: true, data: rows });
  } catch (err: any) {
    res.json({ success: false, message: err.message });
  }
});

// Delete getcord
app.delete("/api/getcord/:id", requireAuth, async (req, res) => {
  if (!db) return res.json({ success: false, message: "DB not connected" });
  try {
    await db.execute("DELETE FROM getcord WHERE id = ?", [req.params.id]);
    res.json({ success: true });
  } catch (err: any) {
    res.json({ success: false, message: err.message });
  }
});

// Check username exists
app.get("/api/check-user/:username", requireAuth, async (req, res) => {
  if (!db) return res.json({ success: false, message: "DB not connected" });
  try {
    const [rows]: any = await db.execute("SELECT pName FROM accounts WHERE pName = ?", [req.params.username]);
    res.json({ exists: rows.length > 0 });
  } catch (err: any) {
    res.json({ exists: false, message: err.message });
  }
});

// Set money
app.post("/api/set-money", requireAuth, async (req, res) => {
  if (!db) return res.json({ success: false, message: "DB not connected" });
  const { username, value, type } = req.body;
  const validTypes = ["pRouble", "pCash", "pBank", "pUangMerah"];
  if (!validTypes.includes(type)) return res.json({ success: false, message: "Tipe tidak valid" });
  if (parseInt(value) > 500000000) return res.json({ success: false, message: "Value melebihi 500 Juta!" });
  try {
    const [rows]: any = await db.execute("SELECT pName FROM accounts WHERE pName = ?", [username]);
    if (rows.length === 0) return res.json({ success: false, message: "Username tidak ditemukan" });
    await db.execute(`UPDATE accounts SET ${type} = ? WHERE pName = ?`, [value, username]);
    res.json({ success: true, message: `Berhasil set ${type} untuk ${username}` });
  } catch (err: any) {
    res.json({ success: false, message: err.message });
  }
});

// Set items
app.post("/api/set-items", requireAuth, async (req, res) => {
  if (!db) return res.json({ success: false, message: "DB not connected" });
  const { username, value, type } = req.body;
  const validTypes = ["pBatu","pBatuk","pFish","pPenyu","pDolphin","pHiu","pMegalodon","pCaught","pPadi","pAyam","pSemen","pEmas","pSusu","pMinyak","pAyamKemas","pAyamPotong","pAyamHidup","pBulu"];
  if (!validTypes.includes(type)) return res.json({ success: false, message: "Tipe tidak valid" });
  if (parseInt(value) > 500) return res.json({ success: false, message: "Value melebihi 500!" });
  try {
    const [rows]: any = await db.execute("SELECT pName FROM accounts WHERE pName = ?", [username]);
    if (rows.length === 0) return res.json({ success: false, message: "Username tidak ditemukan" });
    await db.execute(`UPDATE accounts SET ${type} = ? WHERE pName = ?`, [value, username]);
    res.json({ success: true, message: `Berhasil set ${type} untuk ${username}` });
  } catch (err: any) {
    res.json({ success: false, message: err.message });
  }
});

// Set account
app.post("/api/set-account", requireAuth, async (req, res) => {
  if (!db) return res.json({ success: false, message: "DB not connected" });
  const { username, value, type } = req.body;
  const validTypes = ["pDrugs","pMicin","pSteroid","pComponent","pMetall","pFood","pDrink"];
  if (!validTypes.includes(type)) return res.json({ success: false, message: "Tipe tidak valid" });
  if (parseInt(value) > 700) return res.json({ success: false, message: "Value melebihi 700!" });
  try {
    const [rows]: any = await db.execute("SELECT pName FROM accounts WHERE pName = ?", [username]);
    if (rows.length === 0) return res.json({ success: false, message: "Username tidak ditemukan" });
    await db.execute(`UPDATE accounts SET ${type} = ? WHERE pName = ?`, [value, username]);
    res.json({ success: true, message: `Berhasil set ${type} untuk ${username}` });
  } catch (err: any) {
    res.json({ success: false, message: err.message });
  }
});

// Set property
app.post("/api/set-property", requireAuth, async (req, res) => {
  if (!db) return res.json({ success: false, message: "DB not connected" });
  const { username, type, value } = req.body;
  const validTypes = ["pSkin","pMaskID","pCS","pFreeRoulet"];
  if (!validTypes.includes(type)) return res.json({ success: false, message: "Tipe tidak valid" });
  try {
    const [rows]: any = await db.execute("SELECT pName FROM accounts WHERE pName = ?", [username]);
    if (rows.length === 0) return res.json({ success: false, message: "Username tidak ditemukan" });
    if (type === "pMaskID" && (parseInt(value) < 0 || parseInt(value) > 9999)) return res.json({ success: false, message: "MaskID max 4 digit" });
    if (type === "pFreeRoulet" && parseInt(value) > 300) return res.json({ success: false, message: "Max gacha 300" });
    await db.execute(`UPDATE accounts SET ${type} = ? WHERE pName = ?`, [value, username]);
    res.json({ success: true, message: `Berhasil set ${type} untuk ${username}` });
  } catch (err: any) {
    res.json({ success: false, message: err.message });
  }
});

// Admin log
app.get("/api/admin-log", requireAuth, async (req, res) => {
  if (!db) return res.json({ success: false, message: "DB not connected" });
  try {
    const [rows]: any = await db.execute("SELECT user_id, action, date FROM admin_log ORDER BY date DESC LIMIT 200");
    res.json({ success: true, data: rows });
  } catch (err: any) {
    res.json({ success: false, message: err.message });
  }
});

// ========== FRONTEND ==========
app.get("*", (req, res) => {
  res.setHeader("Content-Type", "text/html");
  res.send(`<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1.0"/>
<title>DewataNation RP - Admin Panel</title>
<link rel="preconnect" href="https://fonts.googleapis.com"/>
<link href="https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;900&family=Rajdhani:wght@300;400;500;600;700&family=Share+Tech+Mono&display=swap" rel="stylesheet"/>
<style>
*{margin:0;padding:0;box-sizing:border-box;}
:root{
  --bg:#050a0f;
  --bg2:#0a1520;
  --bg3:#0f1e2e;
  --card:#0d1a26;
  --border:#1a3a5c;
  --accent:#00d4ff;
  --accent2:#ff6b00;
  --accent3:#00ff88;
  --text:#c8e4f0;
  --text2:#5a8aa0;
  --danger:#ff3b5c;
  --success:#00ff88;
  --warn:#ffaa00;
  --sidebar-w:280px;
}
body{
  font-family:'Rajdhani',sans-serif;
  background:var(--bg);
  color:var(--text);
  min-height:100vh;
  overflow-x:hidden;
}
/* Scanline overlay */
body::before{
  content:'';
  position:fixed;inset:0;
  background:repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(0,212,255,0.015) 2px,rgba(0,212,255,0.015) 4px);
  pointer-events:none;z-index:9999;
}

/* ======= LOADING ======= */
#loading-screen{
  position:fixed;inset:0;
  background:var(--bg);
  display:flex;flex-direction:column;align-items:center;justify-content:center;
  z-index:10000;transition:opacity .5s;
}
.loading-logo{
  font-family:'Orbitron',monospace;
  font-size:2rem;font-weight:900;
  color:var(--accent);
  text-shadow:0 0 30px var(--accent);
  margin-bottom:2rem;letter-spacing:4px;
}
.loading-bar-wrap{
  width:300px;height:4px;background:var(--bg3);border-radius:2px;overflow:hidden;
  border:1px solid var(--border);
}
.loading-bar{
  height:100%;width:0%;
  background:linear-gradient(90deg,var(--accent),var(--accent2));
  border-radius:2px;
  transition:width .1s;
  box-shadow:0 0 10px var(--accent);
}
.loading-text{
  margin-top:1rem;font-family:'Share Tech Mono',monospace;
  color:var(--text2);font-size:.85rem;letter-spacing:2px;
}

/* ======= DB CONNECT MODAL ======= */
#db-modal{
  position:fixed;inset:0;
  background:rgba(0,0,0,.85);
  display:flex;align-items:center;justify-content:center;
  z-index:900;
}
.db-modal-box{
  background:var(--card);
  border:1px solid var(--accent);
  border-radius:12px;padding:2rem;width:90%;max-width:440px;
  box-shadow:0 0 40px rgba(0,212,255,.15);
}
.db-modal-box h2{
  font-family:'Orbitron',monospace;
  color:var(--accent);font-size:1.1rem;
  margin-bottom:1.5rem;text-align:center;letter-spacing:2px;
}

/* ======= LOGIN ======= */
#login-section{
  position:fixed;inset:0;
  display:flex;align-items:center;justify-content:center;
  z-index:800;
  background:radial-gradient(ellipse at 30% 50%,rgba(0,212,255,.05) 0%,transparent 60%),
             radial-gradient(ellipse at 70% 50%,rgba(255,107,0,.05) 0%,transparent 60%),var(--bg);
}
.login-box{
  width:90%;max-width:480px;
  background:var(--card);
  border:1px solid var(--border);
  border-radius:16px;overflow:hidden;
  box-shadow:0 0 60px rgba(0,212,255,.1);
  animation:fadeSlide .6s ease;
}
@keyframes fadeSlide{from{opacity:0;transform:translateY(30px)}to{opacity:1;transform:translateY(0)}}
.login-banner{
  width:100%;height:180px;object-fit:cover;object-position:center;
  display:block;
}
.login-body{padding:2rem;}
.login-body h1{
  font-family:'Orbitron',monospace;
  font-size:1.3rem;color:var(--accent);
  letter-spacing:3px;margin-bottom:.3rem;
  text-shadow:0 0 20px rgba(0,212,255,.5);
}
.login-body p{color:var(--text2);font-size:.9rem;margin-bottom:1.5rem;}

/* ======= FORM ELEMENTS ======= */
.form-group{margin-bottom:1rem;}
label{display:block;font-size:.85rem;color:var(--text2);margin-bottom:.4rem;letter-spacing:1px;font-weight:600;}
input,select{
  width:100%;padding:.7rem 1rem;
  background:rgba(0,0,0,.4);
  border:1px solid var(--border);
  border-radius:8px;color:var(--text);
  font-family:'Rajdhani',sans-serif;font-size:1rem;
  transition:border .2s,box-shadow .2s;outline:none;
}
input:focus,select:focus{
  border-color:var(--accent);
  box-shadow:0 0 15px rgba(0,212,255,.2);
}
select option{background:var(--bg3);}

/* ======= BUTTONS ======= */
.btn{
  padding:.7rem 1.4rem;border:none;cursor:pointer;
  border-radius:8px;font-family:'Rajdhani',sans-serif;
  font-size:1rem;font-weight:700;letter-spacing:1px;
  transition:all .2s;position:relative;overflow:hidden;
}
.btn::after{
  content:'';position:absolute;inset:0;
  background:linear-gradient(rgba(255,255,255,.1),transparent);
  opacity:0;transition:opacity .2s;
}
.btn:hover::after{opacity:1;}
.btn-primary{
  background:linear-gradient(135deg,var(--accent),#0088aa);
  color:#000;width:100%;
  box-shadow:0 4px 20px rgba(0,212,255,.3);
}
.btn-primary:hover{box-shadow:0 4px 30px rgba(0,212,255,.5);transform:translateY(-1px);}
.btn-danger{background:linear-gradient(135deg,var(--danger),#aa0022);color:#fff;}
.btn-danger:hover{box-shadow:0 4px 20px rgba(255,59,92,.4);}
.btn-success{background:linear-gradient(135deg,var(--success),#00aa55);color:#000;}
.btn-success:hover{box-shadow:0 4px 20px rgba(0,255,136,.4);}
.btn-copy{
  background:transparent;border:1px solid var(--border);
  color:var(--accent);padding:.35rem .7rem;font-size:.8rem;
  border-radius:6px;cursor:pointer;transition:all .2s;
  font-family:'Share Tech Mono',monospace;
}
.btn-copy:hover{background:rgba(0,212,255,.1);border-color:var(--accent);}
.btn-sm{padding:.4rem .8rem;font-size:.85rem;}

/* ======= TOAST ======= */
#toast-container{
  position:fixed;top:1.5rem;right:1.5rem;
  z-index:20000;display:flex;flex-direction:column;gap:.5rem;
}
.toast{
  padding:.8rem 1.2rem;border-radius:8px;
  font-family:'Share Tech Mono',monospace;font-size:.85rem;
  animation:toastIn .3s ease;min-width:220px;max-width:320px;
  border:1px solid;
}
@keyframes toastIn{from{opacity:0;transform:translateX(50px)}to{opacity:1;transform:translateX(0)}}
.toast.success{background:rgba(0,255,136,.15);border-color:var(--success);color:var(--success);}
.toast.error{background:rgba(255,59,92,.15);border-color:var(--danger);color:var(--danger);}
.toast.info{background:rgba(0,212,255,.15);border-color:var(--accent);color:var(--accent);}

/* ======= MAIN LAYOUT ======= */
#app{display:none;min-height:100vh;}

/* ======= SIDEBAR ======= */
#sidebar{
  position:fixed;top:0;left:0;bottom:0;
  width:var(--sidebar-w);
  background:var(--bg2);
  border-right:1px solid var(--border);
  transform:translateX(0);
  transition:transform .3s cubic-bezier(.4,0,.2,1);
  z-index:500;display:flex;flex-direction:column;
  box-shadow:4px 0 30px rgba(0,0,0,.5);
}
#sidebar.closed{transform:translateX(calc(-1 * var(--sidebar-w)));}
.sidebar-header{
  padding:1.5rem;
  border-bottom:1px solid var(--border);
  display:flex;align-items:center;gap:1rem;
}
.sidebar-logo{
  width:40px;height:40px;border-radius:8px;object-fit:cover;
  border:1px solid var(--border);
}
.sidebar-title{
  font-family:'Orbitron',monospace;font-size:.85rem;
  color:var(--accent);letter-spacing:2px;line-height:1.3;
}
.sidebar-subtitle{font-size:.7rem;color:var(--text2);}
.sidebar-nav{flex:1;overflow-y:auto;padding:1rem 0;}
.nav-item{
  display:flex;align-items:center;gap:.8rem;
  padding:.85rem 1.5rem;cursor:pointer;
  color:var(--text2);font-size:1rem;font-weight:600;
  border-left:3px solid transparent;
  transition:all .2s;letter-spacing:.5px;
}
.nav-item:hover{
  background:rgba(0,212,255,.05);
  color:var(--text);border-left-color:var(--border);
}
.nav-item.active{
  background:rgba(0,212,255,.1);
  color:var(--accent);border-left-color:var(--accent);
}
.nav-icon{font-size:1.2rem;width:24px;text-align:center;}
.sidebar-footer{
  padding:1rem 1.5rem;border-top:1px solid var(--border);
  font-size:.8rem;color:var(--text2);
}
.db-status{
  display:flex;align-items:center;gap:.5rem;
  font-family:'Share Tech Mono',monospace;
  font-size:.75rem;
}
.db-dot{width:8px;height:8px;border-radius:50%;background:var(--danger);}
.db-dot.on{background:var(--success);box-shadow:0 0 8px var(--success);}

/* ======= MAIN CONTENT ======= */
#main{
  margin-left:var(--sidebar-w);
  transition:margin .3s cubic-bezier(.4,0,.2,1);
  min-height:100vh;
}
#main.full{margin-left:0;}

/* ======= TOPBAR ======= */
.topbar{
  position:sticky;top:0;
  background:rgba(5,10,15,.9);
  backdrop-filter:blur(10px);
  border-bottom:1px solid var(--border);
  padding:.8rem 1.5rem;
  display:flex;align-items:center;gap:1rem;
  z-index:400;
}
.sidebar-toggle{
  background:transparent;border:1px solid var(--border);
  color:var(--accent);width:38px;height:38px;border-radius:8px;
  cursor:pointer;font-size:1.2rem;display:flex;align-items:center;justify-content:center;
  transition:all .2s;flex-shrink:0;
}
.sidebar-toggle:hover{background:rgba(0,212,255,.1);border-color:var(--accent);}
.topbar-title{
  font-family:'Orbitron',monospace;font-size:1rem;
  color:var(--accent);letter-spacing:2px;
}
.topbar-right{margin-left:auto;display:flex;align-items:center;gap:1rem;}
.admin-badge{
  font-family:'Share Tech Mono',monospace;
  font-size:.8rem;color:var(--text2);
  border:1px solid var(--border);border-radius:20px;
  padding:.3rem .8rem;
}

/* ======= CONTENT ======= */
.content{padding:2rem;max-width:1200px;}
.page{display:none;}
.page.active{display:block;animation:pageIn .3s ease;}
@keyframes pageIn{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}

/* ======= CARDS ======= */
.card{
  background:var(--card);
  border:1px solid var(--border);
  border-radius:12px;padding:1.5rem;
  margin-bottom:1.5rem;
}
.card-title{
  font-family:'Orbitron',monospace;
  font-size:.9rem;color:var(--accent);
  letter-spacing:2px;margin-bottom:1rem;
  padding-bottom:.8rem;border-bottom:1px solid var(--border);
}
.stat-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:1rem;margin-bottom:1.5rem;}
.stat-card{
  background:var(--bg3);border:1px solid var(--border);
  border-radius:10px;padding:1.2rem;
  position:relative;overflow:hidden;
}
.stat-card::before{
  content:'';position:absolute;top:0;left:0;right:0;height:2px;
  background:linear-gradient(90deg,var(--accent),transparent);
}
.stat-value{
  font-family:'Orbitron',monospace;font-size:1.4rem;
  color:var(--accent);margin:.3rem 0;
}
.stat-label{font-size:.8rem;color:var(--text2);letter-spacing:1px;}

/* ======= INFO ROWS ======= */
.info-row{
  display:flex;align-items:center;gap:1rem;
  padding:.8rem;background:var(--bg3);
  border-radius:8px;margin-bottom:.5rem;
  border:1px solid var(--border);
  flex-wrap:wrap;
}
.info-label{color:var(--text2);font-size:.85rem;min-width:80px;}
.info-value{
  font-family:'Share Tech Mono',monospace;
  color:var(--accent);flex:1;word-break:break-all;
}

/* ======= TABLE ======= */
.table-wrap{overflow-x:auto;border-radius:8px;border:1px solid var(--border);}
table{width:100%;border-collapse:collapse;}
thead{background:var(--bg3);}
th{
  padding:.8rem 1rem;text-align:left;
  font-family:'Orbitron',monospace;font-size:.7rem;
  color:var(--accent);letter-spacing:2px;
  border-bottom:1px solid var(--border);
}
td{
  padding:.8rem 1rem;font-family:'Share Tech Mono',monospace;
  font-size:.85rem;border-bottom:1px solid rgba(26,58,92,.3);
  color:var(--text);
}
tr:last-child td{border-bottom:none;}
tr:hover td{background:rgba(0,212,255,.03);}

/* ======= SET MENU TABS ======= */
.tabs{display:flex;gap:.5rem;margin-bottom:1.5rem;flex-wrap:wrap;}
.tab{
  padding:.5rem 1rem;border-radius:8px;cursor:pointer;
  font-size:.85rem;font-weight:600;letter-spacing:1px;
  border:1px solid var(--border);color:var(--text2);
  background:transparent;transition:all .2s;
}
.tab.active,.tab:hover{
  background:rgba(0,212,255,.1);
  color:var(--accent);border-color:var(--accent);
}
.tab-content{display:none;}
.tab-content.active{display:block;}

/* ======= BANNER ======= */
.banner{
  width:100%;border-radius:12px;overflow:hidden;margin-bottom:1.5rem;
  border:1px solid var(--border);
  box-shadow:0 0 30px rgba(0,212,255,.1);
}
.banner img{width:100%;max-height:220px;object-fit:cover;display:block;}

/* ======= OVERLAY ======= */
#sidebar-overlay{
  position:fixed;inset:0;background:rgba(0,0,0,.5);
  z-index:499;display:none;
}

/* ======= RESPONSIVE ======= */
@media(max-width:768px){
  :root{--sidebar-w:260px;}
  #sidebar{transform:translateX(calc(-1 * var(--sidebar-w)));}
  #sidebar.open{transform:translateX(0);}
  #sidebar-overlay{display:none;}
  #sidebar.open ~ #sidebar-overlay,
  body.sb-open #sidebar-overlay{display:block;}
  #main{margin-left:0!important;}
  .content{padding:1rem;}
}

/* Glow pulse on accent */
@keyframes glow{
  0%,100%{text-shadow:0 0 10px rgba(0,212,255,.5);}
  50%{text-shadow:0 0 25px rgba(0,212,255,1),0 0 50px rgba(0,212,255,.4);}
}
.glow{animation:glow 2s infinite;}

/* Radio group */
.radio-group{display:flex;flex-wrap:wrap;gap:.5rem;margin-top:.3rem;}
.radio-item{
  display:flex;align-items:center;gap:.4rem;
  padding:.4rem .8rem;border:1px solid var(--border);
  border-radius:6px;cursor:pointer;transition:all .2s;
  font-size:.85rem;
}
.radio-item:hover,.radio-item.selected{
  border-color:var(--accent);background:rgba(0,212,255,.1);color:var(--accent);
}
.radio-item input{display:none;}
</style>
</head>
<body>

<!-- Toast -->
<div id="toast-container"></div>

<!-- Sidebar Overlay -->
<div id="sidebar-overlay" onclick="closeSidebar()"></div>

<!-- Loading Screen -->
<div id="loading-screen">
  <div class="loading-logo glow">DEWATA<span style="color:var(--accent2)">NATION</span></div>
  <div style="font-family:'Share Tech Mono',monospace;color:var(--text2);font-size:.8rem;margin-bottom:1.5rem;letter-spacing:3px;">ROLEPLAY - ADMIN PANEL</div>
  <div class="loading-bar-wrap"><div class="loading-bar" id="loading-bar"></div></div>
  <div class="loading-text" id="loading-text">INITIALIZING SYSTEM...</div>
</div>

<!-- DB Connect Modal -->
<div id="db-modal" style="display:none;">
  <div class="db-modal-box">
    <h2>⚡ DATABASE CONNECTION</h2>
    <div class="form-group"><label>HOST</label><input id="db-host" placeholder="localhost" value="208.84.103.75"/></div>
    <div class="form-group"><label>PORT</label><input id="db-port" placeholder="3306" value="3306"/></div>
    <div class="form-group"><label>USER</label><input id="db-user" placeholder="root" value="u1649_NtHPQzNRvz"/></div>
    <div class="form-group"><label>PASSWORD</label><input id="db-pass" type="password" placeholder="password" value="qJHEEZZraPLuQGGOtHPSvWT="/></div>
    <div class="form-group"><label>DATABASE</label><input id="db-name" placeholder="samp_db" value="s1649_Dewata"/></div>
    <button class="btn btn-primary" onclick="connectDB()">CONNECT DATABASE</button>
  </div>
</div>

<!-- Login -->
<div id="login-section">
  <div class="login-box">
    <img class="login-banner" src="https://logo-dewata-nationrp.edgeone.app/IMG-20260131-WA0425.jpg" alt="DewataNation Banner" onerror="this.style.display='none'"/>
    <div class="login-body">
      <h1>ADMIN PANEL</h1>
      <p>DewataNation RolePlay — SA-MP Server</p>

      <!-- Step 1 -->
      <div id="step-login">
        <div class="form-group"><label>USERNAME</label><input id="l-user" placeholder="Masukkan username..."/></div>
        <div class="form-group"><label>PASSWORD</label><input id="l-pass" type="password" placeholder="Masukkan password..."/></div>
        <button class="btn btn-primary" onclick="doLogin()">LOGIN</button>
      </div>

      <!-- Step 2 -->
      <div id="step-adminkey" style="display:none;">
        <div style="background:rgba(0,255,136,.1);border:1px solid var(--success);border-radius:8px;padding:.8rem;margin-bottom:1rem;font-size:.9rem;color:var(--success);">
          ✅ Password terverifikasi! Masukkan Admin Key.
        </div>
        <div class="form-group"><label>ADMIN KEY</label><input id="l-adminkey" type="password" placeholder="Masukkan admin key..."/></div>
        <button class="btn btn-primary" onclick="doVerifyAdmin()">VERIFY ADMIN KEY</button>
      </div>
    </div>
  </div>
</div>

<!-- App -->
<div id="app">
  <!-- Sidebar -->
  <div id="sidebar">
    <div class="sidebar-header">
      <img class="sidebar-logo" src="https://logo-dewata-nationrp.edgeone.app/IMG-20260131-WA0425.jpg" alt="Logo" onerror="this.style.background='var(--bg3)'"/>
      <div>
        <div class="sidebar-title">DEWATA<br>NATION RP</div>
        <div class="sidebar-subtitle">Admin Control Panel</div>
      </div>
    </div>
    <nav class="sidebar-nav">
      <div class="nav-item active" onclick="navigate('dashboard')">
        <span class="nav-icon">🏠</span> Dashboard
      </div>
      <div class="nav-item" onclick="navigate('getcord')">
        <span class="nav-icon">📍</span> Getcord List
      </div>
      <div class="nav-item" onclick="navigate('setmenu')">
        <span class="nav-icon">⚙️</span> Set Menu
      </div>
      <div class="nav-item" onclick="navigate('adminlog')">
        <span class="nav-icon">📋</span> Admin Log
      </div>
    </nav>
    <div class="sidebar-footer">
      <div class="db-status">
        <div class="db-dot" id="db-dot"></div>
        <span id="db-status-text">Checking DB...</span>
      </div>
      <div style="margin-top:.8rem;">
        <button class="btn btn-danger btn-sm" style="width:100%;" onclick="doLogout()">LOGOUT</button>
      </div>
    </div>
  </div>

  <!-- Main -->
  <div id="main">
    <div class="topbar">
      <button class="sidebar-toggle" onclick="toggleSidebar()">☰</button>
      <div class="topbar-title" id="topbar-title">DASHBOARD</div>
      <div class="topbar-right">
        <div class="admin-badge">👤 <span id="admin-name-display">Admin</span></div>
      </div>
    </div>
    <div class="content">

      <!-- DASHBOARD -->
      <div class="page active" id="page-dashboard">
        <div class="banner">
          <img src="https://logo-dewata-nationrp.edgeone.app/IMG-20260131-WA0425.jpg" alt="Banner"/>
        </div>
        <div class="stat-grid">
          <div class="stat-card">
            <div class="stat-label">SERVER STATUS</div>
            <div class="stat-value" style="color:var(--success);">ONLINE</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">GAMEMODE</div>
            <div class="stat-value" style="font-size:1rem;">DewataNation RP</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">VERSION</div>
            <div class="stat-value" style="font-size:1rem;">SA-MP 0.3.7</div>
          </div>
        </div>
        <div class="card">
          <div class="card-title">SERVER INFORMATION</div>
          <div class="info-row">
            <div class="nav-icon">🌐</div>
            <div class="info-label">IP & PORT</div>
            <div class="info-value">208.84.103.75:7103</div>
            <button class="btn-copy" onclick="copyText('208.84.103.75:7103','IP berhasil disalin!')">📋 COPY</button>
          </div>
          <div class="info-row">
            <div class="nav-icon">💬</div>
            <div class="info-label">WhatsApp</div>
            <div class="info-value" style="word-break:break-all;">https://chat.whatsapp.com/GQ1V4a5ieKbHiXZLxqQx99</div>
            <button class="btn-copy" onclick="copyText('https://chat.whatsapp.com/GQ1V4a5ieKbHiXZLxqQx99','Link WA berhasil disalin!')">📋 COPY</button>
          </div>
        </div>
        <div class="card">
          <div class="card-title">PANEL INFORMATION</div>
          <p style="color:var(--text2);line-height:1.8;font-size:.95rem;">
            Selamat datang di <span style="color:var(--accent);font-weight:700;">DewataNation RolePlay Admin Panel</span>.
            Panel ini digunakan untuk mengelola server SA-MP DewataNation RP. Gunakan menu sidebar untuk mengakses berbagai fitur administrasi.
            <br><br>
            ⚠️ <span style="color:var(--warn);">Harap gunakan panel ini dengan bijaksana. Semua aktifitas akan tercatat di Admin Log.</span>
          </p>
        </div>
      </div>

      <!-- GETCORD -->
      <div class="page" id="page-getcord">
        <div class="card">
          <div class="card-title">📍 GETCORD LIST</div>
          <button class="btn btn-primary btn-sm" style="width:auto;margin-bottom:1rem;" onclick="loadGetcord()">🔄 REFRESH</button>
          <div class="table-wrap">
            <table>
              <thead><tr><th>ID</th><th>NAME</th><th>X</th><th>Y</th><th>Z</th><th>A</th><th>ACTION</th></tr></thead>
              <tbody id="getcord-tbody"><tr><td colspan="7" style="text-align:center;color:var(--text2);">Klik Refresh untuk memuat data</td></tr></tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- SET MENU -->
      <div class="page" id="page-setmenu">
        <div class="tabs">
          <div class="tab active" onclick="switchSetTab('money',this)">💰 Money</div>
          <div class="tab" onclick="switchSetTab('items',this)">🎒 Items</div>
          <div class="tab" onclick="switchSetTab('account',this)">🧪 Account</div>
          <div class="tab" onclick="switchSetTab('property',this)">🏠 Property</div>
        </div>

        <!-- Money -->
        <div class="tab-content active" id="set-money">
          <div class="card">
            <div class="card-title">💰 SET MONEY USER</div>
            <div class="form-group"><label>USERNAME</label><input id="m-user" placeholder="Masukkan username player..."/></div>
            <div class="form-group"><label>VALUE</label><input id="m-val" type="number" placeholder="0 - 500.000.000"/></div>
            <div class="form-group">
              <label>TIPE UANG</label>
              <div class="radio-group" id="m-type-group">
                <div class="radio-item selected" onclick="selectRadio('m-type-group','pRouble',this)">💎 Donate Coin (pRouble)</div>
                <div class="radio-item" onclick="selectRadio('m-type-group','pCash',this)">💵 Cash (pCash)</div>
                <div class="radio-item" onclick="selectRadio('m-type-group','pBank',this)">🏦 Bank (pBank)</div>
                <div class="radio-item" onclick="selectRadio('m-type-group','pUangMerah',this)">🔴 Uang Merah (pUangMerah)</div>
              </div>
              <input type="hidden" id="m-type" value="pRouble"/>
            </div>
            <button class="btn btn-success btn-sm" onclick="setMoney()">✅ SET MONEY</button>
          </div>
        </div>

        <!-- Items -->
        <div class="tab-content" id="set-items">
          <div class="card">
            <div class="card-title">🎒 SET ITEMS USER</div>
            <div class="form-group"><label>USERNAME</label><input id="i-user" placeholder="Masukkan username player..."/></div>
            <div class="form-group"><label>VALUE (max 500)</label><input id="i-val" type="number" placeholder="0 - 500"/></div>
            <div class="form-group">
              <label>TIPE ITEM</label>
              <select id="i-type">
                <option value="pBatu">Batu Bersih (pBatu)</option>
                <option value="pBatuk">Batu Kotor (pBatuk)</option>
                <option value="pFish">Ikan (pFish)</option>
                <option value="pPenyu">Penyu (pPenyu)</option>
                <option value="pDolphin">Dolphin (pDolphin)</option>
                <option value="pHiu">Hiu (pHiu)</option>
                <option value="pMegalodon">Megalodon (pMegalodon)</option>
                <option value="pCaught">Umpan Mancing (pCaught)</option>
                <option value="pPadi">Padi (pPadi)</option>
                <option value="pAyam">Ayam (pAyam)</option>
                <option value="pSemen">Semen (pSemen)</option>
                <option value="pEmas">Emas (pEmas)</option>
                <option value="pSusu">Susu Sapi (pSusu)</option>
                <option value="pMinyak">Minyak (pMinyak)</option>
                <option value="pAyamKemas">Ayam Kemas (pAyamKemas)</option>
                <option value="pAyamPotong">Ayam Potong (pAyamPotong)</option>
                <option value="pAyamHidup">Ayam Hidup (pAyamHidup)</option>
                <option value="pBulu">Bulu Ayam (pBulu)</option>
              </select>
            </div>
            <button class="btn btn-success btn-sm" onclick="setItems()">✅ SET ITEMS</button>
          </div>
        </div>

        <!-- Account -->
        <div class="tab-content" id="set-account">
          <div class="card">
            <div class="card-title">🧪 SET ACCOUNT USER</div>
            <div class="form-group"><label>USERNAME</label><input id="a-user" placeholder="Masukkan username player..."/></div>
            <div class="form-group"><label>VALUE (max 700)</label><input id="a-val" type="number" placeholder="0 - 700"/></div>
            <div class="form-group">
              <label>TIPE</label>
              <select id="a-type">
                <option value="pDrugs">Drugs (pDrugs)</option>
                <option value="pMicin">Marijuana (pMicin)</option>
                <option value="pSteroid">Steroid (pSteroid)</option>
                <option value="pComponent">Component (pComponent)</option>
                <option value="pMetall">Besi (pMetall)</option>
                <option value="pFood">Makanan (pFood)</option>
                <option value="pDrink">Minuman (pDrink)</option>
              </select>
            </div>
            <button class="btn btn-success btn-sm" onclick="setAccount()">✅ SET ACCOUNT</button>
          </div>
        </div>

        <!-- Property -->
        <div class="tab-content" id="set-property">
          <div class="card">
            <div class="card-title">🏠 SET PROPERTY USER</div>
            <div class="form-group"><label>USERNAME</label><input id="p-user" placeholder="Masukkan username player..."/></div>
            <div class="form-group">
              <label>TIPE PROPERTY</label>
              <select id="p-type" onchange="updatePropertyInput()">
                <option value="pSkin">Set Skin (pSkin)</option>
                <option value="pMaskID">Set Mask ID (pMaskID)</option>
                <option value="pCS">Set CS / Custom Skin (pCS)</option>
                <option value="pFreeRoulet">Set Gacha (pFreeRoulet)</option>
              </select>
            </div>
            <div id="p-value-wrap" class="form-group">
              <label id="p-value-label">SKIN ID</label>
              <input id="p-val" type="number" placeholder="Masukkan skin ID..."/>
            </div>
            <div id="p-cs-wrap" style="display:none;" class="form-group">
              <label>CS STATUS</label>
              <div class="radio-group" id="cs-group">
                <div class="radio-item selected" onclick="selectRadio('cs-group','1',this)">✅ Aktifkan (1)</div>
                <div class="radio-item" onclick="selectRadio('cs-group','0',this)">❌ Nonaktifkan (0)</div>
              </div>
              <input type="hidden" id="cs-val" value="1"/>
            </div>
            <button class="btn btn-success btn-sm" onclick="setProperty()">✅ SET PROPERTY</button>
          </div>
        </div>
      </div>

      <!-- ADMIN LOG -->
      <div class="page" id="page-adminlog">
        <div class="card">
          <div class="card-title">📋 ADMIN LOG</div>
          <button class="btn btn-primary btn-sm" style="width:auto;margin-bottom:1rem;" onclick="loadAdminLog()">🔄 REFRESH</button>
          <div class="table-wrap">
            <table>
              <thead><tr><th>USER ID</th><th>ACTION / KEGIATAN</th><th>DATE / WAKTU</th></tr></thead>
              <tbody id="adminlog-tbody"><tr><td colspan="3" style="text-align:center;color:var(--text2);">Klik Refresh untuk memuat data</td></tr></tbody>
            </table>
          </div>
        </div>
      </div>

    </div>
  </div>
</div>

<script>
// ======= STATE =======
let sidebarOpen = true;
let currentPage = 'dashboard';
let radioValues = {};

// ======= LOADING =======
const steps = [
  'INITIALIZING SYSTEM...','LOADING MODULES...','CONNECTING SERVICES...',
  'LOADING ASSETS...','FINALIZING...'
];
let prog = 0;
const bar = document.getElementById('loading-bar');
const lt = document.getElementById('loading-text');
const interval = setInterval(()=>{
  prog += Math.random()*25+5;
  if(prog>=100){prog=100;clearInterval(interval);setTimeout(initApp,400);}
  bar.style.width = prog+'%';
  lt.textContent = steps[Math.min(Math.floor(prog/25),steps.length-1)];
},200);

async function initApp(){
  const ls = document.getElementById('loading-screen');
  ls.style.opacity='0';
  setTimeout(()=>ls.style.display='none',500);
  const sess = await fetch('/api/session').then(r=>r.json());
  if(sess.authenticated){
    showApp(sess.username);
  } else {
    document.getElementById('login-section').style.display='flex';
    checkDBAndShow();
  }
}

async function checkDBAndShow(){
  const r = await fetch('/api/db-status').then(r=>r.json());
  if(!r.connected){
    document.getElementById('db-modal').style.display='flex';
  }
  updateDBStatus(r.connected);
}

function updateDBStatus(connected){
  const dot = document.getElementById('db-dot');
  const txt = document.getElementById('db-status-text');
  if(dot){dot.className='db-dot'+(connected?' on':'');}
  if(txt){txt.textContent=connected?'DB Connected':'DB Disconnected';}
}

async function connectDB(){
  const body = {
    host:document.getElementById('db-host').value,
    port:document.getElementById('db-port').value,
    user:document.getElementById('db-user').value,
    password:document.getElementById('db-pass').value,
    database:document.getElementById('db-name').value,
  };
  const r = await fetch('/api/db-connect',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}).then(r=>r.json());
  if(r.success){
    document.getElementById('db-modal').style.display='none';
    showToast(r.message,'success');
    updateDBStatus(true);
  } else {
    showToast(r.message,'error');
  }
}

// ======= AUTH =======
async function doLogin(){
  const username = document.getElementById('l-user').value.trim();
  const password = document.getElementById('l-pass').value.trim();
  if(!username||!password) return showToast('Isi username dan password!','error');
  const r = await post('/api/login',{username,password});
  if(r.success){
    showToast(r.message,'success');
    document.getElementById('step-login').style.display='none';
    document.getElementById('step-adminkey').style.display='block';
  } else showToast(r.message,'error');
}

async function doVerifyAdmin(){
  const adminKey = document.getElementById('l-adminkey').value.trim();
  if(!adminKey) return showToast('Masukkan Admin Key!','error');
  const r = await post('/api/verify-admin',{adminKey});
  if(r.success){
    showToast('Login berhasil! Selamat datang.','success');
    document.getElementById('login-section').style.display='none';
    const sess = await fetch('/api/session').then(r=>r.json());
    showApp(sess.username);
  } else showToast(r.message,'error');
}

function showApp(username){
  document.getElementById('app').style.display='block';
  document.getElementById('admin-name-display').textContent=username||'Admin';
  checkDBStatus();
}

async function checkDBStatus(){
  const r = await fetch('/api/db-status').then(r=>r.json());
  updateDBStatus(r.connected);
}

async function doLogout(){
  await post('/api/logout',{});
  location.reload();
}

// ======= NAVIGATION =======
function navigate(page){
  document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n=>n.classList.remove('active'));
  document.getElementById('page-'+page).classList.add('active');
  const navMap={dashboard:'Dashboard',getcord:'Getcord List',setmenu:'Set Menu',adminlog:'Admin Log'};
  document.getElementById('topbar-title').textContent=navMap[page]||page.toUpperCase();
  document.querySelectorAll('.nav-item').forEach(n=>{if(n.textContent.toLowerCase().includes(page.split('')[0])){}});
  // highlight nav
  document.querySelectorAll('.nav-item').forEach(n=>{
    if((page==='dashboard'&&n.textContent.includes('Dashboard'))||
       (page==='getcord'&&n.textContent.includes('Getcord'))||
       (page==='setmenu'&&n.textContent.includes('Set'))||
       (page==='adminlog'&&n.textContent.includes('Admin Log')))
      n.classList.add('active');
  });
  currentPage=page;
  if(window.innerWidth<=768) closeSidebar();
  if(page==='getcord') loadGetcord();
  if(page==='adminlog') loadAdminLog();
}

// ======= SIDEBAR =======
function toggleSidebar(){
  const sb=document.getElementById('sidebar');
  const main=document.getElementById('main');
  const overlay=document.getElementById('sidebar-overlay');
  if(window.innerWidth<=768){
    sb.classList.toggle('open');
    document.body.classList.toggle('sb-open');
  } else {
    sidebarOpen=!sidebarOpen;
    sb.classList.toggle('closed',!sidebarOpen);
    main.classList.toggle('full',!sidebarOpen);
  }
}
function closeSidebar(){
  document.getElementById('sidebar').classList.remove('open');
  document.body.classList.remove('sb-open');
}

// ======= GETCORD =======
async function loadGetcord(){
  const tbody=document.getElementById('getcord-tbody');
  tbody.innerHTML='<tr><td colspan="7" style="text-align:center;color:var(--text2);">Loading...</td></tr>';
  const r=await fetch('/api/getcord').then(r=>r.json());
  if(!r.success) return tbody.innerHTML=\`<tr><td colspan="7" style="color:var(--danger);text-align:center;">\${r.message}</td></tr>\`;
  if(!r.data.length) return tbody.innerHTML='<tr><td colspan="7" style="text-align:center;color:var(--text2);">Tidak ada data</td></tr>';
  tbody.innerHTML=r.data.map(c=>\`
    <tr>
      <td><span style="color:var(--accent2);">#\${c.id}</span></td>
      <td>\${c.Name}</td>
      <td>\${parseFloat(c.X).toFixed(4)}</td>
      <td>\${parseFloat(c.Y).toFixed(4)}</td>
      <td>\${parseFloat(c.Z).toFixed(4)}</td>
      <td>\${parseFloat(c.A).toFixed(4)}</td>
      <td style="display:flex;gap:.4rem;flex-wrap:wrap;">
        <button class="btn-copy" onclick="copyText('\${c.X},\${c.Y},\${c.Z},\${c.A}','Koordinat disalin!')">📋 COPY</button>
        <button class="btn btn-danger btn-sm" onclick="deleteGetcord(\${c.id})">🗑️</button>
      </td>
    </tr>
  \`).join('');
}

async function deleteGetcord(id){
  if(!confirm('Hapus koordinat ID '+id+'?')) return;
  const r=await fetch('/api/getcord/'+id,{method:'DELETE'}).then(r=>r.json());
  if(r.success){showToast('Koordinat dihapus!','success');loadGetcord();}
  else showToast(r.message,'error');
}

// ======= SET TABS =======
function switchSetTab(name,el){
  document.querySelectorAll('.tab').forEach(t=>t.classList.remove('active'));
  document.querySelectorAll('.tab-content').forEach(t=>t.classList.remove('active'));
  el.classList.add('active');
  document.getElementById('set-'+name).classList.add('active');
}

function selectRadio(groupId,value,el){
  document.querySelectorAll('#'+groupId+' .radio-item').forEach(r=>r.classList.remove('selected'));
  el.classList.add('selected');
  // find hidden input
  const hiddenInputMap={'m-type-group':'m-type','cs-group':'cs-val'};
  if(hiddenInputMap[groupId]) document.getElementById(hiddenInputMap[groupId]).value=value;
  radioValues[groupId]=value;
}

function updatePropertyInput(){
  const type=document.getElementById('p-type').value;
  const valWrap=document.getElementById('p-value-wrap');
  const csWrap=document.getElementById('p-cs-wrap');
  const valLabel=document.getElementById('p-value-label');
  const valInput=document.getElementById('p-val');
  if(type==='pCS'){
    valWrap.style.display='none';csWrap.style.display='block';
  } else {
    valWrap.style.display='block';csWrap.style.display='none';
    if(type==='pSkin'){valLabel.textContent='SKIN ID';valInput.placeholder='Masukkan skin ID...';}
    else if(type==='pMaskID'){valLabel.textContent='MASK ID (max 4 digit)';valInput.placeholder='0000 - 9999';}
    else if(type==='pFreeRoulet'){valLabel.textContent='JUMLAH GACHA (max 300)';valInput.placeholder='1 - 300';}
  }
}

// ======= SET APIs =======
async function setMoney(){
  const username=document.getElementById('m-user').value.trim();
  const value=document.getElementById('m-val').value;
  const type=document.getElementById('m-type').value;
  if(!username||!value) return showToast('Isi semua field!','error');
  const r=await post('/api/set-money',{username,value,type});
  showToast(r.message,r.success?'success':'error');
}
async function setItems(){
  const username=document.getElementById('i-user').value.trim();
  const value=document.getElementById('i-val').value;
  const type=document.getElementById('i-type').value;
  if(!username||!value) return showToast('Isi semua field!','error');
  const r=await post('/api/set-items',{username,value,type});
  showToast(r.message,r.success?'success':'error');
}
async function setAccount(){
  const username=document.getElementById('a-user').value.trim();
  const value=document.getElementById('a-val').value;
  const type=document.getElementById('a-type').value;
  if(!username||!value) return showToast('Isi semua field!','error');
  const r=await post('/api/set-account',{username,value,type});
  showToast(r.message,r.success?'success':'error');
}
async function setProperty(){
  const username=document.getElementById('p-user').value.trim();
  const type=document.getElementById('p-type').value;
  let value;
  if(type==='pCS') value=document.getElementById('cs-val').value;
  else value=document.getElementById('p-val').value;
  if(!username) return showToast('Isi username!','error');
  if(type!=='pCS'&&!value) return showToast('Isi value!','error');
  const r=await post('/api/set-property',{username,type,value});
  showToast(r.message,r.success?'success':'error');
}

// ======= ADMIN LOG =======
async function loadAdminLog(){
  const tbody=document.getElementById('adminlog-tbody');
  tbody.innerHTML='<tr><td colspan="3" style="text-align:center;color:var(--text2);">Loading...</td></tr>';
  const r=await fetch('/api/admin-log').then(r=>r.json());
  if(!r.success) return tbody.innerHTML=\`<tr><td colspan="3" style="color:var(--danger);text-align:center;">\${r.message}</td></tr>\`;
  if(!r.data.length) return tbody.innerHTML='<tr><td colspan="3" style="text-align:center;color:var(--text2);">Tidak ada log</td></tr>';
  tbody.innerHTML=r.data.map(l=>\`
    <tr>
      <td><span style="color:var(--accent2);">\${l.user_id}</span></td>
      <td style="max-width:400px;word-break:break-word;">\${l.action}</td>
      <td style="color:var(--text2);">\${l.date}</td>
    </tr>
  \`).join('');
}

// ======= UTILS =======
function copyText(text,msg){
  navigator.clipboard.writeText(text).then(()=>showToast(msg||'Disalin!','success')).catch(()=>{
    const ta=document.createElement('textarea');ta.value=text;document.body.appendChild(ta);ta.select();document.execCommand('copy');document.body.removeChild(ta);
    showToast(msg||'Disalin!','success');
  });
}

function showToast(msg,type='info'){
  const c=document.getElementById('toast-container');
  const t=document.createElement('div');
  t.className='toast '+type;
  t.textContent=msg;
  c.appendChild(t);
  setTimeout(()=>{t.style.opacity='0';t.style.transition='opacity .3s';setTimeout(()=>t.remove(),300);},3500);
}

async function post(url,data){
  const r=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});
  return r.json();
}

// Enter key support
document.addEventListener('keydown',e=>{
  if(e.key==='Enter'){
    const step1=document.getElementById('step-login');
    const step2=document.getElementById('step-adminkey');
    if(step1&&step1.style.display!=='none') doLogin();
    else if(step2&&step2.style.display!=='none') doVerifyAdmin();
  }
});
</script>
</body>
</html>`);
});

// Start
async function main() {
  await connectDB();
  app.listen(PORT, () => {
    console.log(`🚀 DewataNation Admin Panel running on port ${PORT}`);
  });
}

main();

# 🚀 S-Proxy Manager

Aplikasi untuk manajemen proxy dengan mudah dan otomatis.

---

## 📋 Deskripsi

Aplikasi ini membantu Anda mengelola multiple proxy secara efisien:
- ✅ Install/Uninstall proxy dengan mudah
- ✅ Auto-restart setiap 5 menit (watchdog)
- ✅ Dashboard monitoring
- ✅ Multi-port support

---

## 🛠️ Persiapan

### 1️⃣ Siapkan Source Code Proxy

Pastikan source code proxy sudah ada di folder **`source`**:

```
c:\sproxy\
├── source\              ← Taruh source code proxy di sini
│   ├── index-x64.exe
│   ├── config.json
│   └── ...
├── nssm\
├── dashboard\
└── ...
```

### 2️⃣ Install Node.js (untuk dashboard)

Download dan install Node.js dari [nodejs.org](https://nodejs.org/) jika ingin menggunakan dashboard monitoring.

---

## 🚀 Cara Penggunaan

### **Step 1: Setup Auto-Restart (Cukup 1x Saja)**

Jalankan sebagai **Administrator**:

```cmd
add_task_scheduler.bat
```

Ini akan membuat **Task Scheduler** yang otomatis merestart semua proxy setiap 5 menit.

> ⚠️ **Catatan:** Jalankan sekali saja saat pertama kali setup!

---

### **Step 2: Kelola Proxy**

Jalankan sebagai **Administrator**:

```cmd
proxy-manager.bat
```

#### Menu Utama:

```
=========================================
       PROXY MANAGER
=========================================
1. Lihat Daftar Proxy
2. Tambah Proxy
3. Hapus Proxy
4. Restart SEMUA Proxy
5. Update SEMUA Proxy
6. Install Dashboard
7. Restart Dashboard
0. Keluar
=========================================
```

#### **Menambah Proxy Baru:**
1. Pilih menu **2** (Tambah Proxy)
2. Masukkan **PORT** yang diinginkan (contoh: `3001`)
3. Proxy akan otomatis:
   - Copy source dari folder `source`
   - Install sebagai Windows Service
   - Dijalankan otomatis

#### **Menghapus Proxy:**
1. Pilih menu **3** (Hapus Proxy)
2. Masukkan **PORT** yang ingin dihapus
3. Service akan dihapus dan folder dibersihkan

#### **Install Dashboard:**
1. Pilih menu **6** (Install Dashboard)
2. Dashboard akan berjalan di `http://localhost:9000` (default)
3. Monitoring semua proxy dalam satu tampilan
4. Untuk mengubah **PORT** dan **PIN** restart all, edit file `dashboard\config.json`:
   ```json
   {
     "port": 9000,
     "restartAllPin": "7777"
   }
   ```

---

## 📁 Struktur Folder

```
c:\sproxy\
├── source\                      # Source code template proxy
├── nssm\                        # NSSM untuk Windows Service
├── dashboard\                   # Dashboard monitoring (opsional)
│   ├── server.js
│   └── config.json              # Konfigurasi port & PIN dashboard
├── 3001\                        # Proxy instance port 3001
├── 3002\                        # Proxy instance port 3002
├── ...
├── add_task_scheduler.bat       # Setup auto-restart (1x saja)
├── proxy-manager.bat            # Menu utama manajemen
├── watchdog-restart.bat         # Script restart otomatis
└── README.md                    # File ini
```

---

## ⚙️ Service Names

- **Proxy Services:** `sproxy-3001`, `sproxy-3002`, dst.
- **Dashboard Service:** `proxy-dashboard`
- **Task Scheduler:** `sproxy Auto Restart`

---

## 🔧 Troubleshooting

### Proxy tidak jalan?
1. Pastikan dijalankan sebagai **Administrator**
2. Cek Windows Services: `services.msc`
3. Cek log di Event Viewer

### Auto-restart tidak bekerja?
1. Buka Task Scheduler (`taskschd.msc`)
2. Cari task **"sproxy Auto Restart"**
3. Pastikan statusnya **Ready** dan **Enabled**

### Dashboard tidak bisa diakses?
1. Pastikan Node.js sudah terinstall
2. Jalankan menu **7** (Restart Dashboard)
3. Akses `http://localhost:4000`

---

## 📝 Notes

- ✅ Semua proxy berjalan sebagai **Windows Service** (otomatis saat boot)
- ✅ Auto-restart setiap **5 menit** via Task Scheduler
- ✅ Path otomatis menyesuaikan lokasi folder aplikasi (portable)
- ⚠️ Selalu jalankan sebagai **Administrator**


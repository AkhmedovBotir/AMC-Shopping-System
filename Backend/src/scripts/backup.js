const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');
const moment = require('moment');

// Backup konfiguratsiyasi
const config = {
    // MongoDB URI
    dbUri: process.env.MONGODB_URI || 'mongodb://localhost:27017/shop',
    
    // Backup papkasi
    backupDir: path.join(__dirname, '../../backups'),
    
    // Backup saqlash muddati (kunlarda)
    retentionDays: 90,
    
    // Backup nomi formati
    getBackupName: () => `backup_${moment().format('YYYY-MM-DD_HH-mm')}`,
    
    // Backup log fayli
    logFile: path.join(__dirname, '../../logs/backup.log')
};

// Log yozish funksiyasi
const log = (message) => {
    const timestamp = moment().format('YYYY-MM-DD HH:mm:ss');
    const logMessage = `[${timestamp}] ${message}\n`;
    
    fs.appendFileSync(config.logFile, logMessage);
    console.log(message);
};

// Backup yaratish
const createBackup = () => {
    // Backup papkasini yaratish
    if (!fs.existsSync(config.backupDir)) {
        fs.mkdirSync(config.backupDir, { recursive: true });
    }

    const backupName = config.getBackupName();
    const backupPath = path.join(config.backupDir, backupName);
    
    // Backup buyrug'i
    const cmd = `mongodump --uri="${config.dbUri}" --out="${backupPath}"`;
    
    log('Backup boshlanmoqda...');
    
    exec(cmd, (error, stdout, stderr) => {
        if (error) {
            log(`Backup xatosi: ${error.message}`);
            return;
        }
        
        // Backup arxivlash
        const archiveCmd = `tar -czf "${backupPath}.tar.gz" -C "${config.backupDir}" "${backupName}"`;
        
        exec(archiveCmd, (error, stdout, stderr) => {
            if (error) {
                log(`Arxivlash xatosi: ${error.message}`);
                return;
            }
            
            // Arxivlanmagan backup papkasini o'chirish
            fs.rmSync(backupPath, { recursive: true });
            
            log(`Backup muvaffaqiyatli yaratildi: ${backupName}.tar.gz`);
            
            // Eski backuplarni tozalash
            cleanOldBackups();
        });
    });
};

// Eski backuplarni tozalash
const cleanOldBackups = () => {
    const files = fs.readdirSync(config.backupDir);
    
    files.forEach(file => {
        const filePath = path.join(config.backupDir, file);
        const stats = fs.statSync(filePath);
        const daysOld = moment().diff(moment(stats.mtime), 'days');
        
        if (daysOld > config.retentionDays) {
            fs.unlinkSync(filePath);
            log(`Eski backup o'chirildi: ${file}`);
        }
    });
};

// Backup jarayonini boshlash
const startBackup = () => {
    try {
        createBackup();
    } catch (error) {
        log(`Backup jarayonida xatolik: ${error.message}`);
    }
};

// Har hafta backup olish
const scheduleBackup = () => {
    // Har yakshanba kuni soat 00:00 da backup olish
    const now = moment();
    const nextSunday = moment().day(7).startOf('day');
    
    if (now.isAfter(nextSunday)) {
        nextSunday.add(1, 'week');
    }
    
    const msUntilNextBackup = nextSunday.diff(now);
    
    setTimeout(() => {
        startBackup();
        // Keyingi backup uchun interval o'rnatish (har 7 kunda)
        setInterval(startBackup, 7 * 24 * 60 * 60 * 1000);
    }, msUntilNextBackup);
    
    log(`Keyingi backup vaqti: ${nextSunday.format('YYYY-MM-DD HH:mm:ss')}`);
};

// Scriptni ishga tushirish
if (require.main === module) {
    // Logs papkasini yaratish
    const logsDir = path.dirname(config.logFile);
    if (!fs.existsSync(logsDir)) {
        fs.mkdirSync(logsDir, { recursive: true });
    }
    
    log('Backup tizimi ishga tushirilmoqda...');
    scheduleBackup();
}

module.exports = {
    startBackup,
    scheduleBackup
}; 
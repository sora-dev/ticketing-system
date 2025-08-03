const express = require("express");
const mongoose = require("mongoose");
const { exec } = require("child_process");
const fs = require("fs");
const path = require("path");
const archiver = require("archiver");
const multer = require("multer");
const yauzl = require("yauzl");
const { auth, adminAuth } = require("../middleware/auth");
const { logAuditEvent } = require("../utils/auditLogger");
const router = express.Router();

// Ensure backup directory exists
const backupDir = path.join(__dirname, "../backups");
if (!fs.existsSync(backupDir)) {
  fs.mkdirSync(backupDir, { recursive: true });
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, backupDir);
  },
  filename: (req, file, cb) => {
    // Generate timestamp-based filename with .zip extension
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    cb(null, `uploaded-backup-${timestamp}.zip`);
  }
});

const upload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    // Only allow zip files
    if (file.mimetype === 'application/zip' || file.originalname.endsWith('.zip')) {
      cb(null, true);
    } else {
      cb(new Error('Only ZIP files are allowed'), false);
    }
  },
  limits: {
    fileSize: 100 * 1024 * 1024 // 100MB limit
  }
});

// Get database name from connection string
const getDatabaseName = () => {
  const uri =
    process.env.MONGODB_URI || "mongodb://localhost:27017/ticketing-system";
  const dbName = uri.split("/").pop().split("?")[0];
  return dbName;
};

// Create backup
router.post("/create", auth, adminAuth, async (req, res) => {
  try {
    const { description } = req.body;
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const dbName = getDatabaseName();
    const backupFileName = `backup-${dbName}-${timestamp}`;
    const backupPath = path.join(backupDir, backupFileName);

    // Create mongodump command - using system-installed tools
    const mongoUri = process.env.MONGODB_URI || "mongodb://localhost:27017";
    const baseUri = mongoUri.split("/").slice(0, -1).join("/");
    const command = `mongodump --uri="${baseUri}/${dbName}" --out="${backupPath}"`;

    exec(command, async (error, stdout, stderr) => {
      if (error) {
        console.error("Backup error:", error);
        return res.status(500).json({
          message: "Backup failed",
          error: error.message,
        });
      }

      // Get backup file size
      const fileSizeInBytes = getDirectorySize(path.join(backupPath, dbName));
      const fileSizeInMB = (fileSizeInBytes / (1024 * 1024)).toFixed(2);

      // Log audit event with correct parameters
      await logAuditEvent({
        userId: req.user._id,
        action: "backup_created",
        resource: "database",
        resourceId: backupFileName,
        details: JSON.stringify({
          backupFileName,
          description: description || "Manual backup",
          size: `${fileSizeInMB} MB`,
        }),
        req,
      });

      res.json({
        message: "Backup created successfully",
        fileName: backupFileName,
        size: `${fileSizeInMB} MB`,
        createdAt: new Date().toISOString(),
        description: description || "Manual backup",
      });
    });
  } catch (error) {
    console.error("Backup creation error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// List backups
router.get("/list", auth, adminAuth, async (req, res) => {
  try {
    const files = fs.readdirSync(backupDir);
    const backups = files
      .map((file) => {
        const filePath = path.join(backupDir, file);
        const stats = fs.statSync(filePath);
        const size = getDirectorySize(filePath);

        return {
          fileName: file,
          size: `${(size / (1024 * 1024)).toFixed(2)} MB`,
          createdAt: stats.birthtime,
          modifiedAt: stats.mtime,
        };
      })
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    res.json({ backups });
  } catch (error) {
    console.error("List backups error:", error);
    res.status(500).json({ message: "Failed to list backups" });
  }
});

// Download backup
router.get("/download/:fileName", auth, adminAuth, async (req, res) => {
  try {
    const { fileName } = req.params;
    const filePath = path.join(backupDir, fileName);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ message: "Backup file not found" });
    }

    // Set response headers for zip download
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}.zip"`);

    // Create archiver instance
    const archive = archiver('zip', {
      zlib: { level: 9 } // Maximum compression
    });

    // Handle archiver errors
    archive.on('error', (err) => {
      console.error('Archive error:', err);
      res.status(500).json({ message: 'Failed to create backup archive' });
    });

    // Pipe archive data to response
    archive.pipe(res);

    // Add the backup directory to the archive
    archive.directory(filePath, false);

    // Finalize the archive
    await archive.finalize();

    // Log audit event
    await logAuditEvent({
      userId: req.user._id,
      action: "backup_downloaded",
      resource: "database",
      resourceId: fileName,
      details: { fileName },
      req,
    });
  } catch (error) {
    console.error("Download backup error:", error);
    res.status(500).json({ message: "Failed to download backup" });
  }
});

// Upload backup
router.post("/upload", auth, adminAuth, upload.single('backupFile'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    const uploadedFilePath = req.file.path;
    const fileName = req.file.filename;
    // Remove .zip extension for extraction directory name
    const extractDirName = fileName.replace(/\.zip$/, '');
    const extractPath = path.join(backupDir, extractDirName);

    // Clean up any existing extraction directory
    if (fs.existsSync(extractPath)) {
      fs.rmSync(extractPath, { recursive: true, force: true });
    }
    
    // Create fresh extraction directory
    fs.mkdirSync(extractPath, { recursive: true });

    // Extract the zip file using yauzl
    yauzl.open(uploadedFilePath, { lazyEntries: true }, (err, zipfile) => {
      if (err) {
        console.error("Failed to open zip file:", err);
        // Remove the uploaded zip file safely
        try {
          if (fs.existsSync(uploadedFilePath)) {
            const stats = fs.statSync(uploadedFilePath);
            if (stats.isFile()) {
              fs.unlinkSync(uploadedFilePath);
            }
          }
        } catch (unlinkError) {
          console.error("Failed to remove uploaded file:", unlinkError);
        }
        // Clean up extraction directory
        if (fs.existsSync(extractPath)) {
          fs.rmSync(extractPath, { recursive: true, force: true });
        }
        return res.status(500).json({
          message: "Failed to open backup file",
          error: err.message,
        });
      }

      zipfile.readEntry();
      
      zipfile.on("entry", (entry) => {
        if (/\/$/.test(entry.fileName)) {
          // Directory entry
          const dirPath = path.join(extractPath, entry.fileName);
          try {
            if (!fs.existsSync(dirPath)) {
              fs.mkdirSync(dirPath, { recursive: true });
            }
          } catch (err) {
            console.error("Failed to create directory:", err);
          }
          zipfile.readEntry();
        } else {
          // File entry
          zipfile.openReadStream(entry, (err, readStream) => {
            if (err) {
              console.error("Failed to read entry:", err);
              zipfile.readEntry();
              return;
            }
            
            const filePath = path.join(extractPath, entry.fileName);
            const fileDir = path.dirname(filePath);
            
            // Ensure directory exists
            try {
              if (!fs.existsSync(fileDir)) {
                fs.mkdirSync(fileDir, { recursive: true });
              }
            } catch (err) {
              console.error("Failed to create file directory:", err);
              zipfile.readEntry();
              return;
            }
            
            const writeStream = fs.createWriteStream(filePath);
            readStream.pipe(writeStream);
            
            writeStream.on('close', () => {
              zipfile.readEntry();
            });
            
            writeStream.on('error', (err) => {
              console.error("Failed to write file:", err);
              zipfile.readEntry();
            });
          });
        }
      });
      
      zipfile.on("end", async () => {
        // Remove the uploaded zip file after extraction
        fs.unlinkSync(uploadedFilePath);
        
        try {
          // Get backup file size
          const fileSizeInBytes = getDirectorySize(extractPath);
          const fileSizeInMB = (fileSizeInBytes / (1024 * 1024)).toFixed(2);

          // Log audit event
          await logAuditEvent({
            userId: req.user._id,
            action: "backup_uploaded",
            resource: "database",
            resourceId: extractDirName,
            details: JSON.stringify({ 
              fileName: extractDirName,
              originalName: req.file.originalname,
              size: `${fileSizeInMB} MB`
            }),
            req,
          });

          res.status(201).json({
            message: "Backup uploaded and extracted successfully",
            fileName: extractDirName,
            size: `${fileSizeInMB} MB`,
            extractedTo: extractPath
          });
        } catch (auditError) {
          console.error("Audit logging error:", auditError);
          res.status(201).json({
            message: "Backup uploaded and extracted successfully",
            fileName: fileName,
            extractedTo: extractPath
          });
        }
      });
      
      zipfile.on("error", (err) => {
        console.error("Extraction error:", err);
        // Remove the uploaded zip file safely
        try {
          if (fs.existsSync(uploadedFilePath)) {
            const stats = fs.statSync(uploadedFilePath);
            if (stats.isFile()) {
              fs.unlinkSync(uploadedFilePath);
            }
          }
        } catch (unlinkError) {
          console.error("Failed to remove uploaded file:", unlinkError);
        }
        // Clean up extraction directory if extraction failed
        if (fs.existsSync(extractPath)) {
          fs.rmSync(extractPath, { recursive: true, force: true });
        }
        res.status(500).json({
          message: "Failed to extract backup file",
          error: err.message,
        });
      });
    });
  } catch (error) {
    console.error("Upload backup error:", error);
    res.status(500).json({ message: "Failed to upload backup" });
  }
});

// Delete backup
router.delete("/:fileName", auth, adminAuth, async (req, res) => {
  try {
    const { fileName } = req.params;
    const filePath = path.join(backupDir, fileName);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ message: "Backup file not found" });
    }

    fs.rmSync(filePath, { recursive: true, force: true });

    // Log audit event
    await logAuditEvent({
      userId: req.user._id,
      action: "backup_deleted",
      resource: "database",
      resourceId: fileName,
      details: JSON.stringify({ fileName }),
      req,
    });

    res.json({ message: "Backup deleted successfully" });
  } catch (error) {
    console.error("Delete backup error:", error);
    res.status(500).json({ message: "Failed to delete backup" });
  }
});

// Restore backup
router.post("/restore/:fileName", auth, adminAuth, async (req, res) => {
  try {
    const { fileName } = req.params;
    const backupPath = path.join(backupDir, fileName);

    if (!fs.existsSync(backupPath)) {
      return res.status(404).json({ message: "Backup file not found" });
    }

    const dbName = getDatabaseName();
    const mongoUri = process.env.MONGODB_URI || "mongodb://localhost:27017";
    const baseUri = mongoUri.split("/").slice(0, -1).join("/");

    // Use system-installed mongorestore
    const command = `mongorestore --uri="${baseUri}/${dbName}" --drop "${path.join(
      backupPath,
      dbName
    )}"`;

    exec(command, async (error, stdout, stderr) => {
      if (error) {
        console.error("Restore error:", error);
        return res.status(500).json({
          message: "Restore failed",
          error: error.message,
        });
      }

      // Log audit event
      await logAuditEvent({
        userId: req.user._id,
        action: "backup_restored",
        resource: "database",
        resourceId: fileName,
        details: { fileName },
        req,
      });

      res.json({
        message: "Backup restored successfully",
        fileName,
        restoredAt: new Date().toISOString(),
      });
    });
  } catch (error) {
    console.error("Restore backup error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Helper function to calculate directory size
function getDirectorySize(dirPath) {
  let totalSize = 0;

  const calculateSize = (currentPath) => {
    const stats = fs.statSync(currentPath);

    if (stats.isDirectory()) {
      const files = fs.readdirSync(currentPath);
      files.forEach((file) => {
        calculateSize(path.join(currentPath, file));
      });
    } else {
      totalSize += stats.size;
    }
  };

  calculateSize(dirPath);
  return totalSize;
}

module.exports = router;

const express = require("express");
const mongoose = require("mongoose");
const { exec } = require("child_process");
const fs = require("fs");
const path = require("path");
const { auth, adminAuth } = require("../middleware/auth");
const { logAuditEvent } = require("../utils/auditLogger");
const router = express.Router();

// Ensure backup directory exists
const backupDir = path.join(__dirname, "../backups");
if (!fs.existsSync(backupDir)) {
  fs.mkdirSync(backupDir, { recursive: true });
}

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
        details: {
          backupFileName,
          description: description || "Manual backup",
          size: `${fileSizeInMB} MB`,
        },
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

    // For now, just send the directory as a zip would require additional setup
    res.json({ message: "Download functionality requires additional setup" });

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
      details: { fileName },
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

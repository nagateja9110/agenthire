const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { ApiError } = require('../utils/errors');

const UPLOADS_DIR = path.join(__dirname, '../../uploads');
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB per spec

if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOADS_DIR),
  filename: (req, file, cb) => {
    const id = crypto.randomBytes(8).toString('hex');
    cb(null, `${Date.now()}-${id}.pdf`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: (req, file, cb) => {
    if (file.mimetype !== 'application/pdf') {
      return cb(new ApiError(400, 'Only PDF resumes are accepted'));
    }
    return cb(null, true);
  },
});

module.exports = { upload, UPLOADS_DIR };

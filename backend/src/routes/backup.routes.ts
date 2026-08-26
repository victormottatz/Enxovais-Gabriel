import { Router } from 'express';
import { BackupService } from '../services/backup.service.js';

export const backupRouter = Router();

// GET /api/v1/backup/download
backupRouter.get('/download', async (req, res, next) => {
  try {
    const backup = await BackupService.gerarBackupCompleto();
    const dataStr = new Date().toISOString().split('T')[0];
    const filename = `backup-enxovais-gabriel-${dataStr}.json`;

    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.json(backup);
  } catch (err) {
    next(err);
  }
});

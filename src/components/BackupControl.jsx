import React, { useRef } from 'react';
import { Download, Upload, Trash2 } from 'lucide-react';
import { exportData, importData } from '../utils/storage';

export default function BackupControl({ onDataImported, onClearAll }) {
  const fileInputRef = useRef(null);

  const handleExport = () => {
    try {
      exportData();
    } catch (error) {
      alert('Failed to export data: ' + error.message);
    }
  };

  const handleImportClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (window.confirm("Importing this backup will overwrite your current logs and insights. Proceed?")) {
      try {
        const importedData = await importData(file);
        alert('Data imported successfully.');
        onDataImported(importedData);
      } catch (error) {
        alert('Import failed: ' + error.message);
      }
    }
    
    // Clear selection so the same file can be uploaded again
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="backup-control">
      <button onClick={handleExport} className="backup-btn" title="Download Journal Backup">
        <Download size={14} /> Export Backup
      </button>
      <button onClick={handleImportClick} className="backup-btn" title="Upload Journal Backup">
        <Upload size={14} /> Import Backup
      </button>
      {onClearAll && (
        <button onClick={onClearAll} className="backup-btn delete" title="Permanently Erase All Journal Data">
          <Trash2 size={14} /> Wipe Journal
        </button>
      )}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        className="hidden-file-input"
        accept=".json"
      />
    </div>
  );
}

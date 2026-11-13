// Lets the page ask where an attached file lives on disk, so a file that is already there is named, not copied.
const { contextBridge, webUtils } = require('electron');
contextBridge.exposeInMainWorld('workwood', { pathFor: file => { try { return webUtils.getPathForFile(file) || ''; } catch { return ''; } } });

/**
 * MEDIA NAME STUDIO - Core Application Engine (Refactored Production Architecture)
 * High Performance, Capability-Detection First, Zero Data-Loss Media Pipeline
 */

const SUPABASE_URL = 'https://whuyytjksrpyojmukftp.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_gpW8TcOIz4ocrrMIWUx3Qg_sZaeZqQ0';

let supabaseClient = null;
if (window.supabase) {
    supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}

class AppError extends Error {
    constructor(category, message, originalError = null) {
        super(message);
        this.name = category;
        this.originalError = originalError;
    }
}

const Logger = {
    debugMode: true,
    camera(...args) { if (this.debugMode) console.log('[Camera]', ...args); },
    recording(...args) { if (this.debugMode) console.log('[Recording]', ...args); },
    processing(...args) { if (this.debugMode) console.log('[Processing]', ...args); },
    storage(...args) { if (this.debugMode) console.log('[Storage]', ...args); },
    sync(...args) { if (this.debugMode) console.log('[Sync]', ...args); },
    settings(...args) { if (this.debugMode) console.log('[Settings]', ...args); },
    error(category, message, err) { console.error(`[${category} Error] ${message}`, err || ''); }
};

const ObjectURLManager = {
    activeUrls: new Set(),
    create(blob) {
        if (!blob) return '';
        const url = URL.createObjectURL(blob);
        this.activeUrls.add(url);
        return url;
    },
    revoke(url) {
        if (url && this.activeUrls.has(url)) {
            URL.revokeObjectURL(url);
            this.activeUrls.delete(url);
        }
    },
    revokeAll() {
        this.activeUrls.forEach(url => URL.revokeObjectURL(url));
        this.activeUrls.clear();
    }
};

const Utils = {
    removeVietnameseTones(str) {
        if (!str) return '';
        str = str.replace(/à|á|ạ|ả|ã|â|ầ|ấ|ậ|ẩ|ẫ|ă|ằ|ắ|ặ|ẳ|ẵ/g, "a");
        str = str.replace(/è|é|ẹ|ẻ|ẽ|ê|ề|ế|ệ|ể|ễ/g, "e");
        str = str.replace(/ì|í|ị|ỉ|ĩ/g, "i");
        str = str.replace(/ò|ó|ọ|ỏ|õ|ô|ồ|ố|ộ|ổ|ỗ|ơ|ờ|ớ|ợ|ở|ỡ/g, "o");
        str = str.replace(/ù|ú|ụ|ủ|ũ|ư|ừ|ứ|ự|ử|ữ/g, "u");
        str = str.replace(/ỳ|ý|ỵ|ỷ|ỹ/g, "y");
        str = str.replace(/đ/g, "d");
        str = str.replace(/À|Á|Ạ|Ả|Ã|Â|Ầ|Ấ|Ậ|Ẩ|Ẫ|Ă|Ằ|Ắ|Ặ|Ẳ|Ẵ/g, "A");
        str = str.replace(/È|É|Ẹ|Ẻ|Ẽ|Ê|Ề|Ế|Ệ|Ể|Ễ/g, "E");
        str = str.replace(/Ì|Í|Ị|Ỉ|Ĩ/g, "I");
        str = str.replace(/Ò|Ó|Ọ|Ỏ|Õ|Ô|Ồ|Ố|Ộ|Ổ|Ỗ|Ơ|Ờ|Ớ|Ợ|Ở|Ỡ/g, "O");
        str = str.replace(/Ù|Ú|Ụ|Ủ|Ũ|Ư|Ừ|Ứ|Ự|Ử|Ữ/g, "U");
        str = str.replace(/Ỳ|Ý|Ỵ|Ỷ|Ỹ/g, "Y");
        str = str.replace(/Đ/g, "D");
        str = str.replace(/\u0300|\u0301|\u0303|\u0309|\u0323/g, "");
        str = str.replace(/\u02C6|\u0306|\u031B/g, "");
        return str.replace(/[^a-zA-Z0-9]/g, "_").replace(/_+/g, "_");
    },

    formatDateForFile(timestamp) {
        const d = new Date(timestamp);
        const pad = n => String(n).padStart(2, '0');
        return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}_${pad(d.getHours())}-${pad(d.getMinutes())}-${pad(d.getSeconds())}`;
    },

    showToast(message, duration = 3500) {
        const toast = document.getElementById('toast');
        if (!toast) return;
        toast.textContent = message;
        toast.classList.remove('hidden');
        clearTimeout(toast._timer);
        toast._timer = setTimeout(() => toast.classList.add('hidden'), duration);
    },

    getBestSupportedVideoMimeType() {
        if (typeof MediaRecorder === 'undefined') return '';
        const candidateTypes = [
            'video/mp4;codecs=avc1.42E01E,mp4a.40.2',
            'video/mp4',
            'video/webm;codecs=h264,opus',
            'video/webm;codecs=vp9,opus',
            'video/webm;codecs=vp8,opus',
            'video/webm'
        ];
        for (const type of candidateTypes) {
            if (MediaRecorder.isTypeSupported(type)) return type;
        }
        return '';
    },

    getFileExtensionFromMime(mimeType, defaultType = 'photo') {
        if (defaultType === 'photo') return 'jpg';
        if (mimeType.includes('mp4')) return 'mp4';
        if (mimeType.includes('webm')) return 'webm';
        return 'mp4';
    },

    checkCapabilities() {
        const nav = navigator || {};
        const mediaDevices = nav.mediaDevices || {};
        return {
            hasGetUserMedia: !!(mediaDevices && mediaDevices.getUserMedia),
            hasEnumerateDevices: !!(mediaDevices && mediaDevices.enumerateDevices),
            hasMediaRecorder: typeof MediaRecorder !== 'undefined',
            hasCanvasCaptureStream: !!(HTMLCanvasElement.prototype.captureStream),
            hasWebCodecs: typeof VideoEncoder !== 'undefined' && typeof VideoDecoder !== 'undefined',
            hasAudioContext: typeof (window.AudioContext || window.webkitAudioContext) !== 'undefined'
        };
    }
};

class AppDB {
    constructor() {
        this.dbName = 'MediaNameStudioDB';
        this.version = 5;
        this.db = null;
    }

    init() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.version);
            request.onupgradeneeded = (e) => {
                const db = e.target.result;
                if (!db.objectStoreNames.contains('students')) db.createObjectStore('students', { keyPath: 'id' });
                if (!db.objectStoreNames.contains('media')) db.createObjectStore('media', { keyPath: 'id' });
                if (!db.objectStoreNames.contains('settings')) db.createObjectStore('settings', { keyPath: 'key' });
            };
            request.onsuccess = (e) => { this.db = e.target.result; resolve(); };
            request.onerror = (e) => reject(new AppError('StorageError', 'IndexedDB failed to open', e));
        });
    }

    async setSetting(key, value) {
        return new Promise((resolve, reject) => {
            const tx = this.db.transaction('settings', 'readwrite');
            tx.objectStore('settings').put({ key, value });
            tx.oncomplete = () => resolve();
            tx.onerror = (e) => reject(new AppError('StorageError', 'Failed to save setting', e));
        });
    }

    async getSetting(key, defaultValue = null) {
        return new Promise(resolve => {
            const tx = this.db.transaction('settings', 'readonly');
            const req = tx.objectStore('settings').get(key);
            req.onsuccess = () => resolve(req.result ? req.result.value : defaultValue);
            req.onerror = () => resolve(defaultValue);
        });
    }

    async saveStudents(studentsArray) {
        return new Promise((resolve, reject) => {
            const tx = this.db.transaction('students', 'readwrite');
            const store = tx.objectStore('students');
            studentsArray.forEach(s => store.put(s));
            tx.oncomplete = () => resolve();
            tx.onerror = (e) => reject(new AppError('StorageError', 'Failed to save students', e));
        });
    }

    async getStudents() {
        return new Promise(resolve => {
            const tx = this.db.transaction('students', 'readonly');
            const req = tx.objectStore('students').getAll();
            req.onsuccess = () => resolve(req.result || []);
            req.onerror = () => resolve([]);
        });
    }

    async clearStudents() {
        return new Promise(resolve => {
            const tx = this.db.transaction('students', 'readwrite');
            tx.objectStore('students').clear();
            tx.oncomplete = () => resolve();
        });
    }

    async saveMedia(mediaObj) {
        return new Promise((resolve, reject) => {
            try {
                const tx = this.db.transaction('media', 'readwrite');
                tx.objectStore('media').put(mediaObj);
                tx.oncomplete = () => resolve();
                tx.onerror = (e) => {
                    if (e.target.error && e.target.error.name === 'QuotaExceededError') {
                        Utils.showToast("Bộ nhớ thiết bị đã đầy. Vui lòng xóa bớt media!");
                        reject(new AppError('QuotaError', 'IndexedDB quota exceeded', e.target.error));
                    } else {
                        reject(new AppError('StorageError', 'Failed to save media item', e.target.error));
                    }
                };
            } catch (err) {
                reject(new AppError('StorageError', 'Failed to execute media save', err));
            }
        });
    }

    async getAllMedia() {
        return new Promise(resolve => {
            const tx = this.db.transaction('media', 'readonly');
            const req = tx.objectStore('media').getAll();
            req.onsuccess = () => {
                const results = req.result || [];
                resolve(results.sort((a, b) => b.timestamp - a.timestamp));
            };
            req.onerror = () => resolve([]);
        });
    }

    async getMediaById(id) {
        return new Promise(resolve => {
            const tx = this.db.transaction('media', 'readonly');
            const req = tx.objectStore('media').get(id);
            req.onsuccess = () => resolve(req.result || null);
            req.onerror = () => resolve(null);
        });
    }

    async deleteMedia(ids) {
        return new Promise(resolve => {
            const tx = this.db.transaction('media', 'readwrite');
            const store = tx.objectStore('media');
            ids.forEach(id => store.delete(id));
            tx.oncomplete = () => resolve();
        });
    }
}
const db = new AppDB();

const DEFAULT_SETTINGS = {
    schemaVersion: 1,
    enabled: true,
    unitName: 'TRƯỜNG TH.TQT',
    showUnit: true,
    showDate: true,
    showLocation: false,
    position: 'bottom-right',
    align: 'right',
    fontSize: 16,
    color: '#ff2407',
    bgColor: 'transparent',
    shadow: true
};

const SettingsManager = {
    currentSettings: { ...DEFAULT_SETTINGS },
    saveDebounceTimer: null,

    async load() {
        try {
            const saved = await db.getSetting('appSettings', null);
            if (saved) {
                this.currentSettings = this.migrate({ ...DEFAULT_SETTINGS, ...saved });
            } else {
                this.currentSettings = { ...DEFAULT_SETTINGS };
            }
            await this.save(true);
            return this.currentSettings;
        } catch (err) {
            Logger.error('Settings', 'Load settings failed, restoring default', err);
            this.currentSettings = { ...DEFAULT_SETTINGS };
            return this.currentSettings;
        }
    },

    migrate(savedSettings) {
        let version = savedSettings.schemaVersion || 1;
        if (version === 1) {
            savedSettings.schemaVersion = 1;
        }
        return { ...DEFAULT_SETTINGS, ...savedSettings };
    },

    get(key = null) {
        return key ? this.currentSettings[key] : this.currentSettings;
    },

    set(key, value) {
        this.currentSettings[key] = value;
        this.scheduleSave();
    },

    async update(partialSettings) {
        Object.assign(this.currentSettings, partialSettings);
        this.scheduleSave();
    },

    scheduleSave() {
        this.showAutoSaveStatus(false);
        if (this.saveDebounceTimer) clearTimeout(this.saveDebounceTimer);
        this.saveDebounceTimer = setTimeout(async () => {
            await this.save();
        }, 400);
    },

    async save(immediate = false) {
        if (this.saveDebounceTimer) {
            clearTimeout(this.saveDebounceTimer);
            this.saveDebounceTimer = null;
        }
        try {
            await db.setSetting('appSettings', this.currentSettings);
            this.showAutoSaveStatus(true);
            Logger.settings('Auto-saved settings:', this.currentSettings);
        } catch (err) {
            Logger.error('Settings', 'Save settings failed', err);
        }
    },

    async reset() {
        this.currentSettings = { ...DEFAULT_SETTINGS };
        await this.save(true);
        return this.currentSettings;
    },

    showAutoSaveStatus(saved) {
        const indicator = document.getElementById('autoSaveIndicator');
        if (!indicator) return;
        if (saved) {
            indicator.innerHTML = '<i class="fa-solid fa-check"></i> Đã tự động lưu';
            indicator.classList.remove('saving');
        } else {
            indicator.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Đang lưu...';
            indicator.classList.add('saving');
        }
    }
};

const Auth = {
    currentUser: null,
    async init() {
        if (!supabaseClient) return;
        try {
            const { data: { session } } = await supabaseClient.auth.getSession();
            this.currentUser = session?.user || null;
            this.updateUI();
            supabaseClient.auth.onAuthStateChange((event, session) => {
                this.currentUser = session?.user || null;
                this.updateUI();
                if (event === 'SIGNED_IN') SyncManager.syncFromCloud();
            });
        } catch (err) {
            Logger.error('Auth', 'Auth init error', err);
        }
    },
    updateUI() {
        const loginSection = document.getElementById('loginSection');
        const userInfo = document.getElementById('userInfo');
        const userEmail = document.getElementById('userEmail');
        if (this.currentUser) {
            if (loginSection) loginSection.style.display = 'none';
            if (userInfo) userInfo.style.display = 'flex';
            if (userEmail) userEmail.textContent = this.currentUser.email;
        } else {
            if (loginSection) loginSection.style.display = 'block';
            if (userInfo) userInfo.style.display = 'none';
        }
    },
    async signInWithGoogle() {
        if (!supabaseClient) { Utils.showToast("Chưa cấu hình Supabase!"); return; }
        const { error } = await supabaseClient.auth.signInWithOAuth({
            provider: 'google',
            options: { redirectTo: window.location.origin + window.location.pathname }
        });
        if (error) Utils.showToast('Lỗi đăng nhập: ' + error.message);
    },
    async signOut() {
        if (!supabaseClient) return;
        await supabaseClient.auth.signOut();
        this.currentUser = null;
        this.updateUI();
        Utils.showToast('Đã đăng xuất!');
    }
};

const SyncManager = {
    isSyncing: false,
    async uploadSingleMedia(mediaObj) {
        if (!Auth.currentUser || !supabaseClient || mediaObj.sync_status === 'synced') return;

        if (SettingsManager.get('enabled') && mediaObj.processingStatus === 'failed') {
            Logger.sync('Bỏ qua upload vì watermark xử lý thất bại');
            return;
        }

        try {
            const userId = Auth.currentUser.id;
            const cleanStudent = Utils.removeVietnameseTones(mediaObj.studentName || 'student');
            const targetBlob = mediaObj.processedBlob || mediaObj.originalBlob || mediaObj.blob;
            if (!targetBlob) return;

            const filePath = `${userId}/${cleanStudent}/${mediaObj.fileName}`;
            const fileToUpload = new File([targetBlob], mediaObj.fileName, { type: targetBlob.type });

            const { error: uploadError } = await supabaseClient.storage.from('media').upload(filePath, fileToUpload, { upsert: true });
            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabaseClient.storage.from('media').getPublicUrl(filePath);

            const { error: dbError } = await supabaseClient.from('media_files').upsert([{
                user_id: userId,
                student_name: mediaObj.studentName,
                file_name: mediaObj.fileName,
                file_url: publicUrl,
                file_type: mediaObj.type,
                file_path: filePath,
                created_at: new Date(mediaObj.timestamp).toISOString()
            }], { onConflict: 'file_path' });

            if (dbError) throw dbError;

            mediaObj.sync_status = 'synced';
            mediaObj.file_path = filePath;
            await db.saveMedia(mediaObj);
            if (App.activeTab === 'tab-gallery') App.loadGallery();
        } catch (err) {
            Logger.error('Sync', 'Upload media failed', err);
            mediaObj.sync_status = 'failed';
            await db.saveMedia(mediaObj);
        }
    },

    async syncFromCloud() {
        if (!Auth.currentUser || !supabaseClient || this.isSyncing) return;
        this.isSyncing = true;
        try {
            const { data: cloudFiles, error } = await supabaseClient.from('media_files')
                .select('*')
                .eq('user_id', Auth.currentUser.id)
                .order('created_at', { ascending: false });
            if (error) throw error;

            if (cloudFiles && cloudFiles.length > 0) {
                const localMedia = await db.getAllMedia();
                const localMap = new Map(localMedia.map(m => [m.fileName, m]));

                for (const file of cloudFiles) {
                    if (!localMap.has(file.file_name)) {
                        try {
                            const res = await fetch(file.file_url);
                            const blob = await res.blob();
                            const mediaObj = {
                                id: new Date(file.created_at).getTime().toString(),
                                type: file.file_type,
                                blob: blob,
                                originalBlob: blob,
                                processedBlob: blob,
                                studentName: file.student_name || 'Học sinh',
                                fileName: file.file_name,
                                timestamp: new Date(file.created_at).getTime(),
                                watermarkApplied: true,
                                processingStatus: 'success',
                                sync_status: 'synced',
                                file_path: file.file_path
                            };
                            await db.saveMedia(mediaObj);
                        } catch (e) {
                            Logger.error('Sync', "Fetch cloud file failed:", file.file_name);
                        }
                    }
                }
                if (App.activeTab === 'tab-gallery') App.loadGallery();
            }
        } catch (err) {
            Logger.error('Sync', 'Sync from cloud error', err);
        } finally {
            this.isSyncing = false;
        }
    }
};

const LocationService = {
    cache: { lat: null, lon: null, formattedName: null, timestamp: 0 },
    isFetchingAddress: false,

    calculateDistance(lat1, lon1, lat2, lon2) {
        const R = 6371000;
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                  Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                  Math.sin(dLon / 2) * Math.sin(dLon / 2);
        return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    },

    formatVietnamLocation(address) {
        if (!address) return null;
        let ward = address.ward || address.suburb || address.quarter || address.village || address.commune || address.hamlet;
        let district = address.city_district || address.district || address.county || address.town;
        let province = address.city || address.state || address.province;

        const parts = [];
        if (ward) {
            ward = ward.trim();
            if (/^(phường|p\.)\s+/i.test(ward)) ward = ward.replace(/^(phường|p\.)\s+/i, 'P. ');
            else if (/^(xã|x\.)\s+/i.test(ward)) ward = ward.replace(/^(xã|x\.)\s+/i, 'Xã ');
            else if (/^(thị trấn|tt\.)\s+/i.test(ward)) ward = ward.replace(/^(thị trấn|tt\.)\s+/i, 'TT. ');
            parts.push(ward);
        }
        if (district) {
            district = district.trim();
            if (/^(quận|q\.)\s+/i.test(district)) district = district.replace(/^(quận|q\.)\s+/i, 'Q. ');
            else if (/^(huyện|h\.)\s+/i.test(district)) district = district.replace(/^(huyện|h\.)\s+/i, 'Huyện ');
            else if (/^(thị xã|tx\.)\s+/i.test(district)) district = district.replace(/^(thị xã|tx\.)\s+/i, 'TX. ');
            else if (/^(thành phố|tp\.)\s+/i.test(district)) district = district.replace(/^(thành phố|tp\.)\s+/i, 'TP. ');
            parts.push(district);
        }
        if (province) {
            province = province.trim();
            if (/^(thành phố|tp\.)\s+/i.test(province)) province = province.replace(/^(thành phố|tp\.)\s+/i, 'TP. ');
            else if (/^(tỉnh)\s+/i.test(province)) province = province.replace(/^(tỉnh)\s+/i, 'Tỉnh ');
            parts.push(province);
        }
        return parts.length > 0 ? parts.join(', ') : null;
    },

    async reverseGeocode(lat, lon) {
        try {
            const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}&accept-language=vi`;
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 4000);

            const response = await fetch(url, { signal: controller.signal, headers: { 'Accept-Language': 'vi' } });
            clearTimeout(timeoutId);

            if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);
            const data = await response.json();

            if (data && data.address) {
                const countryCode = (data.address.country_code || '').toLowerCase();
                if (countryCode === 'vn') {
                    const vnFormatted = this.formatVietnamLocation(data.address);
                    if (vnFormatted) return vnFormatted;
                }
                return data.display_name || null;
            }
        } catch (err) {
            Logger.error('Location', 'Reverse Geocode error', err);
        }
        return null;
    },

    getLocationDisplayString() {
        if (this.cache.lat === null || this.cache.lon === null) return null;
        if (this.cache.formattedName) return `📍 ${this.cache.formattedName}`;
        return `📍 GPS: ${this.cache.lat}, ${this.cache.lon}`;
    },

    async updateLocation(forceRefresh = false) {
        if (!navigator.geolocation) return null;
        return new Promise((resolve) => {
            navigator.geolocation.getCurrentPosition(
                async (position) => {
                    const lat = Number(position.coords.latitude.toFixed(6));
                    const lon = Number(position.coords.longitude.toFixed(6));
                    const now = Date.now();

                    const isDistClose = this.cache.lat !== null && this.calculateDistance(lat, lon, this.cache.lat, this.cache.lon) < 150;
                    const isCacheFresh = (now - this.cache.timestamp) < 600000;

                    this.cache.lat = lat;
                    this.cache.lon = lon;

                    if (isDistClose && isCacheFresh && this.cache.formattedName && !forceRefresh) {
                        this.updateUIStatus();
                        resolve(this.getLocationDisplayString());
                        return;
                    }

                    this.updateUIStatus();
                    if (!this.isFetchingAddress) {
                        this.isFetchingAddress = true;
                        this.reverseGeocode(lat, lon).then((name) => {
                            this.cache.formattedName = name;
                            this.cache.timestamp = Date.now();
                            this.isFetchingAddress = false;
                            this.updateUIStatus();
                        }).catch(() => { this.isFetchingAddress = false; });
                    }
                    resolve(this.getLocationDisplayString());
                },
                (error) => {
                    Logger.error('Location', 'GPS Geolocation error', error);
                    this.updateUIStatus();
                    resolve(null);
                },
                { enableHighAccuracy: true, timeout: 5000, maximumAge: 10000 }
            );
        });
    },

    updateUIStatus() {
        const statusEl = document.getElementById('locationStatusDisplay');
        if (statusEl) {
            if (this.cache.formattedName) {
                statusEl.textContent = `📍 ${this.cache.formattedName}`;
                statusEl.style.color = '#28a745';
            } else if (this.cache.lat !== null) {
                statusEl.textContent = `📍 GPS: ${this.cache.lat}, ${this.cache.lon}`;
                statusEl.style.color = '#ffc107';
            } else {
                statusEl.textContent = '📍 Chưa xác định được vị trí';
                statusEl.style.color = '#aaa';
            }
        }
    }
};

const WatermarkEngine = {
    drawToCanvas(canvas, studentName, settings, locationText = null) {
        if (!settings || !settings.enabled) return;

        const ctx = canvas.getContext('2d');
        const lines = [];

        if (settings.showUnit && settings.unitName) {
            lines.push(settings.unitName.toUpperCase());
        }
        if (studentName) {
            lines.push(`HỌ TÊN: ${studentName.toUpperCase()}`);
        }
        if (settings.showDate) {
            const now = new Date();
            const pad = n => String(n).padStart(2, '0');
            lines.push(`${pad(now.getDate())}/${pad(now.getMonth() + 1)}/${now.getFullYear()} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`);
        }
        if (settings.showLocation && locationText) {
            lines.push(locationText);
        }

        if (lines.length === 0) return;

        const baseFontSize = parseInt(settings.fontSize) || 16;
        const scaleFactor = Math.max(canvas.width / 1280, 0.6);
        const fontSize = Math.round(baseFontSize * scaleFactor);

        ctx.font = `bold ${fontSize}px Arial, sans-serif`;

        const lineHeight = fontSize * 1.35;
        let maxWidth = 0;
        lines.forEach(l => {
            const w = ctx.measureText(l).width;
            if (w > maxWidth) maxWidth = w;
        });

        const padding = Math.round(10 * scaleFactor);
        const bWidth = maxWidth + (padding * 2);
        const bHeight = (lines.length * lineHeight) + padding;

        let boxX = padding;
        let boxY = padding;

        if (settings.position === 'bottom-right') {
            boxX = canvas.width - bWidth - padding;
            boxY = canvas.height - bHeight - padding;
        } else if (settings.position === 'bottom') {
            boxX = (canvas.width - bWidth) / 2;
            boxY = canvas.height - bHeight - padding;
        } else if (settings.position === 'center') {
            boxX = (canvas.width - bWidth) / 2;
            boxY = (canvas.height - bHeight) / 2;
        } else if (settings.position === 'top') {
            boxX = (canvas.width - bWidth) / 2;
            boxY = padding;
        }

        if (settings.bgColor && settings.bgColor.trim() !== 'transparent') {
            ctx.fillStyle = settings.bgColor;
            ctx.fillRect(boxX, boxY, bWidth, bHeight);
        }

        if (settings.shadow) {
            ctx.shadowColor = 'rgba(0, 0, 0, 0.85)';
            ctx.shadowBlur = Math.round(4 * scaleFactor);
            ctx.shadowOffsetX = Math.round(2 * scaleFactor);
            ctx.shadowOffsetY = Math.round(2 * scaleFactor);
        } else {
            ctx.shadowColor = 'transparent';
            ctx.shadowBlur = 0;
            ctx.shadowOffsetX = 0;
            ctx.shadowOffsetY = 0;
        }

        ctx.fillStyle = settings.color || '#ff2407';
        ctx.textBaseline = 'top';

        lines.forEach((line, i) => {
            let textX = boxX + padding;
            ctx.textAlign = 'left';

            if (settings.align === 'center') {
                textX = boxX + (bWidth / 2);
                ctx.textAlign = 'center';
            } else if (settings.align === 'right') {
                textX = boxX + bWidth - padding;
                ctx.textAlign = 'right';
            }
            ctx.fillText(line, textX, boxY + (padding / 2) + (i * lineHeight));
        });

        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;
    }
};

const VideoProcessingEngine = {
    currentJobCancel: null,

    showProgress(percent, title = "Đang xử lý Watermark Video...") {
        const overlay = document.getElementById('processingOverlay');
        const progressBar = document.getElementById('processingProgressBar');
        const percentageText = document.getElementById('processingPercentage');
        const titleEl = document.getElementById('processingTitle');

        if (overlay) overlay.classList.remove('hidden');
        if (progressBar) progressBar.style.width = `${percent}%`;
        if (percentageText) percentageText.textContent = `${percent}%`;
        if (titleEl) titleEl.textContent = title;
    },

    hideProgress() {
        const overlay = document.getElementById('processingOverlay');
        if (overlay) overlay.classList.add('hidden');
    },

    async processOfflineVideoWatermark(originalVideoBlob, studentName, settings, onProgress) {
        return new Promise((resolve, reject) => {
            let isCancelled = false;
            this.currentJobCancel = () => { isCancelled = true; };

            const video = document.createElement('video');
            video.muted = false;
            video.playsInline = true;
            video.preload = 'auto';

            const videoUrl = ObjectURLManager.create(originalVideoBlob);
            video.src = videoUrl;

            let audioContext = null;
            let audioSource = null;
            let audioDestination = null;

            video.onloadedmetadata = async () => {
                try {
                    const duration = video.duration;
                    if (!duration || isNaN(duration) || duration <= 0) {
                        ObjectURLManager.revoke(videoUrl);
                        return reject(new AppError('ProcessingError', 'Thời lượng video không hợp lệ'));
                    }

                    const width = video.videoWidth || 1280;
                    const height = video.videoHeight || 720;

                    const canvas = document.createElement('canvas');
                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d', { alpha: false });

                    const mimeType = Utils.getBestSupportedVideoMimeType();
                    if (!mimeType) {
                        ObjectURLManager.revoke(videoUrl);
                        return reject(new AppError('RecordingError', 'Trình duyệt không hỗ trợ MediaRecorder video'));
                    }

                    const canvasStream = canvas.captureStream(30);

                    try {
                        const AudioCtx = window.AudioContext || window.webkitAudioContext;
                        if (AudioCtx) {
                            audioContext = new AudioCtx();
                            audioSource = audioContext.createMediaElementSource(video);
                            audioDestination = audioContext.createMediaStreamDestination();
                            audioSource.connect(audioDestination);
                            audioSource.connect(audioContext.destination);

                            const audioTrack = audioDestination.stream.getAudioTracks()[0];
                            if (audioTrack) {
                                canvasStream.addTrack(audioTrack);
                            }
                        }
                    } catch (audioErr) {
                        Logger.error('Processing', 'Khởi tạo luồng âm thanh thất bại:', audioErr);
                    }

                    const mediaRecorder = new MediaRecorder(canvasStream, {
                        mimeType,
                        videoBitsPerSecond: 2500000
                    });

                    const chunks = [];
                    mediaRecorder.ondataavailable = e => {
                        if (e.data && e.data.size > 0) chunks.push(e.data);
                    };

                    mediaRecorder.onstop = () => {
                        cleanup();
                        if (isCancelled) {
                            reject(new AppError('ProcessingError', 'Đã hủy xử lý video'));
                            return;
                        }
                        const processedBlob = new Blob(chunks, { type: mimeType });
                        if (processedBlob.size === 0) {
                            reject(new AppError('ProcessingError', 'Video xuất ra có kích thước 0 byte'));
                        } else {
                            resolve(processedBlob);
                        }
                    };

                    const cleanup = () => {
                        try {
                            video.pause();
                            ObjectURLManager.revoke(videoUrl);
                            if (audioContext && audioContext.state !== 'closed') {
                                audioContext.close();
                            }
                        } catch (e) { /* ignore */ }
                    };

                    let locText = null;
                    if (settings.showLocation) {
                        locText = LocationService.getLocationDisplayString();
                    }

                    mediaRecorder.start();
                    await video.play();

                    const renderFrame = () => {
                        if (isCancelled) {
                            mediaRecorder.stop();
                            return;
                        }

                        if (video.ended || video.currentTime >= duration) {
                            if (mediaRecorder.state !== 'inactive') {
                                mediaRecorder.stop();
                            }
                            return;
                        }

                        ctx.drawImage(video, 0, 0, width, height);
                        WatermarkEngine.drawToCanvas(canvas, studentName, settings, locText);

                        const pct = Math.min(Math.round((video.currentTime / duration) * 100), 99);
                        if (onProgress) onProgress(pct);

                        if ('requestVideoFrameCallback' in video) {
                            video.requestVideoFrameCallback(renderFrame);
                        } else {
                            setTimeout(renderFrame, 1000 / 30);
                        }
                    };

                    if ('requestVideoFrameCallback' in video) {
                        video.requestVideoFrameCallback(renderFrame);
                    } else {
                        renderFrame();
                    }

                } catch (err) {
                    ObjectURLManager.revoke(videoUrl);
                    reject(new AppError('ProcessingError', 'Lỗi xử lý khung hình video', err));
                }
            };

            video.onerror = (err) => {
                ObjectURLManager.revoke(videoUrl);
                reject(new AppError('ProcessingError', 'Không thể đọc tệp video gốc', err));
            };
        });
    }
};

const MediaPipeline = {
    async createMediaEntry(originalBlob, type, studentName, settings) {
        const timestamp = Date.now();
        const cleanName = Utils.removeVietnameseTones(studentName);
        const mimeType = originalBlob.type || (type === 'photo' ? 'image/jpeg' : Utils.getBestSupportedVideoMimeType());
        const ext = Utils.getFileExtensionFromMime(mimeType, type);
        const fileName = `${cleanName}_${Utils.formatDateForFile(timestamp)}.${ext}`;

        const mediaEntry = {
            id: timestamp.toString(),
            type,
            blob: originalBlob,
            originalBlob: originalBlob,
            processedBlob: null,
            studentName,
            fileName,
            originalFileName: fileName,
            timestamp,
            mimeType,
            watermarkApplied: false,
            processingStatus: settings.enabled ? 'pending' : 'success',
            sync_status: 'pending',
            error: null
        };

        if (!settings.enabled) {
            mediaEntry.processedBlob = originalBlob;
            mediaEntry.watermarkApplied = false;
        }

        await db.saveMedia(mediaEntry);
        return mediaEntry;
    },

    async processAndSave(mediaEntry, settings) {
        if (!settings.enabled) {
            mediaEntry.processingStatus = 'success';
            mediaEntry.watermarkApplied = false;
            await db.saveMedia(mediaEntry);
            if (Auth.currentUser) SyncManager.uploadSingleMedia(mediaEntry);
            return mediaEntry;
        }

        VideoProcessingEngine.showProgress(0, `Đang xử lý ${mediaEntry.type === 'photo' ? 'ảnh' : 'video'}...`);

        try {
            if (mediaEntry.type === 'photo') {
                const processedBlob = await this.applyWatermarkToPhotoBlob(mediaEntry.originalBlob, mediaEntry.studentName, settings);
                mediaEntry.processedBlob = processedBlob;
                mediaEntry.blob = processedBlob;
                mediaEntry.watermarkApplied = true;
                mediaEntry.processingStatus = 'success';
                VideoProcessingEngine.showProgress(100);
            } else {
                const processedBlob = await VideoProcessingEngine.processOfflineVideoWatermark(
                    mediaEntry.originalBlob,
                    mediaEntry.studentName,
                    settings,
                    (percent) => VideoProcessingEngine.showProgress(percent)
                );
                mediaEntry.processedBlob = processedBlob;
                mediaEntry.blob = processedBlob;
                mediaEntry.watermarkApplied = true;
                mediaEntry.processingStatus = 'success';
            }

            await db.saveMedia(mediaEntry);
            Utils.showToast(`✅ Đã đóng watermark: ${mediaEntry.studentName}`);

            if (Auth.currentUser) {
                SyncManager.uploadSingleMedia(mediaEntry);
            }

        } catch (err) {
            Logger.error('Pipeline', 'Xử lý media thất bại', err);
            mediaEntry.processingStatus = 'failed';
            mediaEntry.error = err.message || 'Lỗi xử lý watermark';
            await db.saveMedia(mediaEntry);

            Utils.showToast(`❌ Lỗi watermark! Video gốc vẫn an toàn. Có thể nhấn Thử lại trong Thư viện.`);
        } finally {
            setTimeout(() => VideoProcessingEngine.hideProgress(), 500);
            if (App.activeTab === 'tab-gallery') App.loadGallery();
        }

        return mediaEntry;
    },

    async applyWatermarkToPhotoBlob(photoBlob, studentName, settings) {
        let locationText = null;
        if (settings.showLocation) {
            locationText = LocationService.getLocationDisplayString();
        }

        return new Promise((resolve, reject) => {
            const img = new Image();
            const url = ObjectURLManager.create(photoBlob);
            img.onload = () => {
                try {
                    const canvas = document.createElement('canvas');
                    canvas.width = img.width;
                    canvas.height = img.height;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0);

                    WatermarkEngine.drawToCanvas(canvas, studentName, settings, locationText);

                    canvas.toBlob((blob) => {
                        ObjectURLManager.revoke(url);
                        if (blob) resolve(blob);
                        else reject(new AppError('WatermarkError', 'Không thể tạo Blob ảnh'));
                    }, 'image/jpeg', 0.92);
                } catch (e) {
                    ObjectURLManager.revoke(url);
                    reject(e);
                }
            };
            img.onerror = () => {
                ObjectURLManager.revoke(url);
                reject(new AppError('WatermarkError', 'Không thể tải ảnh gốc'));
            };
            img.src = url;
        });
    }
};

class CaptureManager {
    constructor() {
        this.capabilities = Utils.checkCapabilities();
        this.stream = null;
        this.videoTrack = null;
        this.mediaRecorder = null;
        this.recordedChunks = [];
        this.isRecording = false;
        this.recordStartTime = 0;
        this.recordTimer = null;
        this.animationFrameId = null;
        this.isCameraReady = false;
        this.currentDeviceId = '';
        this.recordingStudent = null;
        this.recordingSettings = null;
        this.torchActive = false;
    }

    initUI() {
        const desktopZone = document.getElementById('desktopCameraZone');
        const mobileZone = document.getElementById('mobileCameraZone');
        const controlsPanel = document.getElementById('cameraControlsPanel');

        if (!this.capabilities.hasGetUserMedia) {
            if (desktopZone) desktopZone.style.display = 'none';
            if (mobileZone) mobileZone.classList.remove('hidden');
            if (controlsPanel) controlsPanel.classList.add('hidden');
        } else {
            if (desktopZone) desktopZone.style.display = 'flex';
            if (mobileZone) mobileZone.classList.add('hidden');
            if (controlsPanel) controlsPanel.classList.remove('hidden');
        }
    }

    async startCamera(deviceId = '') {
        if (!this.capabilities.hasGetUserMedia) return;

        this.stopCamera();

        const video = document.getElementById('rawVideo');
        try {
            const constraints = {
                video: deviceId ? { deviceId: { exact: deviceId } } : {
                    facingMode: { ideal: 'environment' },
                    width: { ideal: 1920 },
                    height: { ideal: 1080 }
                },
                audio: true
            };

            this.stream = await navigator.mediaDevices.getUserMedia(constraints);
            this.videoTrack = this.stream.getVideoTracks()[0] || null;
            video.srcObject = this.stream;
            this.isCameraReady = false;

            video.onloadedmetadata = () => {
                video.play();
                this.isCameraReady = true;
                this.startCanvasLoop();
                this.inspectTrackCapabilities();
            };

            this.enumerateCameras();
            this.applyFilters();

        } catch (err) {
            Logger.error('Camera', 'startCamera error', err);
            if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
                Utils.showToast("Không có quyền truy cập Camera/Microphone.");
            } else {
                Utils.showToast("Lỗi mở Camera. Chuyển sang Native Camera Mode.");
                this.capabilities.hasGetUserMedia = false;
                this.initUI();
            }
        }
    }

    stopCamera() {
        if (this.isRecording) this.stopRecording();
        if (this.stream) {
            this.stream.getTracks().forEach(t => t.stop());
            this.stream = null;
            this.videoTrack = null;
        }
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        }
        this.isCameraReady = false;
        const video = document.getElementById('rawVideo');
        if (video) video.srcObject = null;
    }

    inspectTrackCapabilities() {
        if (!this.videoTrack || typeof this.videoTrack.getCapabilities !== 'function') return;

        try {
            const caps = this.videoTrack.getCapabilities();
            Logger.camera('Hardware Track Capabilities:', caps);

            const torchBtn = document.getElementById('btnTorchToggle');
            if (torchBtn) {
                if (caps.torch) {
                    torchBtn.classList.remove('hidden');
                } else {
                    torchBtn.classList.add('hidden');
                }
            }
        } catch (e) { /* ignore */ }
    }

    async toggleTorch() {
        if (!this.videoTrack || typeof this.videoTrack.applyConstraints !== 'function') return;
        try {
            const caps = this.videoTrack.getCapabilities ? this.videoTrack.getCapabilities() : {};
            if (!caps.torch) return;

            this.torchActive = !this.torchActive;
            await this.videoTrack.applyConstraints({
                advanced: [{ torch: this.torchActive }]
            });

            const torchBtn = document.getElementById('btnTorchToggle');
            if (torchBtn) {
                torchBtn.style.color = this.torchActive ? '#ffeb3b' : '#ffffff';
            }
        } catch (err) {
            Logger.error('Camera', 'Bật tắt Flash thất bại', err);
        }
    }

    async applyHardwareZoom(zoomVal) {
        if (!this.videoTrack || typeof this.videoTrack.applyConstraints !== 'function') return false;
        try {
            const caps = this.videoTrack.getCapabilities ? this.videoTrack.getCapabilities() : {};
            if (caps.zoom) {
                const min = caps.zoom.min || 1;
                const max = caps.zoom.max || 3;
                const targetZoom = Math.min(Math.max(zoomVal, min), max);
                await this.videoTrack.applyConstraints({ advanced: [{ zoom: targetZoom }] });
                return true;
            }
        } catch (e) { /* fallback */ }
        return false;
    }

    startCanvasLoop() {
        const video = document.getElementById('rawVideo');
        const canvas = document.getElementById('outputCanvas');
        if (!canvas || !video) return;

        const ctx = canvas.getContext('2d', { alpha: false });

        const render = () => {
            if (video.readyState === video.HAVE_ENOUGH_DATA && video.videoWidth > 0) {
                if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
                    canvas.width = video.videoWidth;
                    canvas.height = video.videoHeight;
                }
                ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

                if (this.isRecording && this.recordingStudent && this.recordingSettings && this.recordingSettings.enabled) {
                    let locText = null;
                    if (this.recordingSettings.showLocation) {
                        locText = LocationService.getLocationDisplayString();
                    }
                    WatermarkEngine.drawToCanvas(canvas, this.recordingStudent, this.recordingSettings, locText);
                }
            }
            if (this.stream) {
                this.animationFrameId = requestAnimationFrame(render);
            }
        };
        render();
    }

    async applyFilters() {
        const zoom = parseFloat(document.getElementById('zoomRange')?.value) || 1;
        const bright = parseFloat(document.getElementById('brightnessRange')?.value) || 1;
        const canvas = document.getElementById('outputCanvas');

        const hardwareApplied = await this.applyHardwareZoom(zoom);

        if (canvas) {
            canvas.style.transform = hardwareApplied ? 'none' : `scale(${zoom})`;
            canvas.style.filter = bright !== 1 ? `brightness(${bright})` : 'none';
        }
    }

    async capturePhoto(studentName, settings) {
        if (!this.isCameraReady) throw new AppError('CameraError', 'Camera chưa sẵn sàng');

        const canvas = document.getElementById('outputCanvas');
        if (!canvas || canvas.width === 0) throw new AppError('CameraError', 'Khung hình rỗng');

        let locationText = null;
        if (settings.showLocation) {
            locationText = LocationService.getLocationDisplayString();
        }

        const captureCanvas = document.createElement('canvas');
        captureCanvas.width = canvas.width;
        captureCanvas.height = canvas.height;
        const ctx = captureCanvas.getContext('2d');

        const brightness = parseFloat(document.getElementById('brightnessRange')?.value) || 1;
        const zoom = parseFloat(document.getElementById('zoomRange')?.value) || 1;

        ctx.save();
        if (brightness !== 1) ctx.filter = `brightness(${brightness})`;
        if (zoom !== 1) {
            const cx = captureCanvas.width / 2;
            const cy = captureCanvas.height / 2;
            ctx.translate(cx, cy);
            ctx.scale(zoom, zoom);
            ctx.translate(-cx, -cy);
        }
        ctx.drawImage(canvas, 0, 0, captureCanvas.width, captureCanvas.height);
        ctx.restore();

        WatermarkEngine.drawToCanvas(captureCanvas, studentName, settings, locationText);

        return new Promise(resolve => captureCanvas.toBlob(resolve, 'image/jpeg', 0.92));
    }

    startRecording(studentName, settings) {
        if (this.isRecording) return;
        if (!this.isCameraReady) { Utils.showToast("Camera chưa sẵn sàng!"); return; }

        const canvas = document.getElementById('outputCanvas');
        if (!canvas || canvas.width === 0) return;

        this.recordingStudent = studentName;
        this.recordingSettings = settings;

        try {
            const canvasStream = canvas.captureStream(30);
            const audioTracks = this.stream ? this.stream.getAudioTracks() : [];
            const combinedStream = new MediaStream([...canvasStream.getVideoTracks(), ...audioTracks]);

            const mimeType = Utils.getBestSupportedVideoMimeType();
            if (!mimeType) { Utils.showToast("Trình duyệt không hỗ trợ quay video!"); return; }

            this.mediaRecorder = new MediaRecorder(combinedStream, { mimeType, videoBitsPerSecond: 2500000 });
            this.recordedChunks = [];

            this.mediaRecorder.ondataavailable = e => {
                if (e.data && e.data.size > 0) this.recordedChunks.push(e.data);
            };

            this.mediaRecorder.onstop = async () => {
                const blob = new Blob(this.recordedChunks, { type: mimeType });
                if (blob.size > 0) {
                    const entry = await MediaPipeline.createMediaEntry(blob, 'video', studentName, { enabled: false });
                    entry.processedBlob = blob;
                    entry.watermarkApplied = settings.enabled;
                    entry.processingStatus = 'success';
                    await db.saveMedia(entry);
                    Utils.showToast(`Đã lưu video: ${studentName}`);
                    if (Auth.currentUser) SyncManager.uploadSingleMedia(entry);
                    if (App.activeTab === 'tab-gallery') App.loadGallery();
                }
                this.recordedChunks = [];
                this.recordingStudent = null;
                this.recordingSettings = null;
            };

            this.mediaRecorder.start();
            this.isRecording = true;
            this.recordStartTime = Date.now();

            const btn = document.getElementById('btnRecordVideo');
            if (btn) btn.innerHTML = '<i class="fa-solid fa-square"></i><span class="btn-label">DỪNG</span>';
            document.getElementById('recordingIndicator').classList.remove('hidden');

            this.recordTimer = setInterval(() => {
                const d = Math.floor((Date.now() - this.recordStartTime) / 1000);
                document.getElementById('recordingTime').textContent =
                    `${String(Math.floor(d / 60)).padStart(2, '0')}:${String(d % 60).padStart(2, '0')}`;
            }, 1000);

        } catch (err) {
            Logger.error('Recording', 'Bắt đầu quay video thất bại', err);
            Utils.showToast("Lỗi khởi tạo quay video!");
        }
    }

    stopRecording() {
        if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
            this.mediaRecorder.stop();
        }
        this.isRecording = false;
        clearInterval(this.recordTimer);

        const btn = document.getElementById('btnRecordVideo');
        if (btn) btn.innerHTML = '<i class="fa-solid fa-video"></i><span class="btn-label">QUAY VIDEO</span>';
        document.getElementById('recordingIndicator')?.classList.add('hidden');
        document.getElementById('recordingTime').textContent = '00:00';
    }

    async enumerateCameras() {
        if (!this.capabilities.hasEnumerateDevices) return;
        try {
            const devices = await navigator.mediaDevices.enumerateDevices();
            const videoDevices = devices.filter(d => d.kind === 'videoinput');
            const selector = document.getElementById('cameraSelect');
            if (!selector) return;

            const currentValue = selector.value;
            selector.innerHTML = '<option value="">-- Camera --</option>';
            videoDevices.forEach((d, i) => {
                const opt = document.createElement('option');
                opt.value = d.deviceId;
                opt.text = d.label || `Camera ${i + 1}`;
                selector.appendChild(opt);
            });

            if (currentValue && [...selector.options].some(o => o.value === currentValue)) {
                selector.value = currentValue;
            }

            selector.onchange = (e) => {
                this.currentDeviceId = e.target.value;
                this.startCamera(e.target.value);
            };
        } catch (e) {
            Logger.error('Camera', 'Enumerate devices error', e);
        }
    }

    async switchCamera() {
        const selector = document.getElementById('cameraSelect');
        if (selector && selector.options.length > 1) {
            const current = selector.selectedIndex;
            const next = (current + 1) % selector.options.length;
            selector.selectedIndex = next === 0 ? 1 : next;
            selector.dispatchEvent(new Event('change'));
        } else {
            await this.enumerateCameras();
        }
    }
}

const App = {
    currentStudent: null,
    activeTab: 'tab-camera',
    isSelectMode: false,
    captureManager: null,

    async init() {
        try {
            await db.init();
            await SettingsManager.load();

            this.captureManager = new CaptureManager();
            this.captureManager.initUI();

            this.initSettingsUI();
            this.bindEvents();
            await Auth.init();
            await this.loadStudentList();
            await this.restoreLastState();

            document.addEventListener('visibilitychange', () => {
                if (document.visibilityState === 'visible' && this.activeTab === 'tab-camera') {
                    if (this.captureManager.capabilities.hasGetUserMedia) {
                        this.captureManager.startCamera(this.captureManager.currentDeviceId);
                    }
                } else if (document.visibilityState === 'hidden') {
                    this.captureManager.stopCamera();
                }
            });

            if (SettingsManager.get('showLocation')) {
                LocationService.updateLocation();
            }

        } catch (error) {
            Logger.error('App', 'Lỗi khởi tạo ứng dụng', error);
            Utils.showToast("Lỗi khởi tạo ứng dụng!");
        }
    },

    async restoreLastState() {
        const lastStudentId = await db.getSetting('lastSelectedStudentId', null);
        if (lastStudentId) {
            const students = await db.getStudents();
            const found = students.find(s => s.id === lastStudentId);
            if (found) {
                this.currentStudent = found;
                document.getElementById('headerStudentName').textContent = found.name;
            }
        }

        const lastTab = await db.getSetting('lastActiveTab', 'tab-camera');
        this.switchTab(lastTab, true);
    },

    initSettingsUI() {
        const settings = SettingsManager.get();

        const check = document.getElementById('settingWatermark');
        check.checked = settings.enabled;
        document.getElementById('watermarkSettingsOptions').style.display = settings.enabled ? 'block' : 'none';

        document.getElementById('setUnitName').value = settings.unitName || '';
        document.getElementById('setShowUnit').checked = !!settings.showUnit;
        document.getElementById('setShowDate').checked = !!settings.showDate;
        document.getElementById('setShowLocation').checked = !!settings.showLocation;

        document.getElementById('setPosition').value = settings.position || 'bottom-right';
        document.getElementById('setAlign').value = settings.align || 'right';
        document.getElementById('setFontSize').value = settings.fontSize || 16;
        document.getElementById('setColor').value = settings.color || '#ff2407';
        document.getElementById('setBgColor').value = settings.bgColor || 'transparent';
        document.getElementById('setShadow').checked = settings.shadow !== undefined ? settings.shadow : true;

        LocationService.updateUIStatus();
    },

    bindEvents() {
        document.getElementById('btnLoginGoogle')?.addEventListener('click', () => Auth.signInWithGoogle());
        document.getElementById('btnLogout')?.addEventListener('click', () => Auth.signOut());

        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.switchTab(e.currentTarget.dataset.target));
        });

        const bindAutoSave = (elementId, eventType, key, isCheckbox = false) => {
            const el = document.getElementById(elementId);
            if (!el) return;
            el.addEventListener(eventType, (e) => {
                const val = isCheckbox ? e.target.checked : e.target.value;
                SettingsManager.set(key, val);
                if (key === 'enabled') {
                    document.getElementById('watermarkSettingsOptions').style.display = val ? 'block' : 'none';
                }
                if (key === 'showLocation' && val) {
                    LocationService.updateLocation(true);
                }
            });
        };

        bindAutoSave('settingWatermark', 'change', 'enabled', true);
        bindAutoSave('setUnitName', 'input', 'unitName');
        bindAutoSave('setShowUnit', 'change', 'showUnit', true);
        bindAutoSave('setShowDate', 'change', 'showDate', true);
        bindAutoSave('setShowLocation', 'change', 'showLocation', true);
        bindAutoSave('setPosition', 'change', 'position');
        bindAutoSave('setAlign', 'change', 'align');
        bindAutoSave('setFontSize', 'input', 'fontSize');
        bindAutoSave('setColor', 'input', 'color');
        bindAutoSave('setBgColor', 'input', 'bgColor');
        bindAutoSave('setShadow', 'change', 'shadow', true);

        document.getElementById('btnSaveSettings')?.addEventListener('click', () => {
            SettingsManager.save(true);
            Utils.showToast('Đã lưu cấu hình watermark!');
        });

        document.getElementById('excelUpload')?.addEventListener('change', (e) => this.handleExcelImport(e));
        document.getElementById('btnDownloadSample')?.addEventListener('click', () => this.downloadSampleExcel());
        document.getElementById('btnClearList')?.addEventListener('click', () => this.clearStudents());
        document.getElementById('btnAddManual')?.addEventListener('click', () => this.addManualStudent());
        document.getElementById('searchStudent')?.addEventListener('input', (e) => this.loadStudentList(e.target.value));
        document.getElementById('manualName')?.addEventListener('keypress', (e) => { if (e.key === 'Enter') this.addManualStudent(); });

        document.getElementById('btnSwitchCamera')?.addEventListener('click', () => this.captureManager.switchCamera());
        document.getElementById('btnCapturePhoto')?.addEventListener('click', () => this.handleCapturePhoto());
        document.getElementById('btnRecordVideo')?.addEventListener('click', () => this.handleRecordVideo());
        document.getElementById('btnTorchToggle')?.addEventListener('click', () => this.captureManager.toggleTorch());

        document.getElementById('nativePhotoInput')?.addEventListener('change', (e) => this.handleNativeFileInput(e, 'photo'));
        document.getElementById('nativeVideoInput')?.addEventListener('change', (e) => this.handleNativeFileInput(e, 'video'));

        document.getElementById('zoomRange')?.addEventListener('input', () => this.captureManager.applyFilters());
        document.getElementById('brightnessRange')?.addEventListener('input', () => this.captureManager.applyFilters());
        document.getElementById('btnResetCamera')?.addEventListener('click', () => {
            document.getElementById('zoomRange').value = 1;
            document.getElementById('brightnessRange').value = 1;
            this.captureManager.applyFilters();
        });

        document.getElementById('btnToggleSelectMode')?.addEventListener('click', () => this.toggleSelectMode());
        document.getElementById('btnExportSelected')?.addEventListener('click', () => this.exportSelectedMedia());
        document.getElementById('btnDeleteSelected')?.addEventListener('click', () => this.deleteSelectedMedia());
        document.getElementById('btnDownloadSelectedImages')?.addEventListener('click', () => this.downloadSelectedImages());
        document.getElementById('filterType')?.addEventListener('change', () => this.loadGallery());

        document.getElementById('btnSelectAllMedia')?.addEventListener('click', () => this.setAllCheckboxes(true));
        document.getElementById('btnDeselectAllMedia')?.addEventListener('click', () => this.setAllCheckboxes(false));

        document.getElementById('btnCancelProcessing')?.addEventListener('click', () => {
            if (VideoProcessingEngine.currentJobCancel) VideoProcessingEngine.currentJobCancel();
        });

        document.getElementById('closeImageModal')?.addEventListener('click', () => {
            document.getElementById('imageModal').classList.add('hidden');
        });

        document.getElementById('closeVideoModal')?.addEventListener('click', () => {
            const m = document.getElementById('videoModal');
            const v = document.getElementById('modalVideo');
            m.classList.add('hidden');
            v.pause();
            v.src = '';
        });
    },

    async switchTab(targetTabId, isInitialLoad = false) {
        this.activeTab = targetTabId;
        db.setSetting('lastActiveTab', targetTabId);

        document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));

        document.querySelector(`.nav-btn[data-target="${targetTabId}"]`)?.classList.add('active');
        document.getElementById(targetTabId)?.classList.add('active');

        if (targetTabId === 'tab-camera') {
            if (this.captureManager.capabilities.hasGetUserMedia) {
                this.captureManager.startCamera(this.captureManager.currentDeviceId);
            }
            if (SettingsManager.get('showLocation')) LocationService.updateLocation();
        } else {
            this.captureManager.stopCamera();
        }

        if (targetTabId === 'tab-gallery') this.loadGallery();
        if (targetTabId === 'tab-settings') LocationService.updateUIStatus();
    },

    async handleCapturePhoto() {
        if (!this.currentStudent) {
            Utils.showToast("Vui lòng chọn học sinh trước khi chụp!");
            this.switchTab('tab-list');
            return;
        }

        if (!this.captureManager.capabilities.hasGetUserMedia) {
            const input = document.getElementById('nativePhotoInput');
            if (input) { input.value = ''; input.click(); }
            return;
        }

        try {
            const settings = SettingsManager.get();
            const blob = await this.captureManager.capturePhoto(this.currentStudent.name, settings);
            const mediaEntry = await MediaPipeline.createMediaEntry(blob, 'photo', this.currentStudent.name, { enabled: false });
            mediaEntry.processedBlob = blob;
            mediaEntry.watermarkApplied = settings.enabled;
            mediaEntry.processingStatus = 'success';
            await db.saveMedia(mediaEntry);

            Utils.showToast(`Đã lưu ảnh: ${this.currentStudent.name}`);
            if (Auth.currentUser) SyncManager.uploadSingleMedia(mediaEntry);
        } catch (err) {
            Logger.error('App', 'Lỗi chụp ảnh', err);
            Utils.showToast("Lỗi chụp ảnh!");
        }
    },

    async handleRecordVideo() {
        if (!this.currentStudent) {
            Utils.showToast("Vui lòng chọn học sinh!");
            this.switchTab('tab-list');
            return;
        }

        if (!this.captureManager.capabilities.hasGetUserMedia) {
            const input = document.getElementById('nativeVideoInput');
            if (input) { input.value = ''; input.click(); }
            return;
        }

        if (this.captureManager.isRecording) {
            this.captureManager.stopRecording();
        } else {
            this.captureManager.startRecording(this.currentStudent.name, SettingsManager.get());
        }
    },

    async handleNativeFileInput(e, type) {
        const file = e.target.files[0];
        e.target.value = '';
        if (!file) return;

        if (!this.currentStudent) {
            Utils.showToast("Vui lòng chọn học sinh!");
            this.switchTab('tab-list');
            return;
        }

        Utils.showToast(`Đang tiếp nhận ${type === 'photo' ? 'ảnh' : 'video'} gốc...`);
        try {
            const settings = SettingsManager.get();
            const entry = await MediaPipeline.createMediaEntry(file, type, this.currentStudent.name, settings);
            await MediaPipeline.processAndSave(entry, settings);
        } catch (err) {
            Logger.error('App', 'Lỗi xử lý file camera thiết bị', err);
            Utils.showToast("Lỗi xử lý file từ Camera!");
        }
    },

    handleExcelImport(e) {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = async (evt) => {
            try {
                const workbook = XLSX.read(new Uint8Array(evt.target.result), { type: 'array' });
                const json = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);
                if (json.length === 0) { Utils.showToast("File Excel rỗng!"); return; }
                const keys = Object.keys(json[0]);
                const nameKey = keys.find(k => k.toLowerCase().includes('tên') || k.toLowerCase().includes('name')) || keys[1] || keys[0];
                const newStudents = json.map((row, idx) => ({
                    id: (Date.now() + idx).toString(),
                    name: String(row[nameKey] || '').trim(),
                    class: String(row['Lớp'] || row['Class'] || '').trim()
                })).filter(s => s.name);

                await db.saveStudents(newStudents);
                Utils.showToast(`Đã nhập ${newStudents.length} học sinh!`);
                e.target.value = '';
                this.loadStudentList();
            } catch (err) { Utils.showToast("Lỗi đọc File Excel!"); }
        };
        reader.readAsArrayBuffer(file);
    },

    downloadSampleExcel() {
        const sampleData = [{ "STT": 1, "Họ và tên": "Nguyễn Văn An", "Lớp": "10A1" }];
        const ws = XLSX.utils.json_to_sheet(sampleData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Danh_sach_mau");
        XLSX.writeFile(wb, "Danh_Sach_Hoc_Sinh_Mau.xlsx");
    },

    async addManualStudent() {
        const input = document.getElementById('manualName');
        const name = input.value.trim();
        if (!name) return Utils.showToast("Nhập họ tên!");
        const newStudent = { id: Date.now().toString(), name, class: '' };
        await db.saveStudents([newStudent]);
        input.value = '';
        input.focus();
        this.loadStudentList();
        Utils.showToast(`Đã thêm: ${name}`);
    },

    async clearStudents() {
        if (confirm("Xóa toàn bộ danh sách học sinh?")) {
            await db.clearStudents();
            this.currentStudent = null;
            await db.setSetting('lastSelectedStudentId', null);
            document.getElementById('headerStudentName').textContent = "Chưa chọn học sinh";
            this.loadStudentList();
        }
    },

    async loadStudentList(filterText = '') {
        const list = await db.getStudents();
        const ul = document.getElementById('studentList');
        ul.innerHTML = '';
        const filtered = list.filter(s => s.name.toLowerCase().includes(filterText.toLowerCase()));
        if (filtered.length === 0) {
            ul.innerHTML = '<li style="justify-content:center; color:#888;">Chưa có dữ liệu</li>';
            return;
        }

        filtered.forEach(student => {
            const li = document.createElement('li');
            if (this.currentStudent?.id === student.id) li.classList.add('selected');
            li.innerHTML = `<span><strong>${student.name}</strong> ${student.class ? `(${student.class})` : ''}</span>
                            <i class="fa-solid fa-circle-check" style="color: ${this.currentStudent?.id === student.id ? '#007bff' : '#555'}"></i>`;
            li.addEventListener('click', () => {
                this.currentStudent = student;
                db.setSetting('lastSelectedStudentId', student.id);
                document.getElementById('headerStudentName').textContent = student.name;
                this.loadStudentList(filterText);
                this.switchTab('tab-camera');
            });
            ul.appendChild(li);
        });
    },

    toggleSelectMode() {
        this.isSelectMode = !this.isSelectMode;
        const actionBar = document.getElementById('selectionActionBar');
        const toggleBtn = document.getElementById('btnToggleSelectMode');

        if (this.isSelectMode) {
            actionBar.classList.remove('hidden');
            toggleBtn.innerHTML = '<i class="fa-solid fa-xmark"></i> Hủy chọn nhiều';
            toggleBtn.classList.replace('btn-secondary', 'btn-danger');
        } else {
            actionBar.classList.add('hidden');
            toggleBtn.innerHTML = '<i class="fa-solid fa-square-check"></i> Chọn nhiều';
            toggleBtn.classList.replace('btn-danger', 'btn-secondary');
            this.setAllCheckboxes(false);
        }
        this.loadGallery();
    },

    updateSelectedCount() {
        const checkedBoxes = document.querySelectorAll('.gallery-checkbox:checked');
        const countText = document.getElementById('selectedCountText');
        if (countText) countText.textContent = `Đã chọn: ${checkedBoxes.length}`;
    },

    setAllCheckboxes(select) {
        const filter = document.getElementById('filterType').value;
        const checkboxes = document.querySelectorAll('.gallery-checkbox');
        checkboxes.forEach(cb => {
            if (filter === 'photo' && cb.dataset.type !== 'photo') return;
            if (filter === 'video' && cb.dataset.type !== 'video') return;
            cb.checked = select;
        });
        this.updateSelectedCount();
    },

    getSelectedGalleryItems() {
        const checkedBoxes = document.querySelectorAll('.gallery-checkbox:checked');
        const items = [];
        checkedBoxes.forEach(cb => {
            if (cb._mediaObject) items.push(cb._mediaObject);
        });
        return items;
    },

    async loadGallery() {
        ObjectURLManager.revokeAll();

        const filter = document.getElementById('filterType').value;
        let list = await db.getAllMedia();
        if (filter !== 'all') list = list.filter(m => m.type === filter);
        const grid = document.getElementById('galleryGrid');
        grid.innerHTML = '';

        if (list.length === 0) {
            grid.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: #888; padding: 30px;">Chưa có file media nào</p>';
            this.updateSelectedCount();
            return;
        }

        list.forEach(media => {
            const item = document.createElement('div');
            item.className = 'gallery-item';

            const activeBlob = media.processedBlob || media.originalBlob || media.blob;
            const url = ObjectURLManager.create(activeBlob);

            const syncBadge = media.sync_status === 'synced' ?
                '<span class="badge sync-badge synced" title="Đã đồng bộ"><i class="fa-solid fa-cloud-check"></i></span>' :
                '<span class="badge sync-badge pending" title="Chờ đồng bộ"><i class="fa-solid fa-cloud-arrow-up"></i></span>';

            let statusBadge = '';
            if (media.processingStatus === 'failed') {
                statusBadge = `<button class="badge status-badge failed btn-retry-watermark" data-id="${media.id}" title="Xử lý thất bại. Nhấn để thử lại"><i class="fa-solid fa-triangle-exclamation"></i> Thử lại</button>`;
            } else if (media.watermarkApplied) {
                statusBadge = `<span class="badge status-badge wm-active" title="Đã in Watermark"><i class="fa-solid fa-stamp"></i> WM</span>`;
            }

            const mediaTag = media.type === 'photo' ?
                `<img src="${url}" alt="photo" loading="lazy">` :
                `<video src="${url}" preload="metadata" playsinline></video>`;

            const checkboxDisplay = this.isSelectMode ? '' : 'style="display: none;"';

            item.innerHTML = `
                <input type="checkbox" class="gallery-checkbox" data-id="${media.id}" data-type="${media.type}" ${checkboxDisplay}>
                <div class="gallery-badges">${syncBadge} ${statusBadge}</div>
                ${mediaTag}
                <div class="gallery-info">
                    <strong>${media.studentName}</strong>
                    <span class="file-meta">${media.type.toUpperCase()} • ${Math.round((activeBlob ? activeBlob.size : 0) / 1024 / 1024 * 10) / 10} MB</span>
                </div>`;

            const cb = item.querySelector('.gallery-checkbox');
            cb._mediaObject = media;
            cb.addEventListener('change', () => this.updateSelectedCount());

            const retryBtn = item.querySelector('.btn-retry-watermark');
            if (retryBtn) {
                retryBtn.addEventListener('click', async (e) => {
                    e.stopPropagation();
                    Utils.showToast("Đang thử lại xử lý watermark...");
                    await MediaPipeline.processAndSave(media, SettingsManager.get());
                });
            }

            const mediaEl = item.querySelector('img, video');
            if (mediaEl) {
                mediaEl.addEventListener('click', () => {
                    if (this.isSelectMode) {
                        cb.checked = !cb.checked;
                        this.updateSelectedCount();
                    } else {
                        this.viewMedia(url, media.type, media.fileName);
                    }
                });
            }
            grid.appendChild(item);
        });
        this.updateSelectedCount();
    },

    viewMedia(url, type, fileName) {
        if (type === 'photo') {
            document.getElementById('modalImg').src = url;
            document.getElementById('modalCaption').textContent = fileName;
            document.getElementById('imageModal').classList.remove('hidden');
        } else {
            const v = document.getElementById('modalVideo');
            v.src = url;
            document.getElementById('modalVideoCaption').textContent = fileName;
            document.getElementById('videoModal').classList.remove('hidden');
            v.play();
        }
    },

    async downloadSelectedImages() {
        const selectedImages = this.getSelectedGalleryItems().filter(item => item.type === 'photo');
        if (!selectedImages.length) { Utils.showToast('Vui lòng chọn ít nhất một ảnh!'); return; }

        let successCount = 0;
        Utils.showToast(`Đang tải ${selectedImages.length} ảnh...`);

        for (let i = 0; i < selectedImages.length; i++) {
            const item = selectedImages[i];
            const targetBlob = item.processedBlob || item.originalBlob || item.blob;
            if (!targetBlob) continue;

            const url = ObjectURLManager.create(targetBlob);
            const a = document.createElement('a');
            a.href = url;
            a.download = item.fileName || `image_${Date.now()}.jpg`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            setTimeout(() => ObjectURLManager.revoke(url), 1000);
            successCount++;
            await new Promise(res => setTimeout(res, 250));
        }
        Utils.showToast(`✅ Đã tải ${successCount} ảnh.`);
    },

    async exportSelectedMedia() {
        const cbs = document.querySelectorAll('.gallery-checkbox:checked');
        if (cbs.length === 0) return Utils.showToast("Chọn ít nhất 1 file!");
        Utils.showToast("Đang nén file ZIP...");

        const zip = new JSZip();
        const items = this.getSelectedGalleryItems();

        for (const m of items) {
            const activeBlob = m.processedBlob || m.originalBlob || m.blob;
            if (activeBlob) {
                zip.file(m.fileName, activeBlob);
            }
        }

        const content = await zip.generateAsync({ type: 'blob' });
        saveAs(content, `Media_Studio_${Utils.formatDateForFile(Date.now())}.zip`);
        Utils.showToast("Đã xuất tệp ZIP thành công!");
    },

    async deleteSelectedMedia() {
        const cbs = document.querySelectorAll('.gallery-checkbox:checked');
        if (cbs.length === 0 || !confirm(`Xóa vĩnh viễn ${cbs.length} file đã chọn?`)) return;

        const items = this.getSelectedGalleryItems();
        const ids = items.map(m => m.id);

        for (const m of items) {
            if (Auth.currentUser && m.file_path) {
                try {
                    await supabaseClient.storage.from('media').remove([m.file_path]);
                    await supabaseClient.from('media_files').delete().eq('file_path', m.file_path);
                } catch (e) { /* ignore */ }
            }
        }

        await db.deleteMedia(ids);
        await this.loadGallery();
        Utils.showToast("Đã xóa media thành công!");
    }
};

window.addEventListener('DOMContentLoaded', () => {
    if (!window.appInitialized) {
        window.appInitialized = true;
        App.init();
    }
});
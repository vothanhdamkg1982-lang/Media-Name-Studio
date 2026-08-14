/**
 * MEDIA NAME STUDIO - Core Application Engine (Stable Restore + Direct Multi-Image Download)
 */

const SUPABASE_URL = 'https://whuyytjksrpyojmukftp.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_gpW8TcOIz4ocrrMIWUx3Qg_sZaeZqQ0';

let supabaseClient = null;
if (window.supabase) {
    supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
} else {
    console.error("Supabase SDK chưa được tải thành công!");
}

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
    showToast(message, duration = 3000) {
        const toast = document.getElementById('toast');
        if (!toast) return;
        toast.textContent = message;
        toast.classList.remove('hidden');
        clearTimeout(toast._timer);
        toast._timer = setTimeout(() => toast.classList.add('hidden'), duration);
    },
    getSupportedMimeType() {
        const types = ['video/webm;codecs=vp8,opus', 'video/webm;codecs=vp9,opus', 'video/webm', 'video/mp4'];
        for (const type of types) {
            if (MediaRecorder.isTypeSupported(type)) return type;
        }
        return '';
    }
};

class AppDB {
    constructor() {
        this.dbName = 'MediaNameStudioDB';
        this.version = 3;
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
            request.onerror = (e) => reject(e);
        });
    }
    async setSetting(key, value) {
        return new Promise(resolve => {
            const tx = this.db.transaction('settings', 'readwrite');
            tx.objectStore('settings').put({ key, value });
            tx.oncomplete = () => resolve();
        });
    }
    async getSetting(key, defaultValue) {
        return new Promise(resolve => {
            const tx = this.db.transaction('settings', 'readonly');
            const req = tx.objectStore('settings').get(key);
            req.onsuccess = () => resolve(req.result ? req.result.value : defaultValue);
        });
    }
    async saveStudents(studentsArray) {
        return new Promise(resolve => {
            const tx = this.db.transaction('students', 'readwrite');
            const store = tx.objectStore('students');
            studentsArray.forEach(s => store.put(s));
            tx.oncomplete = () => resolve();
        });
    }
    async getStudents() {
        return new Promise(resolve => {
            const tx = this.db.transaction('students', 'readonly');
            const req = tx.objectStore('students').getAll();
            req.onsuccess = () => resolve(req.result || []);
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
        return new Promise(resolve => {
            const tx = this.db.transaction('media', 'readwrite');
            tx.objectStore('media').put(mediaObj);
            tx.oncomplete = () => resolve();
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
            console.error("Lỗi Auth:", err);
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
        const { error } = await supabaseClient.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.origin + window.location.pathname } });
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
        try {
            const userId = Auth.currentUser.id;
            const cleanStudent = Utils.removeVietnameseTones(mediaObj.studentName || 'student');
            const filePath = `${userId}/${cleanStudent}/${mediaObj.fileName}`;
            const fileToUpload = new File([mediaObj.blob], mediaObj.fileName, { type: mediaObj.blob.type });

            const { error: uploadError } = await supabaseClient.storage.from('media').upload(filePath, fileToUpload, { upsert: true });
            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabaseClient.storage.from('media').getPublicUrl(filePath);

            const { error: dbError } = await supabaseClient.from('media_files').insert([{
                user_id: userId, student_name: mediaObj.studentName, file_name: mediaObj.fileName,
                file_url: publicUrl, file_type: mediaObj.type, file_path: filePath, created_at: new Date(mediaObj.timestamp).toISOString()
            }]);
            if (dbError) throw dbError;

            mediaObj.sync_status = 'synced';
            mediaObj.file_path = filePath;
            await db.saveMedia(mediaObj);
            if (App.activeTab === 'tab-gallery') App.loadGallery();
        } catch (err) {
            console.error("Upload error:", err);
            mediaObj.sync_status = 'failed';
            await db.saveMedia(mediaObj);
        }
    },
    async syncFromCloud() {
        if (!Auth.currentUser || !supabaseClient || this.isSyncing) return;
        this.isSyncing = true;
        try {
            const { data: cloudFiles, error } = await supabaseClient.from('media_files').select('*').eq('user_id', Auth.currentUser.id).order('created_at', { ascending: false });
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
                                id: new Date(file.created_at).getTime().toString(), type: file.file_type, blob: blob,
                                studentName: file.student_name || 'Khách', fileName: file.file_name, timestamp: new Date(file.created_at).getTime(),
                                sync_status: 'synced', file_path: file.file_path
                            };
                            await db.saveMedia(mediaObj);
                        } catch (e) { console.error("Fetch fail:", file.file_name); }
                    }
                }
                if (App.activeTab === 'tab-gallery') App.loadGallery();
            }
        } catch (err) { console.error("Sync error:", err); } finally { this.isSyncing = false; }
    }
};

const MediaPipeline = {
    async saveMediaToApp(blob, type, studentName) {
        const timestamp = Date.now();
        const cleanName = Utils.removeVietnameseTones(studentName);
        const ext = type === 'photo' ? 'jpg' : (blob.type.includes('mp4') ? 'mp4' : 'webm');
        const fileName = `${cleanName}_${Utils.formatDateForFile(timestamp)}.${ext}`;

        const mediaData = {
            id: timestamp.toString(),
            type,
            blob,
            studentName,
            fileName,
            timestamp,
            sync_status: 'pending'
        };

        try {
            await db.saveMedia(mediaData);
            console.log('[MEDIA] saving:', mediaData);
            
            if (App.activeTab === 'tab-gallery') {
                await App.loadGallery();
            }
            if (Auth.currentUser) {
                await SyncManager.uploadSingleMedia(mediaData);
            }
            return mediaData;
        } catch (error) {
            console.error("SAVE MEDIA ERROR:", error);
            Utils.showToast("Lỗi hệ thống khi lưu file!");
            throw error;
        }
    }
};

const WatermarkManager = {
    drawToCanvas(canvas, studentName, settings) {
        if (!settings.enabled) return;
        console.log('[WATERMARK] settings:', settings);

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
            const dateStr = `${pad(now.getDate())}/${pad(now.getMonth() + 1)}/${now.getFullYear()}`;
            const timeStr = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
            lines.push(`${dateStr} ${timeStr}`);
        }

        if (lines.length === 0) return;

        const fontSize = parseInt(settings.fontSize) || 12;
        ctx.font = `bold ${fontSize}px Arial, sans-serif`;

        const lineHeight = fontSize * 1.4;
        let maxWidth = 0;
        lines.forEach(l => { 
            const w = ctx.measureText(l).width; 
            if (w > maxWidth) maxWidth = w; 
        });

        const padding = 10;
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

        ctx.fillStyle = settings.color || '#ff2407';
        ctx.textBaseline = 'top';

        if (settings.bgColor === 'transparent' || !settings.bgColor) {
            ctx.shadowColor = 'rgba(0, 0, 0, 0.7)';
            ctx.shadowBlur = 4;
            ctx.shadowOffsetX = 2;
            ctx.shadowOffsetY = 2;
        }

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
    }
};

const App = {
    settings: {
        enabled: true,
        unitName: 'TRƯỜNG TH.TQT', showUnit: true, showDate: true,
        position: 'bottom-right', align: 'right', fontSize: 12, color: '#ff2407', bgColor: 'transparent'
    },
    currentStudent: null,
    cameraFacingMode: 'environment',
    mediaRecorder: null, recordedChunks: [], isRecording: false, recordStartTime: 0, recordTimer: null,
    rawStream: null, animationFrameId: null, activeTab: 'tab-camera',
    
    // Gallery selection states
    isSelectMode: false,

    async init() {
        try {
            await db.init();
            await this.loadSettings();
            this.initSettingsUI();
            this.bindEvents();
            await Auth.init();
            await this.loadStudentList();
            await this.loadGallery();
            
            document.addEventListener('visibilitychange', () => {
                if (document.visibilityState === 'visible' && this.activeTab === 'tab-camera') {
                    this.startCamera();
                } else if (document.visibilityState === 'hidden') {
                    this.stopCamera();
                }
            });
            this.startCamera();
        } catch (error) { Utils.showToast("Lỗi khởi tạo!"); console.error(error); }
    },

    async loadSettings() {
        const stored = await db.getSetting('appSettings', null);
        if (stored) Object.assign(this.settings, stored);
    },
    async saveSettings() {
        this.settings.enabled = document.getElementById('settingWatermark').checked;
        this.settings.unitName = document.getElementById('setUnitName').value.trim();
        this.settings.showUnit = document.getElementById('setShowUnit').checked;
        this.settings.showDate = document.getElementById('setShowDate').checked;
        this.settings.position = document.getElementById('setPosition').value;
        this.settings.align = document.getElementById('setAlign').value;
        this.settings.fontSize = parseInt(document.getElementById('setFontSize').value) || 12;
        this.settings.color = document.getElementById('setColor').value;
        this.settings.bgColor = document.getElementById('setBgColor').value;
        await db.setSetting('appSettings', this.settings);
        Utils.showToast('Đã lưu cấu hình!');
    },
    initSettingsUI() {
        const check = document.getElementById('settingWatermark');
        check.checked = this.settings.enabled;
        check.addEventListener('change', (e) => {
            document.getElementById('watermarkSettingsOptions').style.display = e.target.checked ? 'block' : 'none';
        });
        document.getElementById('watermarkSettingsOptions').style.display = this.settings.enabled ? 'block' : 'none';
        
        document.getElementById('setUnitName').value = this.settings.unitName;
        document.getElementById('setShowUnit').checked = this.settings.showUnit;
        document.getElementById('setShowDate').checked = this.settings.showDate;
        document.getElementById('setPosition').value = this.settings.position;
        document.getElementById('setAlign').value = this.settings.align;
        document.getElementById('setFontSize').value = this.settings.fontSize;
        document.getElementById('setColor').value = this.settings.color;
        document.getElementById('setBgColor').value = this.settings.bgColor;
    },

    bindEvents() {
        document.getElementById('btnLoginGoogle')?.addEventListener('click', () => Auth.signInWithGoogle());
        document.getElementById('btnLogout')?.addEventListener('click', () => Auth.signOut());

        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.switchTab(e.currentTarget.dataset.target));
        });

        document.getElementById('btnSaveSettings')?.addEventListener('click', () => this.saveSettings());
        document.getElementById('excelUpload')?.addEventListener('change', (e) => this.handleExcelImport(e));
        document.getElementById('btnDownloadSample')?.addEventListener('click', () => this.downloadSampleExcel());
        document.getElementById('btnClearList')?.addEventListener('click', () => this.clearStudents());
        document.getElementById('btnAddManual')?.addEventListener('click', () => this.addManualStudent());
        document.getElementById('searchStudent')?.addEventListener('input', (e) => this.loadStudentList(e.target.value));
        document.getElementById('manualName')?.addEventListener('keypress', (e) => { if (e.key === 'Enter') this.addManualStudent(); });

        document.getElementById('btnSwitchCamera')?.addEventListener('click', () => this.switchCamera());
        document.getElementById('btnCapturePhoto')?.addEventListener('click', () => this.takePhoto());
        document.getElementById('btnRecordVideo')?.addEventListener('click', () => this.toggleRecordVideo());
        
        document.getElementById('btnNativeCamera')?.addEventListener('click', () => document.getElementById('nativeCameraInput').click());
        document.getElementById('nativeCameraInput')?.addEventListener('change', (e) => this.handleNativeCameraFile(e));
        
        document.getElementById('zoomRange')?.addEventListener('input', () => this.applyCameraFilters());
        document.getElementById('brightnessRange')?.addEventListener('input', () => this.applyCameraFilters());
        document.getElementById('btnResetCamera')?.addEventListener('click', () => {
            document.getElementById('zoomRange').value = 1;
            document.getElementById('brightnessRange').value = 1;
            this.applyCameraFilters();
        });

        // Gallery & Multi-select events
        document.getElementById('btnToggleSelectMode')?.addEventListener('click', () => this.toggleSelectMode());
        document.getElementById('btnExportSelected')?.addEventListener('click', () => this.exportSelectedMedia());
        document.getElementById('btnDeleteSelected')?.addEventListener('click', () => this.deleteSelectedMedia());
        document.getElementById('btnDownloadSelectedImages')?.addEventListener('click', () => this.downloadSelectedImages());
        document.getElementById('filterType')?.addEventListener('change', () => this.loadGallery());

        document.getElementById('btnSelectAllMedia')?.addEventListener('click', () => this.setAllCheckboxes(true));
        document.getElementById('btnDeselectAllMedia')?.addEventListener('click', () => this.setAllCheckboxes(false));

        document.getElementById('closeImageModal')?.addEventListener('click', () => {
            document.getElementById('imageModal').classList.add('hidden');
            // Fix: Reset mức zoom về mặc định khi đóng modal
            if (typeof window.resetImageZoom === 'function') window.resetImageZoom();
        });

        document.getElementById('closeVideoModal')?.addEventListener('click', () => {
            const m = document.getElementById('videoModal'); const v = document.getElementById('modalVideo');
            m.classList.add('hidden'); v.pause(); v.src = '';
        });
    },

    switchTab(targetTabId) {
        this.activeTab = targetTabId;
        document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));

        document.querySelector(`.nav-btn[data-target="${targetTabId}"]`)?.classList.add('active');
        document.getElementById(targetTabId)?.classList.add('active');

        if (targetTabId === 'tab-camera') this.startCamera();
        else this.stopCamera();
        if (targetTabId === 'tab-gallery') this.loadGallery();
    },

    async initCameraSelector() {
        const selector = document.getElementById('cameraSelect');
        if (!selector) return;
        try {
            const devices = await navigator.mediaDevices.enumerateDevices();
            const videoDevices = devices.filter(d => d.kind === 'videoinput');
            selector.innerHTML = '<option value="">-- Mặc định hệ thống --</option>';
            videoDevices.forEach((d, i) => {
                const opt = document.createElement('option'); opt.value = d.deviceId; opt.text = d.label || `Camera ${i + 1}`;
                selector.appendChild(opt);
            });
            selector.onchange = (e) => this.startCamera(e.target.value);
        } catch (e) { console.warn("Không thể liệt kê camera:", e); }
    },

    async startCamera(deviceId = '') {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            Utils.showToast("Trình duyệt không hỗ trợ Camera Web. Dùng Camera Gốc!");
            return;
        }
        this.stopCamera();
        const video = document.getElementById('rawVideo');
        try {
            const constraints = {
                video: deviceId ? { deviceId: { exact: deviceId } } : { facingMode: this.cameraFacingMode, width: { ideal: 1280 }, height: { ideal: 720 } },
                audio: true
            };
            this.rawStream = await navigator.mediaDevices.getUserMedia(constraints);
            console.log('[CAMERA] stream active:', this.rawStream);
            video.srcObject = this.rawStream;
            video.onloadedmetadata = () => { video.play(); this.startCanvasLoop(); };
            
            const selector = document.getElementById('cameraSelect');
            if (selector && selector.options.length <= 1) this.initCameraSelector();
        } catch (err) {
            Utils.showToast(`Lỗi mở Camera. Hãy dùng Camera Gốc.`);
            console.error(err);
        }
    },
    stopCamera() {
        if (this.isRecording) this.stopRecording();
        if (this.rawStream) { this.rawStream.getTracks().forEach(t => t.stop()); this.rawStream = null; }
        if (this.animationFrameId) { cancelAnimationFrame(this.animationFrameId); this.animationFrameId = null; }
    },
    switchCamera() {
        this.cameraFacingMode = this.cameraFacingMode === 'environment' ? 'user' : 'environment';
        this.startCamera();
    },
    applyCameraFilters() {
        const zoom = parseFloat(document.getElementById('zoomRange')?.value) || 1;
        const bright = parseFloat(document.getElementById('brightnessRange')?.value) || 1;
        const canvas = document.getElementById('outputCanvas');
        if (canvas) {
            canvas.style.transform = `scale(${zoom})`;
            canvas.style.filter = bright !== 1 ? `brightness(${bright})` : 'none';
        }
    },
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
            }
            if (this.rawStream) this.animationFrameId = requestAnimationFrame(render);
        };
        render();
    },

    async takePhoto() {
        if (!this.currentStudent) {
            Utils.showToast("Vui lòng chọn học sinh trước khi chụp!");
            this.switchTab('tab-list');
            return;
        }

        const video = document.getElementById('rawVideo');
        if (!video || video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA || !video.videoWidth || !video.videoHeight) {
            Utils.showToast("Camera chưa sẵn sàng!");
            return;
        }

        const btnElement = document.getElementById('btnCapturePhoto');
        if(btnElement) btnElement.disabled = true;

        const captureCanvas = document.createElement('canvas');
        captureCanvas.width = video.videoWidth;
        captureCanvas.height = video.videoHeight;
        const ctx = captureCanvas.getContext('2d');

        const brightness = parseFloat(document.getElementById('brightnessRange')?.value) || 1;
        const zoom = parseFloat(document.getElementById('zoomRange')?.value) || 1;

        ctx.save();
        if (brightness !== 1) {
            ctx.filter = `brightness(${brightness})`;
        }
        if (zoom !== 1) {
            const cx = captureCanvas.width / 2;
            const cy = captureCanvas.height / 2;
            ctx.translate(cx, cy);
            ctx.scale(zoom, zoom);
            ctx.translate(-cx, -cy);
        }
        
        ctx.drawImage(video, 0, 0, captureCanvas.width, captureCanvas.height);
        ctx.restore();

        WatermarkManager.drawToCanvas(captureCanvas, this.currentStudent.name, this.settings);

        const blob = await new Promise(resolve => captureCanvas.toBlob(resolve, 'image/jpeg', 0.92));
        
        if (!blob) {
            Utils.showToast("Không tạo được file ảnh!");
            if(btnElement) btnElement.disabled = false;
            return;
        }

        try {
            await MediaPipeline.saveMediaToApp(blob, 'photo', this.currentStudent.name);
            Utils.showToast(`Đã lưu ảnh: ${this.currentStudent.name}`);
        } catch (error) {
            console.error('[CAPTURE ERROR]', error);
        } finally {
            if(btnElement) btnElement.disabled = false;
        }
    },

    async handleNativeCameraFile(e) {
        const file = e.target.files[0];
        e.target.value = '';
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            Utils.showToast("Vui lòng chọn file ảnh!");
            return;
        }

        if (!this.currentStudent) {
            Utils.showToast("Vui lòng chọn học sinh trước khi chụp!");
            this.switchTab('tab-list');
            return;
        }

        Utils.showToast("Đang xử lý ảnh từ Camera gốc...");
        try {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                canvas.width = img.width; 
                canvas.height = img.height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0);
                
                WatermarkManager.drawToCanvas(canvas, this.currentStudent.name, this.settings);
                
                canvas.toBlob(async (blob) => {
                    if (!blob) return;
                    try {
                        await MediaPipeline.saveMediaToApp(blob, 'photo', this.currentStudent.name);
                        Utils.showToast(`Đã lưu ảnh từ Camera gốc: ${this.currentStudent.name}`);
                    } catch(err) {
                        console.error('[MEDIA SAVE ERROR]', err);
                    }
                }, 'image/jpeg', 0.92);
            };
            img.src = URL.createObjectURL(file);
        } catch (err) { 
            Utils.showToast("Lỗi xử lý file!"); 
            console.error(err); 
        }
    },

    toggleRecordVideo() {
        if (!this.currentStudent) { Utils.showToast("Vui lòng chọn học sinh!"); this.switchTab('tab-list'); return; }
        this.isRecording ? this.stopRecording() : this.startRecording();
    },
    startRecording() {
        if (!this.rawStream) { Utils.showToast("Camera chưa sẵn sàng!"); return; }
        const canvas = document.getElementById('outputCanvas');
        if (!canvas || canvas.width === 0) { Utils.showToast("Khung camera chưa sẵn sàng!"); return; }
        
        try {
            const canvasStream = canvas.captureStream(30);
            const audioTracks = this.rawStream.getAudioTracks();
            const combinedStream = new MediaStream([...canvasStream.getVideoTracks(), ...audioTracks]);

            const mimeType = Utils.getSupportedMimeType();
            if (!mimeType) { Utils.showToast("Trình duyệt không hỗ trợ quay video!"); return; }

            this.mediaRecorder = new MediaRecorder(combinedStream, { mimeType });
            this.recordedChunks = [];
            this.mediaRecorder.ondataavailable = e => { if (e.data.size > 0) this.recordedChunks.push(e.data); };
            
            this.mediaRecorder.onstop = async () => {
                const blob = new Blob(this.recordedChunks, { type: mimeType });
                try {
                    await MediaPipeline.saveMediaToApp(blob, 'video', this.currentStudent.name);
                } catch(err) {
                    console.error('[RECORD ERROR]', err);
                }
            };

            this.mediaRecorder.start();
            this.isRecording = true;

            const btn = document.getElementById('btnRecordVideo');
            if(btn) {
                btn.innerHTML = '<i class="fa-solid fa-square"></i> DỪNG';
                btn.classList.replace('btn-danger', 'btn-secondary');
            }
            document.getElementById('recordingIndicator').classList.remove('hidden');
            
            this.recordStartTime = Date.now();
            this.recordTimer = setInterval(() => {
                const d = Math.floor((Date.now() - this.recordStartTime) / 1000);
                document.getElementById('recordingTime').textContent = `${String(Math.floor(d / 60)).padStart(2,'0')}:${String(d % 60).padStart(2,'0')}`;
            }, 1000);
        } catch (err) { Utils.showToast("Lỗi khởi tạo quay video!"); console.error(err); }
    },
    stopRecording() {
        if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
            this.mediaRecorder.stop();
        }
        this.isRecording = false;
        clearInterval(this.recordTimer);
        const btn = document.getElementById('btnRecordVideo');
        if (btn) { btn.innerHTML = '<i class="fa-solid fa-video"></i> QUAY'; btn.classList.replace('btn-secondary', 'btn-danger'); }
        document.getElementById('recordingIndicator')?.classList.add('hidden');
        document.getElementById('recordingTime').textContent = '00:00';
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
                    id: (Date.now() + idx).toString(), name: String(row[nameKey] || '').trim(), class: String(row['Lớp'] || row['Class'] || '').trim()
                })).filter(s => s.name);
                await db.saveStudents(newStudents);
                Utils.showToast(`Đã nhập ${newStudents.length} học sinh!`);
                e.target.value = ''; this.loadStudentList();
            } catch (err) { Utils.showToast("Lỗi đọc File Excel!"); }
        };
        reader.readAsArrayBuffer(file);
    },
    downloadSampleExcel() {
        const sampleData = [{ "STT": 1, "Họ và tên": "Nguyễn Văn An", "Lớp": "5A" }];
        const ws = XLSX.utils.json_to_sheet(sampleData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Danh_sach_mau");
        XLSX.writeFile(wb, "Danh_Sach_Hoc_Sinh_Mau.xlsx");
    },
    async addManualStudent() {
        const input = document.getElementById('manualName');
        const name = input.value.trim();
        if (!name) return Utils.showToast("Nhập họ tên!");
        await db.saveStudents([{ id: Date.now().toString(), name, class: '' }]);
        input.value = ''; input.focus(); this.loadStudentList(); Utils.showToast(`Đã thêm: ${name}`);
    },
    async clearStudents() {
        if (confirm("Xóa toàn bộ danh sách?")) {
            await db.clearStudents();
            this.currentStudent = null; document.getElementById('headerStudentName').textContent = "Chưa chọn";
            this.loadStudentList();
        }
    },
    async loadStudentList(filterText = '') {
        const list = await db.getStudents();
        const ul = document.getElementById('studentList');
        ul.innerHTML = '';
        const filtered = list.filter(s => s.name.toLowerCase().includes(filterText.toLowerCase()));
        if (filtered.length === 0) { ul.innerHTML = '<li style="justify-content:center; color:#888;">Chưa có dữ liệu</li>'; return; }
        
        filtered.forEach(student => {
            const li = document.createElement('li');
            if (this.currentStudent?.id === student.id) li.classList.add('selected');
            li.innerHTML = `<span><strong>${student.name}</strong> ${student.class ? `(${student.class})` : ''}</span>
                            <i class="fa-solid fa-circle-check" style="color: ${this.currentStudent?.id === student.id ? '#007bff' : '#555'}"></i>`;
            li.addEventListener('click', () => {
                this.currentStudent = student;
                document.getElementById('headerStudentName').textContent = student.name;
                this.loadStudentList(filterText); this.switchTab('tab-camera');
            });
            ul.appendChild(li);
        });
    },

    // ==========================================
    // GALLERY & MULTI-SELECT & DIRECT DOWNLOAD
    // ==========================================
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
        const count = checkedBoxes.length;
        const countText = document.getElementById('selectedCountText');
        if (countText) {
            countText.textContent = `Đã chọn: ${count}`;
        }
    },

    setAllCheckboxes(select) {
        const filter = document.getElementById('filterType').value;
        const checkboxes = document.querySelectorAll('.gallery-checkbox');
        checkboxes.forEach(cb => {
            if (filter === 'photo' && cb.dataset.type !== 'photo') return;
            cb.checked = select;
        });
        this.updateSelectedCount();
    },

    getSelectedGalleryItems() {
        const checkedBoxes = document.querySelectorAll('.gallery-checkbox:checked');
        const items = [];
        checkedBoxes.forEach(cb => {
            if (cb._mediaObject) {
                items.push(cb._mediaObject);
            }
        });
        return items;
    },

    async loadGallery() {
        const filter = document.getElementById('filterType').value;
        let list = await db.getAllMedia();
        if (filter !== 'all') list = list.filter(m => m.type === filter);
        const grid = document.getElementById('galleryGrid');
        grid.innerHTML = '';
        
        if (list.length === 0) { 
            grid.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: #888; padding: 30px;">Chưa có file nào</p>'; 
            this.updateSelectedCount();
            return; 
        }

        list.forEach(media => {
            const item = document.createElement('div');
            item.className = 'gallery-item';
            const url = URL.createObjectURL(media.blob);
            const syncIcon = media.sync_status === 'synced' ? '<span class="sync-badge synced"><i class="fa-solid fa-cloud-check"></i></span>' : '<span class="sync-badge pending"><i class="fa-solid fa-cloud-arrow-up"></i></span>';
            const mediaTag = media.type === 'photo' ? `<img src="${url}" alt="photo">` : `<video src="${url}" preload="metadata"></video>`;
            
            const checkboxDisplay = this.isSelectMode ? '' : 'style="display: none;"';
            
            item.innerHTML = `<input type="checkbox" class="gallery-checkbox" data-id="${media.id}" data-type="${media.type}" ${checkboxDisplay}> ${syncIcon} ${mediaTag}
                              <div class="gallery-info"><strong>${media.studentName}</strong></div>`;
            
            const cb = item.querySelector('.gallery-checkbox');
            cb._mediaObject = media;
            cb.addEventListener('change', () => this.updateSelectedCount());

            item.querySelector('img, video').addEventListener('click', () => {
                if (this.isSelectMode) {
                    cb.checked = !cb.checked;
                    this.updateSelectedCount();
                } else {
                    this.viewMedia(url, media.type, media.fileName);
                }
            });
            grid.appendChild(item);
        });
        this.updateSelectedCount();
    },

    viewMedia(url, type, fileName) {
        if (type === 'photo') {
            document.getElementById('modalImg').src = url; document.getElementById('modalCaption').textContent = fileName;
            document.getElementById('imageModal').classList.remove('hidden');
        } else {
            const v = document.getElementById('modalVideo'); v.src = url; document.getElementById('modalVideoCaption').textContent = fileName;
            document.getElementById('videoModal').classList.remove('hidden'); v.play();
        }
    },

    async downloadSelectedImages() {
        const selectedImages = this.getSelectedGalleryItems().filter(item => item.type === 'photo');

        if (!selectedImages.length) {
            Utils.showToast('Vui lòng chọn ít nhất một ảnh!');
            return;
        }

        let successCount = 0;
        let errorCount = 0;
        const total = selectedImages.length;

        Utils.showToast(`Đang chuẩn bị tải ${total} ảnh...`);

        for (let i = 0; i < total; i++) {
            const item = selectedImages[i];
            const blob = item.blob;

            if (!blob) {
                console.warn('Không tìm thấy Blob:', item);
                errorCount++;
                continue;
            }

            try {
                const currentNum = i + 1;
                Utils.showToast(`Đang tải ảnh... ${currentNum} / ${total}`);

                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = item.fileName || `image_${Date.now()}.jpg`;
                document.body.appendChild(a);
                a.click();
                a.remove();

                setTimeout(() => {
                    URL.revokeObjectURL(url);
                }, 1000);

                successCount++;
                // Delay nhỏ tránh trình duyệt chặn tải hàng loạt
                await new Promise(resolve => setTimeout(resolve, 350));
            } catch (err) {
                console.error('Lỗi khi tải ảnh:', item.fileName, err);
                errorCount++;
            }
        }

        if (errorCount === 0) {
            Utils.showToast(`✅ Đã tải thành công ${successCount} ảnh.`);
        } else {
            Utils.showToast(`Đã tải thành công: ${successCount} | Lỗi: ${errorCount}`);
        }
    },

    async exportSelectedMedia() {
        const cbs = document.querySelectorAll('.gallery-checkbox:checked');
        if (cbs.length === 0) return Utils.showToast("Chọn ít nhất 1 file!");
        Utils.showToast("Đang nén file ZIP...");
        const zip = new JSZip(); const mediaList = await db.getAllMedia();
        for (const cb of cbs) {
            const m = mediaList.find(x => x.id === cb.dataset.id);
            if (m && m.blob) zip.file(m.fileName, m.blob);
        }
        const content = await zip.generateAsync({ type: 'blob' });
        saveAs(content, `Media_Studio_${Utils.formatDateForFile(Date.now())}.zip`);
        Utils.showToast("Đã xuất ZIP!");
    },

    async deleteSelectedMedia() {
        const cbs = document.querySelectorAll('.gallery-checkbox:checked');
        if (cbs.length === 0 || !confirm(`Xóa vĩnh viễn ${cbs.length} file?`)) return;
        const ids = Array.from(cbs).map(c => c.dataset.id);
        const mediaList = await db.getAllMedia();
        for (const id of ids) {
            const m = mediaList.find(x => x.id === id);
            if (m && Auth.currentUser && m.file_path) {
                try {
                    await supabaseClient.storage.from('media').remove([m.file_path]);
                    await supabaseClient.from('media_files').delete().eq('file_path', m.file_path);
                } catch(e){}
            }
        }
        await db.deleteMedia(ids);
        await this.loadGallery();
        Utils.showToast("Đã xóa!");
    }
};

// Added: Hỗ trợ chức năng Zoom ảnh trong Gallery
function initImageZoom() {
    const modalImg = document.getElementById('modalImg');
    if (!modalImg) return;
    
    let currentZoom = 1;
    let panX = 0;
    let panY = 0;
    let isDragging = false;
    let startX = 0;
    let startY = 0;

    const updateTransform = () => {
        modalImg.style.transform = `translate(${panX}px, ${panY}px) scale(${currentZoom})`;
    };

    // Được gọi khi đóng Modal (từ App.bindEvents)
    window.resetImageZoom = () => {
        currentZoom = 1;
        panX = 0;
        panY = 0;
        updateTransform();
    };

    // Zoom bằng cuộn chuột (Desktop)
    modalImg.addEventListener('wheel', (e) => {
        e.preventDefault();
        const zoomStep = 0.15;
        if (e.deltaY < 0) {
            currentZoom = Math.min(currentZoom + zoomStep, 4);
        } else {
            currentZoom = Math.max(currentZoom - zoomStep, 1);
        }
        if (currentZoom === 1) { panX = 0; panY = 0; }
        updateTransform();
    }, { passive: false });

    // Kéo bằng chuột (Desktop)
    modalImg.addEventListener('mousedown', (e) => {
        if (currentZoom > 1) {
            isDragging = true;
            startX = e.clientX - panX;
            startY = e.clientY - panY;
        }
    });
    window.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        panX = e.clientX - startX;
        panY = e.clientY - startY;
        updateTransform();
    });
    window.addEventListener('mouseup', () => { isDragging = false; });

    // Cảm ứng 2 ngón (Pinch) và vuốt pan (Mobile)
    let initialDistance = null;
    let initialZoom = 1;

    modalImg.addEventListener('touchstart', (e) => {
        if (e.touches.length === 2) {
            initialDistance = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
            initialZoom = currentZoom;
        } else if (e.touches.length === 1 && currentZoom > 1) {
            isDragging = true;
            startX = e.touches[0].clientX - panX;
            startY = e.touches[0].clientY - panY;
        }
    }, { passive: false });

    modalImg.addEventListener('touchmove', (e) => {
        if (currentZoom > 1 || e.touches.length === 2) e.preventDefault(); // Tránh cuộn trang khi đang thao tác
        
        if (e.touches.length === 2 && initialDistance) {
            const currentDistance = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
            const scale = currentDistance / initialDistance;
            currentZoom = Math.max(1, Math.min(initialZoom * scale, 4));
            if (currentZoom === 1) { panX = 0; panY = 0; }
            updateTransform();
        } else if (e.touches.length === 1 && isDragging && currentZoom > 1) {
            panX = e.touches[0].clientX - startX;
            panY = e.touches[0].clientY - startY;
            updateTransform();
        }
    }, { passive: false });

    modalImg.addEventListener('touchend', () => {
        isDragging = false;
        initialDistance = null;
    });
}

window.addEventListener('DOMContentLoaded', () => { 
    if (!window.appInitialized) { 
        window.appInitialized = true; 
        App.init(); 
        initImageZoom(); // Kích hoạt chức năng Zoom ngay khi DOM Load
    } 
});
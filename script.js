/**
 * MEDIA NAME STUDIO - Core Application Engine
 * (Refactored Production Architecture)
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
    }
};

const Utils = {
    removeVietnameseTones(str) {
        if (!str) return '';
        return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').replace(/[^a-zA-Z0-9]/g, "_").replace(/_+/g, "_");
    },
    formatDateForFile(timestamp) {
        const d = new Date(timestamp);
        const pad = n => String(n).padStart(2, '0');
        return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
    },
    formatDateDisplay(timestamp) {
        const d = new Date(timestamp);
        return `${d.getDate()}/${d.getMonth()+1}/${d.getFullYear()} ${d.getHours()}:${d.getMinutes()}`;
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
        const candidateTypes = ['video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm', 'video/mp4'];
        for (const type of candidateTypes) {
            if (MediaRecorder.isTypeSupported(type)) return type;
        }
        return '';
    },
    getFileExtensionFromMime(mimeType, defaultType = 'photo') {
        if (mimeType.includes('mp4')) return 'mp4';
        if (mimeType.includes('webm')) return 'webm';
        return defaultType === 'photo' ? 'jpg' : 'mp4';
    }
};

// 1. INDEXED DB MANAGER
class AppDB {
    constructor() { this.dbName = 'MediaNameStudioDB'; this.version = 5; this.db = null; }
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
        return new Promise(resolve => {
            const tx = this.db.transaction('settings', 'readwrite');
            tx.objectStore('settings').put({ key, value });
            tx.oncomplete = () => resolve();
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
        return new Promise(resolve => {
            const tx = this.db.transaction('students', 'readwrite');
            const store = tx.objectStore('students');
            store.clear();
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
    async saveMedia(mediaObj) {
        return new Promise((resolve, reject) => {
            const tx = this.db.transaction('media', 'readwrite');
            tx.objectStore('media').put(mediaObj);
            tx.oncomplete = () => resolve();
            tx.onerror = (e) => reject(e);
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

// 2. SETTINGS MANAGER
const DEFAULT_SETTINGS = {
    enabled: true, unitName: 'TRƯỜNG TH.TQT', showUnit: true, showDate: true, 
    showLocation: false, position: 'bottom-right', align: 'right', 
    fontSize: 16, color: '#ff2407', bgColor: 'transparent', shadow: true
};

const SettingsManager = {
    currentSettings: { ...DEFAULT_SETTINGS },
    saveDebounceTimer: null,
    async load() {
        const saved = await db.getSetting('appSettings');
        if (saved) this.currentSettings = { ...DEFAULT_SETTINGS, ...saved };
        this.updateUI();
        return this.currentSettings;
    },
    get(key) { return this.currentSettings[key]; },
    set(key, value) {
        this.currentSettings[key] = value;
        this.scheduleSave();
    },
    scheduleSave() {
        this.showAutoSaveStatus(false);
        if (this.saveDebounceTimer) clearTimeout(this.saveDebounceTimer);
        this.saveDebounceTimer = setTimeout(() => this.save(), 500);
    },
    async save() {
        await db.setSetting('appSettings', this.currentSettings);
        this.showAutoSaveStatus(true);
    },
    showAutoSaveStatus(saved) {
        const indicator = document.getElementById('autoSaveIndicator');
        if (!indicator) return;
        indicator.innerHTML = saved ? '<i class="fa-solid fa-check"></i> Đã tự động lưu' : '<i class="fa-solid fa-spinner fa-spin"></i> Đang lưu...';
        saved ? indicator.classList.remove('saving') : indicator.classList.add('saving');
    },
    updateUI() {
        document.getElementById('settingWatermark').checked = this.currentSettings.enabled;
        document.getElementById('setUnitName').value = this.currentSettings.unitName;
        document.getElementById('setShowUnit').checked = this.currentSettings.showUnit;
        document.getElementById('setShowDate').checked = this.currentSettings.showDate;
        document.getElementById('setShowLocation').checked = this.currentSettings.showLocation;
        document.getElementById('setPosition').value = this.currentSettings.position;
        document.getElementById('setAlign').value = this.currentSettings.align;
        document.getElementById('setFontSize').value = this.currentSettings.fontSize;
        document.getElementById('setColor').value = this.currentSettings.color;
        document.getElementById('setBgColor').value = this.currentSettings.bgColor;
        document.getElementById('setShadow').checked = this.currentSettings.shadow;
    },
    bindEvents() {
        const bind = (id, key, isCheckbox) => {
            document.getElementById(id).addEventListener('input', e => {
                this.set(key, isCheckbox ? e.target.checked : e.target.value);
                if(key === 'showLocation' && e.target.checked) LocationService.fetchLocation();
            });
        };
        bind('settingWatermark', 'enabled', true);
        bind('setUnitName', 'unitName', false);
        bind('setShowUnit', 'showUnit', true);
        bind('setShowDate', 'showDate', true);
        bind('setShowLocation', 'showLocation', true);
        bind('setPosition', 'position', false);
        bind('setAlign', 'align', false);
        bind('setFontSize', 'fontSize', false);
        bind('setColor', 'color', false);
        bind('setBgColor', 'bgColor', false);
        bind('setShadow', 'shadow', true);
    }
};

// 3. LOCATION SERVICE (REVERSE GEOCODING)
const LocationService = {
    cache: { lat: null, lon: null, formattedName: null },
    isFetchingAddress: false,
    async fetchLocation() {
        if (!SettingsManager.get('showLocation')) return;
        return new Promise((resolve) => {
            if (!navigator.geolocation) return resolve(null);
            document.getElementById('locationStatusDisplay').innerText = "📍 Đang lấy vị trí GPS...";
            
            navigator.geolocation.getCurrentPosition(async (pos) => {
                const { latitude, longitude } = pos.coords;
                this.cache.lat = latitude; this.cache.lon = longitude;
                
                try {
                    const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}&accept-language=vi`;
                    const response = await fetch(url, { timeout: 4000 });
                    const data = await response.json();
                    
                    if (data && data.address) {
                        let district = data.address.city_district || data.address.county || data.address.town || '';
                        let province = data.address.city || data.address.state || data.address.province || '';
                        this.cache.formattedName = [district, province].filter(Boolean).join(', ');
                    }
                } catch (e) {
                    // Fallback
                }
                
                document.getElementById('locationStatusDisplay').innerText = this.getLocationDisplayString();
                resolve(this.cache);
            }, () => {
                document.getElementById('locationStatusDisplay').innerText = "📍 Lỗi GPS hoặc bị từ chối quyền";
                resolve(null);
            }, { enableHighAccuracy: true });
        });
    },
    getLocationDisplayString() {
        if (this.cache.lat === null || this.cache.lon === null) return "📍 Vị trí chưa cập nhật";
        if (this.cache.formattedName) return `📍 ${this.cache.formattedName}`;
        return `📍 GPS: ${this.cache.lat.toFixed(4)}, ${this.cache.lon.toFixed(4)}`;
    }
};

// 4. STUDENT MANAGER
const StudentManager = {
    students: [], currentStudent: null,
    async init() {
        this.students = await db.getStudents();
        this.renderList();
        this.bindEvents();
    },
    async addStudent(name) {
        if (!name.trim()) return;
        const id = 'HS' + Date.now().toString().slice(-6);
        this.students.push({ id, name, code: id });
        await db.saveStudents(this.students);
        this.renderList();
        this.selectStudent(id);
    },
    async deleteStudent(id) {
        this.students = this.students.filter(s => s.id !== id);
        await db.saveStudents(this.students);
        if (this.currentStudent && this.currentStudent.id === id) {
            this.currentStudent = null;
            document.getElementById('headerStudentName').innerText = "Chưa chọn học sinh";
        }
        this.renderList();
    },
    selectStudent(id) {
        this.currentStudent = this.students.find(s => s.id === id);
        document.getElementById('headerStudentName').innerText = this.currentStudent ? `👨‍🎓 ${this.currentStudent.name}` : "Chưa chọn học sinh";
        this.renderList();
        Utils.showToast("Đã chọn: " + this.currentStudent.name);
    },
    renderList(filter = '') {
        const list = document.getElementById('studentList');
        list.innerHTML = '';
        this.students.filter(s => s.name.toLowerCase().includes(filter.toLowerCase())).forEach(s => {
            const li = document.createElement('li');
            if (this.currentStudent && this.currentStudent.id === s.id) li.classList.add('selected');
            li.innerHTML = `<span>${s.code} - ${s.name}</span> <button class="btn btn-danger btn-sm" onclick="event.stopPropagation(); StudentManager.deleteStudent('${s.id}')"><i class="fa-solid fa-xmark"></i></button>`;
            li.onclick = () => this.selectStudent(s.id);
            list.appendChild(li);
        });
    },
    bindEvents() {
        document.getElementById('btnAddManual').addEventListener('click', () => {
            const input = document.getElementById('manualName');
            this.addStudent(input.value);
            input.value = '';
        });
        document.getElementById('searchStudent').addEventListener('input', e => this.renderList(e.target.value));
        document.getElementById('btnClearList').addEventListener('click', async () => {
            if(confirm('Xóa toàn bộ danh sách?')) {
                this.students = [];
                await db.saveStudents(this.students);
                this.renderList();
            }
        });
    }
};

// 5. WATERMARK ENGINE
const WatermarkEngine = {
    draw(canvas, ctx, student) {
        if (!SettingsManager.get('enabled')) return;

        const cw = canvas.width; const ch = canvas.height;
        const scale = Math.max(cw, ch) / 1080;
        const fontSize = Math.floor(SettingsManager.get('fontSize') * scale);
        
        ctx.font = `bold ${fontSize}px sans-serif`;
        ctx.textBaseline = 'top';

        let lines = [];
        if (student) lines.push(`HS: ${student.name}`);
        if (SettingsManager.get('showUnit') && SettingsManager.get('unitName')) lines.push(SettingsManager.get('unitName'));
        if (SettingsManager.get('showDate')) lines.push(Utils.formatDateDisplay(Date.now()));
        if (SettingsManager.get('showLocation')) {
            const loc = LocationService.getLocationDisplayString();
            if (loc && loc !== "📍 Vị trí chưa cập nhật") lines.push(loc);
        }

        if (lines.length === 0) return;

        let maxWidth = 0;
        lines.forEach(line => maxWidth = Math.max(maxWidth, ctx.measureText(line).width));

        const padding = fontSize * 0.5;
        const lineHeight = fontSize * 1.4;
        const boxW = maxWidth + padding * 2;
        const boxH = lines.length * lineHeight + padding;

        let x = 0, y = 0;
        switch(SettingsManager.get('position')) {
            case 'top': x = cw/2 - boxW/2; y = padding; break;
            case 'bottom': x = cw/2 - boxW/2; y = ch - boxH - padding; break;
            case 'center': x = cw/2 - boxW/2; y = ch/2 - boxH/2; break;
            case 'bottom-right': x = cw - boxW - padding; y = ch - boxH - padding; break;
        }

        const bgColor = SettingsManager.get('bgColor');
        if (bgColor !== 'transparent') {
            ctx.fillStyle = bgColor;
            ctx.fillRect(x, y, boxW, boxH);
        }

        ctx.fillStyle = SettingsManager.get('color');
        if (SettingsManager.get('shadow')) {
            ctx.shadowColor = 'rgba(0,0,0,0.8)';
            ctx.shadowBlur = 4; ctx.shadowOffsetX = 2; ctx.shadowOffsetY = 2;
        } else {
            ctx.shadowColor = 'transparent';
        }

        const align = SettingsManager.get('align');
        lines.forEach((line, i) => {
            let tx = x + padding;
            if (align === 'center') tx = x + boxW/2 - ctx.measureText(line).width/2;
            if (align === 'right') tx = x + boxW - padding - ctx.measureText(line).width;
            ctx.fillText(line, tx, y + padding + i * lineHeight);
        });
        
        ctx.shadowColor = 'transparent'; // reset
    }
};

// 6. CENTRAL MEDIA PIPELINE
const CentralMediaPipeline = {
    async processPhoto(blob, isNative = false) {
        if (!StudentManager.currentStudent) { Utils.showToast("Lỗi: Chọn học sinh trước!"); return; }
        
        const student = StudentManager.currentStudent;
        const ts = Date.now();
        const fileName = `MNS_${Utils.formatDateForFile(ts)}_${student.code}_${Utils.removeVietnameseTones(student.name)}.jpg`;
        
        let finalBlob = blob;
        let wmApplied = false;

        if (SettingsManager.get('enabled') || (!isNative && InAppCameraEngine.brightness !== 1)) {
            try {
                const img = new Image();
                img.src = URL.createObjectURL(blob);
                await new Promise(res => img.onload = res);
                
                const canvas = document.createElement('canvas');
                canvas.width = img.width; canvas.height = img.height;
                const ctx = canvas.getContext('2d');
                
                // Apply brightness to canvas if not native
                if (!isNative) ctx.filter = `brightness(${InAppCameraEngine.brightness})`;
                ctx.drawImage(img, 0, 0);
                
                if (SettingsManager.get('enabled')) {
                    WatermarkEngine.draw(canvas, ctx, student);
                    wmApplied = true;
                }

                finalBlob = await new Promise(res => canvas.toBlob(res, 'image/jpeg', 0.92));
                URL.revokeObjectURL(img.src);
            } catch (e) {
                Logger.error('Pipeline', 'Photo Processing Error', e);
            }
        }

        const mediaObj = {
            id: ts.toString(), type: 'photo', originalBlob: blob, processedBlob: finalBlob,
            studentName: student.name, fileName, timestamp: ts, mimeType: 'image/jpeg',
            watermarkApplied: wmApplied, processingStatus: 'success', sync_status: 'pending'
        };

        await db.saveMedia(mediaObj);
        GalleryManager.load();
        Utils.showToast("📸 Đã lưu ảnh thành công!");
    },

    async processVideo(blob) {
        if (!StudentManager.currentStudent) { Utils.showToast("Lỗi: Chọn học sinh trước!"); return; }
        
        // THEO QUY TẮC: Để bảo vệ video gốc, không can thiệp watermark video realtime tránh vỡ frames.
        const student = StudentManager.currentStudent;
        const ts = Date.now();
        const ext = Utils.getFileExtensionFromMime(blob.type, 'video');
        const fileName = `MNS_${Utils.formatDateForFile(ts)}_${student.code}_${Utils.removeVietnameseTones(student.name)}.${ext}`;

        const mediaObj = {
            id: ts.toString(), type: 'video', originalBlob: blob, processedBlob: blob,
            studentName: student.name, fileName, timestamp: ts, mimeType: blob.type,
            watermarkApplied: false, processingStatus: 'success', sync_status: 'pending'
        };

        await db.saveMedia(mediaObj);
        GalleryManager.load();
        Utils.showToast("🎥 Đã lưu Video gốc thành công!");
    }
};

// 7. IN-APP CAMERA ENGINE (WITH ZOOM & BRIGHTNESS)
const InAppCameraEngine = {
    stream: null, videoTrack: null, currentFacingMode: 'environment', currentDeviceId: null,
    brightness: 1, zoom: 1, controlsHidden: true,
    
    async init() {
        await this.start();
        this.bindEvents();
    },
    async start() {
        if (this.stream) this.stop();
        try {
            const constraints = { 
                video: this.currentDeviceId ? { deviceId: { exact: this.currentDeviceId } } : { facingMode: this.currentFacingMode },
                audio: true 
            };
            this.stream = await navigator.mediaDevices.getUserMedia(constraints);
            this.videoTrack = this.stream.getVideoTracks()[0];
            
            const rawVideo = document.getElementById('rawVideo');
            rawVideo.srcObject = this.stream;
            await rawVideo.play();
            
            this.updateCapabilities();
        } catch (e) {
            Utils.showToast("Lỗi Camera: " + e.message);
        }
    },
    stop() {
        if (this.stream) this.stream.getTracks().forEach(t => t.stop());
    },
    switchCamera() {
        this.currentFacingMode = this.currentFacingMode === 'environment' ? 'user' : 'environment';
        this.currentDeviceId = null; // reset specific device
        this.start();
    },
    updateCapabilities() {
        if (!this.videoTrack) return;
        try {
            const caps = this.videoTrack.getCapabilities();
            const zoomRange = document.getElementById('zoomRange');
            if (caps.zoom) {
                zoomRange.min = caps.zoom.min; zoomRange.max = caps.zoom.max; zoomRange.step = caps.zoom.step;
            }
        } catch(e) {}
    },
    applyZoom(val) {
        this.zoom = val;
        if (this.videoTrack) {
            try {
                this.videoTrack.applyConstraints({ advanced: [{ zoom: val }] }).catch(() => {
                    // Fallback CSS
                    document.getElementById('rawVideo').style.transform = `scale(${val})`;
                });
            } catch(e) { document.getElementById('rawVideo').style.transform = `scale(${val})`; }
        }
    },
    applyBrightness(val) {
        this.brightness = val;
        document.getElementById('rawVideo').style.filter = `brightness(${val})`;
    },
    toggleControls() {
        this.controlsHidden = !this.controlsHidden;
        const panel = document.getElementById('cameraControlsPanel');
        this.controlsHidden ? panel.classList.add('controls-hidden') : panel.classList.remove('controls-hidden');
    },
    bindEvents() {
        document.getElementById('btnSwitchCamera').addEventListener('click', () => this.switchCamera());
        
        document.getElementById('zoomRange').addEventListener('input', e => this.applyZoom(e.target.value));
        document.getElementById('brightnessRange').addEventListener('input', e => this.applyBrightness(e.target.value));
        
        document.getElementById('btnResetCamera').addEventListener('click', () => {
            document.getElementById('zoomRange').value = 1; this.applyZoom(1);
            document.getElementById('brightnessRange').value = 1; this.applyBrightness(1);
        });

        document.getElementById('cameraSurface').addEventListener('click', (e) => {
            if(e.target.closest('#cameraControlsPanel') || e.target.closest('.camera-action-buttons')) return;
            this.toggleControls();
        });
        
        document.getElementById('btnCapturePhoto').addEventListener('click', async () => {
            if (!StudentManager.currentStudent) return Utils.showToast("Vui lòng chọn học sinh!");
            const rawVideo = document.getElementById('rawVideo');
            if (!rawVideo.srcObject) return;

            const canvas = document.createElement('canvas');
            canvas.width = rawVideo.videoWidth; canvas.height = rawVideo.videoHeight;
            canvas.getContext('2d').drawImage(rawVideo, 0, 0);
            const blob = await new Promise(res => canvas.toBlob(res, 'image/jpeg', 0.95));
            CentralMediaPipeline.processPhoto(blob, false);
        });
        
        // Ẩn mặc định
        document.getElementById('cameraControlsPanel').classList.add('controls-hidden');
    }
};

// 8. VIDEO RECORDER (MỚI)
const VideoRecorder = {
    mediaRecorder: null, recordedChunks: [], isRecording: false, startTime: 0, timerInterval: null,
    
    start() {
        if (!StudentManager.currentStudent) return Utils.showToast("Vui lòng chọn học sinh!");
        if (!InAppCameraEngine.stream) return Utils.showToast("Camera chưa sẵn sàng!");

        this.recordedChunks = [];
        const mimeType = Utils.getBestSupportedVideoMimeType();
        
        try {
            this.mediaRecorder = new MediaRecorder(InAppCameraEngine.stream, { mimeType });
        } catch(e) {
            this.mediaRecorder = new MediaRecorder(InAppCameraEngine.stream);
        }

        this.mediaRecorder.ondataavailable = e => { if (e.data.size > 0) this.recordedChunks.push(e.data); };
        this.mediaRecorder.onstop = () => {
            const blob = new Blob(this.recordedChunks, { type: this.mediaRecorder.mimeType });
            CentralMediaPipeline.processVideo(blob);
        };

        this.mediaRecorder.start();
        this.isRecording = true;
        this.startTime = Date.now();
        
        // UI
        document.getElementById('recordingIndicator').classList.remove('hidden');
        document.getElementById('recordBtnLabel').innerText = "DỪNG QUAY";
        document.getElementById('btnRecordVideo').style.color = "#ff4d4d";
        
        this.timerInterval = setInterval(() => {
            const diff = Math.floor((Date.now() - this.startTime)/1000);
            const m = String(Math.floor(diff/60)).padStart(2, '0');
            const s = String(diff%60).padStart(2, '0');
            document.getElementById('recordingTime').innerText = `${m}:${s}`;
        }, 1000);
    },
    
    stop() {
        if (this.mediaRecorder && this.isRecording) {
            this.mediaRecorder.stop();
            this.isRecording = false;
            clearInterval(this.timerInterval);
            
            // UI
            document.getElementById('recordingIndicator').classList.add('hidden');
            document.getElementById('recordBtnLabel').innerText = "QUAY VIDEO";
            document.getElementById('btnRecordVideo').style.color = "white";
        }
    },
    
    bindEvents() {
        document.getElementById('btnRecordVideo').addEventListener('click', () => {
            this.isRecording ? this.stop() : this.start();
        });
    }
};

// 9. GALLERY MANAGER
const GalleryManager = {
    async load() {
        const media = await db.getAllMedia();
        const grid = document.getElementById('galleryGrid');
        grid.innerHTML = '';
        
        media.forEach(m => {
            const item = document.createElement('div');
            item.className = 'gallery-item';
            const blob = m.processedBlob || m.originalBlob;
            const url = ObjectURLManager.create(blob);
            
            const isVideo = m.type === 'video';
            const mediaHtml = isVideo 
                ? `<video src="${url}#t=0.1" preload="metadata" onclick="GalleryManager.previewVideo('${url}', '${m.fileName}')"></video>` 
                : `<img src="${url}" loading="lazy" onclick="GalleryManager.previewImage('${url}', '${m.fileName}')">`;

            const wmBadge = m.watermarkApplied ? `<span class="badge status-badge wm-active">WM</span>` : '';

            item.innerHTML = `
                ${mediaHtml}
                <div class="gallery-badges">${wmBadge}</div>
                <div class="gallery-info">
                    <strong>${m.studentName}</strong>
                    <div class="file-meta">${Utils.formatDateDisplay(m.timestamp)}</div>
                </div>
            `;
            grid.appendChild(item);
        });
    },
    previewImage(url, title) {
        document.getElementById('modalImg').src = url;
        document.getElementById('modalCaption').innerText = title;
        document.getElementById('imageModal').classList.remove('hidden');
    },
    previewVideo(url, title) {
        const vid = document.getElementById('modalVideo');
        vid.src = url;
        document.getElementById('modalVideoCaption').innerText = title;
        document.getElementById('videoModal').classList.remove('hidden');
        vid.play();
    }
};

// 10. APP UI INITIALIZATION
const AppUI = {
    activeTab: 'tab-camera',
    async init() {
        try {
            await db.init();
            await SettingsManager.load();
            SettingsManager.bindEvents();
            await StudentManager.init();
            
            LocationService.fetchLocation();
            
            await InAppCameraEngine.init();
            VideoRecorder.bindEvents();

            this.bindNavigation();
            this.bindModals();
            this.bindImport();
            
        } catch(e) {
            Utils.showToast("Khởi tạo thất bại: " + e.message);
        }
    },
    bindNavigation() {
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
                document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
                
                const target = e.currentTarget.getAttribute('data-target');
                e.currentTarget.classList.add('active');
                document.getElementById(target).classList.add('active');
                this.activeTab = target;

                if (target === 'tab-gallery') GalleryManager.load();
            });
        });
    },
    bindModals() {
        document.getElementById('closeImageModal').onclick = () => document.getElementById('imageModal').classList.add('hidden');
        document.getElementById('closeVideoModal').onclick = () => {
            const vid = document.getElementById('modalVideo');
            vid.pause(); vid.src = '';
            document.getElementById('videoModal').classList.add('hidden');
        };
    },
    bindImport() {
        const input = document.getElementById('nativePhotoInput');
        document.getElementById('btnImportMedia').onclick = () => input.click();
        input.onchange = (e) => {
            if(e.target.files.length > 0) {
                CentralMediaPipeline.processPhoto(e.target.files[0], true);
            }
        };
    }
};

document.addEventListener('DOMContentLoaded', () => { AppUI.init(); });
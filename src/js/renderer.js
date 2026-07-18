const { ipcRenderer } = require('electron');
const path = require('path');

const AudioManager = require(path.join(__dirname, 'src', 'js', 'audioManager.js'));
const PlaylistManager = require(path.join(__dirname, 'src', 'js', 'playlist.js'));

const player = new AudioManager();
const playlistMgr = new PlaylistManager();

let currentTrackData = null;
let isPlaylistOpen = false;
let isPlaylistDragging = false;

let promptCallback = null;
let confirmCallback = null;
let pendingTrackToAdd = null;

const el = {
    playBtn: document.getElementById('play-btn'),
    progressBar: document.getElementById('progress-bar'),
    currTime: document.getElementById('current-time'),
    durTime: document.getElementById('duration'),
    title: document.getElementById('song-title'),

    favBtn: document.getElementById('fav-btn'),
    listToggle: document.getElementById('list-toggle-btn'),
    playlistSidebar: document.getElementById('playlist-sidebar'),
    favList: document.getElementById('fav-list'),

    playlistsGridView: document.getElementById('playlists-grid-view'),
    playlistDetailView: document.getElementById('playlist-detail-view'),
    playlistsGrid: document.getElementById('playlists-grid'),
    backToGridBtn: document.getElementById('back-to-grid-btn'),
    currentPlaylistTitle: document.getElementById('current-playlist-title'),

    promptModal: document.getElementById('custom-prompt-modal'),
    promptTitle: document.getElementById('prompt-title'),
    promptInput: document.getElementById('prompt-input'),
    promptOk: document.getElementById('prompt-ok'),
    promptCancel: document.getElementById('prompt-cancel'),

    confirmModal: document.getElementById('custom-confirm-modal'),
    confirmTitle: document.getElementById('confirm-title'),
    confirmOk: document.getElementById('confirm-ok'),
    confirmCancel: document.getElementById('confirm-cancel'),

    addModal: document.getElementById('add-to-playlist-modal'),
    modalGrid: document.getElementById('modal-playlists-grid'),
    closeAddModalBtn: document.getElementById('close-add-modal-btn'),

    alertModal: document.getElementById('custom-alert-modal'),
    alertTitle: document.getElementById('alert-title'),
    alertMessage: document.getElementById('alert-message'),
    alertOk: document.getElementById('alert-ok'),

    ytToggle: document.getElementById('yt-toggle-btn'),
    ytPanel: document.getElementById('yt-panel'),
    ytInput: document.getElementById('yt-search-input'),
    ytClearBtn: document.getElementById('yt-clear-btn'),
    ytSearchBtn: document.getElementById('yt-search-btn'),
    ytResults: document.getElementById('yt-results'),
    ytClose: document.getElementById('yt-close-btn'),

    slow: document.getElementById('slow-btn'),
    speed: document.getElementById('speed-btn'),
    reverb: document.getElementById('reverb-btn'),
    btn8d: document.getElementById('8d-btn'),
    muffle: document.getElementById('muffle-btn'),
    bass: document.getElementById('bass-btn'),

    vol: document.getElementById('volume-slider'),
    loop: document.getElementById('loop-btn'),
    shuffle: document.getElementById('shuffle-btn'),
    closeBtn: document.getElementById('close-btn'),
    minBtn: document.getElementById('min-btn'),

    localBtn: document.getElementById('local-file-btn'),
    fileInput: document.getElementById('file-input'),

    themeDots: document.querySelectorAll('.theme-dot'),

    restartBtn: document.getElementById('restart-btn'),
    addBtn: document.getElementById('add-btn')
};

function showPrompt(title, defaultValue, callback) {
    el.promptTitle.innerText = title;
    el.promptInput.value = defaultValue || "";
    el.promptModal.classList.remove('hidden');
    promptCallback = callback;
    el.promptInput.focus();
}

function hidePrompt() {
    el.promptModal.classList.add('hidden');
    promptCallback = null;
}

el.promptOk.onclick = () => {
    if (promptCallback) promptCallback(el.promptInput.value);
    hidePrompt();
};
el.promptCancel.onclick = hidePrompt;
el.promptInput.onkeydown = (e) => {
    if (e.key === 'Enter') el.promptOk.click();
    if (e.key === 'Escape') hidePrompt();
};

function showConfirm(title, callback) {
    el.confirmTitle.innerText = title;
    el.confirmModal.classList.remove('hidden');
    confirmCallback = callback;
}

function hideConfirm() {
    el.confirmModal.classList.add('hidden');
    confirmCallback = null;
}

el.confirmOk.onclick = () => {
    if (confirmCallback) confirmCallback(true);
    hideConfirm();
};
el.confirmCancel.onclick = () => {
    if (confirmCallback) confirmCallback(false);
    hideConfirm();
};

function showCustomAlert(message, title = "Notice") {
    el.alertTitle.innerText = title;
    el.alertMessage.innerText = message;
    el.alertModal.classList.remove('hidden');
}
el.alertOk.onclick = () => {
    el.alertModal.classList.add('hidden');
};

function renderPlaylistsGrid() {
    el.playlistsGrid.innerHTML = '';


    const addCard = document.createElement('div');
    addCard.className = 'playlist-card';
    addCard.innerHTML = `<div class="playlist-card-icon" style="pointer-events: none;">+</div><div class="playlist-card-title" style="pointer-events: none;">NEW PLAYLIST</div>`;
    addCard.ondragover = (e) => { e.preventDefault(); addCard.classList.add('drag-over'); };
    addCard.ondragleave = () => addCard.classList.remove('drag-over');
    addCard.ondrop = (e) => {
        e.preventDefault();
        addCard.classList.remove('drag-over');
        const data = e.dataTransfer.getData('text/plain');
        if (data && data.startsWith('playlist_')) {
            const fromIndex = parseInt(data.replace('playlist_', ''));
            playlistMgr.movePlaylist(fromIndex, 0);
            setTimeout(() => renderPlaylistsGrid(), 50);
        }
    };
    addCard.onclick = () => {
        if (isPlaylistDragging) return;
        showPrompt("New Playlist Name:", "", (name) => {
            if (name && name.trim()) {
                playlistMgr.createPlaylist(name.trim());
                renderPlaylistsGrid();
            }
        });
    };
    el.playlistsGrid.appendChild(addCard);

    playlistMgr.getAllPlaylists().forEach((p, index) => {
        const card = document.createElement('div');
        card.className = 'playlist-card';
        card.draggable = true;
        
        card.innerHTML = `
            <button class="card-action-btn edit" title="Rename">✏️</button>
            <button class="card-action-btn delete" title="Delete">🗑</button>
            <div class="playlist-card-icon" style="pointer-events: none;">🎵</div>
            <div class="playlist-card-title" style="pointer-events: none;">${p.name}</div>
            <div style="font-size: 8px; color: #888; margin-top: 2px; pointer-events: none;">${p.tracks.length} tracks</div>
        `;

        card.ondragstart = (e) => {
            isPlaylistDragging = true;
            e.dataTransfer.setData('text/plain', 'playlist_' + index);
            card.style.opacity = '0.5';
        };
        card.ondragend = () => {
            card.style.opacity = '1';
            setTimeout(() => isPlaylistDragging = false, 100);
        };

        card.ondragover = (e) => {
            e.preventDefault();
            card.classList.add('drag-over');
        };
        card.ondragleave = () => card.classList.remove('drag-over');
        card.ondrop = (e) => {
            e.preventDefault();
            card.classList.remove('drag-over');
            const data = e.dataTransfer.getData('text/plain');
            if (data && data.startsWith('playlist_')) {
                const fromIndex = parseInt(data.replace('playlist_', ''));
                if (fromIndex !== index) {
                    playlistMgr.movePlaylist(fromIndex, index);
                    setTimeout(() => renderPlaylistsGrid(), 50);
                }
            } else if (data && data.startsWith('track_')) {
                const trackIdx = parseInt(data.replace('track_', ''));
                const activeP = playlistMgr.getPlaylist(playlistMgr.activeId);
                if (activeP && p.id !== activeP.id) {
                    const track = activeP.tracks[trackIdx];
                    activeP.tracks.splice(trackIdx, 1);
                    p.tracks.push(track);
                    playlistMgr.save();
                    renderPlaylistDetail(); 
                }
            }
        };

        card.onclick = (e) => {
            if (isPlaylistDragging) return;
            if (e.target.classList.contains('edit')) {
                showPrompt("Rename Playlist:", p.name, (newName) => {
                    if (newName && newName.trim()) {
                        p.name = newName.trim();
                        playlistMgr.save();
                        renderPlaylistsGrid();
                    }
                });
                return;
            }
            if (e.target.classList.contains('delete')) {
                showConfirm(`Delete '${p.name}'?`, (confirmed) => {
                    if (confirmed) {
                        if (!playlistMgr.deletePlaylist(p.id)) {
                            showCustomAlert("Cannot delete the last playlist!", "Error");
                        }
                        renderPlaylistsGrid();
                    }
                });
                return;
            }

            playlistMgr.setActive(p.id);
            openPlaylistDetail();
        };

        el.playlistsGrid.appendChild(card);
    });
}

function openPlaylistDetail() {
    el.playlistsGridView.style.display = 'none';
    el.playlistDetailView.style.display = 'flex';
    renderPlaylistDetail();
}

function openPlaylistsGrid() {
    el.playlistDetailView.style.display = 'none';
    el.playlistsGridView.style.display = 'flex';
    renderPlaylistsGrid();
}

el.backToGridBtn.onclick = openPlaylistsGrid;

function renderPlaylistDetail() {
    const activeP = playlistMgr.getPlaylist(playlistMgr.activeId);
    if (!activeP) return;
    
    el.currentPlaylistTitle.innerText = activeP.name;
    el.favList.innerHTML = '';
    
    if (activeP.tracks.length === 0) {
        el.favList.innerHTML = '<p style="text-align:center; margin-top:20px;">EMPTY LIST</p>';
        return;
    }

    activeP.tracks.forEach((track, index) => {
        const div = document.createElement('div');
        div.className = 'fav-item';
        div.draggable = true;
        div.innerHTML = `
            <div style="flex-grow:1; overflow:hidden; white-space:nowrap; text-overflow:ellipsis;">
                ${index + 1}. ${track.title}
            </div>
            <div style="display: flex; gap: 5px;">
                <button class="edit-track-btn" style="background: rgba(0,0,0,0.5); color: white; border: none; border-radius: 4px; padding: 4px 6px; cursor: pointer; font-size: 8px;" title="Rename">✏️</button>
                <button class="delete-btn" style="background: #ff4757; color: white; border: none; border-radius: 4px; padding: 4px 6px; cursor: pointer; font-size: 8px;" title="Remove">🗑</button>
            </div>
        `;

        div.ondragstart = (e) => {
            e.dataTransfer.setData('text/plain', 'track_' + index);
            div.style.opacity = '0.5';
        };
        div.ondragend = () => div.style.opacity = '1';
        div.ondragover = (e) => e.preventDefault();
        div.ondrop = (e) => {
            e.preventDefault();
            const data = e.dataTransfer.getData('text/plain');
            if (data.startsWith('track_')) {
                const fromIndex = parseInt(data.replace('track_', ''));
                playlistMgr.move(fromIndex, index);
                renderPlaylistDetail();
            }
        };

        div.onclick = (e) => {
            if (e.target.closest('.delete-btn') || e.target.closest('.edit-track-btn')) return;
            playTrack(track);
        };

        const editBtn = div.querySelector('.edit-track-btn');
        editBtn.onclick = () => {
            showPrompt("Rename Track:", track.title, (newName) => {
                if (newName && newName.trim()) {
                    track.title = newName.trim();
                    playlistMgr.save();
                    renderPlaylistDetail();
                    
                    if (currentTrackData && currentTrackData.url === track.url) {
                        currentTrackData.title = track.title;
                        el.title.innerText = track.title.toUpperCase();
                        if (track.title.length > 15) el.title.classList.add('scrolling');
                        else el.title.classList.remove('scrolling');
                    }
                }
            });
        };

        const delBtn = div.querySelector('.delete-btn');
        delBtn.onclick = () => {
            showConfirm(`Remove from playlist?`, (confirmed) => {
                if (confirmed) {
                    playlistMgr.remove(track.url);
                    renderPlaylistDetail();
                    checkFavStatus();
                }
            });
        };

        el.favList.appendChild(div);
    });
}

function checkFavStatus() {
    if (!currentTrackData) return;
    const isFav = playlistMgr.getAllPlaylists().some(p => p.tracks.some(t => t.url === currentTrackData.url));
    if (isFav) {
        el.favBtn.classList.add('active');
    } else {
        el.favBtn.classList.remove('active');
    }
}

el.favBtn.onclick = () => {
    if (!currentTrackData) {
        showCustomAlert("Play a track first!", "Oops!");
        return;
    }
    openAddTrackModal(currentTrackData);
};

el.listToggle.onclick = () => {
    isPlaylistOpen = !isPlaylistOpen;
    
    if (isPlaylistOpen) {
        ipcRenderer.send('resize-window', 650, 600);
        el.playlistSidebar.classList.add('active');

    } else {
        el.playlistSidebar.classList.remove('active');
        setTimeout(() => { ipcRenderer.send('resize-window', 350, 600); }, 300);
    }
};

async function playTrack(track) {
    el.title.innerText = "LOADING...";
    el.title.classList.remove('scrolling');
    
    el.slow.classList.remove('active');
    el.speed.classList.remove('active');
    
    if (track.type === 'youtube') {
        const result = await ipcRenderer.invoke('yt-get-stream', track.url);
        if (result.success) {
            player.play(result.url);
            el.title.innerText = track.title.toUpperCase();
            if (track.title.length > 15) el.title.classList.add('scrolling');
            
            currentTrackData = track;
            el.playBtn.innerText = "❚❚";
            checkFavStatus();
            preloadNextTrack();
        } else {
            showCustomAlert("Broken link or no internet.", "Error");
            el.title.innerText = "ERROR";
        }
    } else if (track.type === 'local') {
        player.play(track.url);
        el.title.innerText = track.title.toUpperCase();
        if (track.title.length > 15) el.title.classList.add('scrolling');
        
        currentTrackData = track;
        el.playBtn.innerText = "❚❚";
        checkFavStatus();
        preloadNextTrack();
    }
}

el.localBtn.onclick = () => el.fileInput.click();

el.fileInput.onchange = (e) => {
    const file = e.target.files[0];
    if (file) {
        playTrack({ title: file.name.replace(/\.[^/.]+$/, ""), url: file.path, type: 'local' });
    }
};

el.themeDots.forEach(dot => {
    dot.onclick = () => {
        const theme = dot.getAttribute('data-theme');
        if (theme === 'default') document.documentElement.removeAttribute('data-theme');
        else document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('pixel_theme', theme);
    };
});
const savedTheme = localStorage.getItem('pixel_theme');
if (savedTheme && savedTheme !== 'default') document.documentElement.setAttribute('data-theme', savedTheme);

el.ytToggle.onclick = (e) => {
    if (e) e.stopPropagation();
    el.ytPanel.classList.toggle('hidden');
};

el.ytClose.onclick = (e) => {
    if (e) e.stopPropagation();
    el.ytPanel.classList.add('hidden');
};

document.addEventListener('click', (e) => {
    if (e.target.classList.contains('custom-modal')) {
        e.target.classList.add('hidden');
        if (e.target === el.promptModal) promptCallback = null;
        if (e.target === el.confirmModal) confirmCallback = null;
        if (e.target === el.addModal) pendingTrackToAdd = null;
    }
});

function openAddTrackModal(trackData) {
    pendingTrackToAdd = trackData;
    el.modalGrid.innerHTML = '';
    
    playlistMgr.getAllPlaylists().forEach(p => {
        const card = document.createElement('div');
        card.className = 'playlist-card';
        card.innerHTML = `<div class="playlist-card-icon">🎵</div><div class="playlist-card-title">${p.name}</div>`;
        card.onclick = () => {
            const exists = p.tracks.some(t => t.url === pendingTrackToAdd.url);
            if (!exists) {
                p.tracks.push(pendingTrackToAdd);
                playlistMgr.save();
                checkFavStatus(); 
            }
            el.addModal.classList.add('hidden');
            pendingTrackToAdd = null;
            
            if (isPlaylistOpen) {
                renderPlaylistsGrid();
                if (el.playlistDetailView.style.display !== 'none' && playlistMgr.activeId === p.id) {
                    renderPlaylistDetail();
                }
            }
        };
        el.modalGrid.appendChild(card);
    });
    
    el.addModal.classList.remove('hidden');
}

el.closeAddModalBtn.onclick = () => {
    el.addModal.classList.add('hidden');
    pendingTrackToAdd = null;
};

el.ytClearBtn.onclick = () => {
    el.ytInput.value = '';
    el.ytResults.innerHTML = '<p style="font-size: 8px; color: #7a6a81; text-align:center; margin-top:20px;">SEARCH TO PLAY</p>';
};

el.ytInput.onkeydown = (e) => {
    if (e.key === 'Enter') el.ytSearchBtn.click();
};

el.ytSearchBtn.onclick = async () => {
    const query = el.ytInput.value;
    if (!query) return;

    try {
        el.ytResults.innerHTML = '<p style="text-align:center; margin-top:20px; font-size:8px;">SEARCHING...</p>';
        const videos = await ipcRenderer.invoke('yt-search-list', query);
        el.ytResults.innerHTML = '';

        if (!videos || videos.length === 0) {
            el.ytResults.innerHTML = '<p style="text-align:center; font-size:8px;">NO RESULTS</p>';
            return;
        }

        videos.forEach(v => {
            const div = document.createElement('div');
            div.className = 'yt-item';
            
            div.innerHTML = `
                <img src="${v.thumbnail}" referrerpolicy="no-referrer" class="yt-thumb" style="width:40px; height:30px; object-fit:cover; border-radius:4px;">
                <div style="flex-grow: 1; overflow: hidden; white-space: nowrap; text-overflow: ellipsis;"><div style="margin-bottom:2px;">${v.title.substring(0, 30)}...</div><div style="color:#888;">${v.timestamp}</div></div>
                <button class="heart-btn add-fav-btn" style="font-size: 14px; padding: 5px;">❤</button>
            `;
            
            div.onclick = (e) => {
                if(e.target.classList.contains('add-fav-btn')) return;
                playTrack({ title: v.title, url: v.url, type: 'youtube' });
            };
            
            const heartBtn = div.querySelector('.add-fav-btn');
            heartBtn.onclick = (e) => {
                e.stopPropagation();
                openAddTrackModal({ title: v.title, url: v.url, type: 'youtube' });
            };
            
            el.ytResults.appendChild(div);
        });
    } catch (err) {
        el.ytResults.innerHTML = `<p style="text-align:center; color:red; font-size:8px;">ERROR</p>`;
    }
};

el.playBtn.onclick = () => {
    const isPlaying = player.togglePlay();
    el.playBtn.innerText = isPlaying ? "❚❚" : "▶";
};

if (el.restartBtn) el.restartBtn.onclick = () => player.setTime(0);

let preloadedNextTrackData = null;
let isShuffleEnabled = false;

function preloadNextTrack() {
    const list = playlistMgr.getAll();
    if (list.length === 0 || !currentTrackData) return;
    let nextTrack = null;
    
    if (isShuffleEnabled) {
        if (list.length > 1) {
            let rIdx = Math.floor(Math.random() * list.length);
            while (list[rIdx].url === currentTrackData.url) {
                rIdx = Math.floor(Math.random() * list.length);
            }
            nextTrack = list[rIdx];
        } else {
            nextTrack = list[0];
        }
    } else {
        const idx = list.findIndex(t => t.url === currentTrackData.url);
        if (idx !== -1 && idx < list.length - 1) nextTrack = list[idx + 1];
        else if (idx === list.length - 1) nextTrack = list[0];
    }
    
    preloadedNextTrackData = nextTrack;
    if (nextTrack && nextTrack.type === 'youtube') {
        ipcRenderer.invoke('yt-get-stream', nextTrack.url).catch(() => {});
    }
}

function playNext() {
    const list = playlistMgr.getAll();
    if (list.length === 0) return;
    
    if (preloadedNextTrackData && list.some(t => t.url === preloadedNextTrackData.url)) {
        playTrack(preloadedNextTrackData);
    } else {
        if (isShuffleEnabled) {
            let rIdx = Math.floor(Math.random() * list.length);
            playTrack(list[rIdx]);
        } else {
            if (!currentTrackData) return;
            const idx = list.findIndex(t => t.url === currentTrackData.url);
            if (idx !== -1 && idx < list.length - 1) playTrack(list[idx + 1]);
            else playTrack(list[0]);
        }
    }
}

function playPrev() {
    const list = playlistMgr.getAll();
    if (list.length === 0 || !currentTrackData) return;
    const idx = list.findIndex(t => t.url === currentTrackData.url);
    if (idx > 0) playTrack(list[idx - 1]);
}

if (el.addBtn) el.addBtn.onclick = playNext;
if (el.restartBtn) el.restartBtn.onclick = () => {
    if (player.currentTime > 3) player.setTime(0);
    else playPrev();
};

el.slow.onclick = () => {
    if (el.slow.classList.toggle('active')) {
        el.speed.classList.remove('active');
        player.setSpeed('slow');
    } else player.setSpeed('normal');
};

el.speed.onclick = () => {
    if (el.speed.classList.toggle('active')) {
        el.slow.classList.remove('active');
        player.setSpeed('fast');
    } else player.setSpeed('normal');
};

el.btn8d.onclick = () => player.set8D(el.btn8d.classList.toggle('active'));
el.bass.onclick = () => player.setBass(el.bass.classList.toggle('active'));
el.reverb.onclick = () => { el.reverb.classList.toggle('active'); player.setReverb(el.reverb.classList.contains('active')); };
el.muffle.onclick = () => { el.muffle.classList.toggle('active'); player.setMuffled(el.muffle.classList.contains('active')); };

el.vol.oninput = () => player.setVolume(el.vol.value / 100);
el.loop.onclick = () => { el.loop.classList.toggle('active'); player.setLoop(el.loop.classList.contains('active')); };
el.shuffle.onclick = () => {
    isShuffleEnabled = !isShuffleEnabled;
    el.shuffle.classList.toggle('active', isShuffleEnabled);
    if (currentTrackData) preloadNextTrack();
};

player.onEnded(() => {
    if (!el.loop.classList.contains('active')) playNext();
});

let isDragging = false;
player.onTimeUpdate((curr, total) => {
    if (!isDragging) {
        el.progressBar.value = (curr / total) * 100;
        el.currTime.innerText = formatTime(curr);
        el.durTime.innerText = formatTime(total);
    }
});

el.progressBar.oninput = () => {
    isDragging = true;
    const val = el.progressBar.value;
    const duration = player.duration;
    if (duration) el.currTime.innerText = formatTime((val / 100) * duration);
};

el.progressBar.onchange = () => {
    player.setTime(el.progressBar.value);
    isDragging = false;
    el.progressBar.blur();
};

el.closeBtn.onclick = () => window.close();
el.minBtn.onclick = () => ipcRenderer.send('minimize-app');

function formatTime(s) {
    if (!s || isNaN(s)) return "0:00";
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec < 10 ? '0' : ''}${sec}`;
}

player.setVolume(el.vol.value / 100);

renderPlaylistsGrid();
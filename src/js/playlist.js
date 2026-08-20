const fs = require('fs');
const path = require('path');
const { ipcRenderer } = require('electron');

class PlaylistManager {
    constructor() {
        this.userDataPath = ipcRenderer.sendSync('get-user-data-path');
        this.jsonPath = path.join(this.userDataPath, 'playlists.json');
        
        let loaded = false;
        if (fs.existsSync(this.jsonPath)) {
            try {
                const fileData = fs.readFileSync(this.jsonPath, 'utf8');
                const parsed = JSON.parse(fileData);
                this.playlists = parsed.playlists || [{ id: 'default', name: 'My Playlist', tracks: [] }];
                this.activeId = parsed.activeId || this.playlists[0].id;
                loaded = true;
            } catch (e) {
                console.error("Error reading playlists.json", e);
            }
        }
        
        if (!loaded) {
            const stored = localStorage.getItem('myPlaylists');
            if (stored) {
                const parsed = JSON.parse(stored);
                if (Array.isArray(parsed)) {
                    this.playlists = [{ id: 'default', name: 'My Playlist', tracks: parsed }];
                } else {
                    this.playlists = parsed.playlists || [{ id: 'default', name: 'My Playlist', tracks: [] }];
                }
            } else {
                const oldList = JSON.parse(localStorage.getItem('myPlaylist'));
                if (oldList && Array.isArray(oldList)) {
                    this.playlists = [{ id: 'default', name: 'My Playlist', tracks: oldList }];
                } else {
                    this.playlists = [{ id: 'default', name: 'My Playlist', tracks: [] }];
                }
            }
            this.activeId = localStorage.getItem('activePlaylistId') || this.playlists[0].id;
            this.save();
        }

        if (!this.getPlaylist(this.activeId)) {
            this.activeId = this.playlists[0].id;
        }
    }

    get activeList() {
        return this.getPlaylist(this.activeId).tracks;
    }

    getPlaylist(id) {
        return this.playlists.find(p => p.id === id);
    }

    createPlaylist(name) {
        const id = 'pl_' + Date.now();
        this.playlists.push({ id, name, tracks: [] });
        this.save();
        return id;
    }

    deletePlaylist(id) {
        if (this.playlists.length <= 1) return false;
        this.playlists = this.playlists.filter(p => p.id !== id);
        if (this.activeId === id) {
            this.activeId = this.playlists[0].id;
            localStorage.setItem('activePlaylistId', this.activeId);
        }
        this.save();
        return true;
    }

    setActive(id) {
        if (this.getPlaylist(id)) {
            this.activeId = id;
            localStorage.setItem('activePlaylistId', id);
            this.save();
        }
    }

    add(track) {
        const list = this.activeList;
        const exists = list.some(t => t.url === track.url);
        if (!exists) {
            list.push(track);
            this.save();
            return true;
        }
        return false;
    }

    remove(trackUrl) {
        const p = this.getPlaylist(this.activeId);
        p.tracks = p.tracks.filter(t => t.url !== trackUrl);
        this.save();
    }

    save() {
        localStorage.setItem('myPlaylists', JSON.stringify({ playlists: this.playlists }));
        localStorage.setItem('activePlaylistId', this.activeId);
        try {
            fs.writeFileSync(this.jsonPath, JSON.stringify({ playlists: this.playlists, activeId: this.activeId }), 'utf8');
        } catch (e) {
            console.error("Error saving playlists.json", e);
        }
    }

    getAll() {
        return this.activeList;
    }

    getAllPlaylists() {
        return this.playlists;
    }

    isFavorite(url) {
        return this.activeList.some(t => t.url === url);
    }

    move(fromIndex, toIndex) {
        const list = this.activeList;
        if (fromIndex < 0 || fromIndex >= list.length || toIndex < 0 || toIndex >= list.length) return;
        const item = list.splice(fromIndex, 1)[0];
        list.splice(toIndex, 0, item);
        this.save();
    }

    movePlaylist(fromIndex, toIndex) {
        if (fromIndex < 0 || fromIndex >= this.playlists.length || toIndex < 0 || toIndex >= this.playlists.length) return;
        const item = this.playlists.splice(fromIndex, 1)[0];
        this.playlists.splice(toIndex, 0, item);
        this.save();
    }
}

module.exports = PlaylistManager;

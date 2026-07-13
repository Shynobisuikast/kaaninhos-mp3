class PlaylistManager {
    constructor() {
        const stored = localStorage.getItem('myPlaylists');
        if (stored) {
            const parsed = JSON.parse(stored);
            if (Array.isArray(parsed)) {
                this.playlists = [
                    { id: 'default', name: 'My Playlist', tracks: parsed }
                ];
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
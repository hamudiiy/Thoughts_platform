/**
 * Thoughts - Downloads Manager
 * Simulates offline downloads using localStorage.
 */

const Downloads = {
    key: 'thoughts_downloaded_articles',

    get() {
        const downloaded = localStorage.getItem(this.key);
        return downloaded ? JSON.parse(downloaded) : [];
    },

    isDownloaded(articleId) {
        return this.get().includes(articleId);
    },

    toggle(articleId, event) {
        if (event) event.stopPropagation();

        let downloaded = this.get();
        const index = downloaded.indexOf(articleId);
        let status;

        if (index === -1) {
            downloaded.push(articleId);
            status = true;
        } else {
            downloaded.splice(index, 1);
            status = false;
        }

        localStorage.setItem(this.key, JSON.stringify(downloaded));
        return status;
    }
};

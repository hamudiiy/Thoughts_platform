/**
 * Thoughts - History Manager
 * Tracks recently viewed articles in localStorage.
 */

const History = {
    key: 'thoughts_read_history',
    maxItems: 50,

    get() {
        const history = localStorage.getItem(this.key);
        return history ? JSON.parse(history) : [];
    },

    add(articleId) {
        let history = this.get();
        // Remove if already exists to move to top
        history = history.filter(id => id !== articleId);
        history.unshift(articleId);

        // Trim to max items
        if (history.length > this.maxItems) {
            history = history.slice(0, this.maxItems);
        }

        localStorage.setItem(this.key, JSON.stringify(history));
    },

    clear() {
        localStorage.removeItem(this.key);
    },

    remove(articleId) {
        let history = this.get();
        history = history.filter(id => id !== articleId);
        localStorage.setItem(this.key, JSON.stringify(history));
    }
};

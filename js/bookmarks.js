/**
 * Thoughts - Bookmark Manager
 * Handles persistent storage of saved articles using localStorage.
 */

const Bookmarks = {
    key: 'thoughts_saved_articles',

    getSaved() {
        const saved = localStorage.getItem(this.key);
        return saved ? JSON.parse(saved) : [];
    },

    isSaved(id) {
        return this.getSaved().includes(id);
    },

    toggle(id, event) {
        if (event) {
            event.stopPropagation();
        }

        const saved = this.getSaved();
        const index = saved.indexOf(id);
        let status;

        if (index === -1) {
            saved.push(id);
            status = true;
        } else {
            saved.splice(index, 1);
            status = false;
        }

        localStorage.setItem(this.key, JSON.stringify(saved));

        // Update any icons on the page if they exist
        this.updateIcons(id, status);

        return status;
    },

    updateIcons(id, status) {
        const icons = document.querySelectorAll(`[data-bookmark-id="${id}"]`);
        icons.forEach(icon => {
            if (status) {
                icon.innerHTML = '🔖';
                icon.classList.add('saved');
            } else {
                icon.innerHTML = '📂'; // we can use a different icon or outline
                icon.classList.remove('saved');
            }
        });
    }
};

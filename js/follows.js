/**
 * Thoughts - Follow Manager
 * Handles persistent storage of followed authors.
 */

const Follows = {
    key: 'thoughts_followed_authors',

    getFollowed() {
        const followed = localStorage.getItem(this.key);
        return followed ? JSON.parse(followed) : [];
    },

    isFollowing(author) {
        return this.getFollowed().includes(author);
    },

    toggle(author, event) {
        if (event) event.stopPropagation();

        const followed = this.getFollowed();
        const index = followed.indexOf(author);
        let status;

        if (index === -1) {
            followed.push(author);
            status = true;
        } else {
            followed.splice(index, 1);
            status = false;
        }

        localStorage.setItem(this.key, JSON.stringify(followed));

        // Dispatch a custom event so other components (like app.js) can react
        window.dispatchEvent(new CustomEvent('thoughtsFollowChange', {
            detail: { author, status }
        }));

        // Update any buttons on the page
        this.updateUI(author, status);

        return status;
    },

    updateUI(author, status) {
        const buttons = document.querySelectorAll(`[data-author="${author}"] .btn-follow, button[data-author-btn="${author}"]`);
        buttons.forEach(btn => {
            if (status) {
                btn.innerHTML = 'Following';
                btn.classList.add('active');
                btn.style.background = '#111827';
                btn.style.color = '#FFFFFF';
            } else {
                btn.innerHTML = 'Follow +';
                btn.classList.remove('active');
                btn.style.background = '';
                btn.style.color = '';
            }
        });
    }
};

/**
 * Thoughts Platform - Article Engine
 */

const ArticleDetail = {
    async init() {
        if (typeof ARTICLES === 'undefined') {
            this.showError('Data file (data/articles.js) not found or blocked by browser.');
            return;
        }

        const params = new URLSearchParams(window.location.search);
        const id = params.get('id');

        const articles = ARTICLES;
        if (!articles || articles.length === 0) {
            this.showError('Article database is empty.');
            return;
        }

        const article = articles.find(a => a.id === id);

        if (article) {
            History.add(id);
            this.renderArticle(article);
            this.renderSuggestions(articles.filter(a => a.id !== id).slice(0, 3));
        } else {
            this.showError('Article not found (ID: ' + id + ')');
        }
    },

    renderArticle(article) {
        const root = document.getElementById('articleContent');
        if (!root) return;

        const isFollowing = Follows.isFollowing(article.author);

        root.innerHTML = `
            <div class="article-hero">
                <img src="${article.image}" alt="${article.title}">
            </div>
            
            <div class="article-meta-header">
                <span class="article-cat">${article.category}</span>
                <h1 class="article-title">${article.title}</h1>
                
                <div class="article-author-card" data-author="${article.author}">
                    <img src="https://ui-avatars.com/api/?name=${encodeURIComponent(article.author)}&background=FF5C39&color=fff" class="author-img">
                    <div class="author-info">
                        <div class="author-name" style="cursor: pointer;" onclick="location.href='index.html?profile=' + encodeURIComponent('${article.author}')">${article.author}</div>
                        <div class="article-date">${article.date} • ${article.readTime}</div>
                    </div>
                    <button class="btn-follow ${isFollowing ? 'active' : ''}" 
                            style="margin-left: auto; ${isFollowing ? 'background: #111827; color: #fff;' : ''}"
                            onclick="Follows.toggle('${article.author}', event)">
                        ${isFollowing ? 'Following' : 'Follow +'}
                    </button>
                </div>

                <div style="margin-top: 24px; display: flex; gap: 12px;">
                    <button class="btn-follow ${Bookmarks.isSaved(article.id) ? 'saved' : ''}" 
                            data-bookmark-id="${article.id}"
                            onclick="const status = Bookmarks.toggle('${article.id}'); this.innerHTML = status ? '🔖 Saved' : '📂 Save Reference';">
                        ${Bookmarks.isSaved(article.id) ? '🔖 Saved' : '📂 Save Reference'}
                    </button>
                    <button class="btn-share" onclick="alert('Link copied to clipboard!')">🔗 Copy Link</button>
                    ${(localStorage.getItem('thoughts_user_name') || 'Guest Author') === article.author ?
                `<button class="btn-share" style="background: #fee2e2; color: #ef4444;" onclick="if(confirm('Delete story?')) { ArticleDetail.deleteArticle('${article.id}'); }">🗑️ Delete</button>`
                : ''}
                </div>
            </div>

            <div class="article-body">
                ${article.fullContent.split('\n\n').map(p => `<p>${p}</p>`).join('')}
            </div>
        `;

        document.title = `Thoughts | ${article.title}`;
    },

    renderSuggestions(suggestions) {
        const container = document.getElementById('suggestedArticles');
        if (!container) return;

        container.innerHTML = suggestions.map(article => `
            <div class="curated-item" onclick="location.href='article.html?id=${article.id}'">
                <div class="curated-text">
                    <div class="curated-meta">${article.category}</div>
                    <h4>${article.title}</h4>
                </div>
                <img src="${article.image}">
            </div>
        `).join('');
    },

    deleteArticle(id) {
        let userArticles = JSON.parse(localStorage.getItem('thoughts_user_articles') || '[]');
        userArticles = userArticles.filter(a => a.id !== id);
        localStorage.setItem('thoughts_user_articles', JSON.stringify(userArticles));
        window.location.href = 'index.html';
    },

    showError(msg) {
        const root = document.getElementById('articleContent');
        if (root) {
            root.innerHTML = `<div class="error-msg"><h1>Oops!</h1><p>${msg}</p><a href="index.html">Back to Home</a></div>`;
        }
    }
};

document.addEventListener('DOMContentLoaded', () => ArticleDetail.init());

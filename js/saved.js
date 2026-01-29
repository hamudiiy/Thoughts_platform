/**
 * Thoughts - Saved Page Engine
 */

const SavedPage = {
    init() {
        if (typeof ARTICLES === 'undefined') {
            console.warn('ARTICLES not ready...');
            setTimeout(() => this.init(), 100);
            return;
        }

        this.render();
    },

    render() {
        const container = document.getElementById('savedList');
        if (!container) return;

        const savedIds = Bookmarks.getSaved();

        if (savedIds.length === 0) {
            container.innerHTML = `
                <div style="padding: 100px 0; text-align: center; color: #64748b;">
                    <div style="font-size: 3rem; margin-bottom: 20px;">📂</div>
                    <h2 style="font-size: 1.5rem; margin-bottom: 8px;">Your library is empty</h2>
                    <p>Articles you bookmark will appear here for quick access.</p>
                    <a href="index.html" style="display: inline-block; margin-top: 24px; color: #FF5C39; font-weight: 700; text-decoration: none;">Explore Articles →</a>
                </div>
            `;
            return;
        }

        const savedArticles = ARTICLES.filter(art => savedIds.includes(art.id));

        container.innerHTML = savedArticles.map(article => `
            <div class="list-article" onclick="location.href='article.html?id=${article.id}'">
                <img src="${article.image}" class="list-thumb">
                <div class="list-info">
                    <div class="list-meta">
                        <img src="https://ui-avatars.com/api/?name=${encodeURIComponent(article.author)}" class="small-avatar">
                        <span>${article.author} • ${article.category}</span>
                    </div>
                    <h3>${article.title}</h3>
                    <p>${article.excerpt}</p>
                    <div class="list-footer">
                        <span>📅 ${article.date} • ⏱️ ${article.readTime}</span>
                        <span class="bookmark saved" 
                              data-bookmark-id="${article.id}" 
                              onclick="Bookmarks.toggle('${article.id}', event); SavedPage.render();">
                              🔖
                        </span>
                    </div>
                </div>
            </div>
        `).join('');
    }
};

document.addEventListener('DOMContentLoaded', () => SavedPage.init());

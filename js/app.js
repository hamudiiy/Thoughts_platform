/**
 * Thoughts Platform - Home Engine
 */

window.onerror = function (msg, url, line) {
    const grid = document.getElementById('featuredGrid');
    if (grid) {
        grid.innerHTML = `<div style="grid-column: 1/-1; padding: 40px; background: #fee2e2; color: #991b1b; border-radius: 12px; font-weight: 700;">
            ⚠️ System Error: ${msg}<br>
            <small style="font-weight: 400; opacity: 0.8;">Line: ${line} | ${url}</small>
        </div>`;
    }
    return false;
};

const Home = {
    state: {
        activeTab: 'For You',
        activeCategory: null,
        searchQuery: ''
    },

    async init() {
        // Initialize global ARTICLES from Static + Local Storage
        if (typeof STATIC_ARTICLES !== 'undefined') {
            let localArticles = [];
            try {
                localArticles = JSON.parse(localStorage.getItem('thoughts_user_articles') || '[]');
            } catch (e) {
                console.error('Error parsing user articles', e);
            }

            // Cleanup: Remove "Impression" and "this is ultra cool"
            // We use a very aggressive filter here to catch variations
            const originalLen = localArticles.length;
            localArticles = localArticles.filter(a => {
                if (!a.title || !a.author) return false; // fast fail invalid
                const t = a.title.toLowerCase().trim();
                const auth = a.author.trim();

                // Target: "Impression" by "Guest Author"
                if (t === 'impression' && auth === 'Guest Author') return false;

                // Target: "this is ultra cool" by "Guest Author"
                if (t.includes('this is ultra cool') && auth === 'Guest Author') return false;

                return true;
            });

            if (localArticles.length !== originalLen) {
                localStorage.setItem('thoughts_user_articles', JSON.stringify(localArticles));
                console.log('Cleaned up', originalLen - localArticles.length, 'articles');
            }

            // Merge to create the global dataset
            window.ARTICLES = [...localArticles, ...STATIC_ARTICLES];
        } else if (typeof ARTICLES === 'undefined') {
            console.warn('ARTICLES not ready, retrying...');
            setTimeout(() => this.init(), 100);
            return;
        }

        if (!ARTICLES || ARTICLES.length === 0) {
            this.showUIError('Article database is empty.');
            return;
        }

        this.setupFilters();
        this.setupSearch();
        this.setupSidebarNav();
        this.setupMobileNav();
        this.setupNotifications();
        this.applyFilters();
        this.renderSidebars(ARTICLES);
        this.checkPremiumStatus();
        this.loadUserInfo();

        // Check for profile link
        const params = new URLSearchParams(window.location.search);
        const profile = params.get('profile');
        if (profile) {
            this.renderAuthorProfileView(profile);
        }

        // Listen for follow changes to update "Following" tab immediately
        window.addEventListener('thoughtsFollowChange', () => {
            if (this.state.activeTab === 'Following') {
                this.applyFilters();
            }
        });
    },

    setupSidebarNav() {
        const navMap = {
            'navHome': () => { this.switchTab('For You'); this.resetCategory(); },
            'navTrending': () => { this.switchTab('Trending'); this.resetCategory(); },
            'navFollowing': () => { this.switchTab('Following'); this.resetCategory(); },
            'navCategories': () => { this.renderCategoriesView(); },
            'navAudio': () => { this.renderAudioView(); },
            'navWrite': () => {
                if (!localStorage.getItem('thoughts_user_name')) {
                    window.location.href = 'login.html';
                } else {
                    Editor.render();
                }
            },
            'navHistory': () => { this.renderHistoryView(); },
            'navDownloaded': () => { this.renderDownloadedView(); },
            'navSettings': () => { this.renderSettingsView(); },
            'navHelp': () => { this.renderHelpView(); },
            'navFeedback': () => { this.renderFeedbackView(); },
            'navSaved': (e) => {
                // This link actually points to saved.html in HTML, 
                // but let's make it a dynamic view if clicked manually via JS
                // Actually, let's just let it be a normal link if it has href="saved.html"
            }
        };

        Object.entries(navMap).forEach(([id, action]) => {
            const el = document.getElementById(id);
            if (el) {
                el.addEventListener('click', (e) => {
                    if (el.getAttribute('href') !== '#' && el.getAttribute('href') !== '') return;
                    e.preventDefault();
                    document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
                    el.classList.add('active');
                    action();
                });
            }
        });

        // "View More Categories" listener
        const viewMore = document.querySelector('.view-more');
        if (viewMore) {
            viewMore.addEventListener('click', (e) => {
                e.preventDefault();
                this.renderCategoriesView();
            });
        }
    },

    setupMobileNav() {
        const toggle = document.getElementById('mobileNavToggle');
        const sidebar = document.querySelector('.sidebar-left');

        if (toggle && sidebar) {
            toggle.addEventListener('click', (e) => {
                e.stopPropagation();
                sidebar.classList.toggle('show');
                toggle.textContent = sidebar.classList.contains('show') ? '✕' : '☰';
            });

            // Close when clicking outside
            document.addEventListener('click', (e) => {
                if (sidebar.classList.contains('show') && !sidebar.contains(e.target) && e.target !== toggle) {
                    sidebar.classList.remove('show');
                    toggle.textContent = '☰';
                }
            });
        }
    },

    setupNotifications() {
        const bell = document.getElementById('bellIcon');
        const dropdown = document.getElementById('notificationsDropdown');
        if (!bell || !dropdown) return;

        bell.addEventListener('click', (e) => {
            e.stopPropagation();
            dropdown.classList.toggle('show');
            // Hide dot when opened
            const dot = bell.querySelector('.notification-dot');
            if (dot) dot.style.display = 'none';
        });

        document.addEventListener('click', () => {
            dropdown.classList.remove('show');
        });

        dropdown.addEventListener('click', (e) => e.stopPropagation());

        // Mock notifications
        const notifList = document.getElementById('notifList');
        const mockNotifs = [
            { author: 'Charlie Dorwart', text: 'published a new article about Environment.', time: '2m ago' },
            { author: 'Corey Rhiel Madsen', text: 'started following you.', time: '1h ago' },
            { author: 'Esther Howard', text: 'liked your saved collection.', time: '3h ago' }
        ];

        if (notifList && mockNotifs.length > 0) {
            notifList.innerHTML = mockNotifs.map(n => `
                <div class="notif-item">
                    <img src="https://ui-avatars.com/api/?name=${encodeURIComponent(n.author)}&background=random" class="notif-avatar">
                    <div class="notif-content">
                        <div class="notif-text"><b>${n.author}</b> ${n.text}</div>
                        <div class="notif-time">${n.time}</div>
                    </div>
                </div>
            `).join('');
        }
    },

    switchTab(tabName) {
        const tabs = document.querySelectorAll('.feed-tabs .tab');
        tabs.forEach(tab => {
            tab.classList.toggle('active', tab.innerText === tabName);
        });
        this.state.activeTab = tabName;
        this.applyFilters();
    },

    resetCategory() {
        this.state.activeCategory = null;
        document.querySelectorAll('.cat-pill, .hashtag').forEach(el => {
            el.style.background = '';
            el.style.color = '';
        });
    },

    showComingSoon(feature) {
        const featuredContainer = document.getElementById('featuredGrid');
        const listContainer = document.getElementById('listSection');
        if (featuredContainer) featuredContainer.innerHTML = '';
        if (listContainer) {
            listContainer.innerHTML = `
                <div style="padding: 100px 0; text-align: center; color: #64748b; background: #fffbe6; border: 1px dashed #ffe58f; border-radius: 24px;">
                    <div style="font-size: 3rem; margin-bottom: 20px;">🚧</div>
                    <h2 style="font-size: 1.5rem; margin-bottom: 8px;">${feature}</h2>
                    <p>We're working hard to bring this feature to Thoughts. Stay tuned!</p>
                    <button onclick="location.reload()" style="margin-top: 24px; background: #111827; color: #fff; border: none; padding: 10px 20px; border-radius: 100px; cursor: pointer;">Back to Feed</button>
                </div>
            `;
        }
    },

    setupFilters() {
        // Middle Tab Listeners
        const tabs = document.querySelectorAll('.feed-tabs .tab');
        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                this.switchTab(tab.innerText);
            });
        });

        // Sidebar Category Listeners
        const categoryPills = document.querySelectorAll('.cat-pill');
        categoryPills.forEach(pill => {
            pill.addEventListener('click', () => {
                const cat = pill.innerText;
                if (this.state.activeCategory === cat) {
                    this.state.activeCategory = null;
                    pill.style.background = '';
                    pill.style.color = '';
                } else {
                    categoryPills.forEach(p => {
                        p.style.background = '';
                        p.style.color = '';
                    });
                    this.state.activeCategory = cat;
                    pill.style.background = '#FF5C39';
                    pill.style.color = '#FFFFFF';
                }
                this.applyFilters();
            });
        });

        // Hashtag Listeners (Top row)
        const hashtags = document.querySelectorAll('.hashtag');
        hashtags.forEach(tag => {
            tag.addEventListener('click', () => {
                const cat = tag.innerText.replace('# ', '');
                if (this.state.activeCategory === cat) {
                    this.state.activeCategory = null;
                    tag.style.background = '';
                    tag.style.color = '';
                } else {
                    hashtags.forEach(t => {
                        t.style.background = '';
                        t.style.color = '';
                    });
                    this.state.activeCategory = cat;
                    tag.style.background = '#FF5C39';
                    tag.style.color = '#FFFFFF';
                }
                this.applyFilters();
            });
        });
    },

    setupSearch() {
        const searchInput = document.querySelector('.search-wrap input');
        if (!searchInput) return;

        searchInput.addEventListener('input', (e) => {
            this.state.searchQuery = e.target.value.toLowerCase().trim();
            this.applyFilters();
        });
    },

    applyFilters() {
        let filtered = [...ARTICLES];

        // 1. Tab Filtering
        if (this.state.activeTab === 'Trending') {
            filtered = filtered.filter(a => a.isTrending);
        } else if (this.state.activeTab === 'Following') {
            const followedAuthors = Follows.getFollowed();
            if (followedAuthors.length === 0) {
                this.renderFollowingEmpty();
                return;
            }
            filtered = filtered.filter(a => followedAuthors.includes(a.author));
        }

        // 2. Category Filtering
        if (this.state.activeCategory) {
            filtered = filtered.filter(a => a.category === this.state.activeCategory);
        }

        // 3. Search Filtering
        if (this.state.searchQuery) {
            filtered = filtered.filter(art =>
                art.title.toLowerCase().includes(this.state.searchQuery) ||
                art.author.toLowerCase().includes(this.state.searchQuery) ||
                art.category.toLowerCase().includes(this.state.searchQuery)
            );
        }

        this.renderFeed(filtered, this.state.searchQuery || this.state.activeCategory || this.state.activeTab);
    },

    renderFollowingEmpty() {
        const featuredContainer = document.getElementById('featuredGrid');
        const listContainer = document.getElementById('listSection');
        if (featuredContainer) featuredContainer.innerHTML = '';
        if (listContainer) {
            listContainer.innerHTML = `
                <div style="padding: 100px 0; text-align: center; color: #64748b; background: #f8fafc; border-radius: 24px;">
                    <div style="font-size: 3rem; margin-bottom: 20px;">👥</div>
                    <h2 style="font-size: 1.5rem; margin-bottom: 8px;">No Following Yet</h2>
                    <p>Follow authors from the sidebar or articles to see their latest stories here.</p>
                </div>
            `;
        }
    },

    renderFeed(articles, context = '') {
        const featuredContainer = document.getElementById('featuredGrid');
        const listContainer = document.getElementById('listSection');

        if (articles.length === 0) {
            if (featuredContainer) featuredContainer.innerHTML = '';
            if (listContainer) {
                listContainer.innerHTML = `
                    <div style="padding: 60px 0; text-align: center; color: #64748b;">
                        <h2 style="font-size: 1.5rem; margin-bottom: 8px;">No matching articles</h2>
                        <p>Try clearing your filters or exploring a different category.</p>
                    </div>
                `;
            }
            return;
        }

        this.renderFeatured(articles.slice(0, 2));
        this.renderList(articles.slice(2));
    },

    showUIError(msg) {
        const grid = document.getElementById('featuredGrid');
        if (grid) {
            grid.innerHTML = `<div style="grid-column: 1/-1; padding: 40px; background: #fee2e2; color: #991b1b; border-radius: 12px; font-weight: 700;">
                🚨 Error: ${msg}<br>
                <small style="font-weight: 400; opacity: 0.8;">Try refreshing the page or checking if "data/articles.js" exists in your folder.</small>
            </div>`;
        }
    },

    renderFeatured(featured) {
        const container = document.getElementById('featuredGrid');
        if (!container) return;

        container.innerHTML = featured.map((article, index) => `
            <div class="featured-card" style="background-image: url('${article.image}');" onclick="Home.openArticle('${article.id}')">
                <div class="badge">${article.isTrending ? '🔥 Trending' : '✨ Recommended'}</div>
                <div class="card-overlay">
                    <div class="card-meta">
                        <img src="https://ui-avatars.com/api/?name=${encodeURIComponent(article.author)}" alt="${article.author}">
                        <span style="cursor: pointer;" onclick="event.stopPropagation(); Home.renderAuthorProfileView('${article.author}')">${article.author}</span>
                        <span> • ${article.category}</span>
                    </div>
                    <h2 class="card-title">${article.title}</h2>
                    <p class="card-excerpt">${article.excerpt}</p>
                    <div class="card-bookmark" data-bookmark-id="${article.id}" onclick="Bookmarks.toggle('${article.id}', event)">
                        ${Bookmarks.isSaved(article.id) ? '🔖' : '📂'}
                    </div>
                </div>
            </div>
        `).join('');
    },

    renderList(others, containerId = 'listSection') {
        const container = document.getElementById(containerId);
        if (!container) return;

        container.innerHTML = others.map(article => `
            <div class="list-article" onclick="Home.openArticle('${article.id}')">
                <img src="${article.image}" class="list-thumb">
                <div class="list-info">
                    <div class="list-meta">
                        <img src="https://ui-avatars.com/api/?name=${encodeURIComponent(article.author)}" class="small-avatar">
                        <span style="cursor: pointer;" onclick="event.stopPropagation(); Home.renderAuthorProfileView('${article.author}')">${article.author}</span>
                        <span> • ${article.category}</span>
                    </div>
                    <h3>${article.title}</h3>
                    <p>${article.excerpt}</p>
                    <div class="list-footer">
                        <span>📅 ${article.date} • ⏱️ ${article.readTime}</span>
                        <span class="bookmark ${Bookmarks.isSaved(article.id) ? 'saved' : ''}" 
                              data-bookmark-id="${article.id}" 
                              onclick="Bookmarks.toggle('${article.id}', event)">
                              ${Bookmarks.isSaved(article.id) ? '🔖' : '📂'}
                        </span>
                    </div>
                </div>
            </div>
        `).join('');
    },

    /* --- Specialized Views --- */

    renderHistoryView() {
        const historyIds = History.get();
        const historyArticles = historyIds.map(id => ARTICLES.find(a => a.id === id)).filter(Boolean);

        const container = document.getElementById('listSection');
        const featured = document.getElementById('featuredGrid');
        if (featured) featured.innerHTML = '';
        if (container) {
            container.innerHTML = `
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 32px;">
                    <h2 style="font-size: 2rem; margin: 0;">Reading History</h2>
                    <button onclick="History.clear(); Home.renderHistoryView();" style="padding: 8px 16px; border-radius: 100px; border: 1px solid #e2e8f0; background: white; cursor: pointer; color: #ef4444; font-weight: 600;">Clear All</button>
                </div>
                <div id="historyList"></div>
            `;
            if (historyArticles.length === 0) {
                document.getElementById('historyList').innerHTML = `<p style="padding: 40px; text-align: center; color: #64748b;">Your history is empty.</p>`;
            } else {
                this.renderList(historyArticles, 'historyList');
                // Add individual delete buttons to list articles in history view
                document.querySelectorAll('#historyList .list-article').forEach((el, i) => {
                    const id = historyArticles[i].id;
                    const del = document.createElement('div');
                    del.innerHTML = '✕';
                    del.style = 'position: absolute; right: 20px; top: 20px; cursor: pointer; opacity: 0.5; font-weight: 700;';
                    del.onclick = (e) => {
                        e.stopPropagation();
                        History.remove(id);
                        this.renderHistoryView();
                    };
                    el.style.position = 'relative';
                    el.appendChild(del);
                });
            }
        }
    },

    renderDownloadedView() {
        const downloadedIds = Downloads.get();
        const downloadedArticles = downloadedIds.map(id => ARTICLES.find(a => a.id === id)).filter(Boolean);

        this.renderListView('Offline Downloads', downloadedArticles, 'Articles you download for offline reading will appear here.', '📥');
    },

    renderCategoriesView() {
        const categories = [...new Set(ARTICLES.map(a => a.category))];
        const container = document.getElementById('listSection');
        const featured = document.getElementById('featuredGrid');
        if (featured) featured.innerHTML = '';

        if (container) {
            container.innerHTML = `
                <div style="padding-bottom: 40px;">
                    <h2 style="font-size: 2rem; margin-bottom: 12px;">Explore Categories</h2>
                    <p style="color: #64748b; margin-bottom: 32px;">Discover stories across various topics and interests.</p>
                    
                    <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 16px;">
                        ${categories.map(cat => `
                            <div class="cat-pill" style="padding: 24px; border-radius: 20px; text-align: center; background: #f8fafc; cursor: pointer; transition: all 0.2s;"
                                 onclick="Home.state.activeCategory = '${cat}'; Home.applyFilters();">
                                <div style="font-size: 2rem; margin-bottom: 12px;">📂</div>
                                <div style="font-weight: 700;">${cat}</div>
                                <div style="font-size: 0.75rem; color: #64748b; margin-top: 4px;">${ARTICLES.filter(a => a.category === cat).length} Articles</div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        }
    },

    renderHelpView() {
        this.renderSimpleMessageView('Help Center', 'How can we help you today?', '❓', `
            <div style="text-align: left; max-width: 600px; margin: 40px auto; background: white; padding: 32px; border-radius: 24px; border: 1px solid #f1f5f9;">
                <h3 style="margin-bottom: 16px;">Frequently Asked Questions</h3>
                <details style="margin-bottom: 12px; padding: 12px; border-bottom: 1px solid #f1f5f9;">
                    <summary style="font-weight: 700; cursor: pointer;">How do I save articles?</summary>
                    <p style="margin-top: 8px; color: #64748b;">Click the bookmark icon on any article card or the "Save Reference" button inside an article.</p>
                </details>
                <details style="margin-bottom: 12px; padding: 12px; border-bottom: 1px solid #f1f5f9;">
                    <summary style="font-weight: 700; cursor: pointer;">Can I read offline?</summary>
                    <p style="margin-top: 8px; color: #64748b;">Yes! Use the "Downloaded" feature to save articles to your local storage for offline access.</p>
                </details>
                <details style="margin-bottom: 12px; padding: 12px;">
                    <summary style="font-weight: 700; cursor: pointer;">Is Thoughts Premium worth it?</summary>
                    <p style="margin-top: 8px; color: #64748b;">Thoughts Premium gives you ad-free reading and access to exclusive editorial content.</p>
                </details>
            </div>
        `);
    },

    renderSettingsView() {
        const savedName = localStorage.getItem('thoughts_user_name') || '';
        const savedEmail = localStorage.getItem('thoughts_user_email') || '';

        this.renderSimpleMessageView('Account Settings', 'Manage your profile and preferences.', '⚙️', `
            <div style="text-align: left; max-width: 500px; margin: 40px auto; background: white; padding: 32px; border-radius: 24px; border: 1px solid #f1f5f9;">
                <div style="margin-bottom: 24px;">
                    <label style="display: block; font-weight: 700; margin-bottom: 8px;">Display Name</label>
                    <input type="text" id="settingsName" value="${savedName}" style="width: 100%; padding: 12px; border-radius: 12px; border: 1px solid #e2e8f0;">
                </div>
                <div style="margin-bottom: 24px;">
                    <label style="display: block; font-weight: 700; margin-bottom: 8px;">Email Address</label>
                    <input type="email" id="settingsEmail" value="${savedEmail}" style="width: 100%; padding: 12px; border-radius: 12px; border: 1px solid #e2e8f0;">
                </div>
                <button onclick="Home.saveSettings()" style="width: 100%; background: #111827; color: white; border: none; padding: 14px; border-radius: 100px; font-weight: 700; cursor: pointer; margin-bottom: 12px;">Save Changes</button>
                <button onclick="Home.logout()" style="width: 100%; background: #fee2e2; color: #ef4444; border: none; padding: 14px; border-radius: 100px; font-weight: 700; cursor: pointer;">Sign Out</button>
            </div>
        `);
    },

    saveSettings() {
        const name = document.getElementById('settingsName').value;
        const email = document.getElementById('settingsEmail').value;
        localStorage.setItem('thoughts_user_name', name);
        localStorage.setItem('thoughts_user_email', email);

        // Update Sidebar UI
        document.querySelector('.user-name').innerText = name;
        document.querySelector('.user-email').innerText = email;
        document.querySelector('.user-card img').src = `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=FF5C39&color=fff`;

        alert('Settings saved!');
    },

    logout() {
        if (confirm('Are you sure you want to sign out?')) {
            localStorage.removeItem('thoughts_user_name');
            localStorage.removeItem('thoughts_user_email');
            window.location.href = 'index.html';
        }
    },

    renderFeedbackView() {
        this.renderSimpleMessageView('Send Feedback', 'We value your thoughts on our platform.', '💬', `
            <div style="text-align: left; max-width: 500px; margin: 40px auto; background: white; padding: 32px; border-radius: 24px; border: 1px solid #f1f5f9;">
                <p style="margin-bottom: 24px; color: #64748b;">Help us improve by sharing your experience or reporting issues.</p>
                <textarea placeholder="Type your feedback here..." style="width: 100%; height: 150px; padding: 16px; border-radius: 16px; border: 1px solid #e2e8f0; font-family: inherit; margin-bottom: 20px;"></textarea>
                <button onclick="alert('Thank you for your feedback!')" style="width: 100%; background: #FF5C39; color: white; border: none; padding: 14px; border-radius: 100px; font-weight: 700; cursor: pointer;">Submit Feedback</button>
            </div>
        `);
    },

    renderListView(title, articles, emptyMsg, emoji) {
        const container = document.getElementById('listSection');
        const featured = document.getElementById('featuredGrid');
        if (featured) featured.innerHTML = '';

        if (container) {
            if (articles.length === 0) {
                container.innerHTML = `
                    <div style="padding: 100px 0; text-align: center; color: #64748b; background: #f8fafc; border-radius: 24px;">
                        <div style="font-size: 3rem; margin-bottom: 20px;">${emoji}</div>
                        <h2 style="font-size: 1.5rem; margin-bottom: 8px;">${title} is Empty</h2>
                        <p>${emptyMsg}</p>
                    </div>
                `;
            } else {
                container.innerHTML = `
                    <h2 style="font-size: 2rem; margin-bottom: 32px;">${title}</h2>
                    <div id="listSubSection"></div>
                `;
                this.renderList(articles, 'listSubSection');
            }
        }
    },

    renderSimpleMessageView(title, subtitle, emoji, extraHtml = '') {
        const container = document.getElementById('listSection');
        const featured = document.getElementById('featuredGrid');
        if (featured) featured.innerHTML = '';

        if (container) {
            container.innerHTML = `
                <div style="padding: 60px 0; text-align: center; color: #64748b;">
                    <div style="font-size: 4rem; margin-bottom: 24px;">${emoji}</div>
                    <h2 style="font-size: 2.5rem; color: #111827; margin-bottom: 12px;">${title}</h2>
                    <p style="font-size: 1.125rem;">${subtitle}</p>
                    ${extraHtml}
                    <button onclick="location.reload()" style="margin-top: 32px; background: #f3f4f6; color: #111827; border: none; padding: 12px 32px; border-radius: 100px; font-weight: 700; cursor: pointer;">Return Home</button>
                </div>
            `;
        }
    },

    renderAudioView() {
        this.renderSimpleMessageView('Audio Books & Podcasts', 'Listen to your favorite stories on the go.', '🎧', `
            <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 20px; text-align: left; margin-top: 40px;">
                ${[1, 2, 3].map(i => `
                    <div style="background: white; border-radius: 20px; padding: 20px; border: 1px solid #f1f5f9; display: flex; gap: 16px; align-items: center;">
                        <div style="width: 60px; height: 60px; background: #FF5C39; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 1.5rem; color: white;">▶️</div>
                        <div>
                            <div style="font-weight: 700; font-size: 1rem;">Audio Story #${i}</div>
                            <div style="font-size: 0.8125rem; color: #64748b;">45 mins • Editorial</div>
                        </div>
                    </div>
                `).join('')}
            </div>
        `);
    },

    renderPublishView() {
        const categories = [...new Set(STATIC_ARTICLES.map(a => a.category))];
        this.renderSimpleMessageView('Tell Your Story', 'Publish your article and share it with the world.', '✍️', `
            <div id="publishForm" style="text-align: left; max-width: 700px; margin: 40px auto; background: white; padding: 32px; border-radius: 24px; border: 1px solid #f1f5f9;">
                <div style="margin-bottom: 24px;">
                    <label style="display: block; font-weight: 700; margin-bottom: 8px;">Article Title</label>
                    <input type="text" id="pubTitle" placeholder="Enter a catchy title..." style="width: 100%; padding: 12px; border-radius: 12px; border: 1px solid #e2e8f0; font-size: 1.125rem;">
                </div>
                <div style="margin-bottom: 24px; display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
                    <div>
                        <label style="display: block; font-weight: 700; margin-bottom: 8px;">Category</label>
                        <select id="pubCat" style="width: 100%; padding: 12px; border-radius: 12px; border: 1px solid #e2e8f0; font-family: inherit;">
                            ${categories.map(c => `<option value="${c}">${c}</option>`).join('')}
                        </select>
                    </div>
                    <div>
                        <label style="display: block; font-weight: 700; margin-bottom: 8px;">Cover Image URL</label>
                        <input type="text" id="pubImage" placeholder="https://..." style="width: 100%; padding: 12px; border-radius: 12px; border: 1px solid #e2e8f0;">
                    </div>
                </div>
                <div style="margin-bottom: 24px;">
                    <label style="display: block; font-weight: 700; margin-bottom: 8px;">Content</label>
                    <textarea id="pubContent" placeholder="Write your story here..." style="width: 100%; height: 300px; padding: 16px; border-radius: 16px; border: 1px solid #e2e8f0; font-family: inherit; line-height: 1.6;"></textarea>
                </div>
                <button onclick="Home.publishArticle()" style="width: 100%; background: #FF5C39; color: white; border: none; padding: 18px; border-radius: 100px; font-weight: 700; font-size: 1.125rem; cursor: pointer; transition: transform 0.2s;">Publish Article</button>
            </div>
        `);
    },

    subscribe() {
        if (!localStorage.getItem('thoughts_user_name')) {
            window.location.href = 'login.html';
            return;
        }
        this.renderSubscribeView();
    },

    renderSubscribeView() {
        const username = localStorage.getItem('thoughts_user_name');

        this.renderSimpleMessageView('Upgrade to Premium', 'Experience Thoughts Platform without limits.', '💎', `
            <div style="max-width: 450px; margin: 40px auto; background: white; padding: 40px; border-radius: 32px; border: 1px solid #f1f5f9; box-shadow: 0 20px 40px -10px rgba(0,0,0,0.05); text-align: center;">
                <div style="font-size: 3rem; font-weight: 900; color: #111827; margin-bottom: 8px;">150 <span style="font-size: 1rem; color: #64748b; font-weight: 500;">ETB / month</span></div>
                <div style="color: #FF5C39; font-weight: 700; background: #fff1f2; display: inline-block; padding: 6px 16px; border-radius: 100px; margin-bottom: 32px; font-size: 0.875rem;">⚡️ Limited Time Offer</div>
                
                <ul style="text-align: left; list-style: none; padding: 0; margin-bottom: 32px; color: #475569; space-y: 12px;">
                    <li style="margin-bottom: 12px; display: flex; gap: 12px; align-items: center;">✅ <span>Ad-free reading experience</span></li>
                    <li style="margin-bottom: 12px; display: flex; gap: 12px; align-items: center;">✅ <span>Exclusive detailed articles & reports</span></li>
                    <li style="margin-bottom: 12px; display: flex; gap: 12px; align-items: center;">✅ <span>Support independent writers</span></li>
                    <li style="margin-bottom: 12px; display: flex; gap: 12px; align-items: center;">✅ <span>Early access to new features</span></li>
                </ul>

                <button onclick="alert('Redirecting to secure payment gateway...'); setTimeout(()=> { localStorage.setItem('thoughts_premium_${username}', 'true'); alert('Payment Successful! Welcome to Premium.'); location.reload(); }, 1500);" 
                        style="width: 100%; background: #000; color: white; border: none; padding: 18px; border-radius: 16px; font-weight: 700; font-size: 1.125rem; cursor: pointer; transition: transform 0.2s; display: flex; align-items: center; justify-content: center; gap: 10px;">
                    <span>Pay with Chapa</span>
                    <span style="font-size: 1.2rem;">💳</span>
                </button>
                <div style="margin-top: 16px; font-size: 0.75rem; color: #94a3b8;">Secured by Chapa Payment Gateway</div>
            </div>
        `);
    },

    publishArticle() {
        const title = document.getElementById('pubTitle').value;
        const category = document.getElementById('pubCat').value;
        const image = document.getElementById('pubImage').value || `https://picsum.photos/seed/${Date.now()}/900/700`;
        const content = document.getElementById('pubContent').value;
        const author = localStorage.getItem('thoughts_user_name') || 'Guest Author';

        if (!title || !content) {
            alert('Please provide a title and content.');
            return;
        }

        const newArticle = {
            id: 'user-' + Date.now(),
            title,
            author,
            category,
            excerpt: content.substring(0, 120) + '...',
            fullContent: content,
            date: new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }),
            readTime: Math.ceil(content.split(' ').length / 200) + ' min read',
            isTrending: false,
            image
        };

        const userArticles = JSON.parse(localStorage.getItem('thoughts_user_articles') || '[]');
        userArticles.unshift(newArticle);
        localStorage.setItem('thoughts_user_articles', JSON.stringify(userArticles));

        // Refresh global state
        refreshArticles();

        this.renderSimpleMessageView('Success!', 'Your story has been published to the world.', '🎉', `
            <p style="margin-top: 20px;">It will appear on the homepage instantly.</p>
        `);
    },

    openArticle(id) {
        if (!localStorage.getItem('thoughts_user_name')) {
            window.location.href = 'login.html';
            return;
        }
        window.location.href = `article.html?id=${id}`;
    },

    renderAuthorProfileView(authorName) {
        const authorArticles = ARTICLES.filter(a => a.author === authorName);
        const container = document.getElementById('listSection');
        const featured = document.getElementById('featuredGrid');
        if (featured) featured.innerHTML = '';

        if (container) {
            container.innerHTML = `
                <div style="display: flex; align-items: center; gap: 24px; margin-bottom: 48px; background: white; padding: 40px; border-radius: 32px; border: 1px solid #f1f5f9;">
                    <img src="https://ui-avatars.com/api/?name=${encodeURIComponent(authorName)}&background=random&size=128" style="width: 120px; height: 120px; border-radius: 60px;">
                    <div>
                        <h2 style="font-size: 2.5rem; margin-bottom: 8px;">${authorName}</h2>
                        <p style="color: #64748b; font-size: 1.125rem;">Editorial Writer • ${authorArticles.length} Stories</p>
                        <button onclick="Follows.toggle('${authorName}'); Home.renderAuthorProfileView('${authorName}');" 
                                style="margin-top: 16px; padding: 10px 24px; border-radius: 100px; border: none; background: #111827; color: white; cursor: pointer; font-weight: 700;">
                            ${Follows.isFollowing(authorName) ? 'Following' : 'Follow'}
                        </button>
                    </div>
                </div>
                <h3 style="font-size: 1.5rem; margin-bottom: 24px;">Articles by ${authorName}</h3>
                <div id="authorList"></div>
            `;
            this.renderList(authorArticles, 'authorList');

            // Allow deletion if it's the current user OR if Author is "Guest Author" and we are "Guest" (aka not logged in but have data)
            // Actually, best heuristic: if article ID starts with 'user-', allow valid user to delete.
            const currentUser = localStorage.getItem('thoughts_user_name');

            // Allow deletion if:
            // 1. Author Name matches Current User
            // 2. Author is "Guest Author" AND (we are anonymous OR currentUser is "Guest Author" - rare)
            // 3. Just brute force: if it's a locally created article (id starts with 'user-'), show delete button.
            //    This is the requested feature: "if unsigned or not logged in... shouldn't there be a way to delete"

            const isLocalArticle = (art) => art.id.startsWith('user-');

            document.querySelectorAll('#authorList .list-article').forEach((el, i) => {
                const article = authorArticles[i];
                if (isLocalArticle(article)) {
                    // Improved check: only show if we own it or we are in a 'dev' / 'guest' mode that allows cleanup
                    // User request: "unsigned or not logged in... method to delete" implies generic local delete.

                    const btn = document.createElement('button');
                    btn.innerHTML = 'Delete Story';
                    btn.style = 'position: absolute; right: 20px; bottom: 20px; background: #fee2e2; color: #ef4444; border: none; padding: 8px 16px; border-radius: 100px; font-weight: 700; cursor: pointer; z-index: 10;';
                    btn.onclick = (e) => {
                        e.stopPropagation();
                        if (confirm('Delete this story permanently?')) {
                            Home.deleteUserArticle(article.id);
                            // Refresh view or redirect if empty
                            Home.renderAuthorProfileView(authorName);
                        }
                    };
                    el.style.position = 'relative';
                    el.appendChild(btn);
                }
            });
        }
    },

    deleteUserArticle(id) {
        let userArticles = JSON.parse(localStorage.getItem('thoughts_user_articles') || '[]');
        userArticles = userArticles.filter(a => a.id !== id);
        localStorage.setItem('thoughts_user_articles', JSON.stringify(userArticles));
        refreshArticles();
    },

    renderSidebars(articles) {
        const curated = document.getElementById('curatedSection');
        if (curated) {
            curated.innerHTML = articles.slice(10, 13).map(article => `
                <div class="curated-item" onclick="location.href='article.html?id=${article.id}'">
                    <div class="curated-text">
                        <div class="curated-meta">${article.category}</div>
                        <h4>${article.title}</h4>
                        <div class="curated-footer">📅 ${article.date} • ⏱️ ${article.readTime}</div>
                    </div>
                    <img src="${article.image}">
                </div>
            `).join('');
        }

        const follows = document.getElementById('followsSection');
        if (follows) {
            const authors = [...new Set(articles.map(a => a.author))].slice(0, 3);
            follows.innerHTML = authors.map(author => {
                const isFollowing = Follows.isFollowing(author);
                return `
                    <div class="follow-item" data-author="${author}">
                        <img src="https://ui-avatars.com/api/?name=${encodeURIComponent(author)}" class="follow-avatar">
                        <div class="follow-name">${author}</div>
                        <button class="btn-follow ${isFollowing ? 'active' : ''}" 
                                style="${isFollowing ? 'background: #111827; color: #fff;' : ''}"
                                onclick="Follows.toggle('${author}', event)">
                            ${isFollowing ? 'Following' : 'Follow +'}
                        </button>
                    </div>
                `;
            }).join('');
        }
    },
    loadUserInfo() {
        const name = localStorage.getItem('thoughts_user_name');
        const email = localStorage.getItem('thoughts_user_email');
        const nameEl = document.querySelector('.user-name');
        const emailEl = document.querySelector('.user-email');
        const imgEl = document.querySelector('.user-card img');
        const userCard = document.querySelector('.user-card');

        if (nameEl) nameEl.innerText = name || 'Guest';
        if (emailEl) emailEl.innerText = email || 'Sign in to read';
        if (imgEl) {
            if (name) {
                imgEl.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=FF5C39&color=fff`;
            } else {
                imgEl.src = 'https://ui-avatars.com/api/?name=Guest&background=e2e8f0&color=64748b';
            }
        }

        if (userCard) {
            userCard.style.position = 'relative';
            const existingDd = userCard.querySelector('.profile-dropdown');
            if (existingDd) existingDd.remove();

            const dd = document.createElement('div');
            dd.className = 'profile-dropdown';
            dd.style.cssText = `display: none; position: absolute; top: 100%; left: 0; width: 100%; background: white; border: 1px solid #f1f5f9; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.05); padding: 8px; z-index: 100; margin-top: 8px;`;

            if (name) {
                dd.innerHTML = `
                    <div onclick="Home.renderSettingsView();" style="padding: 10px; border-radius: 8px; cursor: pointer; font-weight: 600; font-size: 0.875rem; color: #1e293b;">Settings</div>
                    <div onclick="Home.logout()" style="padding: 10px; border-radius: 8px; cursor: pointer; font-weight: 600; font-size: 0.875rem; color: #ef4444;">Sign Out</div>
                `;
            } else {
                dd.innerHTML = `
                     <div onclick="window.location.href='login.html'" style="padding: 10px; border-radius: 8px; cursor: pointer; font-weight: 600; font-size: 0.875rem; color: #FF5C39;">Login / Join</div>
                `;
            }

            userCard.appendChild(dd);

            const items = dd.querySelectorAll('div');
            items.forEach(i => {
                i.onmouseover = () => i.style.background = '#f8fafc';
                i.onmouseout = () => i.style.background = 'transparent';
            });

            userCard.onclick = (e) => {
                e.stopPropagation();
                const isHidden = dd.style.display === 'none';
                dd.style.display = isHidden ? 'block' : 'none';
            };

            document.addEventListener('click', () => { dd.style.display = 'none'; });
        }
    },

    checkPremiumStatus() {
        const username = localStorage.getItem('thoughts_user_name');
        // Only check if logged in
        if (!username) return;

        const isPremium = localStorage.getItem(`thoughts_premium_${username}`) === 'true';
        const banner = document.querySelector('.premium-banner');
        if (isPremium && banner) {
            banner.style.display = 'none';
        }
    }
};

document.addEventListener('DOMContentLoaded', () => Home.init());


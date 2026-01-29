/**
 * Thoughts Platform - Zen Editor
 * Handles the beautiful writing and publishing experience.
 */

const Editor = {
    state: {
        coverImage: null,
        articleContent: ''
    },

    initStandalone() {
        if (!localStorage.getItem('thoughts_user_name')) {
            window.location.href = 'login.html';
            return;
        }
        this.render(document.getElementById('editorRoot'));
    },

    render(targetElement) {
        const container = targetElement || document.getElementById('listSection');
        if (!container && !targetElement) return;

        // If not standalone, apply zen mode to body
        if (!targetElement) document.body.classList.add('zen-mode');

        const categories = STATIC_ARTICLES ? [...new Set(STATIC_ARTICLES.map(a => a.category))] : [];

        container.innerHTML = `
            <div class="zen-editor-container" style="max-width: 800px; margin: 0 auto; animation: fadeIn 0.5s ease;">
                
                <!-- Top Actions -->
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 40px;">
                    <button onclick="Editor.close()" style="background: none; border: none; font-size: 1.5rem; cursor: pointer; color: #64748b;">✕</button>
                    <div style="display: flex; gap: 12px;">
                        <label class="btn-secondary" style="cursor: pointer; padding: 10px 20px; border-radius: 100px; border: 1px solid #e2e8f0; background: white; font-weight: 600; font-size: 0.875rem;">
                            📥 Import File
                            <input type="file" id="articleUpload" accept=".txt,.md,.doc,.docx,.pdf" style="display: none;" onchange="Editor.handleArticleUpload(event)">
                        </label>
                        <button onclick="Editor.publish()" class="btn-publish" style="background: #111827; color: white; border: none; padding: 10px 32px; border-radius: 100px; font-weight: 700; cursor: pointer;">Publish Story</button>
                    </div>
                </div>

                <!-- Cover Image Area -->
                <div id="coverDropzone" class="cover-dropzone" style="width: 100%; height: 350px; background: #f8fafc; border-radius: 24px; border: 2px dashed #e2e8f0; display: flex; flex-direction: column; align-items: center; justify-content: center; overflow: hidden; position: relative; transition: all 0.3s;">
                    <div id="dropzoneContent" style="text-align: center; color: #94a3b8;">
                        <div style="font-size: 3rem; margin-bottom: 12px;">🖼️</div>
                        <p style="font-weight: 600; margin-bottom: 12px;">Set your cover image</p>
                        <div style="display: flex; gap: 8px; justify-content: center;">
                            <label style="color: #FF5C39; cursor: pointer; text-decoration: underline;">
                                Upload File
                                <input type="file" id="imageUpload" accept="image/*" style="display: none;" onchange="Editor.handleImageUpload(event)">
                            </label>
                            <span>or</span>
                            <span onclick="Editor.promptImageUrl()" style="color: #FF5C39; cursor: pointer; text-decoration: underline;">Paste URL</span>
                        </div>
                    </div>
                </div>

                <!-- Metadata Row -->
                <div style="margin-top: 40px; display: flex; gap: 24px; align-items: center;">
                    <select id="editorCat" style="background: #f1f5f9; border: none; padding: 8px 16px; border-radius: 100px; font-family: inherit; font-weight: 700; font-size: 0.875rem; color: #475569; cursor: pointer;">
                        ${categories.map(c => `<option value="${c}">${c}</option>`).join('')}
                    </select>
                    <span style="color: #94a3b8; font-size: 0.8125rem;">Drafting as <b>${localStorage.getItem('thoughts_user_name') || 'Guest Author'}</b></span>
                </div>

                <!-- Editor Inputs -->
                <input type="text" id="editorTitle" placeholder="Title of your story..." 
                       style="width: 100%; border: none; background: transparent; font-size: 3.5rem; font-weight: 900; margin-top: 24px; outline: none; font-family: 'Outfit', sans-serif; letter-spacing: -0.02em;">
                
                <textarea id="editorContent" placeholder="Tell your story..." 
                          style="width: 100%; min-height: 500px; border: none; background: transparent; font-size: 1.25rem; line-height: 1.8; margin-top: 32px; outline: none; font-family: inherit; resize: none;"></textarea>
            </div>
        `;

        // Auto-expand title
        const titleInput = document.getElementById('editorTitle');
        titleInput.focus();
    },

    close() {
        if (window.history.length > 1) {
            window.history.back();
        } else {
            window.location.href = 'index.html';
        }
    },

    promptImageUrl() {
        const url = prompt('Enter image URL:');
        if (url) {
            this.setCoverImage(url);
        }
    },

    handleImageUpload(event) {
        const file = event.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                this.setCoverImage(e.target.result);
            };
            reader.readAsDataURL(file);
        }
    },

    setCoverImage(src) {
        this.state.coverImage = src;
        const dz = document.getElementById('coverDropzone');
        dz.style.border = 'none';
        dz.innerHTML = `
            <img src="${src}" style="width: 100%; height: 100%; object-fit: cover;">
            <div style="position: absolute; bottom: 20px; right: 20px; display: flex; gap: 8px;">
                 <button onclick="Editor.promptImageUrl()" style="padding: 8px 16px; border-radius: 100px; background: rgba(0,0,0,0.6); color: white; border: none; cursor: pointer;">Change URL</button>
                 <label style="padding: 8px 16px; border-radius: 100px; background: rgba(0,0,0,0.6); color: white; border: none; cursor: pointer;">
                    Upload New
                    <input type="file" accept="image/*" style="display: none;" onchange="Editor.handleImageUpload(event)">
                 </label>
            </div>
        `;
    },

    handleArticleUpload(event) {
        const file = event.target.files[0];
        if (!file) return;

        const name = file.name.toLowerCase();

        if (name.endsWith('.doc') || name.endsWith('.docx') || name.endsWith('.pdf')) {
            alert('Note: Automatic text extraction for ' + name.split('.').pop().toUpperCase() + ' files requires server-side processing or heavy libraries.\n\nPlease copy-paste the content or upload a .txt/.md file for now.');
            // Allow them to set the title at least
            document.getElementById('editorTitle').value = file.name.replace(/\.[^/.]+$/, "");
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            document.getElementById('editorContent').value = e.target.result;
            // Try to extract title if it looks like markdown
            const lines = e.target.result.split('\n');
            if (lines[0].startsWith('# ')) {
                document.getElementById('editorTitle').value = lines[0].replace('# ', '');
                document.getElementById('editorContent').value = lines.slice(1).join('\n').trim();
            } else {
                if (!document.getElementById('editorTitle').value) {
                    document.getElementById('editorTitle').value = file.name.replace(/\.[^/.]+$/, "");
                }
            }
        };
        reader.readAsText(file);
    },

    publish() {
        const title = document.getElementById('editorTitle').value;
        const category = document.getElementById('editorCat').value;
        const content = document.getElementById('editorContent').value;
        const image = this.state.coverImage || `https://picsum.photos/seed/${Date.now()}/900/700`;
        const author = localStorage.getItem('thoughts_user_name') || 'Guest Author';

        if (!title || !content) {
            alert('A story needs at least a title and some words!');
            return;
        }

        const newArticle = {
            id: 'user-' + Date.now(),
            title,
            author,
            category,
            excerpt: content.substring(0, 150) + '...',
            fullContent: content,
            date: new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }),
            readTime: Math.ceil(content.split(' ').length / 200) + ' min read',
            isTrending: false,
            image
        };

        const userArticles = JSON.parse(localStorage.getItem('thoughts_user_articles') || '[]');
        userArticles.unshift(newArticle);
        localStorage.setItem('thoughts_user_articles', JSON.stringify(userArticles));

        if (typeof refreshArticles === 'function') refreshArticles();

        // Return home and success
        // Redirect to home
        window.location.href = 'index.html';
    }
};

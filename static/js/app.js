document.addEventListener('DOMContentLoaded', () => {
    // State
    let notes = [];
    let filteredNotes = [];
    let currentFilter = 'all';
    let searchQuery = '';
    
    // DOM Elements
    const notesFeed = document.getElementById('notes-feed');
    const refreshBtn = document.getElementById('refresh-btn');
    const refreshSpinner = document.getElementById('refresh-spinner');
    const searchInput = document.getElementById('search-input');
    const filterTabs = document.getElementById('filter-tabs');
    const resultsMeta = document.getElementById('results-meta');
    
    // Modal DOM Elements
    const tweetModal = document.getElementById('tweet-modal');
    const tweetTextarea = document.getElementById('tweet-textarea');
    const charCounter = document.getElementById('char-counter');
    const closeModalBtn = document.getElementById('close-modal-btn');
    const cancelTweetBtn = document.getElementById('cancel-tweet-btn');
    const submitTweetBtn = document.getElementById('submit-tweet-btn');

    // Fetch Release Notes
    async function fetchNotes() {
        showLoadingState();
        try {
            const response = await fetch('/api/notes');
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            const data = await response.json();
            
            if (data.error) {
                showErrorState(data.error);
                return;
            }
            
            notes = data.notes || [];
            applyFilters();
        } catch (error) {
            console.error('Error fetching notes:', error);
            showErrorState('Failed to fetch release notes. Please check if the server is running and try again.');
        } finally {
            hideLoadingState();
        }
    }

    // Skeleton loader HTML
    function showLoadingState() {
        refreshSpinner.classList.add('spinner-active');
        refreshBtn.disabled = true;
        resultsMeta.textContent = 'Fetching latest updates...';
        notesFeed.innerHTML = `
            <div class="skeletons">
                <div class="skeleton-card"></div>
                <div class="skeleton-card"></div>
                <div class="skeleton-card"></div>
            </div>
        `;
    }

    function hideLoadingState() {
        refreshSpinner.classList.remove('spinner-active');
        refreshBtn.disabled = false;
    }

    // Error UI State
    function showErrorState(message) {
        notesFeed.innerHTML = `
            <div class="empty-state" style="border-color: var(--color-issue);">
                <div class="empty-icon" style="color: var(--color-issue);">
                    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="width: 48px; height: 48px;">
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" fill="currentColor"/>
                    </svg>
                </div>
                <h3>Parsing/Connection Error</h3>
                <p>${escapeHtml(message)}</p>
                <button class="btn btn-secondary" style="margin-top: 1rem;" onclick="location.reload()">Try Again</button>
            </div>
        `;
        resultsMeta.textContent = 'Error loading feed.';
    }

    // Render cards to the UI
    function renderNotes() {
        if (filteredNotes.length === 0) {
            renderEmptyState();
            resultsMeta.textContent = 'No matching updates found';
            return;
        }

        resultsMeta.textContent = `Showing ${filteredNotes.length} of ${notes.length} updates`;
        
        notesFeed.innerHTML = filteredNotes.map(note => {
            const badgeClass = getBadgeClass(note.type);
            return `
                <article class="note-card" data-id="${note.id}">
                    <div class="card-header">
                        <div class="card-meta">
                            <span class="card-date">${escapeHtml(note.date)}</span>
                            <span class="card-badge ${badgeClass}">${escapeHtml(note.type)}</span>
                        </div>
                        ${note.link ? `
                            <a href="${escapeHtml(note.link)}" target="_blank" rel="noopener noreferrer" class="card-source-link" title="Open official release notes">
                                <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M19 19H5V5h7V3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2v-7h-2v7zM14 3v2h3.59l-9.83 9.83 1.41 1.41L19 6.41V10h2V3h-7z" fill="currentColor"/>
                                </svg>
                            </a>
                        ` : ''}
                    </div>
                    <div class="card-content">
                        ${note.description}
                    </div>
                    <div class="card-actions">
                        <button class="btn btn-tweet share-tweet-btn" data-id="${note.id}">
                            <svg class="x-logo-svg" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                            </svg>
                            <span>Share on X</span>
                        </button>
                    </div>
                </article>
            `;
        }).join('');

        // Attach event listeners to newly rendered Tweet buttons
        document.querySelectorAll('.share-tweet-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const noteId = e.currentTarget.getAttribute('data-id');
                const note = notes.find(n => n.id === noteId);
                if (note) openTweetComposer(note);
            });
        });
    }

    // Empty state HTML
    function renderEmptyState() {
        notesFeed.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">
                    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" fill="currentColor"/>
                    </svg>
                </div>
                <h3>No updates found</h3>
                <p>Try refining your search query or choosing a different filter tab.</p>
            </div>
        `;
    }

    // Get badge styles based on release note type
    function getBadgeClass(type) {
        const t = type.toLowerCase();
        if (t.includes('feature')) return 'badge-feature';
        if (t.includes('announcement')) return 'badge-announcement';
        if (t.includes('issue')) return 'badge-issue';
        if (t.includes('deprecation')) return 'badge-deprecation';
        return 'badge-default';
    }

    // Helper to escape HTML characters
    function escapeHtml(str) {
        if (!str) return '';
        return str
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    // Apply Search & Filter tabs
    function applyFilters() {
        filteredNotes = notes.filter(note => {
            // Type Filter
            const typeMatch = currentFilter === 'all' || 
                note.type.toLowerCase().includes(currentFilter);
            
            // Search Query Filter
            const cleanDescription = stripHtml(note.description).toLowerCase();
            const cleanTitle = note.type.toLowerCase();
            const cleanDate = note.date.toLowerCase();
            const searchMatch = !searchQuery || 
                cleanDescription.includes(searchQuery) ||
                cleanTitle.includes(searchQuery) ||
                cleanDate.includes(searchQuery);
                
            return typeMatch && searchMatch;
        });
        
        renderNotes();
    }

    // Helper to strip HTML tags for search index
    function stripHtml(html) {
        const doc = new DOMParser().parseFromString(html, 'text/html');
        return doc.body.textContent || "";
    }

    // Filter Tab click event
    filterTabs.addEventListener('click', (e) => {
        const tab = e.target.closest('.filter-tab');
        if (!tab) return;
        
        // Toggle active classes
        document.querySelectorAll('.filter-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        
        currentFilter = tab.getAttribute('data-type');
        applyFilters();
    });

    // Search input event
    searchInput.addEventListener('input', (e) => {
        searchQuery = e.target.value.toLowerCase().trim();
        applyFilters();
    });

    // Refresh Button click event
    refreshBtn.addEventListener('click', fetchNotes);

    // ==========================================
    // Tweet Composer & X Integration
    // ==========================================
    
    function openTweetComposer(note) {
        const tweetText = generateTweetDraft(note);
        tweetTextarea.value = tweetText;
        updateCharCount();
        
        tweetModal.classList.add('active');
        document.body.style.overflow = 'hidden'; // prevent background scrolling
        tweetTextarea.focus();
    }

    function closeTweetComposer() {
        tweetModal.classList.remove('active');
        document.body.style.overflow = '';
    }

    function generateTweetDraft(note) {
        // Build a nice clean summary of the update
        const typeEmoji = getEmojiForType(note.type);
        const dateStr = note.date;
        const cleanContent = stripHtml(note.description)
            .replace(/\s+/g, ' ') // collapse whitespaces
            .trim();
        
        // Header template: "📢 BigQuery Feature (June 17, 2026): "
        const header = `${typeEmoji} BigQuery ${note.type} (${dateStr}): `;
        
        // Footer templates:
        // Note: Twitter counts any URL as 23 characters, but we'll print the link.
        const footerLink = note.link ? `\n\nRead more: ${note.link}` : '';
        const hashtags = `\n#BigQuery #GoogleCloud #GCP`;
        
        // Calculate max allowed length for the description snippet
        // Max 280 total
        // Header length + Hashtags length + (Url counts as 23)
        const headerLen = header.length;
        const footerUrlLen = note.link ? 13 + 23 : 0; // "\n\nRead more: " (13 chars) + 23 for URL
        const hashtagsLen = hashtags.length;
        
        const availableLen = 280 - headerLen - footerUrlLen - hashtagsLen;
        
        let snippet = cleanContent;
        if (snippet.length > availableLen) {
            snippet = snippet.substring(0, availableLen - 3) + '...';
        }
        
        return `${header}${snippet}${footerLink}${hashtags}`;
    }

    function getEmojiForType(type) {
        const t = type.toLowerCase();
        if (t.includes('feature')) return '🚀';
        if (t.includes('announcement')) return '📢';
        if (t.includes('issue')) return '⚠️';
        if (t.includes('deprecation')) return '🛑';
        return '💡';
    }

    // Function to calculate exact Twitter character count.
    // Handles URL shortening rule (any URL counted as 23 chars)
    function getTwitterCharCount(text) {
        // Regex to match URLs
        const urlRegex = /https?:\/\/[^\s]+/g;
        let count = text.length;
        let match;
        
        // Replace all URL lengths with 23
        while ((match = urlRegex.exec(text)) !== null) {
            const urlLength = match[0].length;
            count = count - urlLength + 23;
        }
        
        return count;
    }

    function updateCharCount() {
        const text = tweetTextarea.value;
        const count = getTwitterCharCount(text);
        const remaining = 280 - count;
        
        charCounter.textContent = remaining;
        
        // Remove style classes
        charCounter.classList.remove('warning', 'danger');
        submitTweetBtn.disabled = false;
        
        if (remaining < 0) {
            charCounter.classList.add('danger');
            submitTweetBtn.disabled = true;
        } else if (remaining <= 20) {
            charCounter.classList.add('warning');
        }
    }

    // Modal Events
    closeModalBtn.addEventListener('click', closeTweetComposer);
    cancelTweetBtn.addEventListener('click', closeTweetComposer);
    
    // Close modal on background click
    tweetModal.addEventListener('click', (e) => {
        if (e.target === tweetModal) {
            closeTweetComposer();
        }
    });

    // Close modal on Escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && tweetModal.classList.contains('active')) {
            closeTweetComposer();
        }
    });

    tweetTextarea.addEventListener('input', updateCharCount);

    submitTweetBtn.addEventListener('click', () => {
        const text = tweetTextarea.value.trim();
        if (getTwitterCharCount(text) <= 280) {
            const tweetUrl = `https://x.com/intent/tweet?text=${encodeURIComponent(text)}`;
            window.open(tweetUrl, '_blank', 'noopener,noreferrer');
            closeTweetComposer();
        }
    });

    // Init
    fetchNotes();
});

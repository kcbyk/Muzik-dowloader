/**
 * Búsqueda en YouTube y la lista de resultados.
 */

import { conEsqueleto } from '../ui/skeleton.js';
import { estadoVacio } from '../ui/empty-states.js';
import { html } from '../core/html.js';
import { apiBase } from '../config/env.js';
import { extractVideoId, formatDuration, isUrl } from '../core/utils.js';
import { downloadFromUrl, urlInput } from './download/download.js';
import { FavoritesModule } from './favorites/store.js';
import { stopPreview, togglePreview } from './preview.js';
import { i18n } from '../i18n/language-manager.js';
import { mensajeDelServidor } from './download/progress.js';
import { hideProgress, setLoading, showProgress, showStatus, updateProgress } from '../ui/status.js';

const searchResults = document.getElementById('searchResults');

const resultsList = document.getElementById('resultsList');

// Search Pagination
let currentSearchResults = [];

let currentSearchPage = 0;

const RESULTS_PER_PAGE = 5;

let searchController = null;
let searchSequence = 0;
let liveTimer = null;
let lastLiveRequest = 0;
let activeQuery = '';
let displayedQuery = '';
const resultCache = new Map();
let nextPageObserver = null;

function showSearchResults() {
    searchResults.classList.remove('hidden');
    document.getElementById('homeView')?.classList.add('showing-results');
}

export function hideSearchResults() {
    clearTimeout(liveTimer);
    const wasSearching = Boolean(searchController);
    searchController?.abort();
    searchController = null;
    searchSequence++;
    activeQuery = '';
    displayedQuery = '';
    if (wasSearching) { setLoading(false); hideProgress(); }
    nextPageObserver?.disconnect();
    searchResults.classList.add('hidden');
    document.getElementById('homeView')?.classList.remove('showing-results');
    resultsList.replaceChildren();
}

/** Wait for typing to settle and keep live requests below the API's limit. */
export function queueLiveSearch() {
    clearTimeout(liveTimer);
    const query = urlInput.value.trim();
    const home = document.getElementById('homeView');
    home?.classList.toggle('has-query', Boolean(query));
    home?.classList.toggle('has-link', Boolean(query) && isUrl(query));
    if (query.length < 3 || isUrl(query)) {
        hideSearchResults();
        return;
    }
    // Obsolete results must not overwrite or be mistaken for the new query.
    if (displayedQuery && displayedQuery !== query) {
        nextPageObserver?.disconnect();
        searchResults.classList.add('hidden');
        home?.classList.remove('showing-results');
        resultsList.replaceChildren();
        displayedQuery = '';
    }
    if (activeQuery && activeQuery !== query) {
        searchController?.abort();
        searchController = null;
        searchSequence++;
        activeQuery = '';
        setLoading(false);
        hideProgress();
    }
    const remaining = Math.max(0, 3200 - (Date.now() - lastLiveRequest));
    liveTimer = setTimeout(() => {
        lastLiveRequest = Date.now();
        searchAndShowResults(query);
    }, Math.max(900, remaining));
}

export async function searchAndShowResults(query) {
    clearTimeout(liveTimer);
    query = String(query || '').trim();
    if (!query || activeQuery === query) return;
    searchController?.abort();
    const controller = new AbortController();
    searchController = controller;
    activeQuery = query;
    const sequence = ++searchSequence;
    const cacheKey = query.toLocaleLowerCase();
    const cached = resultCache.get(cacheKey);
    if (cached) {
        displayedQuery = query;
        renderSearchResults(cached);
        searchController = null;
        activeQuery = '';
        return;
    }
    setLoading(true);
    showProgress();
    updateProgress(30, i18n.t('searching'));
    try {
        const response = await conEsqueleto(resultsList, 'resultado', 3, fetch(`${apiBase()}/api/search`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query }),
            signal: controller.signal,
        }), { alMostrar: () => {
            if (sequence !== searchSequence) return;
            resultsList.replaceChildren();
            showSearchResults();
        } });
        if (sequence !== searchSequence) return;
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(mensajeDelServidor(errorData, i18n.t('error_search')));
        }
        const { results } = await response.json();
        if (sequence !== searchSequence) return;
        if (resultCache.size >= 20) resultCache.delete(resultCache.keys().next().value);
        resultCache.set(cacheKey, results);
        hideProgress();
        displayedQuery = query;
        renderSearchResults(results);
    } catch (error) {
        if (controller.signal.aborted || sequence !== searchSequence) return;
        console.error('Search error:', error);
        hideProgress();
        showStatus(error.message || i18n.t('error_search'), 'error');
    } finally {
        if (sequence === searchSequence) {
            searchController = null;
            activeQuery = '';
            setLoading(false);
        }
    }
}

function renderSearchResults(results) {
    // Initialize new search
    nextPageObserver?.disconnect();
    currentSearchResults = results;
    currentSearchPage = 0;
    resultsList.innerHTML = '';

    if (!results?.length) {
        resultsList.replaceChildren(estadoVacio({
            ilustracion: 'busqueda', titulo: 'empty_search_t', texto: 'empty_search_d',
            accion: { clave: 'act_try_link', alPulsar: () => { urlInput.focus(); urlInput.select(); } },
        }));
        showSearchResults();
        return;
    }

    showNextPage();
    showSearchResults();
}

function showNextPage() {
    nextPageObserver?.disconnect();
    // Remove existing "Load More" button if present
    const existingBtn = document.getElementById('loadMoreContainer');
    if (existingBtn) existingBtn.remove();

    const start = currentSearchPage * RESULTS_PER_PAGE;
    const end = start + RESULTS_PER_PAGE;
    const pageItems = currentSearchResults.slice(start, end);

    pageItems.forEach(video => {
        const item = document.createElement('div');
        item.className = 'result-item';

        // Extract video ID from URL
        const videoId = extractVideoId(video.url);

        const isFav = FavoritesModule.isFavorite(videoId);
        const heartClass = isFav ? 'active' : '';
        const heartFill = isFav ? 'currentColor' : 'none';

        item.innerHTML = html`
            <button class="preview-btn" data-video-id="${videoId}" title="${i18n.t('t_preview')}" aria-label="${i18n.t('t_preview')}">
                <svg class="music-icon" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/>
                </svg>
                <svg class="pause-icon" viewBox="0 0 24 24" fill="currentColor">
                    <rect x="6" y="4" width="4" height="16"/>
                    <rect x="14" y="4" width="4" height="16"/>
                </svg>
            </button>
            <button class="favorite-btn ${heartClass}" data-id="${videoId}" title="${i18n.t(isFav ? 't_fav_remove' : 't_fav_add')}">
                <svg viewBox="0 0 24 24" stroke="currentColor" fill="${heartFill}">
                    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                </svg>
            </button>
            <button class="result-download-btn" type="button" title="${i18n.t('download_btn', { format: 'MP3' })}" aria-label="${i18n.t('download_btn', { format: 'MP3' })}">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v12m-4-4 4 4 4-4M5 18v2h14v-2"/></svg>
            </button>
            <img class="result-thumbnail" src="${video.thumbnail}" alt="" loading="lazy" decoding="async">
            <div class="result-info">
                <div class="result-title">${video.title}</div>
                <div class="result-meta">
                    <span class="result-channel">${video.channel}</span>
                </div>
            </div>
            ${video.duration ? html`<span class="result-duration">${formatDuration(video.duration)}</span>` : ''}
        `;

        // Preview click handler
        const previewBtn = item.querySelector('.preview-btn');
        previewBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            // Con sus datos: si YouTube no deja incrustarla, se baja a la caché (plan 24)
            togglePreview(videoId, previewBtn, { title: video.title, channel: video.channel, thumbnail: video.thumbnail, duration: video.duration });
        });

        // Favorite click handler
        const favBtn = item.querySelector('.favorite-btn');
        favBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            FavoritesModule.toggleFavorite(video, favBtn);
        });

        // Download click handler (on rest of the item)
        const thumbnail = item.querySelector('.result-thumbnail');
        const infoArea = item.querySelector('.result-info');

        const startDownload = () => {
            stopPreview();
            // Do NOT hide search results to allow multiple downloads
            // hideSearchResults();

            // Pass the item element for visual feedback (background mode)
            downloadFromUrl(video.url, video, { item, format: 'mp3' });
        };

        item.querySelector('.result-download-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            startDownload();
        });
        thumbnail.style.cursor = 'pointer';
        thumbnail.addEventListener('click', startDownload);
        infoArea.style.cursor = 'pointer';
        infoArea.addEventListener('click', startDownload);

        resultsList.appendChild(item);
    });

    currentSearchPage++;

    // Add Load More button if there are more results
    if (end < currentSearchResults.length) {
        const btnContainer = document.createElement('div');
        btnContainer.id = 'loadMoreContainer';
        btnContainer.className = 'load-more-container';
        btnContainer.innerHTML = html`<button class="load-more-btn">${i18n.t('yt_load_more', { n: currentSearchResults.length - end })}</button>`;

        btnContainer.querySelector('button').addEventListener('click', showNextPage);
        resultsList.appendChild(btnContainer);
        if (globalThis.IntersectionObserver) {
            nextPageObserver?.disconnect();
            nextPageObserver = new IntersectionObserver((entries) => {
                if (entries.some(entry => entry.isIntersecting)) {
                    nextPageObserver?.disconnect();
                    showNextPage();
                }
            }, { root: document.querySelector('.main-content'), rootMargin: '200px' });
            nextPageObserver.observe(btnContainer);
        }
    }
}

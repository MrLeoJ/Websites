
document.addEventListener('DOMContentLoaded', () => {
    // --- STATE ---
    const API_V3_KEY = '329f898e5642c90715fd2b4a81f0e2d6';
    const API_READ_ACCESS_TOKEN = 'eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiIzMjlmODk4ZTU2NDJjOTA3MTVmZDJiNGE4MWYwZTJkNiIsIm5iZiI6MTcyODkxNTY1OS42NTAyMTksInN1YiI6IjYzYTRkNWQ3MzM0NGM2MDA3ZGMwYzRlOSIsInNjb3BlcyI6WyJhcGlfcmVhZCJdLCJ2ZXJzaW9uIjoxfQ.7JRz28RfwmrRWR058vIiUztw_4L-FbBfL8BICq73-vc';
    const ACCOUNT_ID = '16613298';
    const API_BASE_URL = 'https://api.themoviedb.org/3';
    const UNAVAILABLE_IMAGE_URL = 'https://i.postimg.cc/3wmgc5fd/Image-Unavailable.png';
    const EXCLUDED_GENRE_NAMES = ['Reality', 'Talk', 'News', 'Soap'];
    
    let mediaType = 'movie';
    let currentPage = 1;
    let totalPages = 1;
    let searchTerm = '';
    let isLoading = false;
    let currentFetchAbortController = null;
    let modalHistory = [];

    // Search & Watchlist state
    let isActorSearchMode = false;
    let isWatchlistMode = false;
    let watchlistItems = [];
    let selectedSort = 'date_added_desc';

    // Filter states
    let selectedGenre = '';
    let selectedYear = '';
    let selectedCountry = '';
    let selectedLanguage = '';

    // --- DOM ELEMENTS ---
    const header = document.getElementById('app-header');
    const movieTypeBtn = document.getElementById('movie-type-btn');
    const tvTypeBtn = document.getElementById('tv-type-btn');
    const watchlistBtn = document.getElementById('watchlist-btn');
    const actorSearchToggle = document.getElementById('actor-search-toggle');
    const searchInput = document.getElementById('search-input');
    const mediaContainer = document.getElementById('media-container');
    const loader = document.getElementById('loader');
    const noResults = document.getElementById('no-results');
    const sentinel = document.getElementById('sentinel');
    const resetBtn = document.getElementById('reset-filters-btn');
    const modalContainer = document.getElementById('modal-container');
    const filtersBar = document.querySelector('.filters-bar');
    const backToTopBtn = document.getElementById('back-to-top-btn');
    const toast = document.getElementById('toast-notification');

    const sortByWrapper = document.getElementById('sort-by-wrapper');
    const genreFilterWrapper = document.getElementById('genre-filter-wrapper');
    const yearFilterWrapper = document.getElementById('year-filter-wrapper');
    const countryFilterWrapper = document.getElementById('country-filter-wrapper');
    const languageFilterWrapper = document.getElementById('language-filter-wrapper');
    
    const otherFilters = [
        genreFilterWrapper,
        yearFilterWrapper,
        countryFilterWrapper,
        languageFilterWrapper,
        resetBtn,
    ];

    // --- API SERVICE ---
    const fetchFromApi = async (endpoint, options = {}, useV4Auth = false) => {
        const separator = endpoint.includes('?') ? '&' : '?';
        const url = `${API_BASE_URL}/${endpoint}${useV4Auth ? '' : `${separator}api_key=${API_V3_KEY}`}`;
        
        const fetchOptions = {
            ...options,
            headers: useV4Auth ? {
                'Authorization': `Bearer ${API_READ_ACCESS_TOKEN}`,
                'Content-Type': 'application/json;charset=utf-8',
                ...options.headers,
            } : options.headers,
        };

        try {
            const response = await fetch(url, fetchOptions);
            if (!response.ok) {
                if (!isWatchlistMode) {
                    mediaContainer.innerHTML = `<div class="no-results-container" style="display: block;"><i class="fas fa-exclamation-triangle"></i><p>API Error</p><p>Could not fetch data. Please check the API key or network connection.</p></div>`;
                    loader.classList.add('hidden');
                }
                throw new Error(`API Error: ${response.status}`);
            }
            return response.json();
        } catch (error) {
            if (error.name !== 'AbortError') {
                 console.error(`Fetch error for endpoint "${endpoint}":`, error);
            }
            throw error;
        }
    };
    
    const getExcludedGenreIds = async (type) => {
        try {
            const data = await fetchFromApi(`genre/${type}/list?language=en`);
            const genres = data.genres || [];
            return genres.filter(g => EXCLUDED_GENRE_NAMES.includes(g.name)).map(g => g.id);
        } catch (error) {
            console.error("Could not fetch excluded genre IDs", error);
            return [];
        }
    }
    
    // --- CORE LOGIC ---
    const fetchAndDisplayMedia = async (page = 1, append = false) => {
        if (isLoading) {
            if (currentFetchAbortController) currentFetchAbortController.abort();
        }
        isLoading = true;
        currentFetchAbortController = new AbortController();

        if (page === 1) {
            mediaContainer.innerHTML = '';
            loader.classList.remove('hidden');
            noResults.classList.add('hidden');
        } else {
            loader.classList.remove('hidden');
        }

        try {
            let endpoint;
            const params = new URLSearchParams({
                page: String(page),
                'include_adult': 'false',
                'language': 'en-US',
            });
            
            if (searchTerm.length > 2) {
                params.append('query', searchTerm);
                endpoint = `search/${mediaType}?${params.toString()}`;

            } else {
                const excludedIds = await getExcludedGenreIds(mediaType);
                params.append('sort_by', 'popularity.desc');
                if (excludedIds.length > 0) params.append('without_genres', excludedIds.join(','));
                if (selectedGenre) params.append('with_genres', selectedGenre);
                if (selectedYear) params.append(mediaType === 'movie' ? 'primary_release_year' : 'first_air_date_year', selectedYear);
                if (selectedCountry) params.append('with_origin_country', selectedCountry);
                if (selectedLanguage) params.append('with_original_language', selectedLanguage);
                endpoint = `discover/${mediaType}?${params.toString()}`;
            }

            const data = await fetchFromApi(endpoint, { signal: currentFetchAbortController.signal });
            
            if (!append) mediaContainer.innerHTML = '';
            
            const results = data.results || [];
            results.forEach(item => {
                const card = createMediaCardElement(item);
                if(card) mediaContainer.appendChild(card);
            });

            if (page === 1) {
                totalPages = data.total_pages || 1;
                if(results.length === 0) noResults.classList.remove('hidden');
            }
            updateAllCardWatchlistIcons();
        } catch (error) {
            if (error.name !== 'AbortError') console.error("Failed to fetch media:", error);
        } finally {
            isLoading = false;
            loader.classList.add('hidden');
            currentFetchAbortController = null;
        }
    };
    
    const fetchAndDisplayActors = async () => {
        if (isLoading) {
            if (currentFetchAbortController) currentFetchAbortController.abort();
        }
        isLoading = true;
        currentFetchAbortController = new AbortController();

        mediaContainer.innerHTML = '';
        loader.classList.remove('hidden');
        noResults.classList.add('hidden');

        try {
            const personData = await fetchFromApi(`search/person?query=${encodeURIComponent(searchTerm)}&include_adult=false&language=en-US&page=1`, { signal: currentFetchAbortController.signal });
            const actingPersons = personData.results?.filter(p => p.known_for_department === 'Acting' && p.profile_path);
            
            if (actingPersons && actingPersons.length > 0) {
                actingPersons.sort((a, b) => b.popularity - a.popularity);
                actingPersons.forEach(person => {
                    const personCard = createPersonCardElement(person);
                    mediaContainer.appendChild(personCard);
                });
            } else {
                noResults.classList.remove('hidden');
            }
        } catch (error) {
            if (error.name !== 'AbortError') {
                console.error("Actor search failed", error);
                noResults.classList.remove('hidden');
            }
        } finally {
            isLoading = false;
            loader.classList.add('hidden');
            currentFetchAbortController = null;
        }
    };

    const createCustomSelect = (wrapper, placeholder, options, onSelect) => {
        wrapper.innerHTML = '';
        const selectContainer = document.createElement('div');
        selectContainer.className = 'custom-select';

        const input = document.createElement('input');
        input.type = 'text';
        input.className = 'custom-select-input';
        input.placeholder = placeholder;
        input.setAttribute('aria-label', placeholder);

        const arrow = document.createElement('i');
        arrow.className = 'fas fa-chevron-down custom-select-arrow';

        const optionsContainer = document.createElement('div');
        optionsContainer.className = 'custom-select-options';

        const allOption = document.createElement('div');
        allOption.className = 'custom-select-option';
        allOption.textContent = placeholder;
        allOption.dataset.value = '';
        allOption.onclick = () => handleSelect(allOption);
        optionsContainer.appendChild(allOption);

        options.forEach(opt => {
            const optionEl = document.createElement('div');
            optionEl.className = 'custom-select-option';
            optionEl.textContent = opt.name;
            optionEl.dataset.value = opt.value;
            optionEl.onclick = () => handleSelect(optionEl);
            optionsContainer.appendChild(optionEl);
        });

        const handleSelect = (optionEl) => {
            input.value = optionEl.dataset.value === '' ? '' : optionEl.textContent;
            if (input.value === '') input.placeholder = placeholder;
            onSelect(optionEl.dataset.value);
            optionsContainer.classList.remove('open');
        }
        
        input.addEventListener('input', () => {
            const filter = input.value.toLowerCase();
            optionsContainer.querySelectorAll('.custom-select-option').forEach(opt => {
                const text = opt.textContent.toLowerCase();
                opt.style.display = text.includes(filter) ? '' : 'none';
            });
        });

        input.addEventListener('focus', () => optionsContainer.classList.add('open'));
        selectContainer.addEventListener('click', (e) => e.stopPropagation());
        arrow.addEventListener('click', () => optionsContainer.classList.toggle('open'));

        selectContainer.append(input, arrow, optionsContainer);
        wrapper.appendChild(selectContainer);
        
        return {
            reset: () => {
                input.value = '';
                input.placeholder = placeholder;
            }
        };
    };

    let customSelects = {};

    const fetchFilterOptions = async () => {
        try {
            const [genresData, countriesData] = await Promise.all([
                fetchFromApi(`genre/movie/list?language=en`),
                fetchFromApi(`genre/tv/list?language=en`),
                fetchFromApi(`configuration/countries`),
            ]);

            const allGenres = [...(genresData.genres || []), ...(countriesData.genres || [])];
            const uniqueGenres = Array.from(new Map(allGenres.map(item => [item['id'], item])).values());
            
            const excludedLower = EXCLUDED_GENRE_NAMES.map(name => name.toLowerCase());
            const genreOptions = uniqueGenres
                .filter(g => !excludedLower.includes(g.name.toLowerCase()))
                .sort((a,b) => a.name.localeCompare(b.name))
                .map(g => ({ value: g.id, name: g.name }));

            const languageOptions = [
                { value: 'en', name: 'English' }, { value: 'pt', name: 'Portuguese' }, 
                { value: 'fr', name: 'French' }, { value: 'es', name: 'Spanish' }, { value: 'it', name: 'Italian' }
            ];

            const countryOptions = (await fetchFromApi(`configuration/countries`) || [])
                .sort((a,b) => a.english_name.localeCompare(b.english_name))
                .map(c => ({ value: c.iso_3166_1, name: c.english_name }));
            
            const yearOptions = [];
            const currentYear = new Date().getFullYear();
            for(let i=0; i<70; i++) yearOptions.push({value: currentYear-i, name: String(currentYear-i)});
            
            const handleFilterChange = () => isWatchlistMode ? displayWatchlist() : resetAndFetch();

            customSelects.genre = createCustomSelect(genreFilterWrapper, 'All Genres', genreOptions, (value) => { selectedGenre = value; handleFilterChange(); });
            customSelects.year = createCustomSelect(yearFilterWrapper, 'All Years', yearOptions, (value) => { selectedYear = value; handleFilterChange(); });
            customSelects.country = createCustomSelect(countryFilterWrapper, 'All Countries', countryOptions, (value) => { selectedCountry = value; handleFilterChange(); });
            customSelects.language = createCustomSelect(languageFilterWrapper, 'All Languages', languageOptions, (value) => { selectedLanguage = value; handleFilterChange(); });

        } catch (error) {
            console.error("Failed to fetch filter options:", error);
        }
    };

    const resetAndFetch = () => {
        currentPage = 1;
        totalPages = 1;
        fetchAndDisplayMedia(1, false);
    };
    
    // --- WATCHLIST LOGIC ---
    const fetchWatchlist = async () => {
        try {
            const fetchPage = async (type, page) => fetchFromApi(`account/${ACCOUNT_ID}/watchlist/${type}?page=${page}`, {}, true);
            
            const fetchAll = async (type) => {
                let allResults = [];
                let currentPage = 1;
                let totalPages = 1;
                const media_type_param = type === 'movies' ? 'movie' : 'tv';
                do {
                    const data = await fetchPage(type, currentPage);
                    allResults = allResults.concat(data.results);
                    totalPages = data.total_pages;
                    currentPage++;
                } while (currentPage <= totalPages);
                
                const detailedResults = await Promise.all(allResults.map(async (item) => {
                    try {
                        const details = await fetchFromApi(`${media_type_param}/${item.id}`);
                        return { ...item, ...details, media_type: media_type_param, date_added: new Date() };
                    } catch (e) {
                         console.error(`Failed to fetch details for ${media_type_param} ${item.id}`, e);
                         return null;
                    }
                }));

                return detailedResults.filter(item => item !== null);
            };

            const [movies, tvShows] = await Promise.all([fetchAll('movies'), fetchAll('tv')]);
            watchlistItems = [...movies, ...tvShows];
            updateAllCardWatchlistIcons();
        } catch (error) {
            console.error("Failed to fetch watchlist:", error);
            showToast("Could not load watchlist.");
        }
    };
    
    const displayWatchlist = () => {
        mediaContainer.innerHTML = '';
        noResults.classList.add('hidden');
        loader.classList.remove('hidden');

        let filtered = watchlistItems.filter(item => {
            const title = item.title || item.name || '';
            const releaseYear = (item.release_date || item.first_air_date || 'N/A').substring(0, 4);

            if (mediaType !== 'all' && item.media_type !== mediaType) return false;
            if (searchTerm.length > 2 && !title.toLowerCase().includes(searchTerm.toLowerCase())) return false;
            if (selectedGenre && !item.genres.some(g => g.id == selectedGenre)) return false;
            if (selectedYear && releaseYear !== selectedYear) return false;
            if (selectedCountry && !(item.production_countries?.some(c => c.iso_3166_1 === selectedCountry))) return false;
            if (selectedLanguage && item.original_language !== selectedLanguage) return false;
            return true;
        });

        filtered.sort((a, b) => {
            const titleA = (a.title || a.name || '').toLowerCase();
            const titleB = (b.title || b.name || '').toLowerCase();
            switch (selectedSort) {
                case 'date_added_desc': return new Date(b.date_added) - new Date(a.date_added);
                case 'date_added_asc': return new Date(a.date_added) - new Date(b.date_added);
                case 'popularity_desc': return b.popularity - a.popularity;
                case 'rating_desc': return b.vote_average - a.vote_average;
                case 'release_date_desc': return new Date(b.release_date || b.first_air_date) - new Date(a.release_date || a.first_air_date);
                case 'alphabetical_asc': return titleA.localeCompare(titleB);
                default: return 0;
            }
        });
        
        loader.classList.add('hidden');
        if (filtered.length === 0) {
            noResults.classList.remove('hidden');
        } else {
            filtered.forEach(item => {
                const card = createMediaCardElement(item);
                if(card) mediaContainer.appendChild(card);
            });
             updateAllCardWatchlistIcons();
        }
    };

    const updateAllCardWatchlistIcons = () => {
        const cards = document.querySelectorAll('.watchlist-btn');
        cards.forEach(btn => {
            const card = btn.closest('.media-card');
            if (card) {
                const id = card.dataset.id;
                const isInWatchlist = watchlistItems.some(item => item.id == id);
                btn.classList.toggle('in-watchlist', isInWatchlist);
                btn.title = isInWatchlist ? "Remove from Watchlist" : "Add to Watchlist";
            }
        });
    };

    const toggleWatchlistAction = async (id, type, button) => {
        const isInWatchlist = watchlistItems.some(item => item.id == id);
        const options = {
            method: 'POST',
            body: JSON.stringify({ media_type: type, media_id: id, watchlist: !isInWatchlist })
        };
        try {
            if (button) button.disabled = true;
            await fetchFromApi(`account/${ACCOUNT_ID}/watchlist`, options, true);
            showToast(isInWatchlist ? 'Removed from Watchlist' : 'Added to Watchlist');
            
            if (isInWatchlist) {
                watchlistItems = watchlistItems.filter(item => item.id != id);
                if (isWatchlistMode && button) {
                    button.closest('.media-card-wrapper')?.remove();
                    if (mediaContainer.children.length === 0) noResults.classList.remove('hidden');
                }
            } else {
                const itemDetails = await fetchFromApi(`${type}/${id}`);
                watchlistItems.push({ ...itemDetails, media_type: type, date_added: new Date() });
            }
            updateAllCardWatchlistIcons();
            
            // Also update the specific button that was clicked, as it might not be on a media card
            if (button) {
                const isNowInWatchlist = !isInWatchlist;
                button.classList.toggle('in-watchlist', isNowInWatchlist);
                button.title = isNowInWatchlist ? 'Remove from Watchlist' : 'Add to Watchlist';
            }
        } catch (error) {
            console.error("Failed to update watchlist:", error);
            showToast("Error updating watchlist.");
        } finally {
            if (button) button.disabled = false;
        }
    };

    // --- HTML TEMPLATES & HELPERS ---
    const formatRuntime = (minutes) => {
        if (!minutes || minutes === 0) return 'N/A';
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
    };

    const generateEpisodeOptions = (episodeCount) => {
        if (!episodeCount || episodeCount === 0) return '<option>N/A</option>';
        return Array.from({ length: episodeCount }, (_, i) => `<option value="${i + 1}">Ep ${i + 1}</option>`).join('');
    };

    const openPlayer = (id, type, controlsContainer) => {
        const isTV = type === 'tv';
        let src;

        if (isTV) {
            const season = controlsContainer.querySelector('.player-season-select')?.value || '1';
            const episode = controlsContainer.querySelector('.player-episode-select')?.value || '1';
            src = `https://vidsrc.xyz/embed/tv?tmdb=${id}&season=${season}&episode=${episode}`;
        } else {
            src = `https://vidsrc.xyz/embed/movie?tmdb=${id}`;
        }
        window.open(src, '_blank');
    };

    const createPersonCardElement = (person) => {
        const title = person.name;
        const posterUrl = person.profile_path ? `https://image.tmdb.org/t/p/w500${person.profile_path}` : UNAVAILABLE_IMAGE_URL;
        const escapedName = title.replace(/'/g, "\\'");

        const wrapper = document.createElement('div');
        wrapper.className = 'media-card-wrapper';

        const card = document.createElement('div');
        card.className = 'media-card';
        card.onclick = () => showFilmography(person.id, escapedName);

        card.innerHTML = `
            <img src="${posterUrl}" alt="Photo of ${title}" class="media-card-poster" loading="lazy"/>
            <div class="media-card-overlay person-card-overlay">
                <h3 class="person-card-name">${title}</h3>
            </div>
        `;
        wrapper.appendChild(card);
        return wrapper;
    };

    const createMediaCardElement = (media) => {
        const type = media.media_type || (media.first_air_date ? 'tv' : 'movie');
        const title = media.title || media.name || 'Unknown Title';
        const posterUrl = media.poster_path ? `https://image.tmdb.org/t/p/w500${media.poster_path}` : UNAVAILABLE_IMAGE_URL;
        const escapedTitle = title.replace(/'/g, "\\'");
    
        const wrapper = document.createElement('div');
        wrapper.className = 'media-card-wrapper';

        const card = document.createElement('div');
        card.className = 'media-card';
        card.dataset.id = media.id;
        card.dataset.type = type;
    
        const releaseYear = (media.release_date || media.first_air_date || 'N/A').substring(0, 4);
        const voteAverage = media.vote_average ? media.vote_average.toFixed(1) : '0.0';
    
        card.innerHTML = `
            <img src="${posterUrl}" alt="Poster for ${title}" class="media-card-poster" loading="lazy"/>
            <div class="media-card-overlay">
                <div class="media-card-meta">
                    <span>${releaseYear}</span>
                    <div class="media-card-rating">
                        <i class="fas fa-star"></i>
                        <span>${voteAverage}</span>
                    </div>
                </div>
                <div class="details-pane">
                    <div class="details-spinner"><div class="spinner-small"></div></div>
                    <div class="details-content hidden">
                       <div class="details-text-container">
                           <div class="country-text-container hidden"><strong><i class="fa-solid fa-earth-americas" aria-hidden="true"></i></strong>⠀<span class="country-text"></span></div>
                           <div class="language-text-container hidden"><strong><i class="fa-regular fa-message" aria-hidden="true"></i></strong>⠀<span class="language-text"></span></div>
                           <div class="genres-text-container hidden"><strong><i class="fa-solid fa-clapperboard" aria-hidden="true"></i></strong>⠀<span class="genres-text"></span></div>
                           <div class="runtime-text-container hidden"><strong><i class="fa-regular fa-clock" aria-hidden="true"></i></strong>⠀<span class="runtime-text"></span></div>
                       </div>
                       <div class="details-buttons">
                            <button class="details-btn watchlist-btn" title="Add to Watchlist"><i class="fas fa-bookmark"></i></button>
                            <button class="details-btn trailer-btn" title="Watch Trailer"><i class="fas fa-play"></i></button>
                            <button class="details-btn synopsis-btn" title="Read Synopsis"><i class="fas fa-info-circle"></i></button>
                            <button class="details-btn cast-btn" title="View Cast"><i class="fa-solid fa-user-group"></i></button>
                       </div>
                    </div>
                </div>
            </div>
        `;
        wrapper.appendChild(card);
    
        if (media.genres) { // Pre-populate hover pane for watchlist items
            const spinner = card.querySelector('.details-spinner');
            const content = card.querySelector('.details-content');
    
            const runtime = media.runtime || (media.episode_run_time ? media.episode_run_time[0] : null);
            if (runtime) {
                card.querySelector('.runtime-text').textContent = formatRuntime(runtime);
                card.querySelector('.runtime-text-container').classList.remove('hidden');
            }
            
            const country = media.production_countries?.[0]?.name;
            if(country) {
                let displayCountry = country;
                if (country === 'United States of America') displayCountry = 'USA';
                if (country === 'United Kingdom') displayCountry = 'UK';
                card.querySelector('.country-text').textContent = displayCountry;
                card.querySelector('.country-text-container').classList.remove('hidden');
            }
    
            const language = media.spoken_languages?.[0]?.english_name;
             if(language) {
                card.querySelector('.language-text').textContent = language;
                card.querySelector('.language-text-container').classList.remove('hidden');
            }
    
            const genres = media.genres?.map(g => g.name).join(', ');
            if (genres) {
                card.querySelector('.genres-text').textContent = genres;
                card.querySelector('.genres-text-container').classList.remove('hidden');
            }
            
            spinner.classList.add('hidden');
            content.classList.remove('hidden');
            card.dataset.detailsLoaded = 'true';
        } else {
            card.dataset.detailsLoaded = 'false';
        }

        // Add external player controls for watchlist items
        if (isWatchlistMode) {
            const playerControls = document.createElement('div');
            playerControls.className = 'watchlist-player-controls';

            if (type === 'tv' && media.seasons) {
                const validSeasons = media.seasons.filter(s => s.season_number > 0 && s.episode_count > 0);
                if (validSeasons.length > 0) {
                     playerControls.innerHTML = `
                        <select class="player-season-select">
                            ${validSeasons.map(s => `<option value="${s.season_number}">S ${s.season_number}</option>`).join('')}
                        </select>
                        <select class="player-episode-select">
                            ${generateEpisodeOptions(validSeasons[0].episode_count)}
                        </select>
                        <button class="details-btn player-play-btn" title="Play Episode"><i class="fas fa-play"></i></button>
                    `;
                    const seasonSelect = playerControls.querySelector('.player-season-select');
                    const episodeSelect = playerControls.querySelector('.player-episode-select');
                    
                    seasonSelect.addEventListener('change', () => {
                        const selectedSeasonData = validSeasons.find(s => s.season_number == seasonSelect.value);
                        if (selectedSeasonData) {
                            episodeSelect.innerHTML = generateEpisodeOptions(selectedSeasonData.episode_count);
                        }
                    });
                }
            } else if (type === 'movie') {
                 playerControls.innerHTML = `
                    <button class="details-btn player-play-btn movie" title="Play Movie">
                        <i class="fas fa-play"></i>
                    </button>
                `;
            }

            if (playerControls.hasChildNodes()) {
                const playBtn = playerControls.querySelector('.player-play-btn');
                if (playBtn) {
                    playBtn.addEventListener('click', (e) => {
                        e.stopPropagation();
                        openPlayer(media.id, type, playerControls);
                    });
                }
                wrapper.appendChild(playerControls);
            }
        }
    
        card.querySelector('.trailer-btn').onclick = (e) => { e.stopPropagation(); showTrailer(media.id, type); };
        card.querySelector('.synopsis-btn').onclick = (e) => { e.stopPropagation(); showSynopsis(media.id, type, escapedTitle); };
        card.querySelector('.cast-btn').onclick = (e) => { e.stopPropagation(); showCast(media.id, type); };
        card.querySelector('.watchlist-btn').onclick = (e) => { e.stopPropagation(); toggleWatchlistAction(media.id, type, e.currentTarget); };
        
        return wrapper;
    };
    
    // --- MODAL & EVENT HANDLERS ---
    const showToast = (message) => {
        toast.textContent = message;
        toast.classList.add('show');
        setTimeout(() => toast.classList.remove('show'), 3000);
    };

    const _setModalContent = (content, { isTrailer = false, isNavigable = false } = {}) => {
        const modalId = 'modal-backdrop';
        const modal = document.createElement('div');
        modal.id = modalId;
        modal.className = isTrailer ? 'modal-backdrop-trailer' : 'modal-backdrop';
        
        const contentWrapper = document.createElement('div');
        contentWrapper.className = isTrailer ? 'modal-content-trailer' : 'modal-content';
        
        const singleClickHandler = (e) => {
            if (e.target.id === modalId) {
                isNavigable ? goBackInModal() : closeModal();
            }
        };

        const dblClickHandler = (e) => {
            if (e.target.id === modalId) {
                closeModal();
            }
        };

        modal.onclick = singleClickHandler;
        modal.ondblclick = dblClickHandler;
        
        if (!isNavigable) {
            const closeBtn = document.createElement('button');
            closeBtn.className = isTrailer ? 'modal-close-btn-trailer' : 'modal-close-btn';
            closeBtn.innerHTML = '<i class="fas fa-times fa-lg"></i>';
            closeBtn.setAttribute('aria-label', 'Close modal');
            closeBtn.onclick = closeModal;
        }

        if (typeof content === 'string') {
            contentWrapper.innerHTML += content;
        } else {
            contentWrapper.appendChild(content);
        }

        modal.appendChild(contentWrapper);
        modalContainer.innerHTML = '';
        modalContainer.appendChild(modal);
        document.body.style.overflow = 'hidden';
    };

    window.closeModal = () => {
        modalContainer.innerHTML = '';
        document.body.style.overflow = 'auto';
        modalHistory = [];
    }
    
    const goBackInModal = () => {
        if (modalHistory.length <= 1) {
            closeModal();
            return;
        }
        modalHistory.pop(); // Pop current state
        const prevState = modalHistory[modalHistory.length - 1]; // Get previous state
        _setModalContent(prevState.content, prevState.options);
    };

    const createSpinnerHTML = () => `<div class="loader-container"><div class="spinner"></div></div>`;
    
    const handleCardHover = async (e) => {
        const card = e.target.closest('.media-card');
        if (!card || card.dataset.detailsLoaded === 'true' || isActorSearchMode) return;
    
        card.dataset.detailsLoaded = 'true'; 
    
        const id = card.dataset.id;
        const type = card.dataset.type;
        const spinner = card.querySelector('.details-spinner');
        const content = card.querySelector('.details-content');
    
        try {
            const details = await fetchFromApi(`${type}/${id}?language=en-US`);
    
            const runtime = details.runtime || (details.episode_run_time ? details.episode_run_time[0] : null);
            if (runtime) {
                card.querySelector('.runtime-text').textContent = formatRuntime(runtime);
                card.querySelector('.runtime-text-container').classList.remove('hidden');
            }
    
            const country = details.production_countries?.[0]?.name;
            if (country) {
                let displayCountry = country;
                if (country === 'United States of America') displayCountry = 'USA';
                if (country === 'United Kingdom') displayCountry = 'UK';
                card.querySelector('.country-text').textContent = displayCountry;
                card.querySelector('.country-text-container').classList.remove('hidden');
            }
    
            const language = details.spoken_languages?.[0]?.english_name;
            if (language) {
                card.querySelector('.language-text').textContent = language;
                card.querySelector('.language-text-container').classList.remove('hidden');
            }
    
            const genres = details.genres?.map(g => g.name).join(', ');
            if (genres) {
                card.querySelector('.genres-text').textContent = genres;
                card.querySelector('.genres-text-container').classList.remove('hidden');
            }
    
            spinner.classList.add('hidden');
            content.classList.remove('hidden');
        } catch (err) {
            console.error("Error fetching details on hover", err);
            if (spinner) {
                spinner.innerHTML = `<p class="details-error-text">Could not load details.</p>`;
            }
        }
    };
    
    window.showTrailer = async (id, type) => {
        let content;
        try {
            const videos = await fetchFromApi(`${type}/${id}/videos?language=en-US`);
            const trailer = videos.results.find(v => v.type === 'Trailer' && v.site === 'YouTube');
            
            if (trailer) {
                 content = `
                    <div class="trailer-wrapper">
                        <iframe class="trailer-iframe" src="https://www.youtube.com/embed/${trailer.key}?autoplay=1&mute=0&modestbranding=1&rel=0" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>
                    </div>
                `;
            } else {
                 content = `<div class="trailer-unavailable"><p>No trailer available</p></div>`;
            }
        } catch (error) {
            content = `<div class="trailer-unavailable"><p>Could not load trailer.</p></div>`;
        }
        const options = { isTrailer: true, isNavigable: modalHistory.length > 0 };
        _setModalContent(content, options);
        modalHistory.push({ content, options });
    };

    window.showSynopsis = async (id, type, title) => {
        let content;
        try {
            const details = await fetchFromApi(`${type}/${id}?language=en-US`);
            const overview = details.overview || "No synopsis available for this title.";
            content = `
                <h2 class="modal-title">${title}</h2>
                <p class="modal-body-text">${overview}</p>
            `;
        } catch (error) {
            content = `<h2 class="modal-title">${title}</h2><p class="modal-body-text">Could not load synopsis.</p>`;
        }
        const options = { isNavigable: modalHistory.length > 0 };
        _setModalContent(content, options);
        modalHistory.push({ content, options });
    }
    
    const calculateAge = (birthday) => {
        if (!birthday) return 'N/A';
        const ageDifMs = Date.now() - new Date(birthday).getTime();
        const ageDate = new Date(ageDifMs);
        return Math.abs(ageDate.getUTCFullYear() - 1970);
    };

    window.showCast = async (id, type) => {
        let content;
        try {
            const { cast } = await fetchFromApi(`${type}/${id}/credits?language=en-US`);
            const castToDisplay = (cast || []).slice(0, 15);
            const personDetailsPromises = castToDisplay.map(member => fetchFromApi(`person/${member.id}?language=en-US`));
            const personDetails = await Promise.all(personDetailsPromises);
            
            let castGridHTML = '';
            castToDisplay.forEach((member, index) => {
                const details = personDetails[index];
                const profileUrl = member.profile_path ? `https://image.tmdb.org/t/p/w200${member.profile_path}` : UNAVAILABLE_IMAGE_URL;
                const age = calculateAge(details.birthday);
                const nationality = details.place_of_birth ? details.place_of_birth.split(',').pop().trim() : 'N/A';
                const escapedName = member.name.replace(/'/g, "\\'");

                castGridHTML += `
                    <div class="cast-member" onclick="showFilmography(${member.id}, '${escapedName}')">
                        <img src="${profileUrl}" alt="${member.name}" class="cast-member-image" />
                        <p class="cast-member-name">${member.name}</p>
                        <p class="cast-member-character"><i class="fa-solid fa-masks-theater"></i> ${member.character}</p>
                        <p class="cast-member-meta"><i class="fa-solid fa-location-dot"></i> ${nationality}</p>
                        <p class="cast-member-meta"><i class="fa-solid fa-cake-candles"></i> ${age}</p>
                    </div>`;
            });
            content = `<h2 class="modal-title">Cast</h2><div class="cast-grid">${castGridHTML}</div>`;
        } catch (error) {
            console.error("Failed to fetch person details for cast:", error);
            content = `<h2 class="modal-title">Cast</h2><p class="modal-body-text" style="text-align: center;">Could not load cast details.</p>`;
        }
        const options = { isNavigable: modalHistory.length > 0 };
        _setModalContent(content, options);
        modalHistory.push({ content, options });
    };

    window.showFilmography = async (personId, name) => {
        let content;
        try {
            const { cast } = await fetchFromApi(`person/${personId}/combined_credits?language=en-US`);
            
            const excludedFilmographyGenreIds = await Promise.all([getExcludedGenreIds('movie'), getExcludedGenreIds('tv')]).then(res => [...new Set(res.flat())]);
            const filmography = (cast || [])
                .filter(item => 
                    (item.media_type === 'movie' || item.media_type === 'tv') && 
                    item.poster_path &&
                    !item.genre_ids.some(id => excludedFilmographyGenreIds.includes(id))
                )
                .sort((a,b) => b.popularity - a.popularity);
            
            let filmographyGridHTML = '';
            filmography.forEach(item => {
                const posterUrl = `https://image.tmdb.org/t/p/w200${item.poster_path}`;
                const title = (item.title || item.name || '').replace(/'/g, "\\'");
                filmographyGridHTML += `
                     <div class="filmography-item" onclick="showFilmographyItemDetails(${item.id}, '${item.media_type}')">
                        <img src="${posterUrl}" alt="${title}" class="filmography-item-poster"/>
                    </div>
                `;
            });
            content = `<h2 class="modal-title">Filmography of ${name}</h2><div class="filmography-grid">${filmographyGridHTML}</div>`;
        } catch (error) {
             content = `<h2 class="modal-title">Filmography of ${name}</h2><p class="modal-body-text" style="text-align: center;">Could not load filmography.</p>`;
        }
        const options = { isNavigable: modalHistory.length > 0 };
        _setModalContent(content, options);
        modalHistory.push({ content, options });
    };

    window.showFilmographyItemDetails = async (itemId, itemType) => {
        let content;
        try {
            const details = await fetchFromApi(`${itemType}/${itemId}?language=en-US`);
            const posterUrl = details.poster_path ? `https://image.tmdb.org/t/p/w500${details.poster_path}` : UNAVAILABLE_IMAGE_URL;
            const title = details.title || details.name || "Unknown Title";
            const overview = details.overview || "No synopsis available.";
            const releaseYear = (details.release_date || details.first_air_date || 'N/A').substring(0, 4);
            const rating = details.vote_average ? `${details.vote_average.toFixed(1)}/10` : 'N/A';
            const country = details.production_countries?.[0]?.name.replace('United States of America', 'USA').replace('United Kingdom', 'UK') || 'N/A';
            const language = details.spoken_languages?.[0]?.english_name || 'N/A';
            const genres = details.genres?.map(g => g.name).join(', ') || 'N/A';
            const runtime = details.runtime || (details.episode_run_time ? details.episode_run_time[0] : null);
            const formattedRuntime = runtime ? `${Math.floor(runtime/60)}h ${runtime%60}m` : 'N/A';

            content = document.createElement('div');
            content.className = 'filmography-detail-container';
            content.innerHTML = `
                <div class="filmography-detail-view">
                    <img src="${posterUrl}" alt="Poster for ${title}" class="filmography-detail-poster"/>
                    <div class="filmography-detail-info">
                        <h3>${title}</h3>
                        
                        <div class="film-meta-grid">
                           <div><strong><i class="fa-regular fa-star"></i></strong> ${rating}</div>
                           <div><strong><i class="fa-regular fa-calendar"></i></strong> ${releaseYear}</div>
                           <div><strong><i class="fa-solid fa-earth-americas"></i></strong> ${country}</div>
                           <div><strong><i class="fa-regular fa-message"></i></strong> ${language}</div>
                           <div><strong><i class="fa-solid fa-clapperboard"></i></strong> ${genres}</div>
                           <div><strong><i class="fa-regular fa-clock"></i></strong> ${formattedRuntime}</div>
                        </div>

                        <p class="filmography-detail-synopsis">${overview}</p>
                         <div class="details-buttons full-width">
                            <button class="details-btn watchlist-btn" title="Add to Watchlist"><i class="fas fa-bookmark"></i> Watchlist</button>
                            <button class="details-btn trailer-btn" title="Watch Trailer"><i class="fas fa-play"></i> Trailer</button>
                            <button class="details-btn cast-btn" title="View Cast"><i class="fa-solid fa-user-group"></i> Cast</button>
                       </div>
                    </div>
                </div>
            `;

            const watchlistBtn = content.querySelector('.watchlist-btn');
            const isInWatchlist = watchlistItems.some(item => item.id == itemId);
            watchlistBtn.classList.toggle('in-watchlist', isInWatchlist);
            watchlistBtn.title = isInWatchlist ? "Remove from Watchlist" : "Add to Watchlist";
            
            watchlistBtn.onclick = (e) => { e.stopPropagation(); toggleWatchlistAction(itemId, itemType, watchlistBtn); };
            content.querySelector('.trailer-btn').onclick = (e) => { e.stopPropagation(); showTrailer(itemId, itemType); };
            content.querySelector('.cast-btn').onclick = (e) => { e.stopPropagation(); showCast(itemId, itemType); };

        } catch (error) {
            console.error("Failed to fetch item details from filmography:", error);
            content = document.createElement('div');
            content.innerHTML = `<p class="modal-body-text" style="text-align: center;">Could not load details.</p>`;
        }
        
        const options = { isNavigable: true };
        _setModalContent(content, options);
        modalHistory.push({ content, options });
    };

    const debounce = (func, delay) => {
        let timeout;
        return (...args) => {
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(this, args), delay);
        };
    };

    const throttle = (func, limit) => {
        let inThrottle;
        return function(...args) {
            const context = this;
            if (!inThrottle) {
                func.apply(context, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    };
    
    const handleSearch = () => {
        if (isActorSearchMode) {
            if (searchTerm.length > 2) {
                fetchAndDisplayActors();
            } else {
                mediaContainer.innerHTML = '';
                noResults.classList.add('hidden');
                loader.classList.add('hidden');
            }
        } else {
            isWatchlistMode ? displayWatchlist() : resetAndFetch();
        }
    };
    const debouncedSearch = debounce(handleSearch, 1000);

    // --- EVENT LISTENERS ---
    watchlistBtn.addEventListener('click', () => {
        isWatchlistMode = !isWatchlistMode;
        watchlistBtn.classList.toggle('active', isWatchlistMode);

        if (isWatchlistMode) {
            // Entering watchlist mode, so exit actor search mode
            if (isActorSearchMode) {
                isActorSearchMode = false;
                actorSearchToggle.classList.remove('active');
            }
            // Make sure a media type is selected
            if (!movieTypeBtn.classList.contains('active') && !tvTypeBtn.classList.contains('active')) {
                movieTypeBtn.classList.add('active');
                mediaType = 'movie';
            }
            otherFilters.forEach(el => el.classList.remove('hidden'));
            displayWatchlist();
        } else {
            // Exiting watchlist mode, go back to discover
            resetAndFetch();
        }
    });

    actorSearchToggle.addEventListener('click', () => {
        if (isActorSearchMode) {
            // Currently in actor mode, so toggle it OFF and return to discover mode.
            isActorSearchMode = false;
            actorSearchToggle.classList.remove('active');
            
            // Restore filters and default media type
            otherFilters.forEach(el => el.classList.remove('hidden'));
            movieTypeBtn.classList.add('active');
            mediaType = 'movie';
            searchInput.placeholder = 'Films or Actors...';

            resetAndFetch();
        } else {
            // Not in actor mode, so toggle it ON.
            isActorSearchMode = true;
            actorSearchToggle.classList.add('active');

            // Deactivate other modes/buttons
            isWatchlistMode = false;
            watchlistBtn.classList.remove('active');
            movieTypeBtn.classList.remove('active');
            tvTypeBtn.classList.remove('active');

            // Hide other filters
            otherFilters.forEach(el => el.classList.add('hidden'));

            searchInput.placeholder = 'Search for an actor...';

            if (searchTerm) {
                handleSearch();
            } else {
                mediaContainer.innerHTML = '';
                noResults.classList.add('hidden');
            }
        }
    });

    movieTypeBtn.addEventListener('click', () => {
        // Clicking this button means we want discover mode for movies
        if (isActorSearchMode) {
            isActorSearchMode = false;
            actorSearchToggle.classList.remove('active');
            otherFilters.forEach(el => el.classList.remove('hidden'));
        }
        
        mediaType = 'movie';
        movieTypeBtn.classList.add('active');
        tvTypeBtn.classList.remove('active');
        searchInput.placeholder = 'Films or Actors...';
        
        if (isWatchlistMode) {
            displayWatchlist();
        } else {
            resetAndFetch();
        }
    });

    tvTypeBtn.addEventListener('click', () => {
        // Clicking this button means we want discover mode for tv
        if (isActorSearchMode) {
            isActorSearchMode = false;
            actorSearchToggle.classList.remove('active');
            otherFilters.forEach(el => el.classList.remove('hidden'));
        }

        mediaType = 'tv';
        tvTypeBtn.classList.add('active');
        movieTypeBtn.classList.remove('active');
        searchInput.placeholder = 'TV Series or Actors...';

        if (isWatchlistMode) {
            displayWatchlist();
        } else {
            resetAndFetch();
        }
    });
    
    searchInput.addEventListener('input', (e) => {
        searchTerm = e.target.value;
        debouncedSearch();
    });
    
    resetBtn.addEventListener('click', () => {
        // Reset state variables
        isWatchlistMode = false;
        isActorSearchMode = false;
        mediaType = 'movie';
        searchTerm = '';
        selectedGenre = '';
        selectedYear = '';
        selectedCountry = '';
        selectedLanguage = '';
        currentPage = 1;
        totalPages = 1;

        // Reset UI elements
        watchlistBtn.classList.remove('active');
        actorSearchToggle.classList.remove('active');
        movieTypeBtn.classList.add('active');
        tvTypeBtn.classList.remove('active');
        searchInput.value = '';
        searchInput.placeholder = 'Films or Actors...';
        
        // Make sure all filters are visible
        otherFilters.forEach(el => el.classList.remove('hidden'));
        sortByWrapper.classList.add('hidden');
        
        Object.values(customSelects).forEach(s => s.reset());
        
        // Fetch default content
        resetAndFetch();
    });
    
    mediaContainer.addEventListener('mouseover', handleCardHover);
    
    const handleScroll = () => {
        const scrollTop = window.scrollY || document.documentElement.scrollTop;
        header.classList.toggle('scrolled', scrollTop > 50);
        if (filtersBar) {
            backToTopBtn.classList.toggle('hidden', scrollTop < filtersBar.offsetHeight + filtersBar.offsetTop);
        }
    };

    window.addEventListener('scroll', throttle(handleScroll, 150));
    
    backToTopBtn.addEventListener('click', () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            if (modalHistory.length > 0) {
                goBackInModal();
            } else if (searchInput.value.trim() !== '') {
                searchInput.value = '';
                searchTerm = '';
                handleSearch();
            }
        }
    });
    
    document.addEventListener('click', () => {
        document.querySelectorAll('.custom-select-options.open').forEach(optionsContainer => {
            optionsContainer.classList.remove('open');
        });
    });

    const observer = new IntersectionObserver(entries => {
        if (entries[0].isIntersecting && !isLoading && !isWatchlistMode && !isActorSearchMode && currentPage < totalPages) {
            currentPage++;
            fetchAndDisplayMedia(currentPage, true);
        }
    }, { rootMargin: '200px' });

    observer.observe(sentinel);
    
    // --- INITIALIZATION ---
    fetchFilterOptions();
    fetchAndDisplayMedia();
    fetchWatchlist();
});
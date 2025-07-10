
document.addEventListener('DOMContentLoaded', () => {
    // --- STATE ---
    const API_V3_KEY = '329f898e5642c90715fd2b4a81f0e2d6';
    const API_READ_ACCESS_TOKEN = 'eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiIzMjlmODk4ZTU2NDJjOTA3MTVmZDJiNGE4MWYwZTJkNiIsIm5iZiI6MTcyODkxNTY1OS42NTAyMTksInN1YiI6IjYzYTRkNWQ3MzM0NGM2MDA3ZGMwYzRlOSIsInNjb3BlcyI6WyJhcGlfcmVhZCJdLCJ2ZXJzaW9uIjoxfQ.7JRz28RfwmrRWR058vIiUztw_4L-FbBfL8BICq73-vc';
    const ACCOUNT_ID = '16613298';
    const API_BASE_URL = 'https://api.themoviedb.org/3';
    const UNAVAILABLE_IMAGE_URL = 'https://i.postimg.cc/3wmgc5fd/Image-Unavailable.png';
    const EXCLUDED_GENRE_NAMES = ['Reality', 'Talk', 'Soap', 'Kids', 'News', 'Documentary'];
    const EXCLUDED_KEYWORDS = ['wwe', 'award', 'awards', 'oscar', 'emmy', 'grammy', 'golden globe'];
    const EXCLUDED_TITLES = [
        "the jonathan ross show", "loose women", "the jeremy kyle show", "the graham norton show", "big brother", "love island", "the great british bake off", "strictly come dancing", "the apprentice", "i'm a celebrity... get me out of here!", "the only way is essex", "gogglebox", "rupaul’s drag race uk", "made in chelsea", "britain's got talent", "the masked singer", "the voice", "america's next top model", "top chef", "shark tank", "keeping up with the kardashians", "american idol", "the bachelor", "the bachelorette", "survivor", "good morning america", "live with kelly and mark", "the today show", "the drew barrymore show", "dr. phil", "the tonight show starring jimmy fallon", "jimmy kimmel live", "late night with seth meyers", "the late show with stephen colbert", "the daily show", "real time with bill maher", "judge judy", "mock the week", "a league of their own", "taskmaster", "never mind the buzzcocks", "8 out of 10 cats", "would i lie to you", "meet the richardsons", "big fat quiz", "hypothetical", "the danny kaye show", "deal or no deal"
    ].map(t => t.toLowerCase());

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
    let isWatchingMode = false;
    let watchlistItems = [];
    let selectedSort = 'date_added_desc';
    let selectedNetwork = '';
    let lastPlayedItem = null; // For "Watch Next" feature
    let heroItems = [];
    let currentHeroIndex = 0;
    let heroTimeoutId = null;

    // Filter states
    let selectedGenre = '';
    let selectedYear = '';
    let selectedCountry = '';
    let selectedLanguage = '';
    
    // Maps TV Network IDs to Movie Watch Provider IDs for unified filtering
    const networkToProviderMap = {
        '213': '8',    // Netflix
        '2552': '350', // Apple TV+
        '1024': '9',   // Amazon Prime Video
        '49': '384',   // HBO -> Max
        '3186': '384', // HBO Max -> Max
        '6783': '384', // Max
        '67': '37',    // Showtime
        '3353': '387', // Peacock Premium
        '4330': '531', // Paramount+
        '6219': '391', // MGM+
        '318': '31',   // Starz
        '453': '15',   // Hulu
        '174': '257',  // AMC+
        '1436': '188', // YouTube
        '4692': '207', // Roku Channel
        '2739': '337', // Disney+
        '214': '39',   // Sky Go (UK)
        '4': '2',      // BBC One -> iPlayer
        '332': '2',    // BBC Two -> iPlayer
        '3': '2',      // BBC Three -> iPlayer
        '5871': '103', // ITVX
        '26': '1796',  // Channel 4
        '99': '138',   // My5 (Channel 5)
        '4025': '210', // BritBox
        '19': '15',    // Fox -> Hulu
        '6': '387',    // NBC -> Peacock
    };

    // --- DOM ELEMENTS ---
    const header = document.getElementById('app-header');
    const heroBanner = document.getElementById('hero-banner');
    const movieTypeBtn = document.getElementById('movie-type-btn');
    const tvTypeBtn = document.getElementById('tv-type-btn');
    const watchingBtn = document.getElementById('watching-btn');
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
    const networkFilterWrapper = document.getElementById('network-filter-wrapper');
    const genreFilterWrapper = document.getElementById('genre-filter-wrapper');
    const yearFilterWrapper = document.getElementById('year-filter-wrapper');
    const countryFilterWrapper = document.getElementById('country-filter-wrapper');
    const languageFilterWrapper = document.getElementById('language-filter-wrapper');
    
    // --- HELPERS ---
    const calculateAge = (birthday) => {
        if (!birthday) return 'N/A';
        const ageDifMs = Date.now() - new Date(birthday).getTime();
        const ageDate = new Date(ageDifMs);
        return Math.abs(ageDate.getUTCFullYear() - 1970);
    };

    const isExcludedByKeyword = (title) => {
        if (!title) return false;
        return EXCLUDED_KEYWORDS.some(keyword => title.toLowerCase().includes(keyword));
    };
    
    const isItemExcluded = (item, excludedGenreIds) => {
        const title = (item.title || item.name || '').toLowerCase();
        
        if (EXCLUDED_TITLES.includes(title)) return true;
        if (isExcludedByKeyword(title)) return true;
        if (!item.genre_ids || item.genre_ids.length === 0) return true;
        if (excludedGenreIds && item.genre_ids.some(id => excludedGenreIds.includes(id))) return true;

        return false;
    };

    const shuffleArray = (array) => {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    };

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
    const fetchAndDisplayHeroBanner = async () => {
        try {
            if (heroTimeoutId) clearTimeout(heroTimeoutId);
            const excludedIds = await getExcludedGenreIds(mediaType);
            
            const fetchPromises = [
                 fetchFromApi(`trending/${mediaType}/week?page=1`),
                 fetchFromApi(`trending/${mediaType}/week?page=2`)
            ];
            const responses = await Promise.all(fetchPromises);
            let allResults = responses.flatMap(data => data.results || []);
    
            const validItems = allResults.filter(item =>
                item.backdrop_path && 
                item.overview &&
                item.original_language === 'en' &&
                !isItemExcluded(item, excludedIds)
            );
    
            if (validItems.length < 1) {
                heroBanner.classList.add('hidden');
                header.classList.remove('header-with-hero');
                return;
            }
            
            heroItems = shuffleArray(validItems).slice(0, 10);
            
            if (heroItems.length > 0) {
                header.classList.add('header-with-hero');
                setupHeroCarousel();
            } else {
                 heroBanner.classList.add('hidden');
                 header.classList.remove('header-with-hero');
            }
    
        } catch (error) {
            console.error("Failed to fetch hero banner:", error);
            heroBanner.classList.add('hidden');
            header.classList.remove('header-with-hero');
        }
    };
    
    const setupHeroCarousel = () => {
        if (heroTimeoutId) clearTimeout(heroTimeoutId);
        heroBanner.innerHTML = `
            <div id="hero-background-1" class="hero-background" style="opacity: 0;"></div>
            <div id="hero-background-2" class="hero-background" style="opacity: 0;"></div>
            <div class="hero-overlay"></div>
            <div id="hero-content-wrapper" class="container"></div>
            <div class="hero-controls">
                <button id="hero-prev-btn" class="hero-nav-btn" title="Previous"><i class="fas fa-chevron-left"></i></button>
                <div class="hero-countdown">
                    <div class="hero-countdown-bar animate"></div>
                </div>
                <button id="hero-next-btn" class="hero-nav-btn" title="Next"><i class="fas fa-chevron-right"></i></button>
            </div>
        `;
        
        document.getElementById('hero-prev-btn').onclick = () => {
            const newIndex = (currentHeroIndex - 1 + heroItems.length) % heroItems.length;
            displayHeroSlide(newIndex, 'prev');
        };
        document.getElementById('hero-next-btn').onclick = () => {
            const newIndex = (currentHeroIndex + 1) % heroItems.length;
            displayHeroSlide(newIndex, 'next');
        };
        
        heroBanner.classList.remove('hidden');
        displayHeroSlide(0);
    };
    
    const displayHeroSlide = async (index, direction = 'next') => {
        if (heroTimeoutId) clearTimeout(heroTimeoutId);
        if (!heroItems || heroItems.length === 0) return;
    
        currentHeroIndex = index;
        const heroItem = heroItems[currentHeroIndex];
        const itemMediaType = heroItem.media_type;
    
        const details = await fetchFromApi(`${itemMediaType}/${heroItem.id}?language=en-US`);
        
        const backdropUrl = `https://image.tmdb.org/t/p/original${details.backdrop_path}`;
        const title = details.title || details.name;
        const overview = details.overview;
        const genres = details.genres?.map(g => g.name).slice(0, 2).join(' • ');
        const releaseYear = (details.release_date || details.first_air_date || '').substring(0, 4);
        const escapedTitle = title.replace(/'/g, "\\'");
        const truncatedOverview = overview.length > 250 ? overview.substring(0, 250) + '...' : overview;

        const heroMetaParts = [];
        if (releaseYear) heroMetaParts.push(releaseYear);
        if (genres) heroMetaParts.push(genres);
        const heroMeta = heroMetaParts.join(' | ');
    
        const contentWrapper = document.getElementById('hero-content-wrapper');
        const newSlide = document.createElement('div');
        newSlide.className = 'hero-content';
        
        newSlide.innerHTML = `
            <h2 class="hero-title">${title}</h2>
            <p class="hero-genres">${heroMeta}</p>
            <p class="hero-description">${truncatedOverview}</p>
            <div class="hero-buttons">
                <button class="hero-btn trailer-btn"><i class="fas fa-play"></i> Play Trailer</button>
                <button class="hero-btn info-btn"><i class="fas fa-info-circle"></i> More Info</button>
                <button class="hero-btn cast-btn"><i class="fa-solid fa-user-group"></i> View Cast</button>
                <button class="hero-btn watchlist-btn" title="Add to Watchlist"><i class="fas fa-bookmark"></i> Watchlist</button>
            </div>
        `;
    
        // Handle background transition
        const bg1 = document.getElementById('hero-background-1');
        const bg2 = document.getElementById('hero-background-2');
        const activeBg = bg1.style.opacity === '1' ? bg1 : bg2;
        const inactiveBg = activeBg === bg1 ? bg2 : bg1;
    
        inactiveBg.style.backgroundImage = `url('${backdropUrl}')`;
        inactiveBg.style.opacity = '1';
        if (activeBg) activeBg.style.opacity = '0';
        
        // Handle content transition
        const currentContent = contentWrapper.querySelector('.hero-content');
        if (currentContent) {
            currentContent.classList.add('fade-out');
            currentContent.addEventListener('animationend', () => currentContent.remove(), { once: true });
        }
        
        newSlide.classList.add('fade-in');
        contentWrapper.appendChild(newSlide);
    
        const watchlistBtnEl = newSlide.querySelector('.hero-btn.watchlist-btn');
        newSlide.querySelector('.trailer-btn').onclick = () => showTrailer(details.id, itemMediaType);
        newSlide.querySelector('.info-btn').onclick = () => showSynopsis(details.id, itemMediaType, escapedTitle);
        newSlide.querySelector('.cast-btn').onclick = () => showCast(details.id, itemMediaType);
        watchlistBtnEl.onclick = (e) => toggleWatchlistAction(details.id, itemMediaType, e.currentTarget);
    
        const isInWatchlist = watchlistItems.some(item => item.id == details.id);
        watchlistBtnEl.classList.toggle('in-watchlist', isInWatchlist);
        watchlistBtnEl.title = isInWatchlist ? "Remove from Watchlist" : "Add to Watchlist";
    
        // Restart countdown
        const countdownBar = heroBanner.querySelector('.hero-countdown-bar');
        if (countdownBar) {
            countdownBar.classList.remove('animate');
            void countdownBar.offsetWidth; // Trigger reflow
            countdownBar.classList.add('animate');
        }
        
        heroTimeoutId = setTimeout(() => {
            const nextIndex = (currentHeroIndex + 1) % heroItems.length;
            displayHeroSlide(nextIndex, 'next');
        }, 7000);
    };

    const fetchAndDisplayMedia = async (page = 1, append = false) => {
        if (isLoading) {
            if (currentFetchAbortController) currentFetchAbortController.abort();
        }
        isLoading = true;
        currentFetchAbortController = new AbortController();

        if (page === 1) {
            mediaContainer.innerHTML = '';
            noResults.classList.add('hidden');
        }
        loader.classList.remove('hidden');

        try {
            let endpoint;
            // Initialize params without language or region to allow for broader filtering
            const params = new URLSearchParams({
                page: String(page),
                'include_adult': 'false',
            });
            
            if (searchTerm.length > 2) {
                // For search, add language to get more relevant results
                params.append('language', 'en-US');
                params.append('query', searchTerm);
                if (selectedYear) {
                    params.append(mediaType === 'movie' ? 'primary_release_year' : 'first_air_date_year', selectedYear);
                }
                endpoint = `search/${mediaType}?${params.toString()}`;
            } else { // Discover mode
                const excludedIds = await getExcludedGenreIds(mediaType);
                
                params.append('sort_by', 'popularity.desc');
                if (excludedIds.length > 0) params.append('without_genres', excludedIds.join(','));

                // Apply general filters
                if (selectedGenre) params.append('with_genres', selectedGenre);
                if (selectedYear) params.append(mediaType === 'movie' ? 'primary_release_year' : 'first_air_date_year', selectedYear);
                if (selectedCountry) params.append('with_origin_country', selectedCountry);
                if (selectedLanguage) params.append('with_original_language', selectedLanguage);

                // Apply network/provider filter
                if (selectedNetwork) {
                    if (mediaType === 'tv') {
                        params.append('with_networks', selectedNetwork);
                    } else if (mediaType === 'movie') {
                        const providerId = networkToProviderMap[selectedNetwork];
                        if (providerId) {
                            params.append('with_watch_providers', providerId);
                            // A watch_region is required when using with_watch_providers
                            params.append('watch_region', selectedCountry || 'US');
                            params.append('with_watch_monetization_types', 'flatrate');
                        }
                    }
                }
                
                endpoint = `discover/${mediaType}?${params.toString()}`;
            }

            const data = await fetchFromApi(endpoint, { signal: currentFetchAbortController.signal });
            
            if (!append) mediaContainer.innerHTML = '';
            
            const excludedIds = await getExcludedGenreIds(mediaType);
            let results = (data.results || []).filter(item => !isItemExcluded(item, excludedIds));
            
            const areAnyFiltersActive = searchTerm.length > 2 || selectedNetwork || selectedGenre || selectedYear || selectedCountry || selectedLanguage;
            if (!append && !areAnyFiltersActive) {
                for (let i = results.length - 1; i > 0; i--) {
                    const j = Math.floor(Math.random() * (i + 1));
                    [results[i], results[j]] = [results[j], results[i]];
                }
            }

            results.forEach(item => {
                const card = createMediaCardElement(item);
                if(card) mediaContainer.appendChild(card);
            });

            if (page === 1) {
                totalPages = Math.min(data.total_pages || 1, 500); // Cap at TMDB's 500 page limit
                if (results.length === 0) {
                    noResults.innerHTML = `
                        <i class="fas fa-ghost"></i>
                        <p>No results found.</p>
                        <p>Try adjusting your search or filters.</p>`;
                    noResults.classList.remove('hidden');
                }
            }
            updateAllCardWatchlistIcons();
        } catch (error) {
            if (error.name !== 'AbortError') {
                console.error("Failed to fetch media:", error);
                if (!append) { // Handle error on initial load
                    mediaContainer.innerHTML = '';
                    noResults.innerHTML = `
                        <i class="fas fa-exclamation-triangle"></i>
                        <p>API Error</p>
                        <p>Could not fetch data. Please try again later.</p>`;
                    noResults.classList.remove('hidden');
                } else { // Handle error on pagination (scrolling)
                    showToast('Error loading more results.');
                    currentPage = totalPages; // Prevent further scroll requests on error
                }
            }
        } finally {
            isLoading = false;
            loader.classList.add('hidden');
            currentFetchAbortController = null;
        }
    };
    
    const fetchAndDisplayPopularActors = async (page = 1, append = false) => {
        if (isLoading) {
            if (currentFetchAbortController) currentFetchAbortController.abort();
        }
        isLoading = true;
        currentFetchAbortController = new AbortController();

        if (!append) {
            mediaContainer.innerHTML = '';
            noResults.classList.add('hidden');
        }
        loader.classList.remove('hidden');

        try {
            const data = await fetchFromApi(`person/popular?page=${page}`, { signal: currentFetchAbortController.signal });
            
            let results = data.results || [];
            if (page === 1 && !append) {
                // Shuffle on first load
                for (let i = results.length - 1; i > 0; i--) {
                    const j = Math.floor(Math.random() * (i + 1));
                    [results[i], results[j]] = [results[j], results[i]];
                }
            }
            
            totalPages = data.total_pages || 1;

            if (results.length > 0) {
                results.forEach(person => {
                    const personCard = createPersonCardElement(person);
                    if (personCard) mediaContainer.appendChild(personCard);
                });
            } else if (!append) {
                noResults.classList.remove('hidden');
            }
        } catch (error) {
            if (error.name !== 'AbortError') {
                console.error("Popular actor fetch failed", error);
                if (!append) noResults.classList.remove('hidden');
            }
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
        input.setAttribute('autocomplete', 'off');

        const arrow = document.createElement('i');
        arrow.className = 'fas fa-chevron-down custom-select-arrow';

        const optionsContainer = document.createElement('div');
        optionsContainer.className = 'custom-select-options';

        const closeAllSelects = (exceptThisOne = null) => {
            document.querySelectorAll('.custom-select-options.open').forEach(openContainer => {
                if (openContainer !== exceptThisOne) {
                    openContainer.classList.remove('open');
                }
            });
        };

        const toggleOptions = (forceOpen = null) => {
            const currentlyOpen = optionsContainer.classList.contains('open');
            const shouldOpen = forceOpen !== null ? forceOpen : !currentlyOpen;
            
            closeAllSelects(shouldOpen ? optionsContainer : null);

            if (shouldOpen) {
                optionsContainer.classList.add('open');
            } else {
                optionsContainer.classList.remove('open');
            }
        };

        const handleSelect = (optionEl) => {
            input.value = optionEl.dataset.value === '' ? '' : optionEl.textContent;
            if (input.value === '') input.placeholder = placeholder;
            onSelect(optionEl.dataset.value);
            toggleOptions(false);
        };
        
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
        
        input.addEventListener('input', () => {
            const filter = input.value.toLowerCase();
            optionsContainer.querySelectorAll('.custom-select-option').forEach(opt => {
                const text = opt.textContent.toLowerCase();
                opt.style.display = text.includes(filter) ? '' : 'none';
            });
        });

        input.addEventListener('focus', () => toggleOptions(true));
        selectContainer.addEventListener('click', (e) => e.stopPropagation());

        input.addEventListener('keydown', (e) => {
            const isOptionsOpen = optionsContainer.classList.contains('open');
            if (e.key === 'Escape') {
                toggleOptions(false);
                return;
            }

            if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
                e.preventDefault();
                if (!isOptionsOpen) toggleOptions(true);
                
                const visibleOptions = Array.from(optionsContainer.querySelectorAll('.custom-select-option')).filter(o => o.style.display !== 'none');
                if (!visibleOptions.length) return;

                let highlightedIndex = visibleOptions.findIndex(opt => opt.classList.contains('highlighted'));
                
                if (highlightedIndex !== -1) {
                    visibleOptions[highlightedIndex].classList.remove('highlighted');
                }

                if (e.key === 'ArrowDown') {
                    highlightedIndex = (highlightedIndex + 1) % visibleOptions.length;
                } else { // ArrowUp
                    highlightedIndex = (highlightedIndex - 1 + visibleOptions.length) % visibleOptions.length;
                }
                
                visibleOptions[highlightedIndex].classList.add('highlighted');
                visibleOptions[highlightedIndex].scrollIntoView({ block: 'nearest' });
            }

            if (e.key === 'Enter' && isOptionsOpen) {
                e.preventDefault();
                const highlighted = optionsContainer.querySelector('.highlighted');
                if (highlighted) {
                    handleSelect(highlighted);
                }
            }
        });


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
            
            const networkOptions = [
                { value: '213', name: 'Netflix' }, { value: '2552', name: 'Apple TV+' },
                { value: '1024', name: 'Amazon Prime' }, { value: '49', name: 'HBO' },
                { value: '3186', name: 'HBO Max' }, { value: '67', name: 'Showtime' },
                { value: '3353', name: 'Peacock' }, { value: '4330', name: 'Paramount+' },
                { value: '6219', name: 'MGM+' }, { value: '318', name: 'Starz' },
                { value: '19', name: 'Fox' }, { value: '6', name: 'NBC' },
                { value: '453', name: 'Hulu' }, { value: '174', name: 'AMC+' },
                { value: '6783', name: 'Max' }, { value: '1436', name: 'YouTube' },
                { value: '4692', name: 'Roku' }, { value: '2739', name: 'Disney+' },
                { value: '214', name: 'Sky' }, { value: '4', name: 'BBC One' },
                { value: '332', name: 'BBC Two' }, { value: '3', name: 'BBC Three' },
                { value: '5871', name: 'ITV X' }, { value: '26', name: 'Channel 4' },
                { value: '99', name: 'Channel 5' }, { value: '4025', name: 'BritBox' }
            ].sort((a, b) => a.name.localeCompare(b.name));

            const handleFilterChange = () => (isWatchlistMode || isWatchingMode) ? displayWatchlist() : resetAndFetch();

            customSelects.network = createCustomSelect(networkFilterWrapper, 'All Networks', networkOptions, (value) => { selectedNetwork = value; handleFilterChange(); });
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

    const updateFiltersUI = () => {
        const isDiscover = !isActorSearchMode && !isWatchlistMode && !isWatchingMode;
        const mediaTypeToggleContainer = movieTypeBtn.parentElement;
        const mainElement = document.querySelector('main.container');

        if(heroBanner) {
            heroBanner.classList.toggle('hidden', !isDiscover);
            header.classList.toggle('header-with-hero', isDiscover);
        }
        if (mainElement) mainElement.style.paddingTop = isDiscover ? '2rem' : '8rem';
        
        mediaTypeToggleContainer.classList.toggle('hidden', isWatchingMode);
        
        const allFilters = [networkFilterWrapper, genreFilterWrapper, yearFilterWrapper, countryFilterWrapper, languageFilterWrapper, resetBtn];
        allFilters.forEach(el => el.classList.toggle('hidden', isActorSearchMode));
        
        const showNetworkFilter = (isDiscover || isWatchlistMode) && mediaType === 'tv';
        networkFilterWrapper.classList.toggle('hidden', !showNetworkFilter);

        if (isActorSearchMode) {
            searchInput.placeholder = 'Search for Actors...';
        } else if (mediaType === 'tv') {
            searchInput.placeholder = 'Search for TV Series...';
        } else {
            searchInput.placeholder = 'Search for Films...';
        }
    };

    
    // --- WATCHLIST LOGIC ---
    const calculateNextEpisode = (item, watchedProgress) => {
        const itemProgress = watchedProgress[item.id];
        let nextUp = { season: 1, episode: 1 };
        
        if (!itemProgress || !item.seasons) return nextUp;

        const validSeasons = item.seasons.filter(s => s.season_number > 0 && s.episode_count > 0);
        if (validSeasons.length === 0) return nextUp;

        const lastWatchedSeason = validSeasons.find(s => s.season_number === itemProgress.season);
        if (lastWatchedSeason) {
            if (itemProgress.episode < lastWatchedSeason.episode_count) {
                nextUp = { season: itemProgress.season, episode: itemProgress.episode + 1 };
            } else {
                const nextSeason = validSeasons.find(s => s.season_number === itemProgress.season + 1);
                if (nextSeason) {
                    nextUp = { season: nextSeason.season_number, episode: 1 };
                } else {
                    // Finished series, return last watched episode
                    nextUp = { season: itemProgress.season, episode: itemProgress.episode };
                }
            }
        }
        return nextUp;
    };

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

        let itemsToDisplay = watchlistItems;
        const watchedProgress = JSON.parse(localStorage.getItem('watchedProgress')) || {};

        if (isWatchingMode) {
            itemsToDisplay = itemsToDisplay.filter(item => {
                if (item.media_type !== 'tv') return false;
                const nextUp = calculateNextEpisode(item, watchedProgress);
                // A series is being watched if the next episode to watch is not S1E1
                return !(nextUp.season === 1 && nextUp.episode === 1);
            });
        } else if (isWatchlistMode) {
            itemsToDisplay = itemsToDisplay.filter(item => {
                if (item.media_type !== 'tv') return true; // Always include movies
                const nextUp = calculateNextEpisode(item, watchedProgress);
                // Only include TV series that have not been started
                return nextUp.season === 1 && nextUp.episode === 1;
            });
        }


        let filtered = itemsToDisplay.filter(item => {
            const title = item.title || item.name || '';
            const releaseYear = (item.release_date || item.first_air_date || 'N/A').substring(0, 4);

            if (mediaType !== 'all' && item.media_type !== mediaType) return false;
            if (searchTerm.length > 2 && !title.toLowerCase().includes(searchTerm.toLowerCase())) return false;
            if (selectedGenre && !item.genres.some(g => g.id == selectedGenre)) return false;
            if (selectedYear && releaseYear !== selectedYear) return false;
            if (selectedCountry && !(item.production_countries?.some(c => c.iso_3166_1 === selectedCountry))) return false;
            if (selectedLanguage && item.original_language !== selectedLanguage) return false;
            if (selectedNetwork && item.media_type === 'tv' && !item.networks?.some(n => n.id == selectedNetwork)) return false;
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
            const card = btn.closest('.media-card, .filmography-detail-container, .hero-banner');
            if (card) {
                const id = card.dataset.id;
                if (!id) return; // Hero banner might not have ID yet
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
                if ((isWatchlistMode || isWatchingMode) && button && button.closest('.media-card-wrapper')) {
                    button.closest('.media-card-wrapper')?.remove();
                    if (mediaContainer.children.length === 0) noResults.classList.remove('hidden');
                }
            } else {
                const itemDetails = await fetchFromApi(`${type}/${id}`);
                watchlistItems.push({ ...itemDetails, media_type: type, date_added: new Date() });
            }
            updateAllCardWatchlistIcons();
            
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

    const openPlayer = (id, type, controlsContainer, mediaDetails) => {
        const isTV = type === 'tv';
        let src;

        if (isTV) {
            const seasonSelect = controlsContainer.querySelector('.player-season-select');
            const episodeSelect = controlsContainer.querySelector('.player-episode-select');
            const season = seasonSelect?.value || '1';
            const episode = episodeSelect?.value || '1';
            src = `https://vidsrc.xyz/embed/tv?tmdb=${id}&season=${season}&episode=${episode}`;
            
            const watchedProgress = JSON.parse(localStorage.getItem('watchedProgress')) || {};
            watchedProgress[id] = { season: parseInt(season, 10), episode: parseInt(episode, 10) };
            localStorage.setItem('watchedProgress', JSON.stringify(watchedProgress));

            lastPlayedItem = {
                id,
                type,
                season: parseInt(season, 10),
                episode: parseInt(episode, 10),
                title: mediaDetails.title || mediaDetails.name
            };
        } else {
            src = `https://vidsrc.xyz/embed/movie?tmdb=${id}`;
            lastPlayedItem = null;
        }
        window.open(src, '_blank');
    };

    const createPersonCardElement = (person) => {
        if (!person.profile_path) return null;
        const title = person.name;
        const posterUrl = `https://image.tmdb.org/t/p/w500${person.profile_path}`;
        const escapedName = title.replace(/'/g, "\\'");
    
        const wrapper = document.createElement('div');
        wrapper.className = 'media-card-wrapper';
    
        const card = document.createElement('div');
        card.className = 'media-card';
        card.dataset.id = person.id;
        card.dataset.type = 'person';
        card.dataset.detailsLoaded = 'false';
        card.onclick = () => showFilmography(person.id, escapedName);
    
        card.innerHTML = `
            <img src="${posterUrl}" alt="Photo of ${title}" class="media-card-poster" loading="lazy"/>
            <div class="media-card-overlay">
                <div class="details-pane">
                    <div class="details-spinner"><div class="spinner-small"></div></div>
                    <div class="details-content hidden">
                       <div class="details-text-container">
                           <div class="person-name-text"><strong>${title}</strong></div>
                           <div class="nationality-text-container hidden"><strong><i class="fa-solid fa-location-dot" aria-hidden="true"></i></strong>⠀<span class="nationality-text"></span></div>
                           <div class="age-text-container hidden"><strong><i class="fa-solid fa-cake-candles" aria-hidden="true"></i></strong>⠀<span class="age-text"></span></div>
                       </div>
                    </div>
                </div>
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
                           <div class="country-text-container hidden"><i class="fa-solid fa-earth-americas" aria-hidden="true"></i><span class="country-text"></span></div>
                           <div class="language-text-container hidden"><i class="fa-regular fa-message" aria-hidden="true"></i><span class="language-text"></span></div>
                           <div class="genres-text-container hidden"><i class="fa-solid fa-clapperboard" aria-hidden="true"></i><span class="genres-text"></span></div>
                           <div class="series-text-container hidden"><i class="fa-regular fa-rectangle-list" aria-hidden="true"></i><span class="series-text"></span></div>
                           <div class="network-text-container hidden"><i class="fa-solid fa-tv" aria-hidden="true"></i><span class="network-text"></span></div>
                           <div class="runtime-text-container hidden"><i class="fa-regular fa-clock" aria-hidden="true"></i><span class="runtime-text"></span></div>
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
    
            if (type === 'tv') {
                const network = media.networks?.[0]?.name;
                if(network) {
                    card.querySelector('.network-text').textContent = network;
                    card.querySelector('.network-text-container').classList.remove('hidden');
                }
                const seasons = media.number_of_seasons;
                if (seasons) {
                    card.querySelector('.series-text').textContent = `${seasons} Season${seasons > 1 ? 's' : ''}`;
                    card.querySelector('.series-text-container').classList.remove('hidden');
                }
            }
            
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
        if (isWatchlistMode || isWatchingMode) {
            const playerControls = document.createElement('div');
            playerControls.className = 'watchlist-player-controls';

            if (type === 'tv' && media.seasons) {
                const validSeasons = media.seasons.filter(s => s.season_number > 0 && s.episode_count > 0);
                if (validSeasons.length > 0) {
                    const watchedProgress = JSON.parse(localStorage.getItem('watchedProgress')) || {};
                    const nextUp = calculateNextEpisode(media, watchedProgress);
                    
                    const initialSeasonData = validSeasons.find(s => s.season_number === nextUp.season) || validSeasons[0];

                     playerControls.innerHTML = `
                        <select class="player-season-select">
                            ${validSeasons.map(s => `<option value="${s.season_number}" ${s.season_number === nextUp.season ? 'selected' : ''}>S ${s.season_number}</option>`).join('')}
                        </select>
                        <select class="player-episode-select">
                            ${generateEpisodeOptions(initialSeasonData.episode_count)}
                        </select>
                        <button class="details-btn player-play-btn" title="Play Episode"><i class="fas fa-play"></i></button>
                    `;

                    const seasonSelect = playerControls.querySelector('.player-season-select');
                    const episodeSelect = playerControls.querySelector('.player-episode-select');
                    if (episodeSelect) episodeSelect.value = nextUp.episode;
                    
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
                        openPlayer(media.id, type, playerControls, media);
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
        toast.innerHTML = `<span>${message}</span>`;
        toast.classList.add('show');
        setTimeout(() => toast.classList.remove('show'), 3000);
    };

    const showNextEpisodeToast = (message, buttonText, onAction) => {
        toast.classList.remove('show'); // Hide any previous toast
        
        toast.innerHTML = `
            <span>${message}</span>
             <div class="toast-buttons-container">
                <button class="toast-action-btn">${buttonText}</button>
                <button class="toast-close-btn">&times;</button>
            </div>
        `;
        
        const actionBtn = toast.querySelector('.toast-action-btn');
        const closeBtn = toast.querySelector('.toast-close-btn');

        const closeToast = () => toast.classList.remove('show');

        actionBtn.onclick = () => {
            onAction();
            closeToast();
        };

        closeBtn.onclick = closeToast;

        toast.classList.add('show');
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
        
        const closeBtn = document.createElement('button');
        closeBtn.className = isTrailer ? 'modal-close-btn-trailer' : 'modal-close-btn';
        closeBtn.innerHTML = '<i class="fas fa-times fa-lg"></i>';
        closeBtn.setAttribute('aria-label', 'Close modal');
        closeBtn.onclick = closeModal;

        if (typeof content === 'string') {
            contentWrapper.innerHTML += content;
        } else {
            contentWrapper.appendChild(content);
        }
        
        contentWrapper.prepend(closeBtn);

        modal.appendChild(contentWrapper);
        modalContainer.innerHTML = '';
        modalContainer.appendChild(modal);
        
        // Handle scroll position persistence for filmography modal
        const filmographyContent = contentWrapper.querySelector('[data-filmography-person-id]');
        if (filmographyContent) {
            const personId = filmographyContent.dataset.filmographyPersonId;
            const scrollKey = `filmography-scroll-${personId}`;
            
            const savedScrollTop = sessionStorage.getItem(scrollKey);
            if (savedScrollTop) {
                setTimeout(() => {
                    contentWrapper.scrollTop = parseInt(savedScrollTop, 10);
                }, 0);
            }
    
            contentWrapper.addEventListener('scroll', () => {
                sessionStorage.setItem(scrollKey, contentWrapper.scrollTop);
            });
        }
        
        document.documentElement.classList.add('is-modal-open');
    };

    window.closeModal = () => {
        modalContainer.innerHTML = '';
        document.documentElement.classList.remove('is-modal-open');
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
        if (!card || card.dataset.detailsLoaded === 'true') return;
    
        const id = card.dataset.id;
        const type = card.dataset.type;
        card.dataset.detailsLoaded = 'true';
    
        const spinner = card.querySelector('.details-spinner');
        const content = card.querySelector('.details-content');
    
        try {
            if (type === 'person') {
                const details = await fetchFromApi(`person/${id}?language=en-US`);
                
                const age = calculateAge(details.birthday);
                if (age && age !== 'N/A') {
                    card.querySelector('.age-text').textContent = age;
                    card.querySelector('.age-text-container').classList.remove('hidden');
                }
    
                const nationality = details.place_of_birth ? details.place_of_birth.split(',').pop().trim() : null;
                if (nationality) {
                    card.querySelector('.nationality-text').textContent = nationality;
                    card.querySelector('.nationality-text-container').classList.remove('hidden');
                }
            } else { // Handle movie and TV
                const details = await fetchFromApi(`${type}/${id}?language=en-US`);
        
                if (type === 'tv') {
                    const network = details.networks?.[0]?.name;
                    if (network) {
                        card.querySelector('.network-text').textContent = network;
                        card.querySelector('.network-text-container').classList.remove('hidden');
                    }
                    const seasons = details.number_of_seasons;
                    if (seasons) {
                        card.querySelector('.series-text').textContent = `${seasons} Season${seasons > 1 ? 's' : ''}`;
                        card.querySelector('.series-text-container').classList.remove('hidden');
                    }
                }

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
            }
            spinner.classList.add('hidden');
            content.classList.remove('hidden');
        } catch (err) {
            console.error(`Error fetching details for ${type} on hover`, err);
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
    
    window.showCast = async (id, type) => {
        let content;
        try {
            const [{ cast }, mediaDetails] = await Promise.all([
                fetchFromApi(`${type}/${id}/credits?language=en-US`),
                fetchFromApi(`${type}/${id}?language=en-US`)
            ]);
    
            const releaseDateStr = mediaDetails.release_date || mediaDetails.first_air_date;
            const releaseDate = releaseDateStr ? new Date(releaseDateStr) : null;
    
            const castToDisplay = (cast || []).slice(0, 15);
            const personDetailsPromises = castToDisplay.map(member => fetchFromApi(`person/${member.id}?language=en-US`));
            const personDetails = await Promise.all(personDetailsPromises);
            
            let castGridHTML = '';
            castToDisplay.forEach((member, index) => {
                const details = personDetails[index];
                const profileUrl = member.profile_path ? `https://image.tmdb.org/t/p/w200${member.profile_path}` : UNAVAILABLE_IMAGE_URL;
                const currentAge = calculateAge(details.birthday);
                
                let ageDisplay = currentAge;
                if (releaseDate && details.birthday) {
                    const birthDate = new Date(details.birthday);
                    let ageAtRelease = releaseDate.getFullYear() - birthDate.getFullYear();
                    const monthDiff = releaseDate.getMonth() - birthDate.getMonth();
                    if (monthDiff < 0 || (monthDiff === 0 && releaseDate.getDate() < birthDate.getDate())) {
                        ageAtRelease--;
                    }
                    if (ageAtRelease >= 0) {
                        ageDisplay += ` (${ageAtRelease})`;
                    }
                }
    
                const nationality = details.place_of_birth ? details.place_of_birth.split(',').pop().trim() : 'N/A';
                const escapedName = member.name.replace(/'/g, "\\'");
    
                castGridHTML += `
                    <div class="cast-member" onclick="showFilmography(${member.id}, '${escapedName}')">
                        <img src="${profileUrl}" alt="${member.name}" class="cast-member-image" />
                        <p class="cast-member-name">${member.name}</p>
                        <p class="cast-member-character"><i class="fa-solid fa-masks-theater"></i> ${member.character}</p>
                        <p class="cast-member-meta"><i class="fa-solid fa-location-dot"></i> ${nationality}</p>
                        <p class="cast-member-meta"><i class="fa-solid fa-cake-candles"></i> ${ageDisplay}</p>
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
            const [{ cast }, personDetails, excludedFilmographyGenreIds] = await Promise.all([
                fetchFromApi(`person/${personId}/combined_credits?language=en-US`),
                fetchFromApi(`person/${personId}?language=en-US`),
                Promise.all([getExcludedGenreIds('movie'), getExcludedGenreIds('tv')]).then(res => [...new Set(res.flat())])
            ]);
    
            const filteredCredits = (cast || []).filter(item => {
                if (item.media_type !== 'movie' && item.media_type !== 'tv') return false;
                if (!item.poster_path) return false;
                if (item.media_type === 'movie' && !item.release_date) return false;
                if (item.media_type === 'tv' && !item.first_air_date) return false;
                return !isItemExcluded(item, excludedFilmographyGenreIds);
            });
    
            const films = filteredCredits
                .filter(item => item.media_type === 'movie')
                .sort((a, b) => new Date(b.release_date) - new Date(a.release_date));
    
            const tvSeries = filteredCredits
                .filter(item => item.media_type === 'tv')
                .sort((a, b) => new Date(b.first_air_date) - new Date(a.first_air_date));
    
            const createGridHTML = (items) => {
                if (!items || items.length === 0) return '';
                let gridHTML = '<div class="filmography-grid">';
                items.forEach(item => {
                    const posterUrl = `https://image.tmdb.org/t/p/w200${item.poster_path}`;
                    const title = (item.title || item.name || '').replace(/'/g, "\\'");
                    const releaseYear = (item.release_date || item.first_air_date || 'N/A').substring(0, 4);
                    const voteAverage = item.vote_average ? item.vote_average.toFixed(1) : 'N/A';
                    
                    gridHTML += `
                         <div class="filmography-item" onclick="showFilmographyItemDetails(${item.id}, '${item.media_type}')">
                            <img src="${posterUrl}" alt="${title}" class="filmography-item-poster"/>
                            <div class="filmography-item-overlay">
                                <div class="filmography-item-meta">
                                    <span>${releaseYear}</span>
                                    <div class="filmography-item-rating">
                                        <i class="fas fa-star"></i>
                                        <span>${voteAverage}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    `;
                });
                gridHTML += '</div>';
                return gridHTML;
            };
            
            const encodedName = encodeURIComponent(name);
            const imdbId = personDetails.imdb_id;

            let finalHTML = `<div class="modal-title-container">
                                 <h2 class="modal-title">Filmography of ${name}</h2>
                                 <a href="https://www.google.com/search?q=${encodedName}" target="_blank" class="external-link-btn" title="Search for ${name} on Google">
                                     <i class="fab fa-google"></i>
                                 </a>`;

            if (imdbId) {
                finalHTML += `<a href="https://www.imdb.com/name/${imdbId}/" target="_blank" class="external-link-btn" title="View ${name} on IMDb">
                                  <i class="fab fa-imdb"></i>
                              </a>`;
            }
            finalHTML += '</div>';
    
            if (films.length > 0) {
                finalHTML += `<h4 style="font-size: 1.25rem; font-weight: 600; color: #3c4148; margin-top: 1.5rem;">Films</h4>`;
                finalHTML += createGridHTML(films);
            }
    
            if (tvSeries.length > 0) {
                finalHTML += `<h4 style="font-size: 1.25rem; font-weight: 600; color: #3c4148; margin-top: 1.5rem;">TV Series</h4>`;
                finalHTML += createGridHTML(tvSeries);
            }
    
            if (films.length === 0 && tvSeries.length === 0) {
                finalHTML += `<p class="modal-body-text" style="text-align: center; margin-top: 1rem;">No filmography found.</p>`;
            }
    
            content = `<div data-filmography-person-id="${personId}">${finalHTML}</div>`;

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
            content.dataset.id = itemId;
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

            updateAllCardWatchlistIcons();
            
            content.querySelector('.watchlist-btn').onclick = (e) => { e.stopPropagation(); toggleWatchlistAction(itemId, itemType, e.currentTarget); };
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
        currentPage = 1;
        totalPages = 1;
        if (isActorSearchMode) {
            if (searchTerm.length > 2) {
                fetchAndDisplayActors();
            } else if (searchTerm.length === 0) {
                fetchAndDisplayPopularActors();
            } else {
                mediaContainer.innerHTML = '';
                noResults.classList.add('hidden');
                loader.classList.add('hidden');
            }
        } else {
            (isWatchlistMode || isWatchingMode) ? displayWatchlist() : resetAndFetch();
        }
    };
    const debouncedSearch = debounce(handleSearch, 1000);

    // --- EVENT LISTENERS ---
    watchingBtn.addEventListener('click', () => {
        // Toggling 'Watching' mode
        isWatchingMode = !isWatchingMode;
        watchingBtn.classList.toggle('active', isWatchingMode);

        if (isWatchingMode) {
            // If turning on, disable other modes
            isWatchlistMode = false;
            watchlistBtn.classList.remove('active');
            isActorSearchMode = false;
            actorSearchToggle.classList.remove('active');
            
            mediaType = 'tv'; // Watching is only for TV
            movieTypeBtn.classList.remove('active');
            tvTypeBtn.classList.add('active');
            
            displayWatchlist();
        } else {
            // If turning off, revert to discover view
            resetAndFetch();
        }
        updateFiltersUI();
    });

    watchlistBtn.addEventListener('click', () => {
        // Toggling 'Watchlist' mode
        isWatchlistMode = !isWatchlistMode;
        watchlistBtn.classList.toggle('active', isWatchlistMode);

        if (isWatchlistMode) {
            // If turning on, disable other modes
            isWatchingMode = false;
            watchingBtn.classList.remove('active');
            isActorSearchMode = false;
            actorSearchToggle.classList.remove('active');
            
            if (!movieTypeBtn.classList.contains('active') && !tvTypeBtn.classList.contains('active')) {
                movieTypeBtn.classList.add('active');
                mediaType = 'movie';
            }
            displayWatchlist();
        } else {
            // If turning off, revert to discover view
            resetAndFetch();
        }
        updateFiltersUI();
    });

    actorSearchToggle.addEventListener('click', () => {
        isActorSearchMode = !isActorSearchMode;
        actorSearchToggle.classList.toggle('active', isActorSearchMode);
        
        currentPage = 1;
        totalPages = 1;
        
        // Turn off other modes when activating actor search
        if (isActorSearchMode) {
            isWatchlistMode = false;
            watchlistBtn.classList.remove('active');
            isWatchingMode = false;
            watchingBtn.classList.remove('active');
            movieTypeBtn.classList.remove('active');
            tvTypeBtn.classList.remove('active');
            
            if (searchTerm) {
                handleSearch();
            } else {
                fetchAndDisplayPopularActors();
            }
        } else {
            movieTypeBtn.classList.add('active'); // Default to films
            mediaType = 'movie';
            resetAndFetch();
        }
        updateFiltersUI();
    });

    movieTypeBtn.addEventListener('click', () => {
        if (mediaType === 'movie' && !isActorSearchMode) return;
        
        if (mediaType !== 'movie') {
            selectedNetwork = '';
            if (customSelects.network) customSelects.network.reset();
        }
        
        // When switching to movies, turn off special modes
        isActorSearchMode = false;
        actorSearchToggle.classList.remove('active');
        isWatchingMode = false;
        watchingBtn.classList.remove('active');
        
        mediaType = 'movie';
        movieTypeBtn.classList.add('active');
        tvTypeBtn.classList.remove('active');
        
        fetchAndDisplayHeroBanner();
        updateFiltersUI();
        // If watchlist is active, filter it for movies, otherwise do a fresh fetch
        isWatchlistMode ? displayWatchlist() : resetAndFetch();
    });

    tvTypeBtn.addEventListener('click', () => {
        if (mediaType === 'tv' && !isActorSearchMode) return;

        // When switching to TV, turn off special modes
        isActorSearchMode = false;
        actorSearchToggle.classList.remove('active');
        isWatchingMode = false;
        watchingBtn.classList.remove('active');

        mediaType = 'tv';
        tvTypeBtn.classList.add('active');
        movieTypeBtn.classList.remove('active');

        fetchAndDisplayHeroBanner();
        updateFiltersUI();
        // If watchlist is active, filter it for TV, otherwise do a fresh fetch
        isWatchlistMode ? displayWatchlist() : resetAndFetch();
    });
    
    searchInput.addEventListener('input', (e) => {
        searchTerm = e.target.value;
        debouncedSearch();
    });
    
    resetBtn.addEventListener('click', () => {
        isWatchlistMode = false;
        isWatchingMode = false;
        isActorSearchMode = false;
        mediaType = 'movie';
        searchTerm = '';
        selectedGenre = '';
        selectedYear = '';
        selectedCountry = '';
        selectedLanguage = '';
        selectedNetwork = '';
        currentPage = 1;
        totalPages = 1;

        watchlistBtn.classList.remove('active');
        watchingBtn.classList.remove('active');
        actorSearchToggle.classList.remove('active');
        movieTypeBtn.classList.add('active');
        tvTypeBtn.classList.remove('active');
        searchInput.value = '';
        
        Object.values(customSelects).forEach(s => s.reset());
        fetchAndDisplayHeroBanner();
        updateFiltersUI();
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

    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible' && lastPlayedItem && lastPlayedItem.type === 'tv') {
            const itemToProcess = { ...lastPlayedItem }; // Make a copy
            lastPlayedItem = null; // Null immediately to prevent re-trigger

            const seriesData = watchlistItems.find(item => item.id === itemToProcess.id);
            if (!seriesData || !seriesData.seasons) {
                return;
            }

            let nextUp = null;
            const currentSeasonData = seriesData.seasons.find(s => s.season_number === itemToProcess.season);

            if (currentSeasonData && itemToProcess.episode < currentSeasonData.episode_count) {
                nextUp = { season: itemToProcess.season, episode: itemToProcess.episode + 1 };
            } else {
                const nextSeasonData = seriesData.seasons.find(s => s.season_number === itemToProcess.season + 1);
                if (nextSeasonData && nextSeasonData.episode_count > 0) {
                    nextUp = { season: nextSeasonData.season_number, episode: 1 };
                }
            }
            
            if (nextUp) {
                const message = `Finished this Episode of ${itemToProcess.title}? (S. ${itemToProcess.season} Ep. ${itemToProcess.episode})`;
                const buttonText = `Watch Next`;
                
                const onAction = () => {
                    const src = `https://vidsrc.xyz/embed/tv?tmdb=${itemToProcess.id}&season=${nextUp.season}&episode=${nextUp.episode}`;
                    const watchedProgress = JSON.parse(localStorage.getItem('watchedProgress')) || {};
                    watchedProgress[itemToProcess.id] = { season: nextUp.season, episode: nextUp.episode };
                    localStorage.setItem('watchedProgress', JSON.stringify(watchedProgress));

                    // When user clicks 'watch next', we can set this as the new lastPlayedItem,
                    // in case they come back from that tab.
                    lastPlayedItem = { ...itemToProcess, season: nextUp.season, episode: nextUp.episode };
                    window.open(src, '_blank');

                    // Update the UI on the card if it's visible
                    const cardWrapper = document.querySelector(`.media-card[data-id="${seriesData.id}"]`)?.closest('.media-card-wrapper');
                    if (cardWrapper) {
                         const seasonSelect = cardWrapper.querySelector('.player-season-select');
                         const episodeSelect = cardWrapper.querySelector('.player-episode-select');
                         if(seasonSelect) seasonSelect.value = nextUp.season;
                         const selectedSeasonData = seriesData.seasons.find(s => s.season_number == nextUp.season);
                         if (selectedSeasonData && episodeSelect) {
                            episodeSelect.innerHTML = generateEpisodeOptions(selectedSeasonData.episode_count);
                            episodeSelect.value = nextUp.episode;
                         }
                    }
                };
                showNextEpisodeToast(message, buttonText, onAction);
            }
        }
    });

    const observer = new IntersectionObserver(entries => {
        if (entries[0].isIntersecting && !isLoading) {
            if (isActorSearchMode && searchTerm.length === 0) {
                if (currentPage < totalPages) {
                    currentPage++;
                    fetchAndDisplayPopularActors(currentPage, true);
                }
            } else if (!isWatchlistMode && !isWatchingMode && !isActorSearchMode) {
                if (currentPage < totalPages) {
                    currentPage++;
                    fetchAndDisplayMedia(currentPage, true);
                }
            }
        }
    }, { rootMargin: '200px' });

    observer.observe(sentinel);
    
    // --- INITIALIZATION ---
    fetchFilterOptions();
    updateFiltersUI();
    resetAndFetch();
    fetchWatchlist().then(() => {
        fetchAndDisplayHeroBanner();
        updateAllCardWatchlistIcons();
    });
});

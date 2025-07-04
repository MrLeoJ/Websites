
document.addEventListener('DOMContentLoaded', () => {
    // --- STATE ---
    const API_V3_KEY = '329f898e5642c90715fd2b4a81f0e2d6';
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

    // Filter states
    let selectedGenre = '';
    let selectedYear = '';
    let selectedCountry = '';
    let selectedLanguage = '';

    // --- DOM ELEMENTS ---
    const header = document.getElementById('app-header');
    const movieTypeBtn = document.getElementById('movie-type-btn');
    const tvTypeBtn = document.getElementById('tv-type-btn');
    const searchInput = document.getElementById('search-input');
    const mediaContainer = document.getElementById('media-container');
    const loader = document.getElementById('loader');
    const noResults = document.getElementById('no-results');
    const sentinel = document.getElementById('sentinel');
    const resetBtn = document.getElementById('reset-filters-btn');
    const modalContainer = document.getElementById('modal-container');
    const filtersBar = document.querySelector('.filters-bar');
    const backToTopBtn = document.getElementById('back-to-top-btn');

    const genreFilterWrapper = document.getElementById('genre-filter-wrapper');
    const yearFilterWrapper = document.getElementById('year-filter-wrapper');
    const countryFilterWrapper = document.getElementById('country-filter-wrapper');
    const languageFilterWrapper = document.getElementById('language-filter-wrapper');

    // --- API SERVICE ---
    const fetchFromApi = async (endpoint, options = {}) => {
        const separator = endpoint.includes('?') ? '&' : '?';
        const url = `${API_BASE_URL}/${endpoint}${separator}api_key=${API_V3_KEY}`;
        try {
            const response = await fetch(url, options);
            if (!response.ok) {
                mediaContainer.innerHTML = `<div class="no-results-container" style="display: block;"><i class="fas fa-exclamation-triangle"></i><p>API Error</p><p>Could not fetch data. Please check the API key or network connection.</p></div>`;
                loader.classList.add('hidden');
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
                 try {
                    const personData = await fetchFromApi(`search/person?query=${encodeURIComponent(searchTerm)}&include_adult=false&language=en-US&page=1`, { signal: currentFetchAbortController.signal });
                    const actingPersons = personData.results?.filter(p => p.known_for_department === 'Acting');
                    
                    if (actingPersons && actingPersons.length > 0) {
                        actingPersons.sort((a,b) => b.popularity - a.popularity);
                        const mostPopularActor = actingPersons[0];
                        showFilmography(mostPopularActor.id, mostPopularActor.name);
                        isLoading = false;
                        loader.classList.add('hidden');
                        if (!append) mediaContainer.innerHTML = '';
                        noResults.classList.add('hidden');
                        currentFetchAbortController = null;
                        return; 
                    }
                } catch (error) {
                    if (error.name !== 'AbortError') console.error("Person search failed, falling back to media search", error);
                }

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
        } catch (error) {
            if (error.name !== 'AbortError') console.error("Failed to fetch media:", error);
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
                fetchFromApi(`genre/${mediaType}/list?language=en`),
                fetchFromApi(`configuration/countries`),
            ]);

            const excludedLower = EXCLUDED_GENRE_NAMES.map(name => name.toLowerCase());
            const genreOptions = (genresData.genres || [])
                .filter(g => !excludedLower.includes(g.name.toLowerCase()))
                .map(g => ({ value: g.id, name: g.name }));

            const languageOptions = [
                { value: 'en', name: 'English' }, { value: 'pt', name: 'Portuguese' }, 
                { value: 'fr', name: 'French' }, { value: 'es', name: 'Spanish' }, { value: 'it', name: 'Italian' }
            ];

            const countryOptions = (countriesData || [])
                .sort((a,b) => a.english_name.localeCompare(b.english_name))
                .map(c => ({ value: c.iso_3166_1, name: c.english_name }));
            
            const yearOptions = [];
            const currentYear = new Date().getFullYear();
            for(let i=0; i<70; i++) yearOptions.push({value: currentYear-i, name: String(currentYear-i)});
            
            customSelects.genre = createCustomSelect(genreFilterWrapper, 'All Genres', genreOptions, (value) => { selectedGenre = value; resetAndFetch(); });
            customSelects.year = createCustomSelect(yearFilterWrapper, 'All Years', yearOptions, (value) => { selectedYear = value; resetAndFetch(); });
            customSelects.country = createCustomSelect(countryFilterWrapper, 'All Countries', countryOptions, (value) => { selectedCountry = value; resetAndFetch(); });
            customSelects.language = createCustomSelect(languageFilterWrapper, 'All Languages', languageOptions, (value) => { selectedLanguage = value; resetAndFetch(); });

        } catch (error) {
            console.error("Failed to fetch filter options:", error);
        }
    };

    const resetAndFetch = () => {
        currentPage = 1;
        totalPages = 1;
        fetchAndDisplayMedia(1, false);
    };
    
    // --- HTML TEMPLATES (Element Creators) ---
    const createMediaCardElement = (media) => {
        const title = media.title || media.name || 'Unknown Title';
        const releaseYear = (media.release_date || media.first_air_date || 'N/A').substring(0, 4);
        const posterUrl = media.poster_path ? `https://image.tmdb.org/t/p/w500${media.poster_path}` : UNAVAILABLE_IMAGE_URL;
        const type = media.media_type || mediaType;
        const escapedTitle = title.replace(/'/g, "\\'");
        const voteAverage = media.vote_average ? media.vote_average.toFixed(1) : '0.0';

        const card = document.createElement('div');
        card.className = 'media-card';
        card.dataset.id = media.id;
        card.dataset.type = type;
        card.dataset.detailsLoaded = 'false';

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
                    <div class="details-spinner">
                        <div class="spinner-small"></div>
                    </div>
                    <div class="details-content hidden">
                       <div class="details-text-container">
                           <div class="country-text-container hidden"><strong><i class="fa-solid fa-earth-americas" aria-hidden="true"></i></strong>⠀<span class="country-text"></span></div>
                           <div class="language-text-container hidden"><strong><i class="fa-regular fa-message" aria-hidden="true"></i></strong>⠀</strong><span class="language-text"></span></div>
                           <div class="genres-text-container hidden"><strong><i class="fa-solid fa-clapperboard" aria-hidden="true"></i></strong>⠀</strong><span class="genres-text"></span></div>
                           <div class="runtime-text-container hidden"><strong></strong><i class="fa-regular fa-clock" aria-hidden="true"></i></strong>⠀<span class="runtime-text"></span></div>
                       </div>
                       <div class="details-buttons">
                            <button class="details-btn trailer-btn" title="Watch Trailer"><i class="fas fa-play"></i></button>
                            <button class="details-btn synopsis-btn" title="Read Synopsis"><i class="fas fa-info-circle"></i></button>
                            <button class="details-btn cast-btn" title="View Cast"><i class="fas fa-users"></i></button>
                       </div>
                    </div>
                </div>
            </div>
        `;

        card.querySelector('.trailer-btn').onclick = (e) => { e.stopPropagation(); showTrailer(media.id, type); };
        card.querySelector('.synopsis-btn').onclick = (e) => { e.stopPropagation(); showSynopsis(media.id, type, escapedTitle); };
        card.querySelector('.cast-btn').onclick = (e) => { e.stopPropagation(); showCast(media.id, type); };

        return card;
    };
    
    // --- MODAL & EVENT HANDLERS ---
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
        if (!card || card.dataset.detailsLoaded === 'true') return;
        
        card.dataset.detailsLoaded = 'true';
        
        const id = card.dataset.id;
        const type = card.dataset.type;
        const detailsPane = card.querySelector('.details-pane');
        const spinner = card.querySelector('.details-spinner');
        const content = card.querySelector('.details-content');
        
        detailsPane.style.maxHeight = '200px';
        detailsPane.style.opacity = '1';

        try {
            const details = await fetchFromApi(`${type}/${id}?language=en-US`);
            
            const runtime = details.runtime || (details.episode_run_time ? details.episode_run_time[0] : null);
            if (runtime) {
                card.querySelector('.runtime-text').textContent = `${Math.floor(runtime/60)}h ${runtime%60}m`;
                card.querySelector('.runtime-text-container').classList.remove('hidden');
            }
            
            const country = details.production_countries?.[0]?.name;
            if(country) {
                let displayCountry = country;
                if (country === 'United States of America') displayCountry = 'USA';
                if (country === 'United Kingdom') displayCountry = 'UK';
                card.querySelector('.country-text').textContent = displayCountry;
                card.querySelector('.country-text-container').classList.remove('hidden');
            }

            const language = details.spoken_languages?.[0]?.english_name;
             if(language) {
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
        } catch(err) {
            console.error("Error fetching details on hover", err);
            spinner.innerHTML = `<p class="details-error-text">Could not load details.</p>`;
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
                            <button class="details-btn trailer-btn" title="Watch Trailer"><i class="fas fa-play"></i> Trailer</button>
                            <button class="details-btn cast-btn" title="View Cast"><i class="fas fa-users"></i> Cast</button>
                       </div>
                    </div>
                </div>
            `;
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

    const debouncedSearch = debounce(resetAndFetch, 1000);

    // --- EVENT LISTENERS ---
    movieTypeBtn.addEventListener('click', () => {
        if(mediaType === 'movie') return;
        mediaType = 'movie';
        movieTypeBtn.classList.add('active');
        tvTypeBtn.classList.remove('active');
        searchInput.placeholder = 'Search Films or Actors...';
        fetchFilterOptions();
        resetAndFetch();
    });

    tvTypeBtn.addEventListener('click', () => {
        if(mediaType === 'tv') return;
        mediaType = 'tv';
        tvTypeBtn.classList.add('active');
        movieTypeBtn.classList.remove('active');
        searchInput.placeholder = 'Search TV Series or Actors...';
        fetchFilterOptions();
        resetAndFetch();
    });
    
    searchInput.addEventListener('input', (e) => {
        searchTerm = e.target.value;
        debouncedSearch();
    });
    
    resetBtn.addEventListener('click', () => {
        selectedGenre = '';
        selectedYear = '';
        selectedCountry = '';
        selectedLanguage = '';
        Object.values(customSelects).forEach(s => s.reset());
        searchInput.value = '';
        searchTerm = '';
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
                resetAndFetch();
            }
        }
    });
    
    document.addEventListener('click', () => {
        document.querySelectorAll('.custom-select-options.open').forEach(optionsContainer => {
            optionsContainer.classList.remove('open');
        });
    });

    const observer = new IntersectionObserver(entries => {
        if (entries[0].isIntersecting && !isLoading && currentPage < totalPages) {
            currentPage++;
            fetchAndDisplayMedia(currentPage, true);
        }
    }, { rootMargin: '200px' });

    observer.observe(sentinel);
    
    // --- INITIALIZATION ---
    fetchFilterOptions();
    fetchAndDisplayMedia();
});
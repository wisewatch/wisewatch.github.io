const TMDB_API_KEY = '1e6c49b4cc57e66a33167920ed6ce4cb';
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const USER_ID = 'user1';

function getRatedMovieIds() {
  const ratings = JSON.parse(localStorage.getItem('movieRatings_user1') || '{}');
  return Object.keys(ratings).map(id => parseInt(id, 10));
}

function getLikedAndInterestedMovieIds() {
  const ratings = JSON.parse(localStorage.getItem('movieRatings_user1') || '{}');
  return Object.entries(ratings)
    .filter(([_, v]) => v === 'liked' || v === 'interested')
    .map(([k, _]) => parseInt(k, 10));
}

async function fetchRecommendedMovies(movieId) {
  const res = await fetch(`${TMDB_BASE_URL}/movie/${movieId}/recommendations?api_key=${TMDB_API_KEY}&language=en-US&page=1`);
  const data = await res.json();
  return data.results || [];
}

function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
}

function renderMovies(movies) {
  const container = document.getElementById('discoverMovies');
  container.innerHTML = '';
  if (movies.length === 0) {
    container.innerHTML = '<div class="text-center">No recommendations yet. Rate some movies first!</div>';
    return;
  }
  
  movies.forEach(async (movie) => {
    const col = document.createElement('div');
    col.className = 'col-12 mb-4';
    
    // Get additional movie information
    const certification = await getMovieCertification(movie.id);
    const streamingInfo = await getStreamingInfo(movie.id, 'movie');
    const trailerUrl = await getTrailerUrl(movie.id, 'movie');
    
    col.innerHTML = `
      <div class="result-item">
        <div class="movie-content">
          <div class="movie-header">
            <h3>${movie.title}</h3>
            ${trailerUrl ? `
              <button class="trailer-btn" onclick="window.open('${trailerUrl}', '_blank')">
                <span class="trailer-icon">▶</span>
                Watch Trailer
              </button>
            ` : ''}
          </div>
          <p>Release Date: ${movie.release_date || 'Unknown'}</p>
          <p>Rating: ${(movie.vote_average / 2).toFixed(1)}/5</p>
          <p>Age Rating: ${certification}</p>
          
          <div class="dropdown-section">
            <button class="dropdown-btn" onclick="toggleDropdown(this)">
              Overview <span class="dropdown-arrow">▼</span>
            </button>
            <div class="dropdown-content">
              <p>${movie.overview || 'No overview available.'}</p>
            </div>
          </div>

          <div class="dropdown-section">
            <button class="dropdown-btn" onclick="toggleDropdown(this)">
              Where to Watch <span class="dropdown-arrow">▼</span>
            </button>
            <div class="dropdown-content">
              ${createProviderHTML(streamingInfo)}
            </div>
          </div>

          <div class="action-buttons">
            <button onclick="addToWatchHistory(${JSON.stringify(movie).replace(/"/g, '&quot;')})" class="choice-btn">Add to Watch History</button>
            <button onclick="addToWatchlist('movie', ${JSON.stringify(movie).replace(/"/g, '&quot;')})" class="choice-btn">Add to Watchlist</button>
          </div>
        </div>
        ${movie.poster_path ? `<img src="https://image.tmdb.org/t/p/w200${movie.poster_path}" alt="${movie.title} poster">` : ''}
      </div>
    `;
    container.appendChild(col);
  });
}

async function discoverMovies() {
  const likedIds = getLikedAndInterestedMovieIds();
  const alreadyRated = new Set(getRatedMovieIds());
  if (likedIds.length === 0) {
    renderMovies([]);
    return;
  }
  // Get filter values
  const minYear = document.getElementById('minYear').value;
  const maxYear = document.getElementById('maxYear').value;
  const minRating = document.getElementById('ratingFilter').value;
  const ageRating = document.getElementById('ageRatingFilter').value;
  const servicesFilter = document.getElementById('servicesFilter')?.value === 'true';

  const recMap = new Map(); // movieId -> {movie, count}
  for (const id of likedIds) {
    const recs = await fetchRecommendedMovies(id);
    for (const rec of recs) {
      if (alreadyRated.has(rec.id)) continue; // skip already rated
      // Filter by year
      if (minYear && rec.release_date && rec.release_date < `${minYear}-01-01`) continue;
      if (maxYear && rec.release_date && rec.release_date > `${maxYear}-12-31`) continue;
      // Filter by rating
      if (minRating && rec.vote_average < parseFloat(minRating)) continue;
      // Filter by age rating (certification)
      if (ageRating && rec.adult !== undefined) {
        // Note: TMDB API doesn't always provide certification in recs, so this is a best effort
        // You may want to fetch details for each rec to get certification if needed
        // For now, skip this filter if not available
      }
      // Apply services filter if enabled
      if (servicesFilter) {
        const userServices = JSON.parse(localStorage.getItem('userServices_user1') || '[]');
        if (userServices.length > 0) {
          // Filter movies to only show those available on user's services
          // This is a simplified filter - in a real app you'd check actual availability
          // For now, we'll show all movies but add a note about the filter
          console.log('Services filter enabled, user services:', userServices);
        }
      }
      if (!recMap.has(rec.id)) {
        recMap.set(rec.id, { movie: rec, count: 1 });
      } else {
        recMap.get(rec.id).count++;
      }
    }
  }
  // Convert to array, sort by count desc, then shuffle within same-count groups
  let recArr = Array.from(recMap.values());
  recArr.sort((a, b) => b.count - a.count);
  // Shuffle within same-count groups for variety
  let grouped = [];
  let lastCount = null;
  let group = [];
  for (const item of recArr) {
    if (lastCount === null || item.count === lastCount) {
      group.push(item);
    } else {
      shuffleArray(group);
      grouped = grouped.concat(group);
      group = [item];
    }
    lastCount = item.count;
  }
  if (group.length) shuffleArray(grouped = grouped.concat(group));
  // Only show up to 24 recommendations for performance
  renderMovies(grouped.slice(0, 24).map(x => x.movie));
}

function getRatedShowIds() {
  const ratings = JSON.parse(localStorage.getItem('showRatings_user1') || '{}');
  return Object.keys(ratings).map(id => parseInt(id, 10));
}

function getLikedAndInterestedShowIds() {
  const ratings = JSON.parse(localStorage.getItem('showRatings_user1') || '{}');
  return Object.entries(ratings)
    .filter(([_, v]) => v === 'liked' || v === 'interested')
    .map(([k, _]) => parseInt(k, 10));
}

async function fetchRecommendedShows(showId) {
  const res = await fetch(`${TMDB_BASE_URL}/tv/${showId}/recommendations?api_key=${TMDB_API_KEY}&language=en-US&page=1`);
  const data = await res.json();
  return data.results || [];
}

function renderShows(shows) {
  const container = document.getElementById('discoverShows');
  container.innerHTML = '';
  if (shows.length === 0) {
    container.innerHTML = '<div class="text-center">No show recommendations yet. Rate some shows first!</div>';
    return;
  }
  
  shows.forEach(async (show) => {
    const col = document.createElement('div');
    col.className = 'col-12 mb-4';
    
    // Get additional show information
    const streamingInfo = await getStreamingInfo(show.id, 'tv');
    const trailerUrl = await getTrailerUrl(show.id, 'tv');
    const contentRating = await getShowContentRating(show.id);
    
    col.innerHTML = `
      <div class="result-item">
        <div class="show-content">
          <div class="show-header">
            <h3>${show.name}</h3>
            ${trailerUrl ? `
              <button class="trailer-btn" onclick="window.open('${trailerUrl}', '_blank')">
                <span class="trailer-icon">▶</span>
                Watch Trailer
              </button>
            ` : ''}
          </div>
          <p>First Air Date: ${show.first_air_date || 'Unknown'}</p>
          <p>Rating: ${(show.vote_average / 2).toFixed(1)}/5</p>
          <p>Age Rating: ${contentRating}</p>
          
          <div class="dropdown-section">
            <button class="dropdown-btn" onclick="toggleDropdown(this)">
              Overview <span class="dropdown-arrow">▼</span>
            </button>
            <div class="dropdown-content">
              <p>${show.overview || 'No overview available.'}</p>
            </div>
          </div>

          <div class="dropdown-section">
            <button class="dropdown-btn" onclick="toggleDropdown(this)">
              Where to Watch <span class="dropdown-arrow">▼</span>
            </button>
            <div class="dropdown-content">
              ${createProviderHTML(streamingInfo)}
            </div>
          </div>

          <div class="action-buttons">
            <button onclick="addToWatchHistory(${JSON.stringify(show).replace(/"/g, '&quot;')})" class="choice-btn">Add to Watch History</button>
            <button onclick="addToWatchlist('show', ${JSON.stringify(show).replace(/"/g, '&quot;')})" class="choice-btn">Add to Watchlist</button>
          </div>
        </div>
        ${show.poster_path ? `<img src="https://image.tmdb.org/t/p/w200${show.poster_path}" alt="${show.name} poster">` : ''}
      </div>
    `;
    container.appendChild(col);
  });
}

async function discoverShows() {
  const likedIds = getLikedAndInterestedShowIds();
  const alreadyRated = new Set(getRatedShowIds());
  if (likedIds.length === 0) {
    renderShows([]);
    return;
  }
  // Get filter values
  const minYear = document.getElementById('minYear').value;
  const maxYear = document.getElementById('maxYear').value;
  const minRating = document.getElementById('ratingFilter').value;
  const status = document.getElementById('statusFilter').value;
  const servicesFilter = document.getElementById('servicesFilter')?.value === 'true';

  const recMap = new Map(); // showId -> {show, count}
  for (const id of likedIds) {
    const recs = await fetchRecommendedShows(id);
    for (const rec of recs) {
      if (alreadyRated.has(rec.id)) continue; // skip already rated
      // Filter by year
      if (minYear && rec.first_air_date && rec.first_air_date < `${minYear}-01-01`) continue;
      if (maxYear && rec.first_air_date && rec.first_air_date > `${maxYear}-12-31`) continue;
      // Filter by rating
      if (minRating && rec.vote_average < parseFloat(minRating)) continue;
      // Filter by status (not available in recs, so skip for now)
      // Apply services filter if enabled
      if (servicesFilter) {
        const userServices = JSON.parse(localStorage.getItem('userServices_user1') || '[]');
        if (userServices.length > 0) {
          // Filter shows to only show those available on user's services
          // This is a simplified filter - in a real app you'd check actual availability
          // For now, we'll show all shows but add a note about the filter
          console.log('Services filter enabled, user services:', userServices);
        }
      }
      if (!recMap.has(rec.id)) {
        recMap.set(rec.id, { show: rec, count: 1 });
      } else {
        recMap.get(rec.id).count++;
      }
    }
  }
  // Convert to array, sort by count desc, then shuffle within same-count groups
  let recArr = Array.from(recMap.values());
  recArr.sort((a, b) => b.count - a.count);
  // Shuffle within same-count groups for variety
  let grouped = [];
  let lastCount = null;
  let group = [];
  for (const item of recArr) {
    if (lastCount === null || item.count === lastCount) {
      group.push(item);
    } else {
      shuffleArray(group);
      grouped = grouped.concat(group);
      group = [item];
    }
    lastCount = item.count;
  }
  if (group.length) shuffleArray(grouped = grouped.concat(group));
  // Only show up to 24 recommendations for performance
  renderShows(grouped.slice(0, 24).map(x => x.show));
}

// --- Call both discover functions on load ---
function refreshRecommendations() {
  if (document.getElementById('movies-tab').classList.contains('active')) {
    discoverMovies();
  } else {
    discoverShows();
  }
}

discoverMovies();
discoverShows();

// Helper functions for movie and show functionality
async function getMovieCertification(movieId) {
  try {
    const response = await fetch(`${TMDB_BASE_URL}/movie/${movieId}/release_dates?api_key=${TMDB_API_KEY}`);
    const data = await response.json();
    const usRating = data.results.find(r => r.iso_3166_1 === 'US');
    return usRating?.release_dates[0]?.certification || 'Not Rated';
  } catch (error) {
    console.error('Error fetching movie certification:', error);
    return 'Not Rated';
  }
}

async function getStreamingInfo(itemId, type = 'movie') {
  try {
    const endpoint = type === 'movie' ? 'movie' : 'tv';
    const response = await fetch(`${TMDB_BASE_URL}/${endpoint}/${itemId}/watch/providers?api_key=${TMDB_API_KEY}`);
    const data = await response.json();
    const usProviders = data.results.US;
    return usProviders || { flatrate: [], rent: [], buy: [] };
  } catch (error) {
    console.error('Error fetching streaming info:', error);
    return { flatrate: [], rent: [], buy: [] };
  }
}

async function getShowContentRating(showId) {
  try {
    const response = await fetch(`${TMDB_BASE_URL}/tv/${showId}/content_ratings?api_key=${TMDB_API_KEY}`);
    const data = await response.json();
    const usRating = data.results.find(r => r.iso_3166_1 === 'US');
    return usRating?.rating || 'Not Rated';
  } catch (error) {
    console.error('Error fetching show content rating:', error);
    return 'Not Rated';
  }
}

async function getTrailerUrl(itemId, type = 'movie') {
  try {
    const endpoint = type === 'movie' ? 'movie' : 'tv';
    const response = await fetch(`${TMDB_BASE_URL}/${endpoint}/${itemId}/videos?api_key=${TMDB_API_KEY}`);
    const data = await response.json();
    const trailer = data.results.find(video => video.type === 'Trailer' && video.site === 'YouTube');
    return trailer ? `https://www.youtube.com/watch?v=${trailer.key}` : null;
  } catch (error) {
    console.error('Error fetching trailer:', error);
    return null;
  }
}

function createProviderHTML(providers) {
  if (!providers || (!providers.flatrate && !providers.rent && !providers.buy)) {
    return '<p>No streaming information available.</p>';
  }

  return `
    <div class="streaming-providers">
      ${providers.flatrate && providers.flatrate.length > 0 ? `
        <div class="provider-group">
          <h4>Stream On:</h4>
          <div class="provider-list">
            ${providers.flatrate.map(p => `
              <div class="provider-item">
                <img src="https://image.tmdb.org/t/p/w45${p.logo_path}" alt="${p.provider_name}" title="${p.provider_name}">
                <span>${p.provider_name}</span>
              </div>
            `).join('')}
          </div>
        </div>
      ` : ''}
      ${providers.rent && providers.rent.length > 0 ? `
        <div class="provider-group">
          <h4>Rent On:</h4>
          <div class="provider-list">
            ${providers.rent.map(p => `
              <div class="provider-item">
                <img src="https://image.tmdb.org/t/p/w45${p.logo_path}" alt="${p.provider_name}" title="${p.provider_name}">
                <span>${p.provider_name}</span>
              </div>
            `).join('')}
          </div>
        </div>
      ` : ''}
      ${providers.buy && providers.buy.length > 0 ? `
        <div class="provider-group">
          <h4>Buy On:</h4>
          <div class="provider-list">
            ${providers.buy.map(p => `
              <div class="provider-item">
                <img src="https://image.tmdb.org/t/p/w45${p.logo_path}" alt="${p.provider_name}" title="${p.provider_name}">
                <span>${p.provider_name}</span>
              </div>
            `).join('')}
          </div>
        </div>
      ` : ''}
    </div>
  `;
}

// Add toggleDropdown function to window scope
window.toggleDropdown = function(button) {
  const content = button.nextElementSibling;
  const arrow = button.querySelector('.dropdown-arrow');
  
  if (content.style.display === 'block') {
    content.style.display = 'none';
    arrow.textContent = '▼';
  } else {
    content.style.display = 'block';
    arrow.textContent = '▲';
  }
};

// Make addToWatchHistory available globally
window.addToWatchHistory = async function(item) {
  try {
    // Get current profile from localStorage
    const savedProfile = localStorage.getItem(`userProfile_${USER_ID}`);
    let userProfile = savedProfile ? JSON.parse(savedProfile) : { watchHistory: [] };
    
    if (!Array.isArray(userProfile.watchHistory)) {
      userProfile.watchHistory = [];
    }
    
    // Check if item already exists in history
    const existingIndex = userProfile.watchHistory.findIndex(m => m.id === item.id);
    if (existingIndex !== -1) {
      // Update existing entry
      userProfile.watchHistory[existingIndex] = {
        ...userProfile.watchHistory[existingIndex],
        watchedDate: new Date().toISOString()
      };
    } else {
      // Add new entry
      userProfile.watchHistory.unshift({
        id: item.id,
        title: item.title || item.name,
        name: item.name || item.title,
        poster_path: item.poster_path,
        overview: item.overview,
        release_date: item.release_date || item.first_air_date,
        vote_average: item.vote_average,
        watchedDate: new Date().toISOString(),
        type: item.title ? 'movie' : 'tv'
      });
    }
    
    // Keep only last 20 items
    if (userProfile.watchHistory.length > 20) {
      userProfile.watchHistory = userProfile.watchHistory.slice(0, 20);
    }
    
    // Save to localStorage
    localStorage.setItem(`userProfile_${USER_ID}`, JSON.stringify(userProfile));
    
    alert('Added to watch history!');
  } catch (error) {
    console.error('Error adding to watch history:', error);
    alert('Error adding to watch history. Please try again.');
  }
};

window.addToWatchlist = function(type, item) {
  const watchlist = JSON.parse(localStorage.getItem(type + 'Watchlist')) || [];
  // Check if item is already in watchlist
  if (watchlist.some(existingItem => existingItem.id === item.id)) {
    alert('This item is already in your watchlist!');
    return;
  }
  // Add to watchlist
  watchlist.push(item);
  localStorage.setItem(type + 'Watchlist', JSON.stringify(watchlist));
  alert('Added to watchlist!');
};

// --- AI Chatbot Logic ---
document.addEventListener('DOMContentLoaded', function() {
  const aiBtn = document.getElementById('aiChatbotBtn');
  const aiModal = document.getElementById('aiChatbotModal');
  const aiForm = document.getElementById('aiChatbotForm');
  const aiInput = document.getElementById('aiChatbotInput');
  const aiMessages = document.getElementById('aiChatbotMessages');

  if (aiBtn && aiModal && aiForm && aiInput && aiMessages) {
    aiBtn.onclick = () => {
      aiModal.style.display = 'flex';
      setTimeout(() => aiInput.focus(), 200);
      
      // Show welcome message if this is the first time opening
      if (aiMessages.children.length === 0) {
        appendAIMessage('assistant', 'Hi! I\'m WiseWatch AI, your personal movie and TV show recommendation assistant! 🎬✨\n\nI can help you find the perfect watch based on your mood, genre preferences, or specific requests. Here are some examples of what you can ask me:\n\n• "I want a feel-good comedy to cheer me up"\n• "Something scary for a Halloween movie night"\n• "A romantic movie for date night"\n• "An action-packed TV show to binge"\n• "A documentary about space"\n• "Something similar to Stranger Things"\n\nJust tell me what you\'re in the mood for, and I\'ll suggest the perfect title for you!');
      }
    };
    window.closeAIChatbot = function() {
      aiModal.style.display = 'none';
    };
    aiForm.onsubmit = async (e) => {
      e.preventDefault();
      const userMsg = aiInput.value.trim();
      if (!userMsg) return;
      appendAIMessage('user', userMsg);
      aiInput.value = '';
      aiInput.disabled = true;
      await getAIResponse(userMsg);
      aiInput.disabled = false;
      aiInput.focus();
    };
  } else {
    console.error('Some AI chatbot elements not found:', { aiBtn, aiModal, aiForm, aiInput, aiMessages });
  }
});

function appendAIMessage(role, text) {
  const aiMessages = document.getElementById('aiChatbotMessages');
  if (!aiMessages) return;
  
  const msgDiv = document.createElement('div');
  msgDiv.style.marginBottom = '12px';
  msgDiv.style.display = 'flex';
  msgDiv.style.justifyContent = role === 'user' ? 'flex-end' : 'flex-start';
  msgDiv.innerHTML = `
    <div style="max-width:80%;padding:10px 14px;border-radius:14px;${role==='user' ? 'background:linear-gradient(90deg,#a259ff,#f24e1e);color:white;' : 'background:#f3f3f3;color:#222;'};box-shadow:0 1px 4px rgba(0,0,0,0.04);">
      ${role==='user' ? '<i class="fas fa-user me-1"></i>' : '<i class="fas fa-robot me-1"></i>'}${text}
    </div>
  `;
  aiMessages.appendChild(msgDiv);
  aiMessages.scrollTop = aiMessages.scrollHeight;
}

async function getAIResponse(userMsg) {
  const aiMessages = document.getElementById('aiChatbotMessages');
  if (!aiMessages) {
    console.error('aiMessages element not found');
    return;
  }
  
  appendAIMessage('assistant', '<span style="opacity:0.7"><i class="fas fa-spinner fa-spin"></i> Thinking...</span>');
  aiMessages.scrollTop = aiMessages.scrollHeight;
  
  console.log('Starting AI response for:', userMsg);
  
  // Simulate a short delay for better UX
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  console.log('Delay completed, removing spinner');
  
  // Remove spinner
  if (aiMessages.lastChild) {
    aiMessages.removeChild(aiMessages.lastChild);
  }
  
  console.log('Spinner removed, generating TMDB recommendation');
  
  // More flexible keyword matching for TMDB
  const userMsgLower = userMsg.toLowerCase();
  console.log('User message (lowercase):', userMsgLower);
  
  // Define genre mappings for TMDB
  const genreMappings = {
    comedy: 35,
    horror: 27,
    romance: 10749,
    action: 28,
    drama: 18,
    family: 10751,
    sciFi: 878,
    documentary: 99,
    thriller: 53,
    adventure: 12,
    animation: 16,
    fantasy: 14,
    mystery: 9648,
    crime: 80,
    war: 10752,
    western: 37,
    music: 10402,
    history: 36,
    tvMovie: 10770
  };
  
  // Determine what to search for
  let searchType = 'movie'; // default to movies
  let genreId = null;
  let keywords = [];
  
  // Check for TV show indicators
  if (userMsgLower.includes('tv') || userMsgLower.includes('show') || userMsgLower.includes('series') || userMsgLower.includes('episode') || userMsgLower.includes('season')) {
    searchType = 'tv';
  }
  
  // Determine genre based on keywords
  if (userMsgLower.includes('comedy') || userMsgLower.includes('funny') || userMsgLower.includes('humor') || userMsgLower.includes('laugh') || userMsgLower.includes('cheer') || userMsgLower.includes('happy') || userMsgLower.includes('feel-good')) {
    genreId = genreMappings.comedy;
    keywords = ['comedy', 'funny', 'humor'];
  } else if (userMsgLower.includes('scary') || userMsgLower.includes('horror') || userMsgLower.includes('spooky') || userMsgLower.includes('creepy') || userMsgLower.includes('frightening')) {
    genreId = genreMappings.horror;
    keywords = ['horror', 'scary', 'thriller'];
  } else if (userMsgLower.includes('romantic') || userMsgLower.includes('romance') || userMsgLower.includes('love') || userMsgLower.includes('date') || userMsgLower.includes('sweet') || userMsgLower.includes('cute')) {
    genreId = genreMappings.romance;
    keywords = ['romance', 'romantic', 'love'];
  } else if (userMsgLower.includes('action') || userMsgLower.includes('adventure') || userMsgLower.includes('exciting') || userMsgLower.includes('thrilling') || userMsgLower.includes('intense') || userMsgLower.includes('fast-paced')) {
    genreId = genreMappings.action;
    keywords = ['action', 'adventure', 'exciting'];
  } else if (userMsgLower.includes('drama') || userMsgLower.includes('emotional') || userMsgLower.includes('serious') || userMsgLower.includes('touching') || userMsgLower.includes('moving') || userMsgLower.includes('powerful')) {
    genreId = genreMappings.drama;
    keywords = ['drama', 'emotional', 'serious'];
  } else if (userMsgLower.includes('family') || userMsgLower.includes('kids') || userMsgLower.includes('children') || userMsgLower.includes('wholesome') || userMsgLower.includes('innocent')) {
    genreId = genreMappings.family;
    keywords = ['family', 'kids', 'wholesome'];
  } else if (userMsgLower.includes('sci-fi') || userMsgLower.includes('science fiction') || userMsgLower.includes('futuristic') || userMsgLower.includes('space') || userMsgLower.includes('technology') || userMsgLower.includes('mind-bending')) {
    genreId = genreMappings.sciFi;
    keywords = ['sci-fi', 'science fiction', 'futuristic'];
  } else if (userMsgLower.includes('documentary') || userMsgLower.includes('real') || userMsgLower.includes('true story') || userMsgLower.includes('educational') || userMsgLower.includes('informative')) {
    genreId = genreMappings.documentary;
    keywords = ['documentary', 'real', 'educational'];
  } else if (userMsgLower.includes('thriller') || userMsgLower.includes('suspense') || userMsgLower.includes('mystery')) {
    genreId = genreMappings.thriller;
    keywords = ['thriller', 'suspense', 'mystery'];
  } else if (userMsgLower.includes('fantasy') || userMsgLower.includes('magical') || userMsgLower.includes('wizard') || userMsgLower.includes('supernatural')) {
    genreId = genreMappings.fantasy;
    keywords = ['fantasy', 'magical', 'supernatural'];
  } else if (userMsgLower.includes('animation') || userMsgLower.includes('animated') || userMsgLower.includes('cartoon')) {
    genreId = genreMappings.animation;
    keywords = ['animation', 'animated'];
  }
  
  try {
    let recommendations = [];
    
    if (genreId) {
      console.log(`Searching for ${searchType} with genre ID: ${genreId}`);
      // Get recommendations by genre
      const response = await fetch(`https://api.themoviedb.org/3/discover/${searchType}?api_key=1e6c49b4cc57e66a33167920ed6ce4cb&with_genres=${genreId}&sort_by=popularity.desc&vote_count.gte=100&page=1`);
      const data = await response.json();
      
      if (data.results && data.results.length > 0) {
        // Get top 3 results
        recommendations = data.results.slice(0, 3);
      }
    }
    
    // If no genre-specific results or no genre matched, get popular content
    if (recommendations.length === 0) {
      console.log('No genre-specific results, getting popular content');
      const response = await fetch(`https://api.themoviedb.org/3/${searchType}/popular?api_key=${TMDB_API_KEY}&page=1`);
      const data = await response.json();
      
      if (data.results && data.results.length > 0) {
        recommendations = data.results.slice(0, 3);
      }
    }
    
    if (recommendations.length > 0) {
      const randomRec = recommendations[Math.floor(Math.random() * recommendations.length)];
      const title = searchType === 'tv' ? randomRec.name : randomRec.title;
      const year = searchType === 'tv' ? 
        (randomRec.first_air_date ? new Date(randomRec.first_air_date).getFullYear() : '') :
        (randomRec.release_date ? new Date(randomRec.release_date).getFullYear() : '');
      const rating = randomRec.vote_average ? randomRec.vote_average.toFixed(1) : 'N/A';
      const overview = randomRec.overview || 'No description available.';
      
      const genreText = keywords.length > 0 ? keywords[0] : 'popular';
      const typeText = searchType === 'tv' ? 'TV show' : 'movie';
      
      const recommendation = `🎬 **${title}** ${year ? `(${year})` : ''}\n\n⭐ **Rating:** ${rating}/10\n\n📝 **Overview:** ${overview.length > 200 ? overview.substring(0, 200) + '...' : overview}\n\nBased on your interest in ${genreText} ${typeText}s, I think you'll love this one! It's currently trending and highly rated by viewers.`;
      
      console.log('TMDB recommendation generated:', recommendation);
      appendAIMessage('assistant', recommendation);
    } else {
      // Fallback message
      const fallback = "I'm having trouble finding recommendations right now, but here are some popular picks:\n\n🎬 **The Shawshank Redemption** - A powerful drama about hope and redemption\n🎬 **The Grand Budapest Hotel** - A delightful comedy with stunning visuals\n🎬 **Inception** - A mind-bending sci-fi thriller\n\nTry asking for a specific genre like 'comedy', 'horror', or 'romance' for more targeted recommendations!";
      appendAIMessage('assistant', fallback);
    }
    
  } catch (error) {
    console.error('Error fetching TMDB recommendations:', error);
    // Fallback to static recommendations
    const fallback = "I'm having trouble connecting to my recommendation database right now, but here are some great picks:\n\n🎬 **The Grand Budapest Hotel** - A delightful feel-good comedy\n🎬 **The Shawshank Redemption** - A powerful drama about hope\n🎬 **Mad Max: Fury Road** - An adrenaline-pumping action film\n\nTry asking for a specific genre like 'comedy', 'horror', or 'romance'!";
    appendAIMessage('assistant', fallback);
  }
  
  console.log('Recommendation sent to chat');
} 

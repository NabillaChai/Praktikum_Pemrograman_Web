// OpenWeatherMap API Configuration
const API_KEY = '26e7f13a8b7096d8d5b92a6ff3f171d6';
const BASE_URL = 'https://api.openweathermap.org/data/2.5';

// State
let currentUnit = 'metric';
let currentCity = '';
let favorites = JSON.parse(localStorage.getItem('weatherFavorites')) || [];
let updateInterval;

// Popular cities for autocomplete
const popularCities = [
    'Jakarta', 'Bandung', 'Surabaya', 'Medan', 'Semarang',
    'Makassar', 'Palembang', 'Tangerang', 'Depok', 'Bekasi',
    'Bandar Lampung', 'Yogyakarta', 'Malang', 'Bogor', 'Batam',
    'Pekanbaru', 'Padang', 'Denpasar', 'Samarinda', 'Pontianak',
    'Manado', 'Balikpapan', 'Jambi', 'Cimahi', 'Banjarmasin',
    'Serang', 'Mataram', 'Tasikmalaya', 'Bengkulu', 'Palu',
    'Sukabumi', 'Kediri', 'Cilegon', 'Tegal', 'Binjai',
    'London', 'New York', 'Tokyo', 'Paris', 'Singapore',
    'Sydney', 'Dubai', 'Mumbai', 'Bangkok', 'Seoul'
];

// Weather condition mapping
const weatherConditions = {
    'clear sky': 'clear-sky',
    'few clouds': 'few-clouds',
    'scattered clouds': 'scattered-clouds',
    'broken clouds': 'broken-clouds',
    'overcast clouds': 'overcast-clouds',
    'shower rain': 'shower-rain',
    'rain': 'rain',
    'light rain': 'light-rain',
    'moderate rain': 'moderate-rain',
    'thunderstorm': 'thunderstorm',
    'snow': 'snow',
    'mist': 'mist',
    'fog': 'fog',
    'haze': 'haze'
};

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    initializeApp();
    loadFavorites();

    // Get user's location
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            position => {
                fetchWeatherByCoords(position.coords.latitude, position.coords.longitude);
            },
            () => {
                fetchWeather('Bandar Lampung');
            }
        );
    } else {
        fetchWeather('Bandar Lampung');
    }
});

function initializeApp() {
    // Search functionality
    document.getElementById('searchBtn').addEventListener('click', handleSearch);
    document.getElementById('citySearch').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleSearch();
    });

    // Autocomplete
    document.getElementById('citySearch').addEventListener('input', handleAutocomplete);

    // Refresh button
    document.getElementById('refreshBtn').addEventListener('click', handleRefresh);

    // Theme toggle
    document.getElementById('themeToggle').addEventListener('click', toggleTheme);

    // Load saved theme
    const savedTheme = localStorage.getItem('weatherTheme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
    updateThemeButton();

    // Load saved unit preference
    const savedUnit = localStorage.getItem('weatherUnit') || 'metric';
    currentUnit = savedUnit;
    updateUnitButtons();
}

function handleSearch() {
    const city = document.getElementById('citySearch').value.trim();
    if (city) {
        fetchWeather(city);
        document.getElementById('suggestions').classList.remove('active');
    }
}

function handleRefresh() {
    if (!currentCity) {
        showError('No city selected. Please search for a city first.');
        return;
    }

    const refreshBtn = document.getElementById('refreshBtn');
    refreshBtn.classList.add('refreshing');

    fetchWeather(currentCity).then(() => {
        setTimeout(() => {
            refreshBtn.classList.remove('refreshing');
        }, 500);
    });
}

function handleAutocomplete(e) {
    const value = e.target.value.toLowerCase();
    const suggestionsDiv = document.getElementById('suggestions');

    if (value.length < 2) {
        suggestionsDiv.classList.remove('active');
        return;
    }

    const matches = popularCities
        .filter(city => city.toLowerCase().includes(value))
        .slice(0, 5);

    if (matches.length > 0) {
        suggestionsDiv.innerHTML = matches
            .map(city => `<div class="suggestion-item" onclick="selectCity('${city}')">${city}</div>`)
            .join('');
        suggestionsDiv.classList.add('active');
    } else {
        suggestionsDiv.classList.remove('active');
    }
}

function selectCity(city) {
    document.getElementById('citySearch').value = city;
    document.getElementById('suggestions').classList.remove('active');
    fetchWeather(city);
}

async function fetchWeather(city) {
    try {
        showLoading(true);
        hideError();

        const geoUrl = `https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(city)}&limit=1&appid=${API_KEY}`;
        const geoResponse = await fetch(geoUrl);

        if (!geoResponse.ok) {
            throw new Error('Tidak dapat menemukan lokasi');
        }

        const geoData = await geoResponse.json();

        if (geoData.length === 0) {
            throw new Error(`Kota "${city}" tidak ditemukan. Coba kota yang lebih besar.`);
        }

        const location = geoData[0];

        const weatherUrl = `${BASE_URL}/weather?lat=${location.lat}&lon=${location.lon}&appid=${API_KEY}&units=${currentUnit}&lang=id`;
        const weatherResponse = await fetch(weatherUrl);

        if (!weatherResponse.ok) {
            throw new Error('Tidak dapat mengambil data cuaca');
        }

        const weatherData = await weatherResponse.json();

        currentCity = location.name;

        if (location.state) {
            weatherData.name = `${location.name}, ${location.state}`;
        } else {
            weatherData.name = location.name;
        }

        weatherData.sys.country = location.country;

        displayCurrentWeather(weatherData);
        fetchForecast(location.lat, location.lon);
        startAutoRefresh();

    } catch (error) {
        console.error('Error:', error);
        showError(error.message);
        showLoading(false);
    }
}

async function fetchWeatherByCoords(lat, lon) {
    try {
        showLoading(true);
        hideError();

        const url = `${BASE_URL}/weather?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=${currentUnit}&lang=id`;
        const weatherResponse = await fetch(url);

        if (!weatherResponse.ok) {
            throw new Error('Unable to fetch weather data');
        }

        const weatherData = await weatherResponse.json();
        currentCity = weatherData.name;

        displayCurrentWeather(weatherData);
        fetchForecast(lat, lon);
        startAutoRefresh();

    } catch (error) {
        showError('Unable to fetch weather data for your location.');
        showLoading(false);
        fetchWeather('Bandar Lampung');
    }
}

async function fetchForecast(lat, lon) {
    try {
        const url = `${BASE_URL}/forecast?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=${currentUnit}&lang=id`;
        const forecastResponse = await fetch(url);

        if (!forecastResponse.ok) {
            throw new Error('Unable to fetch forecast');
        }

        const forecastData = await forecastResponse.json();
        displayForecast(forecastData);

    } catch (error) {
        console.error('Error fetching forecast:', error);
    }
}

function getWeatherClass(description) {
    const lowerDesc = description.toLowerCase();

    for (const [key, className] of Object.entries(weatherConditions)) {
        if (lowerDesc.includes(key)) {
            return className;
        }
    }

    if (lowerDesc.includes('cloud')) return 'few-clouds';
    if (lowerDesc.includes('rain')) return 'rain';
    if (lowerDesc.includes('storm')) return 'thunderstorm';
    if (lowerDesc.includes('snow')) return 'snow';
    if (lowerDesc.includes('clear')) return 'clear-sky';

    return 'few-clouds';
}

function displayCurrentWeather(data) {
    const currentWeatherDiv = document.getElementById('currentWeather');
    const temp = Math.round(data.main.temp);
    const feelsLike = Math.round(data.main.feels_like);
    const humidity = data.main.humidity;
    const windSpeed = Math.round(data.wind.speed * (currentUnit === 'metric' ? 3.6 : 1));
    const windUnit = currentUnit === 'metric' ? 'km/h' : 'mph';
    const tempUnit = currentUnit === 'metric' ? '°C' : '°F';
    const icon = data.weather[0].icon;
    const description = data.weather[0].description;

    const timestamp = new Date().toLocaleString('id-ID', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });

    const weatherClass = getWeatherClass(description);
    currentWeatherDiv.className = `current-weather ${weatherClass}`;

    const isFavorite = favorites.includes(data.name);

    currentWeatherDiv.innerHTML = `
        <div class="weather-main">
            <div class="weather-info">
                <div class="location">
                    <i class="fas fa-map-marker-alt"></i> ${data.name}, ${data.sys.country}
                </div>
                <div class="timestamp">${timestamp}</div>
                <div class="temperature">${temp}${tempUnit}</div>
                <div class="weather-description">${description}</div>
                <button class="btn btn-primary" onclick="toggleFavorite('${data.name}')">
                    <i class="fas fa-star"></i>
                    ${isFavorite ? 'Remove from Favorites' : 'Add to Favorites'}
                </button>
            </div>
            <div class="weather-icon-main">
                <img src="https://openweathermap.org/img/wn/${icon}@4x.png" alt="${description}">
            </div>
        </div>

        <div class="weather-details">
            <div class="detail-item">
                <div class="detail-label">Feels Like</div>
                <div class="detail-value">${feelsLike}${tempUnit}</div>
            </div>
            <div class="detail-item">
                <div class="detail-label">Humidity</div>
                <div class="detail-value">${humidity}%</div>
            </div>
            <div class="detail-item">
                <div class="detail-label">Wind Speed</div>
                <div class="detail-value">${windSpeed} ${windUnit}</div>
            </div>
            <div class="detail-item">
                <div class="detail-label">Pressure</div>
                <div class="detail-value">${data.main.pressure} hPa</div>
            </div>
        </div>
    `;

    currentWeatherDiv.style.display = 'block';
    showLoading(false);
}

function displayForecast(data) {
    const forecastGrid = document.getElementById('forecastGrid');
    const forecastSection = document.getElementById('forecastSection');

    const dailyForecasts = data.list
        .filter(item => item.dt_txt.includes('12:00:00'))
        .slice(0, 5);

    const tempUnit = currentUnit === 'metric' ? '°C' : '°F';

    forecastGrid.innerHTML = dailyForecasts.map(day => {
        const date = new Date(day.dt * 1000);
        const dayName = date.toLocaleDateString('id-ID', { weekday: 'short' });

        const temp = Math.round(day.main.temp);
        const tempMin = Math.round(day.main.temp_min);
        const tempMax = Math.round(day.main.temp_max);
        const icon = day.weather[0].icon;
        const description = day.weather[0].description;

        return `
            <div class="forecast-card">
                <div class="forecast-day">${dayName}</div>
                <div class="forecast-icon">
                    <img src="https://openweathermap.org/img/wn/${icon}@2x.png" alt="${description}">
                </div>
                <div class="forecast-temp">${temp}${tempUnit}</div>
                <div class="temp-range">${tempMin}° / ${tempMax}°</div>
                <div class="forecast-desc">${description}</div>
            </div>
        `;
    }).join('');

    forecastSection.style.display = 'block';
}

function setUnit(unit) {
    currentUnit = unit;
    localStorage.setItem('weatherUnit', unit);
    updateUnitButtons();

    if (currentCity) {
        fetchWeather(currentCity);
    }
}

function updateUnitButtons() {
    const celsiusBtn = document.getElementById('celsiusBtn');
    const fahrenheitBtn = document.getElementById('fahrenheitBtn');

    if (currentUnit === 'metric') {
        celsiusBtn.classList.add('active');
        fahrenheitBtn.classList.remove('active');
    } else {
        celsiusBtn.classList.remove('active');
        fahrenheitBtn.classList.add('active');
    }
}

function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';

    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('weatherTheme', newTheme);

    updateThemeButton();
}

function updateThemeButton() {
    const theme = document.documentElement.getAttribute('data-theme');
    const btn = document.getElementById('themeToggle');

    btn.innerHTML = theme === 'dark'
        ? '<i class="fas fa-sun"></i>'
        : '<i class="fas fa-moon"></i>';
}

function toggleFavorite(city) {
    const index = favorites.indexOf(city);

    if (index > -1) {
        favorites.splice(index, 1);
    } else {
        if (favorites.length >= 10) {
            showError('You can only save up to 10 favorite cities.');
            return;
        }
        favorites.push(city);
    }

    localStorage.setItem('weatherFavorites', JSON.stringify(favorites));
    loadFavorites();

    if (currentCity === city) {
        fetchWeather(currentCity);
    }
}

function loadFavorites() {
    const favoritesGrid = document.getElementById('favoritesGrid');

    if (favorites.length === 0) {
        favoritesGrid.innerHTML = `
            <p style="color: var(--text-secondary); font-size: 15px;">
                No favorite cities yet. Search for a city and add it to favorites!
            </p>`;
        return;
    }

    favoritesGrid.innerHTML = favorites
        .map(city => `
            <div class="favorite-item" onclick="fetchWeather('${city}')">
                <span><i class="fas fa-star"></i> ${city}</span>
                <button class="remove-favorite"
                    onclick="event.stopPropagation(); toggleFavorite('${city}')">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `)
        .join('');
}

function startAutoRefresh() {
    if (updateInterval) {
        clearInterval(updateInterval);
    }

    updateInterval = setInterval(() => {
        if (currentCity) {
            console.log('Auto-refreshing weather data...');
            fetchWeather(currentCity);
        }
    }, 300000);
}

function showLoading(show) {
    const loadingDiv = document.getElementById('loadingCurrent');
    if (loadingDiv) {
        loadingDiv.style.display = show ? 'block' : 'none';
    }
}

function showError(message) {
    const errorDiv = document.getElementById('errorMessage');

    errorDiv.innerHTML = `<i class="fas fa-exclamation-circle"></i> ${message}`;
    errorDiv.classList.add('active');

    setTimeout(() => {
        errorDiv.classList.remove('active');
    }, 7000);
}

function hideError() {
    document.getElementById('errorMessage').classList.remove('active');
}

document.addEventListener('click', (e) => {
    if (!e.target.closest('.navbar-search')) {
        document.getElementById('suggestions').classList.remove('active');
    }
});

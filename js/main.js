// --------------------------------+
// Initializing the Refresh Button |
// --------------------------------+

const app = document.querySelector('.app');
const refreshButton = document.querySelector('.button-refresh');
refreshButton.addEventListener('click', refreshUI);

function refreshUI() {
  app.classList.add('refreshing');
  setTimeout(() => app.classList.remove('refreshing'), 800);

  console.log('REFRESH');
  refreshCountryData();
  rebuildTable();
}

// ----------------------+
// Fetching country data |
// ----------------------+

let countryObj = {};
let myCountries = [];
let countriesContainer = document.querySelector('.countries');

fetch('https://thevirustracker.com/free-api?countryTotals=ALL')
.then((response) => {
  return response.json();
})
.then((data) => {  
  buildCountryObject(data);
  initializeState();
});

// ------------------------------------------------
// Initialize country array based on local storage 
    // TESTING OF LOCAL STORAGE
    // chrome.storage.local.remove('myCountries');
// ------------------------------------------------

function initializeState() {
  chrome.storage.sync.get('myCountries', function (result) {
    if (!result.myCountries) {
      myCountries = topFive(countryObj);
      chrome.storage.sync.set({ 'myCountries': myCountries });
    }
    else {
      myCountries = result.myCountries;
      refreshCountryData();
    }
    rebuildTable();
  });
}

// ---------------------------
// Refresh Country Data 
// ---------------------------

function refreshCountryData() {
  for (let i = 0; i < myCountries.length; i++) {
    myCountries[i] = countryObj[myCountries[i].title.toLowerCase()];
  }
}

// ---------------------------
// Build up the Country Object 
// ---------------------------

function buildCountryObject(data) {
  // key = Country Names, values = Country Object
  for (let [key, value] of Object.entries(data.countryitems[0])) {
    if (value.title) {
      countryObj[value.title.toLowerCase()] = value;
    }
  }
}

// --------------------
// Adding new countries 
// --------------------

const addCountryInput = document.querySelector('.country-form__input');
const addCountryButton = document.querySelector('.country-form__button');

addCountryButton.addEventListener('click', addCountry);

function addCountry(e) {
  const newCountry = findCountry(addCountryInput.value);
  e.preventDefault();
  if (myCountries.includes(newCountry)) {
    console.log('There\'s already an old man in my country.');
  }
  else if (newCountry) {
    myCountries.push(newCountry);
    chrome.storage.sync.set({ 'myCountries': myCountries });
    rebuildTable();
    addCountryInput.value = "";
  }
  else console.log('No country for old men.')
}

// -----------------------------------------------------------------------
// Returns matched country
// Additionally - acts as a fail safe for user who mistypes a country name 
// -----------------------------------------------------------------------

function findCountry(country) {
  if (countryObj.hasOwnProperty(country.toLowerCase())) {
    return countryObj[country.toLowerCase()];
  }
  // TODO: check alternate country spelling object as a fail safe
}

// --------------------------------
// Rebuilds the UI - Countries List 
// --------------------------------

function rebuildTable() {
  let element = "";
  sortCountries(myCountries);
  for (let country of myCountries) element+=createRow(country).outerHTML;
  countriesContainer.innerHTML=element;
  activateDeleteButtons();
}

// ----------------
// Delete a Country
// ----------------

function deleteCountry(countryKey) {
  for (let i=0; i < myCountries.length; i++) {
    if (myCountries[i].ourid === Number(countryKey)) {
      myCountries.splice(i, 1);
      chrome.storage.sync.set({ 'myCountries': myCountries });
      rebuildTable();
      return;
    }
  }
  console.log('Country is gone.');
}

// -----------------------------------------------------------------
// Activate the event listeners for the delete country functionality 
// -----------------------------------------------------------------

function activateDeleteButtons() {
  const deleteButtons = document.querySelectorAll('.remove-country');
  for (let button of [...deleteButtons]) {
    button.addEventListener('click', () => {
      deleteCountry(button.getAttribute('data-ourid'));
    });
  }
}

// -------------------------
// Create a New Country Road 
// -------------------------

function createRow(country) {
  const div = document.createElement('div');
  div.classList.add('country');

  div.innerHTML = `
    <button class="remove-country" data-ourid="${country.ourid}">
      <svg version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px" viewBox="0 0 14 14" style="enable-background:new 0 0 14 14;" xml:space="preserve">
        <path d="M14,1.4L12.6,0L7,5.6L1.4,0L0,1.4L5.6,7L0,12.6L1.4,14L7,8.4l5.6,5.6l1.4-1.4L8.4,7L14,1.4z"/>
      </svg>
    </button>
    <div class="country__name">${country.title}</div>
    <!-- Confirmed -->
    <div class="statistic column-confirmed">
      <div class="statistic__count">${formatNumber(country.total_cases)}</div>
      <div class="statistic__change">+${calculatePercentage(country.total_new_cases_today, country.total_cases)}%</div>
    </div>
    <!-- Deaths -->
    <div class="statistic column-deaths">
      <div class="statistic__count">${formatNumber(country.total_deaths)}</div>
      <div class="statistic__change">+${calculatePercentage(country.total_new_deaths_today, country.total_deaths)}%</div>
    </div>
    <!-- Recovered -->
    <div class="statistic column-recovered">
      <div class="statistic__count">${formatNumber(country.total_recovered)}</div>
      <div class="statistic__change"></div>
    </div>
  `;
  return div;
}

// -----------------------------------
// HELPER: Calculate percentage change
// -----------------------------------

function calculatePercentage(casesToday, casesTotal) {
  let percent = casesToday/casesTotal;
  if (isNaN(percent)) {
    return "0.00";
  } else {
    return (percent * 100).toFixed(2);
  }
}

// ----------------------------
// HELPER: format number for UI 
// ----------------------------

function formatNumber(number) {

  // ---------------
  // Up to a thousand
  // ---------------

  if (number < 1000) {
    return number;
  }

  // ---------------
  // Up to a million
  // ---------------

  if (number < 1000000) {
    let preDigit = String(number).split('');
    const removedDigits = Number(preDigit.slice(-2).join(''));

    preDigit.splice(-2);
    
    // If the removed digits are greater than 50, round last value up
    if (removedDigits >= 50) {
      const newValue = Number(preDigit.join('')) + 1;
      preDigit = String(newValue).split('');
    }

    preDigit.splice(preDigit.length-1, 0, '.');
    preDigit.push('<span>k</span>');
    return preDigit.join('');
  }

  // ---------------
  // Up to a billion
  // ---------------

  let preDigit = String(number).split('');
  const removedDigits = Number(preDigit.slice(-5).join(''));

  preDigit.splice(-5);

  // If the removed digits are greater than 50000, round last value up
  if (removedDigits >= 50000) {
    const newValue = Number(preDigit.join('')) + 1;
    preDigit = String(newValue).split('');
  }

  preDigit.splice(preDigit.length-1, 0, '.');
  preDigit.push('<span>m</span>');
  return preDigit.join('');
}

// --------------------------------------------------------
// HELPER: returns the smallest element of the passed array 
// --------------------------------------------------------

function getSmallestValue(countries) {
  let smallest = countries[0];
  for (let country of countries) {
    if (smallest.total_cases > country.total_cases) smallest = country;
  }
  return smallest;
}

// --------------------------------------------------------
// Acquire the top five countries to initiate the extension 
// --------------------------------------------------------

function topFive(countries) {    
  const sampleCountry = countries["botswana"]; 
  const mostCasesArray = [sampleCountry, sampleCountry, sampleCountry, sampleCountry, sampleCountry];
  for (let key in countries) {  
    const leastCase = getSmallestValue(mostCasesArray);
    if (leastCase.total_cases < countries[key].total_cases) {
      const indexOfLeastCase = mostCasesArray.indexOf(leastCase);
      mostCasesArray[indexOfLeastCase] = countryObj[key];
    }
  }

  return mostCasesArray;
}

// ------------------------------
// HELPER: Sort the Country Array 
// ------------------------------

function sortCountries(array) {
  return array.sort((a, b) => {
    return b.total_cases - a.total_cases;
  });
}

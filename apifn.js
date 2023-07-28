const api_key = 'af997705b123f58d19bbb59f31377a6c';
var request = require('request');

function getWeather(city) {
    result = undefined;
    let url = `http://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${api_key}`;
    // console.log(url);
    let req = request(url, cb);
    while (result === undefined) {
        require('deasync').runLoopOnce();
    }
    // console.log(result);
    return result;
}

function getWeatherByCor(lat, lon) {
    result = undefined;
    let url = `http://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${api_key}`;
    // console.log(url);
    let req = request(url, cb);
    while (result === undefined) {
        require('deasync').runLoopOnce();
    }
    console.log(result);
    return result;
}
// http://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${api_key}
function cb(err, response, body) {
    // console.log(body);
    if (err) {
        console.log('error:', err);
    }
    let weather = JSON.parse(body);
    // console.log(weather);
    // console.log('aa gya');
    if (weather.message === 'city not found') {
        result = 'unable to get weather ' + weather.message;
    } else {
        result = 'Right now its ' + (weather.main.temp - 273.15).toFixed(2) + ' degrees with ' + weather.weather[0].description + ' in ' + weather.name;
    }
    // console.log('chala gya');
}

module.exports = {getWeather, getWeatherByCor};
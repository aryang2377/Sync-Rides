// TO MAKE THE MAP APPEAR YOU MUST
// ADD YOUR ACCESS TOKEN FROM
// https://account.mapbox.com

const mapToken = window.mapToken || "";
const defaultCoordinates = [77.2090, 28.6139]; // New Delhi fallback

function initMap(coordinates) {
  if (!mapToken) {
    console.error("Mapbox token is missing. Set MAP_TOKEN in .env and pass to view.");
    return;
  }

  mapboxgl.accessToken = mapToken;

  const map = new mapboxgl.Map({
    container: "map",
    style: "mapbox://styles/mapbox/streets-v11",
    center: coordinates,
    zoom: 13,
  });

  new mapboxgl.Marker({ color: "red" })
    .setLngLat(coordinates)
    .setPopup(new mapboxgl.Popup({ offset: 25 }).setHTML("<h5>My current location</h5>"))
    .addTo(map);
}

function locateAndInit() {
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const userCoords = [position.coords.longitude, position.coords.latitude];
        initMap(userCoords);
      },
      (error) => {
        console.warn("Geolocation failed, using fallback coordinates:", error.message);
        initMap(defaultCoordinates);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  } else {
    console.warn("Geolocation is not supported; using fallback coordinates.");
    initMap(defaultCoordinates);
  }
}

locateAndInit();
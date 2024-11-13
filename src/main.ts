// todo
// Import Leaflet and required modules
import "leaflet/dist/leaflet.css";
import "./style.css";
import leaflet from "leaflet";
import "./leafletWorkaround.ts"; // Fix for marker icon issue
import luck from "./luck.ts"; // Deterministic random generator

// Define constants for starting location and gameplay settings
const OAKES_CLASSROOM = leaflet.latLng(36.98949379578401, -122.06277128548504);
const GAMEPLAY_ZOOM_LEVEL = 19;
const TILE_DEGREES = 1e-4;
const NEIGHBORHOOD_SIZE = 8;
const CACHE_SPAWN_PROBABILITY = 0.1;

// Set the application title
const app: HTMLDivElement = document.querySelector("#app")!;
const appName = "Geocoin Carrier";
document.title = appName;

const header = document.createElement("h1");
header.innerHTML = appName;
app.append(header);

// Initialize the map centered on Oakes College
const map = leaflet.map("map", {
  center: OAKES_CLASSROOM,
  zoom: GAMEPLAY_ZOOM_LEVEL,
  minZoom: GAMEPLAY_ZOOM_LEVEL,
  maxZoom: GAMEPLAY_ZOOM_LEVEL,
  zoomControl: false,
  scrollWheelZoom: false,
});

// Add OpenStreetMap tile layer
leaflet.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
  maxZoom: 18,
  attribution:
    '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
}).addTo(map);

// Player marker on the map
const playerMarker = leaflet.marker(OAKES_CLASSROOM);
playerMarker.bindTooltip("This is you!");
playerMarker.addTo(map);

// Player's inventory status panel
let playerInventory = 0;
const statusPanel = document.querySelector<HTMLDivElement>("#statusPanel")!;
statusPanel.innerHTML = "Coins collected: 0";

// Function to spawn a cache on the map
function spawnCache(i: number, j: number) {
  const origin = OAKES_CLASSROOM;
  const bounds = leaflet.latLngBounds([
    [origin.lat + i * TILE_DEGREES, origin.lng + j * TILE_DEGREES],
    [origin.lat + (i + 1) * TILE_DEGREES, origin.lng + (j + 1) * TILE_DEGREES],
  ]);

  // Create a marker for the cache
  const cacheMarker = leaflet.rectangle(bounds, { color: "blue", weight: 1 });
  cacheMarker.addTo(map);

  // Set an initial, procedurally generated coin count for the cache
  let cacheCoins = Math.floor(luck([i, j, "coins"].toString()) * 10) + 1;

  // Popup for cache interactions
  cacheMarker.bindPopup(() => {
    const popupDiv = document.createElement("div");
    popupDiv.innerHTML = `
      <div>Cache at (${i},${j}). Coins: <span id="coinCount">${cacheCoins}</span></div>
      <button id="collect">Collect</button>
      <button id="deposit">Deposit</button>
    `;

    // Collect button functionality
    popupDiv.querySelector<HTMLButtonElement>("#collect")!.addEventListener(
      "click",
      () => {
        if (cacheCoins > 0) {
          cacheCoins--;
          playerInventory++;
          popupDiv.querySelector<HTMLSpanElement>("#coinCount")!.textContent =
            cacheCoins.toString();
          statusPanel.innerHTML = `Coins collected: ${playerInventory}`;
        }
      },
    );

    // Deposit button functionality
    popupDiv.querySelector<HTMLButtonElement>("#deposit")!.addEventListener(
      "click",
      () => {
        if (playerInventory > 0) {
          cacheCoins++;
          playerInventory--;
          popupDiv.querySelector<HTMLSpanElement>("#coinCount")!.textContent =
            cacheCoins.toString();
          statusPanel.innerHTML = `Coins collected: ${playerInventory}`;
        }
      },
    );

    return popupDiv;
  });
}

// Procedurally generate caches around the player's neighborhood
for (let i = -NEIGHBORHOOD_SIZE; i <= NEIGHBORHOOD_SIZE; i++) {
  for (let j = -NEIGHBORHOOD_SIZE; j <= NEIGHBORHOOD_SIZE; j++) {
    if (luck([i, j].toString()) < CACHE_SPAWN_PROBABILITY) {
      spawnCache(i, j);
    }
  }
}

// Import Leaflet and required modules
import "leaflet/dist/leaflet.css";
import "./style.css";
import leaflet from "leaflet";
import "./leafletWorkaround.ts"; // Fix for marker icon issue
import luck from "./luck.ts"; // Deterministic random generator

// Define constants
const oakes_classroom = leaflet.latLng(36.98949379578401, -122.06277128548504);
const zoom_level = 19;
const tile_deg = 1e-4; // Movement and cache granularity
const neighborhood_size = 8;
const cache_spaw_prob = 0.1;
const scale_fac = 1e4;

// State variables
const player_location = { lat: oakes_classroom.lat, lng: oakes_classroom.lng };
const cached_locations = new Map<string, CacheState>();
const player_inventory: Coin[] = [];

// Set up app title and status panel
const app: HTMLDivElement = document.querySelector("#app")!;
const appName = "Geocoin Carrier";
document.title = appName;

const header = document.createElement("h1");
header.innerHTML = appName;
app.append(header);

const statusPanel = document.querySelector<HTMLDivElement>("#statusPanel")!;
statusPanel.innerHTML = "Coins collected: 0";

// Utility: Convert latitude and longitude to grid cell
function latLngToGridCell(lat: number, lng: number): { i: number; j: number } {
  return { i: Math.round(lat * scale_fac), j: Math.round(lng * scale_fac) };
}

// CacheLocation class (Flyweight Pattern)
class CacheLocation {
  static locations = new Map<string, CacheLocation>();
  private constructor(public i: number, public j: number) {}

  static get(lat: number, lng: number): CacheLocation {
    const { i, j } = latLngToGridCell(lat, lng);
    const key = `${i},${j}`;
    if (!CacheLocation.locations.has(key)) {
      CacheLocation.locations.set(key, new CacheLocation(i, j));
    }
    return CacheLocation.locations.get(key)!;
  }

  toString() {
    return `${this.i}:${this.j}`;
  }
}

// Memento Pattern: CacheState
class CacheState {
  constructor(public location: CacheLocation, public coins: Coin[]) {}
}

// Coin class with unique identity
class Coin {
  constructor(public location: CacheLocation, public serial: number) {}

  toString() {
    return `${this.location}#${this.serial}`;
  }
}

// Initialize map
const map = leaflet.map("map", {
  center: oakes_classroom,
  zoom: zoom_level,
  minZoom: zoom_level,
  maxZoom: zoom_level,
  zoomControl: false,
  scrollWheelZoom: false,
});

leaflet.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
  maxZoom: 19,
  attribution: "&copy; OpenStreetMap contributors",
}).addTo(map);

const playerMarker = leaflet.marker(oakes_classroom);
playerMarker.bindTooltip("This is you!");
playerMarker.addTo(map);

// Spawn cache function
function spawnCache(i: number, j: number) {
  const origin = oakes_classroom;
  const lat = origin.lat + i * tile_deg;
  const lng = origin.lng + j * tile_deg;
  const location = CacheLocation.get(lat, lng);

  if (cached_locations.has(location.toString())) {
    return; // Avoid duplicate cache creation
  }

  const bounds = leaflet.latLngBounds([
    [lat, lng],
    [lat + tile_deg, lng + tile_deg],
  ]);

  const cacheMarker = leaflet.rectangle(bounds, { color: "purple", weight: 1 });
  cacheMarker.addTo(map);

  const numCoins = Math.floor(luck([i, j, "coins"].toString()) * 10) + 1;
  const cacheCoins: Coin[] = Array.from(
    { length: numCoins },
    (_, serial) => new Coin(location, serial),
  );

  cached_locations.set(
    location.toString(),
    new CacheState(location, cacheCoins),
  );

  cacheMarker.bindPopup(() => {
    const popupDiv = document.createElement("div");
    const cacheState = cached_locations.get(location.toString())!;
    popupDiv.innerHTML = `
      <div>Cache at ${location}. Coins: ${
      cacheState.coins.map((coin) => coin.toString()).join(", ")
    }</div>
      <button id="collect">Collect Coin</button>
      <button id="deposit">Deposit Coin</button>
    `;

    popupDiv.querySelector("#collect")!.addEventListener("click", () => {
      if (cacheState.coins.length > 0) {
        const collectedCoin = cacheState.coins.pop()!;
        player_inventory.push(collectedCoin);
        updateStatusPanel();
        popupDiv.querySelector("div")!.innerHTML =
          `Cache at ${location}. Coins: ${
            cacheState.coins.map((coin) => coin.toString()).join(", ")
          }`;
      }
    });

    popupDiv.querySelector("#deposit")!.addEventListener("click", () => {
      if (player_inventory.length > 0) {
        const depositedCoin = player_inventory.pop()!;
        cacheState.coins.push(depositedCoin);
        updateStatusPanel();
        popupDiv.querySelector("div")!.innerHTML =
          `Cache at ${location}. Coins: ${
            cacheState.coins.map((coin) => coin.toString()).join(", ")
          }`;
      }
    });

    return popupDiv;
  });
}

// Generate caches in the neighborhood once
function generateInitialCaches() {
  for (let i = -neighborhood_size; i <= neighborhood_size; i++) {
    for (let j = -neighborhood_size; j <= neighborhood_size; j++) {
      if (luck([i, j].toString()) < cache_spaw_prob) {
        spawnCache(i, j);
      }
    }
  }
}

// Update the player marker
function updatePlayerMarker() {
  playerMarker.setLatLng(player_location);
}

// Update the status panel
function updateStatusPanel() {
  statusPanel.innerHTML = `Coins collected: ${
    player_inventory
      .map((coin) => coin.toString())
      .join(", ")
  }`;
}

// Handle player movement
function movePlayer(direction: "north" | "south" | "east" | "west") {
  switch (direction) {
    case "north":
      player_location.lat += tile_deg;
      break;
    case "south":
      player_location.lat -= tile_deg;
      break;
    case "east":
      player_location.lng += tile_deg;
      break;
    case "west":
      player_location.lng -= tile_deg;
      break;
  }
  updatePlayerMarker();
}

// Add event listeners to movement buttons
document.getElementById("north")!.addEventListener(
  "click",
  () => movePlayer("north"),
);
document.getElementById("south")!.addEventListener(
  "click",
  () => movePlayer("south"),
);
document.getElementById("east")!.addEventListener(
  "click",
  () => movePlayer("east"),
);
document.getElementById("west")!.addEventListener(
  "click",
  () => movePlayer("west"),
);

// Initialize the game
generateInitialCaches();
updatePlayerMarker();
updateStatusPanel();

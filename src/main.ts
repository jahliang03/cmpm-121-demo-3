// Import Leaflet and required modules
import "leaflet/dist/leaflet.css";
import "./style.css";
import leaflet from "leaflet";
import "./leafletWorkaround.ts"; // Fix for marker icon issue
import luck from "./luck.ts"; // Deterministic random generator

// Define constants
const oakes_classroom = leaflet.latLng(36.98949379578401, -122.06277128548504);
const zoom_level = 19;
const tile_deg = 1e-4;
const neighborhood_size = 8;
const cache_spaw_prob = 0.1;
const scale_fac = 1e4;

// Set up app title and status panel
const app: HTMLDivElement = document.querySelector("#app")!;
const appName = "Geocoin Carrier";
document.title = appName;

const header = document.createElement("h1");
header.innerHTML = appName;
app.append(header);

const statusPanel = document.querySelector<HTMLDivElement>("#statusPanel")!;
const playerInventory: Coin[] = [];
statusPanel.innerHTML = "Coins collected: 0";

// Convert latitude and longitude to grid coordinates,
function latLngToGridCell(lat: number, lng: number): { i: number; j: number } {
  return { i: Math.round(lat * scale_fac), j: Math.round(lng * scale_fac) };
}

// Implement CacheLocation with Flyweight Pattern
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

// Player marker
const playerMarker = leaflet.marker(oakes_classroom);
playerMarker.bindTooltip("This is you!");
playerMarker.addTo(map);

// Spawn cache function
function spawnCache(i: number, j: number) {
  const origin = oakes_classroom;
  const lat = origin.lat + i * tile_deg;
  const lng = origin.lng + j * tile_deg;
  const location = CacheLocation.get(lat, lng);

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

  cacheMarker.bindPopup(() => {
    const popupDiv = document.createElement("div");
    popupDiv.innerHTML = `
      <div>Cache at ${location}. Coins: ${
      cacheCoins.map((coin) => coin.toString()).join(", ")
    }</div>
      <button id="collect">Collect Coin</button>
      <button id="deposit">Deposit Coin</button>
    `;

    popupDiv.querySelector("#collect")!.addEventListener("click", () => {
      if (cacheCoins.length > 0) {
        const collectedCoin = cacheCoins.pop()!;
        playerInventory.push(collectedCoin);
        statusPanel.innerHTML = `Coins collected: ${
          playerInventory.map((coin) => coin.toString()).join(", ")
        }`;
        popupDiv.querySelector("div")!.innerHTML =
          `Cache at ${location}. Coins: ${
            cacheCoins.map((coin) => coin.toString()).join(", ")
          }`;
      }
    });

    popupDiv.querySelector("#deposit")!.addEventListener("click", () => {
      if (playerInventory.length > 0) {
        const depositedCoin = playerInventory.pop()!;
        cacheCoins.push(depositedCoin);
        statusPanel.innerHTML = `Coins collected: ${
          playerInventory.map((coin) => coin.toString()).join(", ")
        }`;
        popupDiv.querySelector("div")!.innerHTML =
          `Cache at ${location}. Coins: ${
            cacheCoins.map((coin) => coin.toString()).join(", ")
          }`;
      }
    });

    return popupDiv;
  });
}

// Generate caches in the neighborhood
for (let i = -neighborhood_size; i <= neighborhood_size; i++) {
  for (let j = -neighborhood_size; j <= neighborhood_size; j++) {
    if (luck([i, j].toString()) < cache_spaw_prob) {
      spawnCache(i, j);
    }
  }
}

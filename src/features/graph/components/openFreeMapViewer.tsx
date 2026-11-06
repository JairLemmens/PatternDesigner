import { useEffect, useRef } from "react";
import { useViewport } from "@xyflow/react";
import { Map as MapLibreMap, MercatorCoordinate, setWorkerUrl } from "maplibre-gl";
import mapWorkerUrl from "maplibre-gl/dist/maplibre-gl-worker.mjs?url";
import "maplibre-gl/dist/maplibre-gl.css";
import "./openFreeMapViewer.css";

setWorkerUrl(mapWorkerUrl);

const INITIAL_CENTER: [number, number] = [-77.6088, 43.1566];
const EARTH_CIRCUMFERENCE_METERS = 2 * Math.PI * 6_378_137;
const MAP_TILE_SIZE = 512;
const GRAPH_METERS_PER_UNIT = 1 / (9 * Math.sqrt(Math.PI));

function mapZoomForOneMeterPerGraphUnit(latitude: number, graphZoom: number) {
  const metersPerWorld = EARTH_CIRCUMFERENCE_METERS * Math.cos((latitude * Math.PI) / 180);
  return Math.log2((metersPerWorld * graphZoom) / MAP_TILE_SIZE);
}

function syncMapToGraphViewport(map: MapLibreMap, viewport: { x: number; y: number; zoom: number }) {
  const zoom = Math.max(-5, Math.min(35, mapZoomForOneMeterPerGraphUnit(INITIAL_CENTER[1], viewport.zoom / GRAPH_METERS_PER_UNIT)));
  const worldSize = MAP_TILE_SIZE * 2 ** zoom;
  const origin = MercatorCoordinate.fromLngLat(INITIAL_CENTER);
  const { clientWidth, clientHeight } = map.getContainer();
  const center = new MercatorCoordinate(
    origin.x + (clientWidth / 2 - viewport.x) / worldSize,
    origin.y + (clientHeight / 2 - viewport.y) / worldSize,
  ).toLngLat();
  map.jumpTo({ center, zoom });
}

/** A non-interactive OpenFreeMap basemap that follows the graph canvas. */
export function OpenFreeMapViewer() {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const viewport = useViewport();
  const viewportRef = useRef(viewport);
  viewportRef.current = viewport;

  useEffect(() => {
    if (!containerRef.current) return;
    const map = new MapLibreMap({
      container: containerRef.current,
      style: "https://tiles.openfreemap.org/styles/liberty",
      center: INITIAL_CENTER,
      zoom: mapZoomForOneMeterPerGraphUnit(INITIAL_CENTER[1], 1 / GRAPH_METERS_PER_UNIT),
      minZoom: -5,
      maxZoom: 35,
      interactive: false,
      fadeDuration: 0,
    });
    mapRef.current = map;
    map.on("load", () => syncMapToGraphViewport(map, viewportRef.current));
    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    syncMapToGraphViewport(map, viewport);
  }, [viewport]);

  return <div ref={containerRef} className="openfreemap-viewer" aria-label="OpenFreeMap basemap" />;
}

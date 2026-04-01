import { CircleMarker, MapContainer, TileLayer, useMapEvents } from "react-leaflet";

function Picker({ value, onChange }) {
  useMapEvents({
    click(event) {
      onChange({
        latitude: event.latlng.lat,
        longitude: event.latlng.lng
      });
    }
  });

  if (!value) {
    return null;
  }

  return (
    <CircleMarker
      center={[value.latitude, value.longitude]}
      radius={10}
      pathOptions={{
        color: "#20382f",
        fillColor: "#f4a652",
        fillOpacity: 1,
        weight: 3
      }}
    />
  );
}

function LocationPickerMap({ value, onChange }) {
  const center = value
    ? [value.latitude, value.longitude]
    : [20.5937, 78.9629];

  return (
    <MapContainer
      center={center}
      zoom={value ? 15 : 5}
      style={{ height: "100%", width: "100%" }}
      scrollWheelZoom
      className="location-picker-map"
    >
      <TileLayer
        attribution="&copy; OpenStreetMap"
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <Picker value={value} onChange={onChange} />
    </MapContainer>
  );
}

export default LocationPickerMap;

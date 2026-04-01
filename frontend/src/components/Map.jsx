import { CircleMarker, MapContainer, Popup, TileLayer } from "react-leaflet";

function Map({ shops, userLocation, center, zoom = 13, className = "" }) {
  return (
    <MapContainer
      center={center || userLocation}
      zoom={zoom}
      style={{ height: "100%", width: "100%" }}
      scrollWheelZoom={false}
      className={className}
    >
      <TileLayer
        attribution="&copy; OpenStreetMap"
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <CircleMarker
        center={userLocation}
        radius={11}
        pathOptions={{
          color: "#20382f",
          fillColor: "#f4a652",
          fillOpacity: 1,
          weight: 3
        }}
      >
        <Popup>You are here</Popup>
      </CircleMarker>

      {shops.map((shop, index) => {
        const coordinates = shop.location?.coordinates;
        if (!Array.isArray(coordinates) || coordinates.length < 2) {
          return null;
        }

        return (
          <CircleMarker
            key={shop._id || `${shop.shopName}-${index}`}
            center={[coordinates[1], coordinates[0]]}
            radius={9}
            pathOptions={{
              color: "#d56d2c",
              fillColor: "#fff4df",
              fillOpacity: 0.95,
              weight: 3
            }}
          >
            <Popup>
              <strong>{shop.shopName || "Press Shop"}</strong>
              <br />
              {shop.address || "Address available on booking"}
              <br />
              {typeof shop.pricePerCloth === "number" ? `Rs. ${shop.pricePerCloth} per cloth` : "Price on request"}
            </Popup>
          </CircleMarker>
        );
      })}
    </MapContainer>
  );
}

export default Map;

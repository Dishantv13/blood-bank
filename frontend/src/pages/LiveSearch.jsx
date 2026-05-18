import GeospatialSearch from "../components/GeospatialSearch";

const LiveSearch = () => {
  return (
    <div className="live-search-page">
      <div
        className="live-search-container"
        style={{
          maxWidth: "1200px",
          padding: "2rem",
          margin: "0 auto",
          paddingBottom: "80px",
        }}
      >
        <header style={{ marginBottom: "3rem" }}>
          <h1
            style={{
              fontSize: "2.6rem",
              fontWeight: "800",
              color: "var(--text-main)",
              marginBottom: "0.5rem",
              letterSpacing: "-1px",
            }}
          >
            📍 Live Geospatial Blood Finder
          </h1>
          <p style={{ color: "var(--text-muted)", fontSize: "1.1rem", maxWidth: "600px" }}>
            Detect your live coordinates and instantly locate the closest blood bank units or active donors within a custom proximity radius in real-time.
          </p>
        </header>

        <GeospatialSearch />
      </div>
    </div>
  );
};

export default LiveSearch;

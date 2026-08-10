import { useEffect, useState } from "react";
import "../styles/DestinationSearch.css";

function DestinationSearch({
  destination,
  onDestinationSelect
}) {
  const [searchText, setSearchText] = useState(
    destination?.display_name || ""
  );

  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const cleanSearchText = searchText.trim();

    if (cleanSearchText.length < 3) {
      setSuggestions([]);
      setError("");
      return;
    }

    const timer = setTimeout(async () => {
      try {
        setLoading(true);
        setError("");

        const query = encodeURIComponent(cleanSearchText);

        const response = await fetch(
          `https://nominatim.openstreetmap.org/search` +
          `?format=jsonv2` +
          `&q=${query}` +
          `&countrycodes=gb` +
          `&limit=5` +
          `&addressdetails=1`
        );

        if (!response.ok) {
          throw new Error("Destination search failed");
        }

        const results = await response.json();
        setSuggestions(results);
      } catch (searchError) {
        console.error(
          "Destination search error:",
          searchError
        );

        setError("Unable to search destinations.");
        setSuggestions([]);
      } finally {
        setLoading(false);
      }
    }, 1100);

    return () => clearTimeout(timer);
  }, [searchText]);

  const selectDestination = (place) => {
    const selectedDestination = {
      latitude: Number(place.lat),
      longitude: Number(place.lon),
      display_name: place.display_name
    };

    setSearchText(place.display_name);
    setSuggestions([]);
    setError("");

    onDestinationSelect(selectedDestination);
  };

  const handleSearchChange = (event) => {
    setSearchText(event.target.value);
    setError("");

    if (destination) {
      onDestinationSelect(null);
    }
  };

  return (
    <section className="destination-search-card">

      <label htmlFor="destination-search">
        Destination or postcode
      </label>

      <div className="destination-search-box">

        <div className="destination-search-icon-box">
          🔍
        </div>

        <input
          id="destination-search"
          className="destination-search-input"
          type="text"
          placeholder="Enter postcode, address or destination"
          value={searchText}
          autoComplete="off"
          onChange={handleSearchChange}
        />

        <div className="destination-search-state">

          {loading && (
            <span className="destination-search-spinner">
            </span>
          )}

        </div>

      </div>

      {error && (
        <div className="destination-search-error">
          {error}
        </div>
      )}

      {suggestions.length > 0 && (
        <div className="destination-suggestions">

          {suggestions.map((place) => (
            <button
              type="button"
              className="destination-suggestion"
              key={place.place_id}
              onClick={() => selectDestination(place)}
            >

              <span className="suggestion-pin">
                📍
              </span>

              <div className="suggestion-information">

                <strong>
                  {place.name ||
                    place.display_name.split(",")[0]}
                </strong>

                <p>{place.display_name}</p>

              </div>

            </button>
          ))}

        </div>
      )}

  

    </section>
  );
}

export default DestinationSearch;
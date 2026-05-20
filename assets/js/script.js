const map = L.map('map').setView([20.7, -103.5], 7);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors'
}).addTo(map);

fetch('maps/jalisco_municipios.geojson')
    .then(response => response.json())
    .then(data => {

        L.geoJSON(data, {
            style: {
                color: '#1e3a8a',
                weight: 1,
                fillColor: '#60a5fa',
                fillOpacity: 0.5
            },

            onEachFeature: function(feature, layer) {

                if (feature.properties) {

                    layer.bindPopup(
                        `<strong>${feature.properties.NOMGEO || "Municipio"}</strong>`
                    );

                }

            }

        }).addTo(map);

    });
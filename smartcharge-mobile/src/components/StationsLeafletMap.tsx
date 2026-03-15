import React, { useMemo } from "react";
import { View } from "react-native";
import { WebView } from "react-native-webview";
import type { Station } from "../features/stations/stationsApi";

type Props = {
  stations: Station[];
  onSelect: (stationId: number) => void;
};

export default function StationsLeafletMap({ stations, onSelect }: Props) {
  const html = useMemo(() => {
    const stationsJson = JSON.stringify(
      (stations ?? []).map((s: any) => ({
        id: s.id,
        name: s.name,
        lat: Number(s.lat),
        lng: Number(s.lng),
        price: Number(s.price ?? 0),
        load: Number(s.load ?? s.mockLoad ?? 0),
        status: String(s.status ?? s.mockStatus ?? "GREEN"),
      }))
    );

    // Leaflet + OSM (web ile aynı)
    return `
<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta
      name="viewport"
      content="width=device-width, initial-scale=1, maximum-scale=1"
    />
    <link
      rel="stylesheet"
      href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
    />
    <style>
      html, body, #map { height: 100%; margin: 0; padding: 0; background: #0b1220; }
      .leaflet-control-attribution { font-size: 10px; }
      .bubble {
        width: 36px; height: 36px; border-radius: 18px;
        display: flex; align-items: center; justify-content: center;
        border: 3px solid white;
        box-shadow: 0 8px 20px rgba(0,0,0,.35);
        font-weight: 900;
        color: white;
        font-size: 12px;
      }
      .popup {
        background: #111827; color: #f8fafc;
        border: 1px solid rgba(255,255,255,.12);
        border-radius: 14px; padding: 10px;
        width: 260px;
      }
      .btn {
        width: 100%;
        background: #2563eb;
        color: white;
        border: none;
        padding: 10px 12px;
        border-radius: 10px;
        font-weight: 900;
        cursor: pointer;
        margin-top: 10px;
      }
      .tag {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        font-size: 10px;
        padding: 4px 8px;
        border-radius: 999px;
        border: 1px solid rgba(255,255,255,.12);
        opacity: .9;
      }
    </style>
  </head>
  <body>
    <div id="map"></div>

    <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
    <script>
      const stations = ${stationsJson};

      const center = stations.length
        ? [stations[0].lat, stations[0].lng]
        : [38.614, 27.405];

      const map = L.map("map", { zoomControl: true }).setView(center, 12);

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: "&copy; OpenStreetMap contributors"
      }).addTo(map);

      function color(status) {
        const s = String(status || "").toUpperCase();
        if (s === "RED") return "#ef4444";
        if (s === "YELLOW") return "#f59e0b";
        return "#22c55e";
      }

      function densityText(status) {
        const s = String(status || "").toUpperCase();
        if (s === "RED") return "Yüksek Yoğunluk";
        if (s === "YELLOW") return "Orta Yoğunluk";
        return "Düşük Yoğunluk";
      }

      stations.forEach(st => {
        const icon = L.divIcon({
          className: "",
          iconSize: [36, 36],
          iconAnchor: [18, 18],
          html: '<div class="bubble" style="background:'+color(st.status)+';">' + Math.round(st.load) + '%</div>'
        });

        const popupHtml =
          '<div class="popup">' +
            '<div style="font-weight:900; font-size:14px; margin-bottom:6px;">'+ st.name +'</div>' +
            '<div class="tag">'+ densityText(st.status) +' • %'+ Math.round(st.load) +' Dolu</div>' +
            '<div style="margin-top:8px; font-size:12px; opacity:.85;">Fiyat: <b>'+ st.price +' ₺/kWh</b></div>' +
            '<button class="btn" onclick="window.ReactNativeWebView.postMessage(String('+ st.id +'))">' +
              'Saatleri Gör & Rezerve Et' +
            '</button>' +
          '</div>';

        L.marker([st.lat, st.lng], { icon }).addTo(map).bindPopup(popupHtml, { closeButton: true });
      });
    </script>
  </body>
</html>
    `;
  }, [stations]);

  return (
    <View style={{ flex: 1 }}>
      <WebView
        originWhitelist={["*"]}
        source={{ html }}
        javaScriptEnabled
        domStorageEnabled
        onMessage={(ev) => {
          const id = Number(ev.nativeEvent.data);
          if (!Number.isNaN(id)) onSelect(id);
        }}
      />
    </View>
  );
}
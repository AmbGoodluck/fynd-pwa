export type Coord = { latitude: number; longitude: number };

export type Stop = {
  id: string;
  name: string;
  description?: string;
  distance?: string;
  time?: string;
  rating?: string;
  image: string;
  coordinate: Coord;
};

const LABELS = '123456789ABCDEFGHIJKLMNOP';

/**
 * Full interactive Google Maps JS — bakes STOPS into the HTML.
 * User location + activeIdx changes are pushed later via injectJavaScript.
 */
export function buildTripHtml(stops: Stop[], mapsJsUrl: string): string {
  const stopsData = JSON.stringify(
    stops.map((s, i) => ({
      id: s.id,
      name: s.name,
      lat: s.coordinate.latitude,
      lng: s.coordinate.longitude,
      label: LABELS[i] ?? 'X',
    }))
  ).replace(/</g, '\\u003c');

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no"/>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body, #map { width: 100%; height: 100%; overflow: hidden; }
  </style>
</head>
<body>
  <div id="map"></div>
  <script>
    var STOPS = ${stopsData};
    var USER = null;
    var activeIdx = 0;
    var map, markers = [], polyline, userMarker;
    var directionsRenderer = null;

    function pinSvg(label, isActive) {
      var color = isActive ? '#22C55E' : '#9CA3AF';
      var size = isActive ? 48 : 38;
      var fs = isActive ? 15 : 12;
      var svg = '<svg xmlns="http://www.w3.org/2000/svg" width="' + size + '" height="' + Math.round(size * 1.3) + '" viewBox="0 0 40 52">'
        + '<defs><filter id="drop" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="0" dy="4" stdDeviation="4" flood-opacity="0.25"/></filter></defs>'
        + '<path d="M20 2C11 2 4 9 4 19c0 14 16 31 16 31s16-17 16-31c0-10-7-17-16-17z" fill="' + color + '" filter="url(#drop)"/>'
        + '<circle cx="20" cy="19" r="14" fill="white"/>'
        + '<text x="20" y="24" font-family="Arial,sans-serif" font-size="' + fs + '" font-weight="bold" text-anchor="middle" fill="' + color + '">' + label + '</text>'
        + '</svg>';
      return {
        url: 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg),
        scaledSize: new google.maps.Size(size, Math.round(size * 1.3)),
        anchor: new google.maps.Point(size / 2, Math.round(size * 1.3)),
      };
    }

    function blueDotSvg() {
      var svg = '<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28">'
        + '<defs><filter id="glow"><feDropShadow dx="0" dy="0" stdDeviation="4" flood-color="#3B82F6" flood-opacity="0.6"/></filter></defs>'
        + '<circle cx="14" cy="14" r="10" fill="#3B82F6" stroke="white" stroke-width="3" filter="url(#glow)"/>'
        + '<circle cx="14" cy="14" r="4" fill="white"/>'
        + '</svg>';
      return {
        url: 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg),
        scaledSize: new google.maps.Size(28, 28),
        anchor: new google.maps.Point(14, 14),
      };
    }

    function initMap() {
      var center = STOPS.length > 0
        ? { lat: STOPS[0].lat, lng: STOPS[0].lng }
        : { lat: 40.7128, lng: -74.006 };

      map = new google.maps.Map(document.getElementById('map'), {
        center: center,
        zoom: 13,
        disableDefaultUI: true,
        gestureHandling: 'greedy',
        clickableIcons: false,
        styles: [
          { featureType: 'poi', stylers: [{ visibility: 'simplified' }] },
          { featureType: 'transit', stylers: [{ visibility: 'off' }] },
        ],
      });

      renderAll();
      if (window.ReactNativeWebView) {
        window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'mapReady' }));
      }
    }

    function renderAll() {
      markers.forEach(function(m) { m.setMap(null); });
      markers = [];
      if (directionsRenderer) {
        directionsRenderer.setMap(null);
      }
      if (STOPS.length === 0) return;

      if (STOPS.length > 1) {
        // Use DirectionsService for map paths instead of straight lines
        var ds = new google.maps.DirectionsService();
        directionsRenderer = new google.maps.DirectionsRenderer({
          map: map,
          suppressMarkers: true,
          preserveViewport: true,
          polylineOptions: {
            strokeColor: '#22C55E',
            strokeOpacity: 0.85,
            strokeWeight: 4
          }
        });

        var waypts = STOPS.slice(1, STOPS.length - 1).map(function(s) {
          return { location: new google.maps.LatLng(s.lat, s.lng), stopover: true };
        });

        ds.route({
          origin: new google.maps.LatLng(STOPS[0].lat, STOPS[0].lng),
          destination: new google.maps.LatLng(STOPS[STOPS.length - 1].lat, STOPS[STOPS.length - 1].lng),
          waypoints: waypts,
          travelMode: google.maps.TravelMode.WALKING
        }, function(res, status) {
          if (status === 'OK') {
            directionsRenderer.setDirections(res);
          } else {
            // fallback to straightforward polyline
            polyline = new google.maps.Polyline({
              path: STOPS.map(function(s) { return { lat: s.lat, lng: s.lng }; }),
              geodesic: true, strokeColor: '#22C55E', strokeOpacity: 0.85, strokeWeight: 4, map: map,
            });
          }
        });
      }

      STOPS.forEach(function(stop, i) {
        var m = new google.maps.Marker({
          position: { lat: stop.lat, lng: stop.lng },
          map: map,
          icon: pinSvg(stop.label, i === activeIdx),
          title: stop.name,
          zIndex: i === activeIdx ? 10 : 1,
        });
        (function(idx) {
          m.addListener('click', function() {
            activeIdx = idx;
            refreshMarkers();
            if (window.ReactNativeWebView) {
              window.ReactNativeWebView.postMessage(
                JSON.stringify({ type: 'markerTap', index: idx })
              );
            }
          });
        })(i);
        markers.push(m);
      });

      drawUserDot();
      fitAll();
    }

    function drawUserDot() {
      if (userMarker) userMarker.setMap(null);
      if (!USER) return;
      userMarker = new google.maps.Marker({
        position: USER,
        map: map,
        icon: blueDotSvg(),
        zIndex: 20,
        title: 'You',
      });
    }

    function refreshMarkers() {
      markers.forEach(function(m, i) {
        m.setIcon(pinSvg(STOPS[i].label, i === activeIdx));
        m.setZIndex(i === activeIdx ? 10 : 1);
      });
    }

    function fitAll() {
      if (STOPS.length === 0) return;
      if (STOPS.length === 1) {
        map.setCenter({ lat: STOPS[0].lat, lng: STOPS[0].lng });
        map.setZoom(15);
        return;
      }
      var b = new google.maps.LatLngBounds();
      STOPS.forEach(function(s) { b.extend({ lat: s.lat, lng: s.lng }); });
      if (USER) b.extend(USER);
      map.fitBounds(b, { top: 50, right: 30, bottom: 30, left: 30 });
    }

    /* ── Called from React Native via injectJavaScript ── */

    function setActiveStop(idx) {
      activeIdx = idx;
      refreshMarkers();
      if (STOPS[idx]) {
        map.panTo({ lat: STOPS[idx].lat, lng: STOPS[idx].lng });
        map.setZoom(15);
      }
    }

    function showOverview() {
      refreshMarkers();
      fitAll();
    }

    function setUserLocation(lat, lng) {
      USER = { lat: lat, lng: lng };
      drawUserDot();
      calculateNextStop();
    }

    function calculateNextStop() {
      if (!USER || STOPS.length === 0) return;
      var targetStop = STOPS[activeIdx];
      if (!targetStop) return;

      var ds = new google.maps.DirectionsService();
      ds.route({
        origin: USER,
        destination: { lat: targetStop.lat, lng: targetStop.lng },
        travelMode: google.maps.TravelMode.WALKING
      }, function(res, status) {
        if (status === 'OK') {
          var leg = res.routes[0].legs[0];
          if (window.ReactNativeWebView) {
            window.ReactNativeWebView.postMessage(JSON.stringify({
              type: 'nextStopInfo',
              distance: leg.distance ? leg.distance.text : '',
              duration: leg.duration ? leg.duration.text : '',
              stopName: targetStop.name
            }));
          }
        }
      });
    }

    function showDirections(uLat, uLng, dLat, dLng) {
      if (!map) return;
      if (directionsRenderer) { directionsRenderer.setMap(null); directionsRenderer = null; }
      directionsRenderer = new google.maps.DirectionsRenderer({
        map: map,
        suppressMarkers: true,
        polylineOptions: { strokeColor: '#3B82F6', strokeWeight: 5, strokeOpacity: 0.9 }
      });
      var ds = new google.maps.DirectionsService();
      ds.route({
        origin: { lat: uLat, lng: uLng },
        destination: { lat: dLat, lng: dLng },
        travelMode: google.maps.TravelMode.WALKING
      }, function(result, status) {
        if (status === 'OK') {
          directionsRenderer.setDirections(result);
          var leg = result.routes[0].legs[0];
          map.fitBounds(result.routes[0].bounds, { top: 60, right: 30, bottom: 30, left: 30 });
          if (window.ReactNativeWebView) {
            window.ReactNativeWebView.postMessage(JSON.stringify({
              type: 'navInfo',
              distance: leg.distance ? leg.distance.text : '',
              duration: leg.duration ? leg.duration.text : ''
            }));
          }
        } else {
          if (window.ReactNativeWebView) {
            window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'navError', status: status }));
          }
        }
      });
    }

    function clearDirections() {
      if (directionsRenderer) { directionsRenderer.setMap(null); directionsRenderer = null; }
      renderAll();
      if (window.ReactNativeWebView) {
        window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'navCleared' }));
      }
    }
  </script>
  <script async
    src="${mapsJsUrl}">
  </script>
</body>
</html>`;
}

/**
 * Idle map (Map tab, no active trip) — shows user's location only.
 */
export function buildIdleHtml(mapsJsUrl: string): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no"/>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body, #map { width: 100%; height: 100%; overflow: hidden; }
  </style>
</head>
<body>
  <div id="map"></div>
  <script>
    var USER = null;
    var map, userMarker;

    function initMap() {
      map = new google.maps.Map(document.getElementById('map'), {
        center: { lat: 40.7128, lng: -74.006 },
        zoom: 11,
        disableDefaultUI: true,
        gestureHandling: 'greedy',
        clickableIcons: false,
        styles: [
          { featureType: 'poi', stylers: [{ visibility: 'simplified' }] },
          { featureType: 'transit', stylers: [{ visibility: 'off' }] },
        ],
      });
      if (window.ReactNativeWebView) {
        window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'mapReady' }));
      }
    }

    function setUserLocation(lat, lng) {
      USER = { lat: lat, lng: lng };
      if (userMarker) userMarker.setMap(null);
      var svg = '<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22">'
        + '<circle cx="11" cy="11" r="8" fill="#22C55E" stroke="white" stroke-width="3"/>'
        + '<circle cx="11" cy="11" r="3" fill="white"/></svg>';
      userMarker = new google.maps.Marker({
        position: USER,
        map: map,
        icon: {
          url: 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg),
          scaledSize: new google.maps.Size(22, 22),
          anchor: new google.maps.Point(11, 11),
        },
        title: 'Your location',
      });
      map.setCenter(USER);
      map.setZoom(14);
    }
  </script>
  <script async
    src="${mapsJsUrl}">
  </script>
</body>
</html>`;
}
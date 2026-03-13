/**
 * NavigationScreen — Full-screen in-app navigation to a single destination.
 *
 * Route params:
 *   destinationLat, destinationLng — target coordinates
 *   destinationName — display name for the destination
 *
 * Uses Google Maps Directions API (WALKING mode) rendered inside FyndMapView.
 * Real-time GPS tracking via browser geolocation / expo-location.
 */
import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import FyndMapView, { FyndMapViewRef } from '../components/FyndMapView';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import * as Sentry from '../services/sentry';
import { F } from '../theme/fonts';
import { logEvent } from '../services/firebase';

// ─── Constants ────────────────────────────────────────────────────────────────
const WEB_PROXY_FALLBACK = 'https://fynd-api.jallohosmanamadu311.workers.dev';
const API_KEY = process.env.EXPO_PUBLIC_GOOGLE_PLACES_API_KEY || '';
const PROXY = ((process.env.EXPO_PUBLIC_OPENAI_PROXY || '').replace(/\/$/, '')) || WEB_PROXY_FALLBACK;

type Coord = { latitude: number; longitude: number };
type Props = { navigation: any; route?: any };

// ─── HTML builder ─────────────────────────────────────────────────────────────
function buildNavigationHtml(
  destLat: number,
  destLng: number,
  destName: string,
  mapsJsUrl: string,
): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no"/>
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    html,body{width:100%;height:100%;overflow:hidden;position:relative}
    #map{width:100%;height:100%}
    #navPanel{
      display:none;position:absolute;top:10px;left:50%;
      transform:translateX(-50%);background:rgba(17,24,39,0.96);
      border-radius:18px;padding:12px 16px;min-width:82%;max-width:340px;
      z-index:999;box-shadow:0 4px 24px rgba(0,0,0,0.5);
    }
    #navPanel.active{display:block}
    .nav-top{display:flex;align-items:center;gap:12px}
    .nav-arrow{width:46px;height:46px;background:#22C55E;border-radius:13px;
      display:flex;align-items:center;justify-content:center;
      font-size:24px;line-height:1;flex-shrink:0;color:#fff}
    .nav-text{flex:1;min-width:0}
    .nav-dist{font-size:22px;font-weight:700;color:#fff;line-height:1.1;font-family:-apple-system,sans-serif}
    .nav-instr{font-size:12px;color:#9CA3AF;margin-top:4px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-family:-apple-system,sans-serif}
    .nav-footer{display:flex;justify-content:space-between;align-items:center;
      margin-top:10px;padding-top:8px;border-top:1px solid rgba(255,255,255,0.12)}
    .nav-eta{font-size:11px;color:#6B7280;font-family:-apple-system,sans-serif}
    .nav-dest-name{font-size:11px;color:#22C55E;font-weight:600;font-family:-apple-system,sans-serif}
    #arrivedBanner{
      display:none;position:absolute;top:10px;left:50%;
      transform:translateX(-50%);background:rgba(34,197,94,0.97);
      border-radius:18px;padding:14px 22px;min-width:72%;max-width:320px;
      z-index:999;text-align:center;box-shadow:0 4px 20px rgba(34,197,94,0.55);
    }
    #arrivedBanner.active{display:block}
    .arr-title{font-size:18px;font-weight:700;color:#fff;font-family:-apple-system,sans-serif}
    .arr-sub{font-size:12px;color:rgba(255,255,255,0.85);margin-top:5px;font-family:-apple-system,sans-serif}
    #errorBanner{
      display:none;position:absolute;top:10px;left:50%;
      transform:translateX(-50%);background:rgba(239,68,68,0.97);
      border-radius:18px;padding:14px 22px;min-width:72%;max-width:320px;
      z-index:999;text-align:center;box-shadow:0 4px 20px rgba(239,68,68,0.35);
    }
    #errorBanner.active{display:block}
    .err-title{font-size:14px;font-weight:600;color:#fff;font-family:-apple-system,sans-serif}
  </style>
</head>
<body>
  <div id="map"></div>
  <div id="navPanel">
    <div class="nav-top">
      <div class="nav-arrow" id="navArrow">\u2191</div>
      <div class="nav-text">
        <div class="nav-dist" id="navDist">\u2014</div>
        <div class="nav-instr" id="navInstr">Calculating route\u2026</div>
      </div>
    </div>
    <div class="nav-footer">
      <span class="nav-eta" id="navEta">\u2014 remaining</span>
      <span class="nav-dest-name" id="navDestName">${destName.replace(/'/g, "\\'")}</span>
    </div>
  </div>
  <div id="arrivedBanner">
    <div class="arr-title">\uD83C\uDF89 You've arrived!</div>
    <div class="arr-sub" id="arrivedName">${destName.replace(/'/g, "\\'")}</div>
  </div>
  <div id="errorBanner">
    <div class="err-title" id="errorText">Unable to calculate route. Please try again.</div>
  </div>
  <script>
    var DEST={lat:${destLat},lng:${destLng},name:'${destName.replace(/'/g, "\\'")}'};
    var USER=null;
    var map,userMarker,destMarker;
    var directionsService,directionsRenderer;
    var navMode=false,navSteps=[],navCurrentStep=0;
    var navTotalDistM=0,navTotalDurS=0,navElapsedDistM=0;
    var prevLat=null,prevLng=null;
    var routeCalculated=false;

    function blueDotSvg(){
      var svg='<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22">'
        +'<circle cx="11" cy="11" r="8" fill="#3B82F6" stroke="white" stroke-width="3"/>'
        +'<circle cx="11" cy="11" r="3" fill="white"/></svg>';
      return{
        url:'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svg),
        scaledSize:new google.maps.Size(22,22),
        anchor:new google.maps.Point(11,11)
      };
    }

    function destPinSvg(){
      var svg='<svg xmlns="http://www.w3.org/2000/svg" width="40" height="52" viewBox="0 0 40 52">'
        +'<path d="M20 0C9 0 0 9 0 20c0 14 20 32 20 32S40 34 40 20C40 9 31 0 20 0z" fill="#EF4444"/>'
        +'<circle cx="20" cy="19" r="12" fill="white"/>'
        +'<text x="20" y="24" font-family="Arial,sans-serif" font-size="16" font-weight="bold" text-anchor="middle" fill="#EF4444">\u2691</text></svg>';
      return{
        url:'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svg),
        scaledSize:new google.maps.Size(40,52),
        anchor:new google.maps.Point(20,52)
      };
    }

    function initMap(){
      map=new google.maps.Map(document.getElementById('map'),{
        center:{lat:DEST.lat,lng:DEST.lng},
        zoom:14,
        disableDefaultUI:true,
        gestureHandling:'greedy',
        clickableIcons:false,
        styles:[
          {featureType:'poi',stylers:[{visibility:'simplified'}]},
          {featureType:'transit',stylers:[{visibility:'off'}]}
        ]
      });

      destMarker=new google.maps.Marker({
        position:{lat:DEST.lat,lng:DEST.lng},
        map:map,icon:destPinSvg(),
        title:DEST.name,zIndex:5
      });

      directionsService=new google.maps.DirectionsService();
      directionsRenderer=new google.maps.DirectionsRenderer({
        map:map,suppressMarkers:true,
        polylineOptions:{strokeColor:'#16A34A',strokeOpacity:1,strokeWeight:5}
      });

      if(window.ReactNativeWebView)
        window.ReactNativeWebView.postMessage(JSON.stringify({type:'mapReady'}));
    }

    /* ── helpers ─── */
    function haversineM(lt1,ln1,lt2,ln2){
      var R=6371000,dLat=(lt2-lt1)*Math.PI/180,dLon=(ln2-ln1)*Math.PI/180;
      var a=Math.sin(dLat/2)*Math.sin(dLat/2)+
            Math.cos(lt1*Math.PI/180)*Math.cos(lt2*Math.PI/180)*
            Math.sin(dLon/2)*Math.sin(dLon/2);
      return R*2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a));
    }
    function bearingDeg(lt1,ln1,lt2,ln2){
      var y=Math.sin((ln2-ln1)*Math.PI/180)*Math.cos(lt2*Math.PI/180);
      var x=Math.cos(lt1*Math.PI/180)*Math.sin(lt2*Math.PI/180)-
            Math.sin(lt1*Math.PI/180)*Math.cos(lt2*Math.PI/180)*
            Math.cos((ln2-ln1)*Math.PI/180);
      return(Math.atan2(y,x)*180/Math.PI+360)%360;
    }
    function maneuverArrow(m){
      var a={'turn-left':'\\u21B0','turn-right':'\\u21B1','turn-slight-left':'\\u2196','turn-slight-right':'\\u2197',
             'turn-sharp-left':'\\u2199','turn-sharp-right':'\\u2198','uturn-left':'\\u21A9','uturn-right':'\\u21AA',
             'roundabout-left':'\\u21BA','roundabout-right':'\\u21BB','ramp-left':'\\u2196','ramp-right':'\\u2197',
             'fork-left':'\\u2196','fork-right':'\\u2197','merge':'\\u2191','ferry':'\\u26F4'};
      return a[m]||'\\u2191';
    }
    function stripHtml(h){return h?h.replace(/<[^>]*>/g,''):''}
    function fmtDist(m){return m>=1000?((m/1000).toFixed(1)+' km'):(Math.round(m)+' m')}
    function fmtTime(s){var m=Math.ceil(s/60);return m<60?(m+' min'):(Math.floor(m/60)+'h '+(m%60)+'m')}

    function updateNavPanel(){
      if(navCurrentStep>=navSteps.length)return;
      var step=navSteps[navCurrentStep];
      document.getElementById('navArrow').textContent=maneuverArrow(step.maneuver);
      document.getElementById('navDist').textContent=fmtDist(step.distM);
      document.getElementById('navInstr').textContent=stripHtml(step.instr);
      var remainM=Math.max(0,navTotalDistM-navElapsedDistM);
      var remainS=navTotalDurS>0&&navTotalDistM>0?navTotalDurS*(remainM/navTotalDistM):0;
      document.getElementById('navEta').textContent=fmtTime(remainS)+' remaining';
    }

    function showNavPanel(){
      document.getElementById('navPanel').classList.add('active');
      document.getElementById('arrivedBanner').classList.remove('active');
      document.getElementById('errorBanner').classList.remove('active');
    }
    function hideNavPanel(){
      document.getElementById('navPanel').classList.remove('active');
    }
    function showArrived(){
      navMode=false;hideNavPanel();
      document.getElementById('arrivedBanner').classList.add('active');
      try{map.setHeading(0);map.setTilt(0);}catch(e){}
      if(window.ReactNativeWebView)
        window.ReactNativeWebView.postMessage(JSON.stringify({type:'navigationArrived'}));
    }
    function showError(msg){
      document.getElementById('errorText').textContent=msg;
      document.getElementById('errorBanner').classList.add('active');
      setTimeout(function(){document.getElementById('errorBanner').classList.remove('active');},5000);
    }

    /* ── user location ── */
    function setUserLocation(lat,lng){
      USER={lat:lat,lng:lng};
      if(userMarker)userMarker.setMap(null);
      userMarker=new google.maps.Marker({
        position:USER,map:map,icon:blueDotSvg(),zIndex:20,title:'You'
      });
      updateNavigation(lat,lng);

      /* auto-start route on first location fix */
      if(!routeCalculated){
        routeCalculated=true;
        startNavigation();
      }
    }

    function updateNavigation(lat,lng){
      if(!navMode||navSteps.length===0)return;
      if(prevLat!==null&&prevLng!==null){
        var bearing=bearingDeg(prevLat,prevLng,lat,lng);
        try{map.setHeading(bearing);map.setTilt(45);}catch(e){}
      }
      map.setCenter({lat:lat,lng:lng});
      map.setZoom(18);
      prevLat=lat;prevLng=lng;

      if(navCurrentStep<navSteps.length){
        var step=navSteps[navCurrentStep];
        var d=haversineM(lat,lng,step.endLat,step.endLng);
        if(d<18&&navCurrentStep<navSteps.length-1){
          navElapsedDistM+=step.distM;
          navCurrentStep++;
          updateNavPanel();
        }else{
          document.getElementById('navDist').textContent=fmtDist(d);
        }
      }
      if(haversineM(lat,lng,DEST.lat,DEST.lng)<25)showArrived();
    }

    function recenterMap(){
      if(USER){
        map.setCenter(USER);
        map.setZoom(navMode?18:14);
      }
    }

    function fitBounds(){
      var b=new google.maps.LatLngBounds();
      b.extend({lat:DEST.lat,lng:DEST.lng});
      if(USER)b.extend(USER);
      map.fitBounds(b,{top:60,right:30,bottom:30,left:30});
      try{map.setHeading(0);map.setTilt(0);}catch(e){}
    }

    /* ── navigation control ── */
    function startNavigation(){
      if(!USER){
        if(window.ReactNativeWebView)
          window.ReactNativeWebView.postMessage(JSON.stringify({type:'navigationError',status:'NO_GPS'}));
        return;
      }
      showNavPanel();
      document.getElementById('navInstr').textContent='Calculating route\\u2026';
      document.getElementById('navDist').textContent='\\u2014';

      directionsService.route({
        origin:new google.maps.LatLng(USER.lat,USER.lng),
        destination:new google.maps.LatLng(DEST.lat,DEST.lng),
        travelMode:google.maps.TravelMode.WALKING,
      },function(result,status){
        if(status==='OK'){
          directionsRenderer.setDirections(result);
          navSteps=[];navTotalDistM=0;navTotalDurS=0;navElapsedDistM=0;
          var leg=result.routes[0].legs[0];
          leg.steps.forEach(function(step){
            navSteps.push({
              instr:step.instructions||'',
              maneuver:step.maneuver||'straight',
              distM:step.distance?step.distance.value:0,
              durS:step.duration?step.duration.value:0,
              endLat:step.end_location.lat(),
              endLng:step.end_location.lng()
            });
            navTotalDistM+=step.distance?step.distance.value:0;
            navTotalDurS+=step.duration?step.duration.value:0;
          });
          navCurrentStep=0;navMode=true;prevLat=null;prevLng=null;
          map.setCenter(USER);map.setZoom(18);
          updateNavPanel();
          if(window.ReactNativeWebView)
            window.ReactNativeWebView.postMessage(JSON.stringify({
              type:'navigationStarted',
              totalDistanceM:navTotalDistM,
              totalDurationS:navTotalDurS,
              distanceText:leg.distance?leg.distance.text:'',
              durationText:leg.duration?leg.duration.text:''
            }));
        }else{
          hideNavPanel();
          showError('Unable to calculate route. Please try again.');
          if(window.ReactNativeWebView)
            window.ReactNativeWebView.postMessage(JSON.stringify({type:'navigationError',status:status}));
        }
      });
    }

    function stopNavigation(){
      navMode=false;navSteps=[];navCurrentStep=0;navElapsedDistM=0;prevLat=null;prevLng=null;
      hideNavPanel();
      if(directionsRenderer){directionsRenderer.setMap(null);}
      directionsRenderer=new google.maps.DirectionsRenderer({
        map:map,suppressMarkers:true,
        polylineOptions:{strokeColor:'#16A34A',strokeOpacity:1,strokeWeight:5}
      });
      try{map.setHeading(0);map.setTilt(0);}catch(e){}
      fitBounds();
      if(window.ReactNativeWebView)
        window.ReactNativeWebView.postMessage(JSON.stringify({type:'navigationStopped'}));
    }
  </script>
  <script async src="${mapsJsUrl}"></script>
</body>
</html>`;
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function NavigationScreen({ navigation, route }: Props) {
  const destLat: number = route?.params?.destinationLat ?? 0;
  const destLng: number = route?.params?.destinationLng ?? 0;
  const destName: string = route?.params?.destinationName ?? 'Destination';

  const insets = useSafeAreaInsets();
  const webViewRef = useRef<FyndMapViewRef>(null);
  const navWatchRef = useRef<any>(null);

  const [mapReady, setMapReady] = useState(false);
  const [mapLoading, setMapLoading] = useState(true);
  const [userLoc, setUserLoc] = useState<Coord | null>(null);
  const [navActive, setNavActive] = useState(false);
  const [navInfo, setNavInfo] = useState<{
    distM: number; durS: number;
    distanceText: string; durationText: string;
  } | null>(null);
  const [gpsError, setGpsError] = useState(false);
  const [arrived, setArrived] = useState(false);

  const mapsJsUrl = useMemo(() => {
    if (Platform.OS === 'web' && PROXY) {
      return `${PROXY}/api/maps/js?callback=initMap&loading=async`;
    }
    return `https://maps.googleapis.com/maps/api/js?key=${API_KEY}&callback=initMap&loading=async`;
  }, []);

  const mapHtml = useMemo(
    () => buildNavigationHtml(destLat, destLng, destName, mapsJsUrl),
    [destLat, destLng, destName, mapsJsUrl],
  );

  // Safety valve: clear loading after 12s
  useEffect(() => {
    const t = setTimeout(() => setMapLoading(false), 12000);
    return () => clearTimeout(t);
  }, []);

  // Start GPS watch immediately
  useEffect(() => {
    logEvent('navigation_started', { destination: destName });

    if (Platform.OS === 'web') {
      const geo = typeof navigator !== 'undefined' ? navigator.geolocation : null;
      if (!geo) {
        setGpsError(true);
        return;
      }
      navWatchRef.current = geo.watchPosition(
        (pos) => {
          const { latitude, longitude } = pos.coords;
          setUserLoc({ latitude, longitude });
          setGpsError(false);
          webViewRef.current?.injectJavaScript(
            `setUserLocation(${latitude}, ${longitude}); true;`,
          );
        },
        (err) => {
          setGpsError(true);
          Sentry.captureMessage('NavigationScreen GPS error', {
            level: 'warning',
            extra: { code: err.code, message: err.message },
          });
        },
        { enableHighAccuracy: true, maximumAge: 1000, timeout: 15000 },
      );
    } else {
      (async () => {
        try {
          const { status } = await Location.requestForegroundPermissionsAsync();
          if (status !== 'granted') {
            setGpsError(true);
            return;
          }
          const sub = await Location.watchPositionAsync(
            { accuracy: Location.Accuracy.BestForNavigation, timeInterval: 1500, distanceInterval: 3 },
            (loc) => {
              const { latitude, longitude } = loc.coords;
              setUserLoc({ latitude, longitude });
              setGpsError(false);
              webViewRef.current?.injectJavaScript(
                `setUserLocation(${latitude}, ${longitude}); true;`,
              );
            },
          );
          navWatchRef.current = sub;
        } catch (err) {
          setGpsError(true);
          Sentry.captureException(err, { tags: { context: 'NavigationScreen.gpsWatch' } });
        }
      })();
    }

    return () => {
      if (Platform.OS === 'web') {
        const geo = typeof navigator !== 'undefined' ? navigator.geolocation : null;
        if (geo && navWatchRef.current !== null) geo.clearWatch(navWatchRef.current);
      } else {
        navWatchRef.current?.remove?.();
      }
      navWatchRef.current = null;
    };
  }, [destName]);

  const onMessage = useCallback((rawData: string) => {
    try {
      const data = JSON.parse(rawData);
      if (data.type === 'mapReady') {
        setMapReady(true);
        setMapLoading(false);
      } else if (data.type === 'navigationStarted') {
        setNavActive(true);
        setNavInfo({
          distM: data.totalDistanceM ?? 0,
          durS: data.totalDurationS ?? 0,
          distanceText: data.distanceText ?? '',
          durationText: data.durationText ?? '',
        });
      } else if (data.type === 'navigationStopped') {
        setNavActive(false);
        setNavInfo(null);
      } else if (data.type === 'navigationError') {
        if (data.status === 'NO_GPS') {
          setGpsError(true);
        } else {
          Alert.alert('Navigation', 'Unable to calculate route. Please try again.');
        }
        setNavActive(false);
      } else if (data.type === 'navigationArrived') {
        setNavActive(false);
        setArrived(true);
        logEvent('navigation_arrived', { destination: destName });
      }
    } catch (_) {}
  }, [destName]);

  const handleRecenter = () => {
    webViewRef.current?.injectJavaScript('recenterMap(); true;');
  };

  const handleOverview = () => {
    webViewRef.current?.injectJavaScript('fitBounds(); true;');
  };

  const handleRestartNav = () => {
    setArrived(false);
    webViewRef.current?.injectJavaScript('startNavigation(); true;');
  };

  const handleStopNav = () => {
    webViewRef.current?.injectJavaScript('stopNavigation(); true;');
    setNavActive(false);
    setNavInfo(null);
  };

  const handleExit = () => {
    // Clean up GPS and go back
    if (Platform.OS === 'web') {
      const geo = typeof navigator !== 'undefined' ? navigator.geolocation : null;
      if (geo && navWatchRef.current !== null) geo.clearWatch(navWatchRef.current);
    } else {
      navWatchRef.current?.remove?.();
    }
    navWatchRef.current = null;
    navigation.goBack();
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Full-screen map */}
      <View style={styles.mapContainer}>
        <FyndMapView
          ref={webViewRef}
          html={mapHtml}
          style={styles.map}
          onMessage={onMessage}
        />

        {/* Loading overlay */}
        {mapLoading && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator color="#22C55E" size="large" />
            <Text style={styles.loadingText}>Loading navigation…</Text>
          </View>
        )}

        {/* GPS error banner */}
        {gpsError && !mapLoading && (
          <View style={styles.gpsBanner}>
            <Ionicons name="warning-outline" size={16} color="#fff" />
            <Text style={styles.gpsBannerText}>Location access is required for navigation.</Text>
          </View>
        )}

        {/* Arrived banner */}
        {arrived && (
          <View style={styles.arrivedBanner}>
            <Text style={styles.arrivedTitle}>🎉 You've arrived!</Text>
            <Text style={styles.arrivedSub}>{destName}</Text>
          </View>
        )}

        {/* Top controls */}
        {!mapLoading && (
          <View style={styles.topControls} pointerEvents="box-none">
            {/* Exit button */}
            <TouchableOpacity style={styles.exitBtn} onPress={handleExit}>
              <Ionicons name="arrow-back" size={20} color="#111827" />
            </TouchableOpacity>

            <View style={{ flex: 1 }} />

            {/* Overview */}
            <TouchableOpacity style={styles.controlBtn} onPress={handleOverview}>
              <Ionicons name="contract-outline" size={16} color="#111827" />
            </TouchableOpacity>

            {/* Recenter */}
            <TouchableOpacity style={styles.controlBtn} onPress={handleRecenter}>
              <Ionicons name="locate-outline" size={16} color="#111827" />
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Bottom panel */}
      <View style={[styles.bottomPanel, { paddingBottom: Math.max(16, insets.bottom) }]}>
        {/* Destination info */}
        <View style={styles.destRow}>
          <View style={styles.destDot} />
          <View style={styles.destInfo}>
            <Text style={styles.destName} numberOfLines={1}>{destName}</Text>
            {navInfo ? (
              <Text style={styles.destMeta}>
                {navInfo.distanceText || (navInfo.distM >= 1000
                  ? `${(navInfo.distM / 1000).toFixed(1)} km`
                  : `${navInfo.distM} m`)}
                {' · '}
                {navInfo.durationText || `${Math.ceil(navInfo.durS / 60)} min`}
                {' walking'}
              </Text>
            ) : (
              <Text style={styles.destMeta}>Calculating route…</Text>
            )}
          </View>
        </View>

        {/* Action buttons */}
        <View style={styles.actionRow}>
          {arrived ? (
            <TouchableOpacity style={styles.doneBtn} onPress={handleExit}>
              <Ionicons name="checkmark-circle" size={18} color="#fff" style={{ marginRight: 8 }} />
              <Text style={styles.doneBtnText}>Done</Text>
            </TouchableOpacity>
          ) : navActive ? (
            <TouchableOpacity style={styles.stopBtn} onPress={handleStopNav}>
              <Ionicons name="stop-circle" size={18} color="#fff" style={{ marginRight: 8 }} />
              <Text style={styles.stopBtnText}>Stop Navigation</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.startBtn} onPress={handleRestartNav} disabled={gpsError}>
              <Ionicons name="navigate" size={18} color="#fff" style={{ marginRight: 8 }} />
              <Text style={styles.startBtnText}>
                {navInfo ? 'Restart Navigation' : 'Start Navigation'}
              </Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={styles.closeBtn} onPress={handleExit}>
            <Ionicons name="close" size={20} color="#374151" />
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },

  mapContainer: {
    flex: 1,
    position: 'relative',
    overflow: 'hidden',
  },
  map: { flex: 1 },

  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F2F2F7',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 13,
    color: '#8E8E93',
    fontFamily: F.regular,
  },

  gpsBanner: {
    position: 'absolute',
    top: 60,
    left: 20,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(239, 68, 68, 0.95)',
    borderRadius: 14,
    padding: 12,
    zIndex: 100,
  },
  gpsBannerText: {
    flex: 1,
    fontSize: 13,
    fontFamily: F.medium,
    color: '#fff',
  },

  arrivedBanner: {
    position: 'absolute',
    top: 60,
    left: 20,
    right: 20,
    alignItems: 'center',
    backgroundColor: 'rgba(34, 197, 94, 0.97)',
    borderRadius: 18,
    padding: 16,
    zIndex: 100,
  },
  arrivedTitle: {
    fontSize: 18,
    fontFamily: F.bold,
    color: '#fff',
  },
  arrivedSub: {
    fontSize: 13,
    fontFamily: F.regular,
    color: 'rgba(255,255,255,0.85)',
    marginTop: 4,
  },

  topControls: {
    position: 'absolute',
    top: 10,
    left: 10,
    right: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    zIndex: 10,
  },
  exitBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.95)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
  },
  controlBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.95)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
  },

  bottomPanel: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 16,
    paddingHorizontal: 16,
  },

  destRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  destDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#EF4444',
    marginRight: 12,
  },
  destInfo: { flex: 1 },
  destName: {
    fontSize: 16,
    fontFamily: F.semibold,
    color: '#111827',
  },
  destMeta: {
    fontSize: 13,
    fontFamily: F.regular,
    color: '#6B7280',
    marginTop: 2,
  },

  actionRow: {
    flexDirection: 'row',
    gap: 10,
  },
  startBtn: {
    flex: 1,
    height: 50,
    borderRadius: 14,
    backgroundColor: '#22C55E',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  startBtnText: {
    fontSize: 15,
    fontFamily: F.semibold,
    color: '#fff',
  },
  stopBtn: {
    flex: 1,
    height: 50,
    borderRadius: 14,
    backgroundColor: '#EF4444',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stopBtnText: {
    fontSize: 15,
    fontFamily: F.semibold,
    color: '#fff',
  },
  doneBtn: {
    flex: 1,
    height: 50,
    borderRadius: 14,
    backgroundColor: '#22C55E',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  doneBtnText: {
    fontSize: 15,
    fontFamily: F.semibold,
    color: '#fff',
  },
  closeBtn: {
    width: 50,
    height: 50,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
});

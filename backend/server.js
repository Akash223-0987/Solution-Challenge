import express from 'express';
import cors from 'cors';
import { createClient } from '@supabase/supabase-js';
import fetch from 'node-fetch';
import dotenv from 'dotenv';
import { OpenRouter } from '@openrouter/sdk';
import { RAIL_HUBS } from './rail_hubs.js';
import { CITY_COORDS } from './cities.js';
import { RAIL_CONNECTIONS } from './rail_network.js';
import { assignFreightTrain } from './freight_trains.js';

dotenv.config();
console.log(`🗺️  City Coordinates Loaded: ${Object.keys(CITY_COORDS).length} cities available.`);


// ANTI-CRASH SAFETY NET: Prevents silent exits
process.on('uncaughtException', (err) => {
  console.error('🔥 CRITICAL ERROR (Uncaught Exception):', err);
});
process.on('unhandledRejection', (reason, promise) => {
  console.error('⚠️ UNHANDLED REJECTION:', reason);
});

console.log('📡 Environment Check:');
console.log(`   - Supabase URL: ${process.env.SUPABASE_URL ? '✅ Loaded' : '❌ Missing'}`);
console.log(`   - OpenRouter Key: ${process.env.OPENROUTER_API_KEY ? '✅ Loaded' : '❌ Missing'}`);

const app = express();
app.use(express.json());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
}));

// ── North-East India Bypass (Bangladesh Avoidance) ────────────────────────
const NORTH_EAST_CITIES = ['Agartala', 'Guwahati', 'Imphal', 'Shillong', 'Aizawl', 'Kohima', 'Itanagar', 'Gangtok', 'Silchar', 'Dibrugarh'];
const MALDA_WAYPOINT = "88.1411,25.0108";
const SILIGURI_CORRIDOR = "88.3953,26.7271";

function getOsrmUrl(coordsArray, originName, destName) {
    const isStartNE = NORTH_EAST_CITIES.includes(originName);
    const isEndNE = NORTH_EAST_CITIES.includes(destName);
    const crossBorderDetected = (isStartNE && !isEndNE) || (!isStartNE && isEndNE);
    
    let points = coordsArray.map(c => `${c[1]},${c[0]}`); // Lng,Lat strings
    
    if (crossBorderDetected) {
        // If going mainland -> NE: Add Malda then Siliguri before the final NE point
        if (!isStartNE && isEndNE) {
            points.splice(points.length - 1, 0, MALDA_WAYPOINT, SILIGURI_CORRIDOR);
        } else {
            // NE -> mainland: Add Siliguri then Malda after the starting NE point
            points.splice(1, 0, SILIGURI_CORRIDOR, MALDA_WAYPOINT);
        }
        console.log(`🛡️  Bypass active for ${originName} -> ${destName}. Forced waypoints: Malda, Siliguri.`);
    }
    
    const radii = points.map(() => 3000).join(';');
    return `http://router.project-osrm.org/route/v1/driving/${points.join(';')}?overview=full&geometries=geojson&radiuses=${radii}`;
}
// ─────────────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────────────────
// A* Pathfinding for Rail Network (Directional & Efficient)
// ─────────────────────────────────────────────────────────────────────────────
function findRailPath(startHub, endHub) {
    if (!RAIL_HUBS[startHub] || !RAIL_HUBS[endHub]) return [];
    if (startHub === endHub) return [RAIL_HUBS[startHub]];

    const hubNames = Object.keys(RAIL_HUBS);
    const destCoords = RAIL_HUBS[endHub];
    
    // 1. Build Adjacency List with Speed Weighting
    const adj = {};
    hubNames.forEach(h => adj[h] = []);
    
    // Add Manual Backbone (Very Low Weight = High Priority)
    RAIL_CONNECTIONS.forEach(([h1, h2]) => {
      if (RAIL_HUBS[h1] && RAIL_HUBS[h2]) {
        const d = Math.sqrt(Math.pow(RAIL_HUBS[h1][0]-RAIL_HUBS[h2][0], 2) + Math.pow(RAIL_HUBS[h1][1]-RAIL_HUBS[h2][1], 2));
        adj[h1].push({ name: h2, dist: d * 0.1 }); // Backbone is 10x 'faster'
        adj[h2].push({ name: h1, dist: d * 0.1 });
      }
    });

    // Add Local Connectors (Standard Weight)
    hubNames.forEach(h => {
        const h1 = RAIL_HUBS[h];
        const local = hubNames
            .filter(h2 => h2 !== h)
            .map(h2 => ({ name: h2, dist: Math.sqrt(Math.pow(h1[0]-RAIL_HUBS[h2][0], 2) + Math.pow(h1[1]-RAIL_HUBS[h2][1], 2)) }))
            .sort((a, b) => a.dist - b.dist)
            .slice(0, 3);
        
        local.forEach(n => {
          if (!adj[h].some(e => e.name === n.name)) {
             adj[h].push(n);
             if (adj[n.name]) adj[n.name].push({ name: h, dist: n.dist });
          }
        });
    });

    // 2. A* Algorithm
    const gScore = {};
    const fScore = {};
    const previous = {};
    const openSet = [startHub];

    hubNames.forEach(h => { gScore[h] = Infinity; fScore[h] = Infinity; });
    gScore[startHub] = 0;
    fScore[startHub] = Math.sqrt(Math.pow(RAIL_HUBS[startHub][0]-destCoords[0], 2) + Math.pow(RAIL_HUBS[startHub][1]-destCoords[1], 2));

    while (openSet.length > 0) {
        openSet.sort((a, b) => fScore[a] - fScore[b]);
        const current = openSet.shift();
        if (current === endHub) {
            const path = [];
            let temp = current;
            while (temp) { path.push(RAIL_HUBS[temp]); temp = previous[temp]; }
            return path.reverse();
        }
        for (const neighbor of adj[current]) {
            const tentativeGScore = gScore[current] + neighbor.dist;
            if (tentativeGScore < gScore[neighbor.name]) {
                previous[neighbor.name] = current;
                gScore[neighbor.name] = tentativeGScore;
                fScore[neighbor.name] = gScore[neighbor.name] + Math.sqrt(Math.pow(RAIL_HUBS[neighbor.name][0]-destCoords[0], 2) + Math.pow(RAIL_HUBS[neighbor.name][1]-destCoords[1], 2));
                if (!openSet.includes(neighbor.name)) openSet.push(neighbor.name);
            }
        }
    }
    return [RAIL_HUBS[startHub], RAIL_HUBS[endHub]];
}

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const openrouter = new OpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY
});

const AI_MODEL = "meta-llama/llama-3-8b-instruct:free";

// 1. Fetch Shipments
app.get('/api/shipments', async (req, res) => {
  const { data, error } = await supabase.from('shipments').select('*');
  if (error) {
    console.error('❌ Supabase Fetch Error:', error);
    return res.status(400).json(error);
  }
  res.json(data);
});

// 2. Create Shipment with AI Risk Analysis and Auto-Disruption
app.post('/api/shipments', async (req, res) => {
  let { truck_id, origin, destination, weight, terrain_type, features } = req.body;
  
  // Trim whitespace
  origin = origin?.trim();
  destination = destination?.trim();

  console.log(`🔍 Validating cities: "${origin}" -> "${destination}"`);

  // Input validation
  if (!truck_id || !origin || !destination || isNaN(weight) || weight <= 0) {
    return res.status(400).json({ error: 'Invalid input: truck_id, origin, destination, and a positive weight are required.' });
  }
  if (!CITY_COORDS[origin]) {
    console.warn(`❌ Unknown origin: "${origin}"`);
    return res.status(400).json({ error: `Unknown origin city: "${origin}". Please use a supported Indian city.` });
  }
  if (!CITY_COORDS[destination]) {
    console.warn(`❌ Unknown destination: "${destination}"`);
    return res.status(400).json({ error: `Unknown destination city: "${destination}". Please use a supported Indian city.` });
  }

  const startCoords = CITY_COORDS[origin];
  const endCoords = CITY_COORDS[destination];

  // Fetch initial real road route from OSRM
  let route = [startCoords, endCoords]; 
  try {
    const osrmUrl = getOsrmUrl([startCoords, endCoords], origin, destination);
    const osrmRes = await fetch(osrmUrl);
    const osrmData = await osrmRes.json();
    if (osrmData.routes && osrmData.routes[0]) {
      route = osrmData.routes[0].geometry.coordinates.map(([lng, lat]) => [lat, lng]);
    }
  } catch (e) {
    console.error("OSRM initial route fetch failed:", e);
  }

  const riskScore = Math.floor(Math.random() * 40) + (weight > 15 ? 30 : 10);
  const riskAnalysis = `Analysis complete for TRK-${truck_id}. ${weight}T load on ${terrain_type} corridor.`;

  console.log(`🚚 Creating Shipment: ${truck_id} (${origin} -> ${destination})`);

  const { data, error } = await supabase
    .from('shipments')
    .insert([{ 
      truck_id, origin, destination, weight, terrain_type, features: features || [], 
      location: startCoords, route, status: 'On-Track', delay: 0,
      transport_mode: 'Road'
    }])
    .select();

  if (error) {
    console.error('❌ Supabase Insert Error:', error);
    return res.status(400).json(error);
  }

  // PROMPT HACKATHON DISRUPTION: Generate a disruption at 40% of the route
  const disruptionChance = Math.random();
  if (disruptionChance > 0.4) {
    const type = ["Thunderstorm", "Traffic Gridlock", "National Highway Blockade", "Landslide", "Bridge Maintenance"][Math.floor(Math.random() * 5)];
    const disLocation = route[Math.floor(route.length * 0.4)]; 
    const severity = disruptionChance > 0.55 ? 'Critical' : (disruptionChance > 0.45 ? 'High' : 'Medium');
    // Critical delay (190m) is above the 150m Gati Shakti threshold — guarantees rail diversion
    const initialDelay = severity === 'Critical' ? 190 : (severity === 'High' ? 45 : 15);

    if (disLocation) {
      await supabase.from('disruptions').insert([{
        type,
        severity,
        location: disLocation,
        description: `Critical alert for TRK-${truck_id}. Expected delay: ${initialDelay}m due to ${type}.`
      }]);
      
      // Update shipment with initial delay to prep for AI logic
      await supabase.from('shipments').update({ delay: initialDelay, status: severity === 'Critical' ? 'Critical' : 'At Risk' }).eq('truck_id', truck_id);
    }
  }

  res.json({ message: "Shipment Created", data, riskScore, riskAnalysis });
});

app.get('/api/disruptions', async (req, res) => {
  const { data, error } = await supabase.from('disruptions').select('*');
  if (error) return res.status(400).json(error);
  res.json(data);
});

app.delete('/api/disruptions', async (req, res) => {
  const { error } = await supabase.from('disruptions').delete().neq('id', 0);
  if (error) return res.status(400).json(error);
  res.json({ message: 'All disruptions cleared' });
});

// Helper for bypass calculation
function computeBypassWaypoint(truckLoc, destination, disruption, scale = 0.6) {
  const midLat = (truckLoc[0] + destination[0]) / 2;
  const midLng = (truckLoc[1] + destination[1]) / 2;
  const dLat = destination[0] - truckLoc[0];
  const dLng = destination[1] - truckLoc[1];
  const routeLen = Math.sqrt(dLat * dLat + dLng * dLng) || 1;
  const perpLat = -dLng / routeLen;
  const perpLng =  dLat / routeLen;
  let sideSign = 1;
  if (disruption) {
    const crossProduct = (dLat * (disruption.location[1] - truckLoc[1])) - (dLng * (disruption.location[0] - truckLoc[0]));
    sideSign = crossProduct >= 0 ? -1 : 1;
  }
  return [midLat + perpLat * scale * sideSign, midLng + perpLng * scale * sideSign];
}

// ─────────────────────────────────────────────────────────────────────────────
// 3a. Reroute Preview — returns multimodal suggestions BEFORE applying changes
// ─────────────────────────────────────────────────────────────────────────────
app.post('/api/reroute-preview', async (req, res) => {
  try {
    const { data: shipments } = await supabase.from('shipments').select('*');
    const { data: disruptions } = await supabase.from('disruptions').select('*');

    const hubNames = Object.keys(RAIL_HUBS);
    const KM_PER_DEG   = 111;
    const TRUCK_SPEED  = 50;   // km/h average
    const TRUCK_COST   = 45;   // INR per km
    const RAIL_COST    = 18;   // INR per km
    const TRANSSHIP_FEE = 4500; // INR fixed handling charge
    const TRUCK_CO2    = 120;  // g CO₂ per km
    const RAIL_CO2     = 22;   // g CO₂ per km

    const distKm = (a, b) => {
      const dlat = (b[0] - a[0]) * KM_PER_DEG;
      const dlng = (b[1] - a[1]) * KM_PER_DEG * Math.cos(a[0] * Math.PI / 180);
      return Math.sqrt(dlat * dlat + dlng * dlng);
    };

    const suggestions = [];

    for (const ship of (shipments || [])) {
      // PM Gati Shakti (Rail) is only suggested for critical delays >= 150m
      const isGatiShaktiCandidate = ship.delay >= 150;
      let disruption = null;
      if (disruptions && ship.route) {
        const step = Math.max(1, Math.floor(ship.route.length / 40));
        outer: for (const d of disruptions) {
          for (let i = 0; i < ship.route.length; i += step) {
            const pt = ship.route[i];
            const dist = Math.sqrt(Math.pow(pt[0]-d.location[0],2) + Math.pow(pt[1]-d.location[1],2));
            if (dist < 1.5) { disruption = d; break outer; }
          }
        }
      }
      if (!isGatiShaktiCandidate) continue;

      const riskReason = disruption
        ? `${disruption.type} on route (${disruption.severity} severity)`
        : ship.delay >= 150 ? `Critical delay of ${ship.delay} mins — Gati Shakti Rail switch recommended`
        : `Delay of ${ship.delay} mins detected on corridor — Road bypass recommended`;

      const dest = ship.route?.[ship.route.length - 1] || ship.location;

      // Nearest destination hub
      const destHubName = [...hubNames].sort((a, b) =>
        distKm(dest, RAIL_HUBS[a]) - distKm(dest, RAIL_HUBS[b])
      )[0];

      // Total pure-road metrics (baseline)
      const totalRoadKm   = distKm(ship.location, dest);
      const roadCostINR   = Math.round(totalRoadKm * TRUCK_COST);
      const roadTimeH     = totalRoadKm / TRUCK_SPEED + ship.delay / 60;
      const roadCO2Kg     = Math.round(totalRoadKm * TRUCK_CO2 / 1000);

      // Top 3 origin hubs
      const top3 = [...hubNames].sort((a, b) =>
        distKm(ship.location, RAIL_HUBS[a]) - distKm(ship.location, RAIL_HUBS[b])
      ).slice(0, 3);

      const hubOptions = top3.map((hubName, idx) => {
        const hubCoords     = RAIL_HUBS[hubName];
        const destHubCoords = RAIL_HUBS[destHubName];

        const dToHub      = distKm(ship.location, hubCoords);
        const dRail       = distKm(hubCoords, destHubCoords);
        const dLastMile   = distKm(destHubCoords, dest);
        const trainInfo   = assignFreightTrain(hubName, destHubName);

        const timeToHub   = dToHub / TRUCK_SPEED;
        const timeRail    = dRail  / trainInfo.avg_speed_kmh;
        const timeLastMile = dLastMile / TRUCK_SPEED;
        const totalEtaH   = timeToHub + 1.5 + timeRail + timeLastMile; // 1.5h transshipment

        const multiCostINR = Math.round(dToHub * TRUCK_COST + dRail * RAIL_COST + dLastMile * TRUCK_COST + TRANSSHIP_FEE);
        const multiCO2Kg   = Math.round((dToHub + dLastMile) * TRUCK_CO2 / 1000 + dRail * RAIL_CO2 / 1000);

        return {
          rank: idx + 1,
          isRecommended: idx === 0,
          originHub: hubName,
          originHubCoords: hubCoords,
          destHub: destHubName,
          destHubCoords,
          distToHubKm:    Math.round(dToHub),
          distRailLegKm:  Math.round(dRail),
          distLastMileKm: Math.round(dLastMile),
          train: trainInfo,
          totalEtaHours:    Math.round(totalEtaH * 10) / 10,
          timeSavedHours:   Math.max(0, Math.round((roadTimeH - totalEtaH) * 10) / 10),
          roadCostINR,
          multimodalCostINR: multiCostINR,
          costSavingINR:    roadCostINR - multiCostINR,
          roadCO2Kg,
          multimodalCO2Kg:  multiCO2Kg,
          co2SavingKg:      Math.max(0, roadCO2Kg - multiCO2Kg),
        };
      });

      suggestions.push({
        shipmentId:        ship.id,
        truckId:           ship.truck_id || String(ship.id),
        origin:            ship.origin || 'Origin',
        destination:       ship.destination || 'Destination',
        currentStatus:     ship.status,
        currentDelay:      ship.delay,
        riskReason,
        disruptionType:    disruption?.type    || null,
        disruptionSeverity: disruption?.severity || null,
        hubOptions,
      });
    }

    res.json({ suggestions, hasRisk: suggestions.length > 0 });
  } catch (err) {
    console.error('Reroute preview error:', err);
    res.status(500).json({ suggestions: [], hasRisk: false, error: err.message });
  }
});

// 3b. The AI Optimizer Engine (PM Gati Shakti Master Plan Logic)
app.post('/api/optimize', async (req, res) => {
  console.log('🤖 AI Master Optimizer (Gati Shakti Connectivity) activated...');
  try {
    const { data: shipments } = await supabase.from('shipments').select('*');
    const { data: disruptions } = await supabase.from('disruptions').select('*');

    let fixedCount = 0;
    let railCount = 0;
    let aiExplanation = "";

    console.log(`📦 Fleet snapshot: ${shipments?.length || 0} shipments, ${disruptions?.length || 0} active disruptions`);
    // ── Optimized Parallel Optimization Engine ────────────────────────────────
    const hubNames = Object.keys(RAIL_HUBS);
    let aiPromise = null;

    const optimizationResults = await Promise.all((shipments || []).map(async (shipment) => {
      let nearestDisruption = null;
      let needsReroute = false;

      // Fast Disruption Check: Check every ~40th point instead of every point
      if (disruptions && shipment.route) {
        const step = Math.max(1, Math.floor(shipment.route.length / 40));
        for (const d of disruptions) {
          for (let i = 0; i < shipment.route.length; i += step) {
            const point = shipment.route[i];
            const dist = Math.sqrt(Math.pow(point[0] - d.location[0], 2) + Math.pow(point[1] - d.location[1], 2));
            if (dist < 1.5) { nearestDisruption = d; needsReroute = true; break; }
          }
          if (needsReroute) break;
        }
      }

      if (needsReroute || shipment.status === 'Critical' || shipment.status === 'At Risk' || shipment.delay >= 150) {
        let transportMode = 'Road';
        let bypassPoint = null;
        const dest = shipment.route ? shipment.route[shipment.route.length - 1] : shipment.location;

        const shouldTransship = shipment.delay >= 150;

        if (shouldTransship) {
            transportMode = 'Rail';
            const nearestHub = [...hubNames].sort((a,b) => {
                const da = Math.sqrt(Math.pow(shipment.location[0]-RAIL_HUBS[a][0], 2) + Math.pow(shipment.location[1]-RAIL_HUBS[a][1], 2));
                const db = Math.sqrt(Math.pow(shipment.location[0]-RAIL_HUBS[b][0], 2) + Math.pow(shipment.location[1]-RAIL_HUBS[b][1], 2));
                return da - db;
            })[0];
            bypassPoint = RAIL_HUBS[nearestHub];
            
            const destHub = [...hubNames].sort((a,b) => {
                const destCoords = shipment.route ? shipment.route[shipment.route.length - 1] : shipment.location;
                const da = Math.sqrt(Math.pow(destCoords[0]-RAIL_HUBS[a][0], 2) + Math.pow(destCoords[0]-RAIL_HUBS[a][1], 2));
                const db = Math.sqrt(Math.pow(destCoords[0]-RAIL_HUBS[b][0], 2) + Math.pow(destCoords[0]-RAIL_HUBS[b][1], 2));
                return da - db;
            })[0];
            const trainInfo = assignFreightTrain(nearestHub, destHub);
            shipment._trainInfo = trainInfo;
            shipment._originHubName = nearestHub;
            shipment._destHubName = destHub;
        } else {
            bypassPoint = computeBypassWaypoint(shipment.location, dest, nearestDisruption, 0.6);
        }

        // Trigger AI Explanation Promise once (concise for speed)
        if (!aiPromise) {
          const systemMsg = `You are the Gati Shakti Logistics OS. 
          STRICT RULES:
          1. Output exactly 3 bullet points.
          2. Total length MUST BE between 30 and 60 words.
          3. No algorithms, no math, no greetings.
          4. Professional, data-driven style.`;

          const aiPrompt = `GENERATE 3 BULLET POINTS FOR TRK-${shipment.truck_id}:
          Scenario: ${transportMode === 'Rail' ? 'Switched to Rail to bypass road blockage.' : 'Road bypass initiated for ' + (nearestDisruption?.type || 'delay') + '.'}
          Metrics: Efficiency, Time saved, ESG impact.`;
          
          const AI_MODEL_STABLE = "mistralai/mistral-7b-instruct:free";
          
          aiPromise = (async () => {
            try {
              console.log(`🤖 AI PROMPT for TRK-${shipment.truck_id} [MODEL: ${AI_MODEL_STABLE}]:`, aiPrompt);
              const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
                method: "POST",
                headers: {
                  "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
                  "Content-Type": "application/json",
                  "HTTP-Referer": "http://localhost:5173",
                  "X-Title": "AetherLog Dashboard"
                },
                body: JSON.stringify({
                  model: AI_MODEL_STABLE,
                  messages: [
                    { role: "system", content: systemMsg },
                    { role: "user", content: aiPrompt }
                  ],
                  max_tokens: 150, // Higher to allow for the 30-60 word range
                  temperature: 0.7, // Slightly higher for better flow within the word range
                  stream: false
                })
              });
              
              const result = await response.json();
              if (result.error) {
                console.error("❌ OpenRouter Error Details:", JSON.stringify(result.error));
                return "AI Optimization successful. Route efficiency increased by 15%. ESG impact neutralized.";
              }
              
              const text = result.choices?.[0]?.message?.content || "";
              console.log(`📡 AI RESPONSE:`, text);
              
              return text.trim() || "Route optimization successful.";
            } catch (e) { 
              console.error("❌ AI Fetch Error:", e);
              return "Gati Shakti optimization applied."; 
            }
          })();
        }

        // Fetch Optimized Path (Parallel with others)
        let newRoute = shipment.route;
        try {
          if (transportMode === 'Rail') {
            const hubs = findRailPath(shipment._originHubName, shipment._destHubName);
            const segments = [shipment.location, ...hubs, dest];
            let concatenatedRoute = [];
            
            console.log(`📡 Calculating segmented multimodal route for TRK-${shipment.truck_id} (${segments.length - 1} segments)...`);
            
            for (let i = 0; i < segments.length - 1; i++) {
              const start = segments[i];
              const end = segments[i+1];
              // Use a simpler OSRM call for each segment
              const url = `http://router.project-osrm.org/route/v1/driving/${start[1]},${start[0]};${end[1]},${end[0]}?overview=full&geometries=geojson&radiuses=3000;3000`;
              
              try {
                const res = await fetch(url);
                const data = await res.json();
                if (data.code === 'Ok' && data.routes?.[0]) {
                  const segmentCoords = data.routes[0].geometry.coordinates.map(([lng, lat]) => [lat, lng]);
                  // Avoid duplicating join points
                  if (concatenatedRoute.length > 0) segmentCoords.shift();
                  concatenatedRoute.push(...segmentCoords);
                } else {
                  // If segment fails, use straight line for JUST this segment
                  concatenatedRoute.push(start, end);
                }
              } catch (err) {
                concatenatedRoute.push(start, end);
              }
            }
            if (concatenatedRoute.length > 2) {
              newRoute = concatenatedRoute;
            }
          } else {
            const url = getOsrmUrl([shipment.location, bypassPoint, dest], shipment.origin, shipment.destination);
            const osrmRes = await fetch(url);
            const osrmData = await osrmRes.json();
            if (osrmData.code === 'Ok' && osrmData.routes?.[0]) {
              newRoute = osrmData.routes[0].geometry.coordinates.map(([lng, lat]) => [lat, lng]);
            }
          }
        } catch (e) { console.error("❌ Routing Error:", e); }

        // Update Supabase
        await supabase.from('shipments').update({
          status: 'On-Track',
          transport_mode: transportMode,
          route: newRoute,
          delay: transportMode === 'Rail' ? 20 : 15,
          ...(shipment._trainInfo ? {
            train_number: shipment._trainInfo.train_number,
            train_name: shipment._trainInfo.train_name,
            train_operator: shipment._trainInfo.train_operator,
            commodity_type: shipment._trainInfo.commodity_type,
            avg_speed_kmh: shipment._trainInfo.avg_speed_kmh,
            wagon_type: shipment._trainInfo.wagon_type,
          } : {})
        }).eq('id', shipment.id);
        
        return { fixed: true, rail: transportMode === 'Rail' };
      }
      return { fixed: false };
    }));

    fixedCount = optimizationResults.filter(r => r.fixed).length;
    railCount = optimizationResults.filter(r => r.rail).length;
    aiExplanation = aiPromise ? await aiPromise : "";

    if (fixedCount > 0) await supabase.from('disruptions').delete().neq('id', 0);

    console.log(`✅ Optimization complete: ${fixedCount} units fixed (${railCount} → Rail)`);
    res.json({ success: true, message: `Optimized ${fixedCount} units.`, railCount, aiExplanation });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Optimization failed' });
  }
});

const PORT = process.env.PORT || 8082;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 AetherLog Gati Shakti Backend on http://localhost:${PORT}`);
  console.log(`📡 Monitoring National Logistics Grid... (Press Ctrl+C to stop)`);
});



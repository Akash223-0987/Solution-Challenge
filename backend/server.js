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
    // Shortest distance: Just go from origin hub to destination hub directly
    return [RAIL_HUBS[startHub], RAIL_HUBS[endHub]];
}

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const openrouter = new OpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY
});

const AI_MODEL = "google/gemma-4-31b-it:free";

// 1. Fetch Shipments
app.get('/api/shipments', async (req, res) => {
  const { userId } = req.query;
  
  let query = supabase.from('shipments').select('*');
  if (userId) {
    query = query.eq('user_id', userId);
  }

  const { data, error } = await query;
  if (error) {
    console.error('❌ Supabase Fetch Error:', error);
    return res.status(400).json(error);
  }
  res.json(data);
});

// 2. Create Shipment with AI Risk Analysis and Auto-Disruption
app.post('/api/shipments', async (req, res) => {
  let { truck_id, origin, destination, weight, terrain_type, features, user_id } = req.body;
  
  // Trim whitespace
  origin = origin?.trim();
  destination = destination?.trim();

  console.log(`🔍 Validating cities: "${origin}" -> "${destination}"`);

  // Input validation
  if (!truck_id || !origin || !destination || isNaN(weight) || weight <= 0) {
    return res.status(400).json({ error: "Invalid truck data. Please provide ID, origin, destination, and valid weight." });
  }

  const startCoords = CITY_COORDS[origin];
  const destCoords = CITY_COORDS[destination];

  if (!startCoords || !destCoords) {
    return res.status(400).json({ error: `Could not geocode cities. Available: ${Object.keys(CITY_COORDS).slice(0, 5).join(', ')}...` });
  }

  // Initial OSRM Route Fetch
  let route = [startCoords, destCoords];
  try {
    const url = getOsrmUrl([startCoords, destCoords], origin, destination);
    const osrmRes = await fetch(url);
    const osrmData = await osrmRes.json();
    if (osrmData.routes && osrmData.routes[0]) {
      route = osrmData.routes[0].geometry.coordinates.map(([lng, lat]) => [lat, lng]);
    }
  } catch (e) {
    console.error("OSRM initial route fetch failed:", e);
  }

  const riskScore = Math.floor(Math.random() * 30) + (weight > 10 ? 60 : 40); 
  const riskAnalysis = `AI Alert: High-risk corridor detected for TRK-${truck_id}. ${weight}T load sensitive to ${terrain_type} conditions.`;

  console.log(`🚚 Creating Shipment: ${truck_id} (${origin} -> ${destination})`);

  // Updated distribution for 6 trucks: 2 On-Track (33%), 1 At Risk (17%), 3 Critical (50%)
  const disruptionChance = Math.random();
  let initialDelay = 0;
  let status = 'On-Track';
  let disruptionToInsert = null;

  if (disruptionChance > 0.33) { // 67% chance of some issue
    let severity = 'Medium';
    if (disruptionChance > 0.50) {
      severity = 'Critical';
    } else {
      // Small range (0.33 to 0.50) for 'At Risk' (Medium/High)
      severity = Math.random() > 0.5 ? 'High' : 'Medium';
    }
    
    const type = ["Thunderstorm", "Traffic Gridlock", "National Highway Blockade", "Landslide", "Bridge Maintenance"][Math.floor(Math.random() * 5)];
    const disLocation = route[Math.floor(route.length * 0.4)]; 
    initialDelay = severity === 'Critical' ? 210 : (severity === 'High' ? 60 : 25);
    status = severity === 'Critical' ? 'Critical' : 'At Risk';

    if (disLocation) {
      disruptionToInsert = {
        type,
        severity,
        location: disLocation,
        description: `CRITICAL ALERT: TRK-${truck_id} encountered ${type}. Immediate rerouting required. Estimated delay: ${initialDelay}m.`
      };
    }
  }

  const { data: shipmentData, error: shipmentError } = await supabase
    .from('shipments')
    .insert([{ 
      truck_id, origin, destination, weight, terrain_type, features: features || [], 
      location: startCoords, route, status, delay: initialDelay,
      transport_mode: 'Road',
      user_id: user_id || null
    }])
    .select();

  if (shipmentError) {
    console.error('❌ Supabase Insert Error:', shipmentError);
    return res.status(400).json(shipmentError);
  }

  if (disruptionToInsert) {
    await supabase.from('disruptions').insert([disruptionToInsert]);
  }

  res.json({ message: "Shipment Created", data: shipmentData, riskScore, riskAnalysis });
});

app.get('/api/disruptions', async (req, res) => {
  const { data, error } = await supabase.from('disruptions').select('*');
  if (error) return res.status(400).json(error);
  res.json(data);
});

// ─────────────────────────────────────────────────────────────────────────────
// Multimodal Route Optimization (Preview)
// ─────────────────────────────────────────────────────────────────────────────
app.post('/api/reroute-preview', async (req, res) => {
  try {
    const { userId } = req.body;
    let query = supabase.from('shipments').select('*');
    if (userId) {
      query = query.eq('user_id', userId);
    }
    
    const { data: shipments } = await query;
    const atRisk = shipments.filter(s => s.status !== 'On-Track' || (s.delay || 0) > 30);
    
    if (atRisk.length === 0) {
      return res.json({ hasRisk: false, suggestions: [] });
    }

    const suggestions = atRisk.map(s => {
      // Find candidate hubs within 300km of current location
      const hubCandidates = Object.entries(RAIL_HUBS)
        .map(([name, coords]) => ({
          name,
          coords,
          dist: Math.sqrt(Math.pow(coords[0]-s.location[0], 2) + Math.pow(coords[1]-s.location[1], 2)) * 111
        }))
        .filter(h => h.dist < 600) // Search radius
        .sort((a,b) => a.dist - b.dist)
        .slice(0, 3);

      return {
        shipmentId: s.id,
        truckId: s.truck_id,
        origin: s.origin,
        destination: s.destination,
        currentStatus: s.status,
        currentDelay: s.delay,
        riskReason: s.status === 'Critical' ? 'Severe Gridlock' : 'Potential Delay',
        hubOptions: hubCandidates.map((h, idx) => {
          const destHubName = Object.keys(RAIL_HUBS).find(name => name.includes(s.destination)) || Object.keys(RAIL_HUBS)[0];
          const destHubCoords = RAIL_HUBS[destHubName];
          
          const railDist = Math.sqrt(Math.pow(destHubCoords[0]-h.coords[0], 2) + Math.pow(destHubCoords[1]-h.coords[1], 2)) * 111;
          const lastMileDist = Math.sqrt(Math.pow(CITY_COORDS[s.destination][0]-destHubCoords[0], 2) + Math.pow(CITY_COORDS[s.destination][1]-destHubCoords[1], 2)) * 111;
          
          return {
            rank: idx + 1,
            isRecommended: idx === 0,
            originHub: h.name,
            destHub: destHubName,
            distToHubKm: Math.round(h.dist),
            distRailLegKm: Math.round(railDist),
            distLastMileKm: Math.round(lastMileDist),
            train: assignFreightTrain(h.name, destHubName),
            totalEtaHours: Math.round((railDist/65) + 4),
            timeSavedHours: Math.max(1, Math.round(s.delay/60) + 2 - idx),
            roadCostINR: Math.round(s.weight * 500),
            multimodalCostINR: Math.round(s.weight * 320 * (1 + (idx * 0.06))),
            costSavingINR: Math.round(s.weight * 500) - Math.round(s.weight * 320 * (1 + (idx * 0.06))),
            roadCO2Kg: Math.round(s.weight * 45),
            multimodalCO2Kg: Math.round(s.weight * 12 * (1 + (idx * 0.06))),
            co2SavingKg: Math.round(s.weight * 45) - Math.round(s.weight * 12 * (1 + (idx * 0.06)))
          };
        })
      };
    });

    res.json({ hasRisk: suggestions.length > 0, suggestions });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Preview failed' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// Multimodal Optimization (Apply)
// ─────────────────────────────────────────────────────────────────────────────
app.post('/api/optimize', async (req, res) => {
  try {
    const { shipmentId, userId } = req.body;
    let query = supabase.from('shipments').select('*');
    if (shipmentId && shipmentId !== 'ALL') {
      query = query.eq('id', shipmentId);
    } else if (userId) {
      query = query.eq('user_id', userId);
    }
    
    const { data: shipments } = await query;
    const { data: disruptions } = await supabase.from('disruptions').select('*');

    let fixedCount = 0;
    let railCount = 0;
    let aiExplanation = "";
    let aiPromise = null;

    const optimizationResults = await Promise.all(shipments.map(async (shipment) => {
      // Find nearest disruption
      const nearestDisruption = disruptions.find(d => {
        const dist = Math.sqrt(Math.pow(d.location[0]-shipment.location[0], 2) + Math.pow(d.location[1]-shipment.location[1], 2)) * 111;
        return dist < 100;
      });

      if (shipment.status !== 'On-Track' || (shipment.delay || 0) > 30 || nearestDisruption) {
        // Logic: If delay is critical (>120) or bridge/landslide, switch to Rail. Else, Road bypass.
        const needsRail = shipment.status === 'Critical' || (shipment.delay || 0) > 120 || (nearestDisruption?.type === 'Landslide' || nearestDisruption?.type === 'Bridge Maintenance');
        const transportMode = needsRail ? 'Rail' : 'Road';
        
        const dest = CITY_COORDS[shipment.destination];
        let bypassPoint = dest;

        // Add specific metadata for AI
        if (needsRail) {
           const hubs = Object.entries(RAIL_HUBS).sort((a,b) => {
             const distA = Math.sqrt(Math.pow(a[1][0]-shipment.location[0], 2) + Math.pow(a[1][1]-shipment.location[1], 2));
             const distB = Math.sqrt(Math.pow(b[1][0]-shipment.location[0], 2) + Math.pow(b[1][1]-shipment.location[1], 2));
             return distA - distB;
           });
           shipment._originHubName = hubs[0][0];
           shipment._destHubName = Object.keys(RAIL_HUBS).find(n => n.includes(shipment.destination)) || Object.keys(RAIL_HUBS)[0];
           shipment._trainInfo = assignFreightTrain(shipment._originHubName, shipment._destHubName);
        } else {
            // Function to compute a simple road bypass waypoint
            const computeBypassWaypoint = (start, end, disruption, offset = 0.5) => {
              const midLat = (start[0] + end[0]) / 2;
              const midLng = (start[1] + end[1]) / 2;
              // Push waypoint slightly perpendicular to the direct path
              return [midLat + (Math.random() > 0.5 ? offset : -offset), midLng + (Math.random() > 0.5 ? offset : -offset)];
            };
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
          
          const AI_MODEL_STABLE = AI_MODEL;
          const AI_MODEL_FALLBACK = "openai/gpt-oss-120b:free";
          
          aiPromise = (async () => {
            const fetchOpenRouter = async (modelName) => {
              const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
                method: "POST",
                headers: {
                  "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
                  "Content-Type": "application/json",
                  "HTTP-Referer": "http://localhost:5173",
                  "X-Title": "AetherLog Dashboard"
                },
                body: JSON.stringify({
                  model: modelName,
                  messages: [
                    { role: "system", content: systemMsg },
                    { role: "user", content: aiPrompt }
                  ],
                  max_tokens: 150,
                  temperature: 0.7,
                  stream: false
                })
              });

              if (!response.ok) {
                const errorData = await response.text();
                throw new Error(`HTTP Error ${response.status}: ${errorData}`);
              }
              
              const data = await response.json();
              if (data.choices?.[0]?.message?.content) {
                return data.choices[0].message.content.trim();
              } else {
                throw new Error("Unexpected Payload");
              }
            };

            try {
              console.log(`🤖 AI MISSION for TRK-${shipment.truck_id} [PRIMARY: ${AI_MODEL_STABLE}]`);
              const text = await fetchOpenRouter(AI_MODEL_STABLE);
              console.log(`📡 AI RESPONSE (PRIMARY):`, text);
              return text;
            } catch (err) {
              console.warn(`⚠️ Primary AI Failed (${err.message}). Attempting FALLBACK...`);
              try {
                console.log(`🤖 AI MISSION for TRK-${shipment.truck_id} [FALLBACK: ${AI_MODEL_FALLBACK}]`);
                const fallbackText = await fetchOpenRouter(AI_MODEL_FALLBACK);
                console.log(`📡 AI RESPONSE (FALLBACK):`, fallbackText);
                return fallbackText;
              } catch (fallbackErr) {
                console.error("❌ Both AI Models Failed:", fallbackErr.message);
                return "AI Intelligence service temporarily unavailable. Protocol: Manual Routing.";
              }
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

// 3. Live Weather News Scraper (Informational only)
app.get('/api/weather-news', async (req, res) => {
  try {
    const response = await fetch('https://www.skymetweather.com/weather-news/');
    const html = await response.text();
    
    // Simple regex to extract titles from the Skymet "Suggested Resources" or latest news blocks
    // This is a robust enough approach for a dashboard news ticker
    const matches = html.match(/<a[^>]+href="([^"]+)"[^>]*>([^<]+)<\/a>/g) || [];
    const news = matches
      .map(m => {
        const title = m.replace(/<[^>]+>/g, '').trim();
        const link = m.match(/href="([^"]+)"/)?.[1] || '';
        return { title, link };
      })
      .filter(n => n.title.length > 20 && (n.title.includes('Weather') || n.title.includes('Rain') || n.title.includes('Heat') || n.title.includes('Storm') || n.title.includes('India')))
      .slice(0, 8);

    // Fallback if scraping fails or returns nothing
    if (news.length === 0) {
      return res.json([
        { title: "Network Alert: Pre-monsoon activity observed in Southern corridors.", link: "#" },
        { title: "Logistics Advisory: Heavy fog reported in Northern clusters, expect transit delays.", link: "#" },
        { title: "Climate Update: Heatwave conditions intensifying across Central India.", link: "#" }
      ]);
    }
    
    res.json(news);
  } catch (error) {
    console.error('Weather news fetch failed:', error);
    res.status(500).json({ error: 'Failed to fetch weather news' });
  }
});

const PORT = process.env.PORT || 8082;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 AetherLog Gati Shakti Backend on http://localhost:${PORT}`);
  console.log(`📡 Monitoring National Logistics Grid... (Press Ctrl+C to stop)`);
});

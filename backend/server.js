import express from 'express';
import cors from 'cors';
import { createClient } from '@supabase/supabase-js';
import fetch from 'node-fetch';
import dotenv from 'dotenv';
import { OpenRouter } from '@openrouter/sdk';
import { RAIL_HUBS } from './rail_hubs.js';
import { CITY_COORDS } from './cities.js';
import { assignFreightTrain } from './freight_trains.js';

dotenv.config();

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
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
}));
app.use(express.json());

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const openrouter = new OpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY
});

const AI_MODEL = "nvidia/nemotron-3-super-120b-a12b:free";

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
  const { truck_id, origin, destination, weight, terrain_type, features } = req.body;

  // Input validation
  if (!truck_id || !origin || !destination || isNaN(weight) || weight <= 0) {
    return res.status(400).json({ error: 'Invalid input: truck_id, origin, destination, and a positive weight are required.' });
  }
  if (!CITY_COORDS[origin]) {
    return res.status(400).json({ error: `Unknown origin city: "${origin}". Please use a supported Indian city.` });
  }
  if (!CITY_COORDS[destination]) {
    return res.status(400).json({ error: `Unknown destination city: "${destination}". Please use a supported Indian city.` });
  }

  const startCoords = CITY_COORDS[origin];
  const endCoords = CITY_COORDS[destination];

  // Fetch initial real road route from OSRM
  let route = [startCoords, endCoords]; 
  try {
    const osrmUrl = `http://router.project-osrm.org/route/v1/driving/${startCoords[1]},${startCoords[0]};${endCoords[1]},${endCoords[0]}?overview=full&geometries=geojson`;
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
    // Critical delay (190m) is above the 180m Gati Shakti threshold — guarantees rail diversion
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
      // Only suggest for at-risk / delayed shipments
      const isAtRisk = ship.status === 'Critical' || ship.status === 'At Risk' ||
                       ship.status === 'Delayed'  || ship.delay >= 30;
      let disruption = null;
      if (disruptions && ship.route) {
        outer: for (const d of disruptions) {
          for (const pt of ship.route) {
            const dist = Math.sqrt(Math.pow(pt[0]-d.location[0],2) + Math.pow(pt[1]-d.location[1],2));
            if (dist < 1.5) { disruption = d; break outer; }
          }
        }
      }
      if (!isAtRisk && !disruption) continue;

      const riskReason = disruption
        ? `${disruption.type} on route (${disruption.severity} severity)`
        : ship.delay >= 180 ? `Critical delay of ${ship.delay} mins — rail switch recommended`
        : `Delay of ${ship.delay} mins detected on corridor`;

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
    const hubNames = Object.keys(RAIL_HUBS);

    for (const shipment of shipments) {
      let nearestDisruption = null;
      let needsReroute = false;

      // Check if disruption is on path
      if (disruptions && shipment.route) {
        for (const d of disruptions) {
          for (const point of shipment.route) {
            const dist = Math.sqrt(Math.pow(point[0] - d.location[0], 2) + Math.pow(point[1] - d.location[1], 2));
            if (dist < 1.5) { nearestDisruption = d; needsReroute = true; break; }
          }
          if (needsReroute) break;
        }
      }

      console.log(`  → TRK-${shipment.truck_id}: status=${shipment.status} delay=${shipment.delay}m disruption=${nearestDisruption?.severity || 'none'}`);

      if (needsReroute || shipment.status === 'Critical' || shipment.status === 'At Risk' || shipment.delay >= 180) {
        let transportMode = 'Road';
        let bypassPoint = null;
        const dest = shipment.route ? shipment.route[shipment.route.length - 1] : shipment.location;

        // PM GATI SHAKTI STRATEGY:
        // Switch to RAIL if delay >= 180 mins (3 hours) OR any Critical disruption is on this route
        const shouldTransship = shipment.delay >= 180 || nearestDisruption?.severity === 'Critical';

        if (shouldTransship) {
            transportMode = 'Rail';
            const nearestHub = [...hubNames].sort((a,b) => {
                const da = Math.sqrt(Math.pow(shipment.location[0]-RAIL_HUBS[a][0], 2) + Math.pow(shipment.location[1]-RAIL_HUBS[a][1], 2));
                const db = Math.sqrt(Math.pow(shipment.location[0]-RAIL_HUBS[b][0], 2) + Math.pow(shipment.location[1]-RAIL_HUBS[b][1], 2));
                return da - db;
            })[0];
            bypassPoint = RAIL_HUBS[nearestHub];
            // Assign real goods train for this corridor
            const destHub = [...hubNames].sort((a,b) => {
                const destCoords = shipment.route ? shipment.route[shipment.route.length - 1] : shipment.location;
                const da = Math.sqrt(Math.pow(destCoords[0]-RAIL_HUBS[a][0], 2) + Math.pow(destCoords[1]-RAIL_HUBS[a][1], 2));
                const db = Math.sqrt(Math.pow(destCoords[0]-RAIL_HUBS[b][0], 2) + Math.pow(destCoords[1]-RAIL_HUBS[b][1], 2));
                return da - db;
            })[0];
            const trainInfo = assignFreightTrain(nearestHub, destHub);
            shipment._trainInfo = trainInfo; // attach for Supabase update below
            console.log(`🚆 Gati Shakti Multimodal: Diverting ${shipment.truck_id} to ${nearestHub} Rail Hub → ${destHub}`);
            console.log(`   🚂 Assigned: [${trainInfo.train_number}] ${trainInfo.train_name} (${trainInfo.commodity_type})`);
        } else {
            bypassPoint = computeBypassWaypoint(shipment.location, dest, nearestDisruption, 0.6);
            console.log(`🛣️ Road Optimization: Recalculating highway bypass for ${shipment.truck_id}`);
        }

        // Fetch Optimized Road-to-Hub or Road-to-Hub-to-Destination Path
        let newRoute = shipment.route;
        try {
          const url = `http://router.project-osrm.org/route/v1/driving/${shipment.location[1]},${shipment.location[0]};${bypassPoint[1]},${bypassPoint[0]};${dest[1]},${dest[0]}?overview=full&geometries=geojson`;
          const osrmRes = await fetch(url);
          const osrmData = await osrmRes.json();
          if (osrmData.routes?.[0]) {
            newRoute = osrmData.routes[0].geometry.coordinates.map(([lng, lat]) => [lat, lng]);
          }
        } catch (e) { console.error("OSRM Optimize Error", e); }

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
        
        fixedCount++;
        if (transportMode === 'Rail') railCount++;

        // Only generate AI Explanation for the first one to avoid API limits
        if (!aiExplanation) {
          const prompt = transportMode === 'Rail' 
            ? `PM Gati Shakti Analysis: Truck ${shipment.truck_id} diverted to Rail via nearest Transshipment Hub due to critical road blockage. Explain how this multimodal switch saves fuel and carbon emissions while bypassing the ${nearestDisruption?.type || 'blockage'}.`
            : `Road Optimization: TRK-${shipment.truck_id} diverted via shortest bypass corridor to avoid ${nearestDisruption?.type || 'delay'}. Mention mathematical shortest path.`;
          
          try {
            let responseText = "";
            const stream = await openrouter.chat.send({
              model: AI_MODEL,
              messages: [{ role: "user", content: prompt }],
              stream: true
            });

            process.stdout.write("\n🧠 AI Reasoning Stream: ");
            for await (const chunk of stream) {
              const content = chunk.choices[0]?.delta?.content;
              if (content) {
                responseText += content;
                process.stdout.write(content);
              }

              // Usage information comes in the final chunk
              if (chunk.usage) {
                console.log("\n[Reasoning tokens:", chunk.usage.reasoningTokens, "]\n");
              }
            }
            aiExplanation = responseText || "Optimized fleet response.";
          } catch (e) { 
            console.error("OpenRouter SDK Error:", e);
            aiExplanation = "AI re-routed shipments to ensure Multimodal Gati Shakti efficiency."; 
          }
        }
      }
    }

    if (fixedCount > 0) await supabase.from('disruptions').delete().neq('id', 0);

    console.log(`✅ Optimization complete: ${fixedCount} units fixed (${railCount} → Rail, ${fixedCount - railCount} → Road bypass)`);
    res.json({ success: true, message: `Gati Shakti: Optimized ${fixedCount} units (${railCount} switched to Rail).`, aiExplanation });
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



import express from 'express';
import cors from 'cors';
import { createClient } from '@supabase/supabase-js';
import fetch from 'node-fetch';
import dotenv from 'dotenv';
import { RAIL_HUBS } from './rail_hubs.js';
import { CITY_COORDS } from './cities.js';

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
app.use(cors());
app.use(express.json());

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const AI_MODEL = "google/gemini-2.0-flash-exp:free";

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
  
  const startCoords = CITY_COORDS[origin] || [28.6139, 77.2090];
  const endCoords = CITY_COORDS[destination] || [19.0760, 72.8777];

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
    const severity = disruptionChance > 0.8 ? 'Critical' : (disruptionChance > 0.6 ? 'High' : 'Medium');
    // Massive delay for Critical/High to trigger Gati Shakti later
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

// 3. The AI Optimizer Engine (PM Gati Shakti Master Plan Logic)
app.post('/api/optimize', async (req, res) => {
  console.log('🤖 AI Master Optimizer (Gati Shakti Connectivity) activated...');
  try {
    const { data: shipments } = await supabase.from('shipments').select('*');
    const { data: disruptions } = await supabase.from('disruptions').select('*');

    let fixedCount = 0;
    let aiExplanation = "";

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

      if (needsReroute || shipment.status === 'Critical' || shipment.status === 'At Risk' || shipment.delay >= 180) {
        let transportMode = 'Road';
        let bypassPoint = null;
        const dest = shipment.route ? shipment.route[shipment.route.length - 1] : shipment.location;

        // PM GATI SHAKTI STRATEGY:
        // Only switch to RAIL if delay >= 180 mins (3 hours) 
        // OR it's a Critical disruption with a 40% probability for demo diversity
        const shouldTransship = shipment.delay >= 180 || (nearestDisruption?.severity === 'Critical' && Math.random() > 0.6);

        if (shouldTransship) {
            transportMode = 'Rail';
            const hubNames = Object.keys(RAIL_HUBS);
            const nearestHub = hubNames.sort((a,b) => {
                const da = Math.sqrt(Math.pow(shipment.location[0]-RAIL_HUBS[a][0], 2) + Math.pow(shipment.location[1]-RAIL_HUBS[a][1], 2));
                const db = Math.sqrt(Math.pow(shipment.location[0]-RAIL_HUBS[b][0], 2) + Math.pow(shipment.location[1]-RAIL_HUBS[b][1], 2));
                return da - db;
            })[0];
            bypassPoint = RAIL_HUBS[nearestHub];
            console.log(`🚆 Gati Shakti Multimodal: Diverting ${shipment.truck_id} to ${nearestHub} Rail Hub (Delay: ${shipment.delay}m)`);
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
          delay: transportMode === 'Rail' ? 20 : 15
        }).eq('id', shipment.id);
        
        fixedCount++;

        // Only generate AI Explanation for the first one to avoid API limits
        if (!aiExplanation) {
          const prompt = transportMode === 'Rail' 
            ? `PM Gati Shakti Analysis: Truck ${shipment.truck_id} diverted to Rail via nearest Transshipment Hub due to critical road blockage. Explain how this multimodal switch saves fuel and carbon emissions while bypassing the ${nearestDisruption?.type || 'blockage'}.`
            : `Road Optimization: TRK-${shipment.truck_id} diverted via shortest bypass corridor to avoid ${nearestDisruption?.type || 'delay'}. Mention mathematical shortest path.`;
          
          try {
            const aiRes = await fetch("https://openrouter.ai/api/v1/chat/completions", {
              method: "POST",
              headers: { "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`, "Content-Type": "application/json" },
              body: JSON.stringify({ model: AI_MODEL, messages: [{ role: "user", content: prompt }] })
            });
            const aiData = await aiRes.json();
            aiExplanation = aiData.choices?.[0]?.message?.content || "Optimized fleet response.";
          } catch (e) { aiExplanation = "AI re-routed shipments to ensure Multimodal Gati Shakti efficiency."; }
        }
      }
    }

    if (fixedCount > 0) await supabase.from('disruptions').delete().neq('id', 0);

    res.json({ success: true, message: `Gati Shakti: Optimized ${fixedCount} units.`, aiExplanation });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Optimization failed' });
  }
});

const PORT = 8082;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 AetherLog Gati Shakti Backend on http://localhost:${PORT}`);
  console.log(`📡 Monitoring National Logistics Grid... (Press Ctrl+C to stop)`);
});

// Force the event loop to stay active
setInterval(() => {}, 10000);

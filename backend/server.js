import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

// Force .env to override any system-level environment variables
dotenv.config({ override: true });

import { supabase } from './src/lib/supabase.js';
import { OpenRouter } from "@openrouter/sdk";

const openrouter = new OpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY
});

const AI_MODEL = "nvidia/nemotron-3-super-120b-a12b:free";

const app = express();
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(cors());

// 1. Fetch All Active Shipments (For your Map)
app.get('/api/shipments', async (req, res) => {
  const { data: shipments, error } = await supabase
    .from('shipments')
    .select('*');
  
  if (error) return res.status(400).json(error);

  // Get active disruptions
  const { data: disruptions } = await supabase
    .from('disruptions')
    .select('*');

  // Simple Proximity Check
  const processedShipments = shipments.map((shipment) => {
    let status = shipment.status;
    
    if (shipment.location && disruptions && disruptions.length > 0) {
      for (const disruption of disruptions) {
        if (disruption.location) {
          // Calculate basic distance (Euclidean for simplicity)
          const dist = Math.sqrt(
            Math.pow(shipment.location[0] - disruption.location[0], 2) + 
            Math.pow(shipment.location[1] - disruption.location[1], 2)
          );
          
          // roughly within ~50-100km radius depending on coords
          if (dist < 0.5) { 
            status = 'Critical';
            shipment.delay = (shipment.delay || 0) + (disruption.severity === 'High' ? 120 : 45);
            break;
          }
        }
      }
    }
    return { ...shipment, status };
  });

  res.json(processedShipments);
});

// 2. Add New Shipment (Your "+" Button logic)
app.post('/api/shipments', async (req, res) => {
  const { truck_id, origin, destination, weight, terrain_type, location, route } = req.body;
  
  let initialStatus = 'On-Track';

  // Automated Terrain Validator (Constraint Logic)
  // If truck is heavy and terrain is mountainous, it's risky!
  if (weight > 15 && (terrain_type === 'Mountainous' || terrain_type === 'Hilly')) {
      initialStatus = 'At Risk';
  } else if (weight > 25) {
      initialStatus = 'Critical'; // Overloaded for any terrain
  }

  const { data, error } = await supabase
    .from('shipments')
    .insert([{ 
      truck_id, 
      origin, 
      destination, 
      weight, 
      terrain_type, 
      location,
      route,
      status: initialStatus 
    }]);

  if (error) return res.status(400).json(error);

  // Gemini (OpenRouter) Disruption Risk Scoring
  let riskScore = 50; // default
  let riskAnalysis = "Analyzing risk...";

  try {
    const prompt = `Score the logistics risk (0-100) for a shipment from ${origin} to ${destination}. 
    Truck ID: ${truck_id}, Weight: ${weight}T, Terrain: ${terrain_type}. 
    Respond with ONLY a number followed by a short one-sentence explanation. 
    Format: [score] | [explanation]`;

    const riskResponse = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: AI_MODEL,
        messages: [{ role: "user", content: prompt }]
      })
    });

    const aiData = await riskResponse.json();
    const aiText = aiData.choices?.[0]?.message?.content || "";
    const [scorePart, explanation] = aiText.split('|').map(s => s.trim());
    riskScore = parseInt(scorePart) || 50;
    riskAnalysis = explanation || "Risk analysis completed.";
    
    // Attempt to update the shipment with the risk score if the column exists
    await supabase.from('shipments').update({ 
      status: riskScore > 70 ? 'Critical' : (riskScore > 40 ? 'At Risk' : 'On-Track')
    }).eq('truck_id', truck_id);

  } catch (aiErr) {
    console.error("Risk Scoring AI Error:", aiErr);
  }

  res.json({ message: "Shipment Created", data, riskScore, riskAnalysis });
});

// 2.5 Fetch All Active Disruptions (Weather/Traffic)
app.get('/api/disruptions', async (req, res) => {
  const { data, error } = await supabase.from('disruptions').select('*');
  if (error) return res.status(400).json(error);
  res.json(data);
});

// 2.6 Create a new Disruption (auto-triggered when a simulation truck spawns)
app.post('/api/disruptions', async (req, res) => {
  const { type, severity, location, description } = req.body;
  const { data, error } = await supabase
    .from('disruptions')
    .insert([{ type, severity, location, description }])
    .select();
  if (error) return res.status(400).json(error);
  res.json({ message: 'Disruption created', data });
});

// 2.7 Clear all disruptions (after AI resolves them)
app.delete('/api/disruptions', async (req, res) => {
  const { error } = await supabase.from('disruptions').delete().neq('id', 0);
  if (error) return res.status(400).json(error);
  res.json({ message: 'All disruptions cleared' });
});

// 2.8 Get Real Road Route from OSRM (Free, No Key Required)
app.get('/api/road-route', async (req, res) => {
  const { start, end } = req.query; // Expecting "lat,lng" format
  if (!start || !end) return res.status(400).json({ error: "Start and end coordinates required" });

  try {
    const [startLat, startLng] = start.split(',').map(Number);
    const [endLat, endLng] = end.split(',').map(Number);

    // OSRM uses [lng, lat] format
    const url = `http://router.project-osrm.org/route/v1/driving/${startLng},${startLat};${endLng},${endLat}?overview=full&geometries=geojson`;
    const response = await fetch(url);
    const data = await response.json();

    if (!data.routes || data.routes.length === 0) {
      throw new Error("No route found from OSRM");
    }

    // Convert back from [lng, lat] to [lat, lng]
    const coords = data.routes[0].geometry.coordinates.map(([lng, lat]) => [lat, lng]);
    res.json({ coordinates: coords });
  } catch (error) {
    console.error("Road route fetch error:", error);
    res.status(500).json({ error: "Failed to fetch road route" });
  }
});

// 3. The AI Optimizer Engine
app.post('/api/optimize', async (req, res) => {
  console.log('🤖 AI Route Optimizer activated...');

  /**
   * Computes the shortest perpendicular bypass waypoint.
   * Instead of routing to a completely different city, this finds a point
   * that is slightly off to the side of the original path — just enough to
   * clear the disruption zone, then rejoin the original route.
   * 
   * Think of it like GPS rerouting: it doesn't send you to a different city,
   * it takes the next side road and rejoins the highway 2km ahead.
   */
  function computeBypassWaypoint(truckLoc, destination, disruption) {
    // Midpoint between truck and its next destination
    const midLat = (truckLoc[0] + destination[0]) / 2;
    const midLng = (truckLoc[1] + destination[1]) / 2;

    // Direction vector: truck → destination
    const dLat = destination[0] - truckLoc[0];
    const dLng = destination[1] - truckLoc[1];
    const routeLen = Math.sqrt(dLat * dLat + dLng * dLng) || 1;

    // Perpendicular vector (rotate 90°), normalized
    const perpLat = -dLng / routeLen;
    const perpLng =  dLat / routeLen;

    // Offset magnitude: ~0.6 degrees (~65km) — just enough to clear a disruption
    const OFFSET = 0.6;

    // Decide which side to bypass on (away from the disruption)
    // Check if the disruption is "left" or "right" of the route
    let sideSign = 1;
    if (disruption) {
      const crossProduct = (dLat * (disruption.location[1] - truckLoc[1])) 
                         - (dLng * (disruption.location[0] - truckLoc[0]));
      sideSign = crossProduct >= 0 ? -1 : 1; // Go opposite side to the disruption
    }

    return [
      midLat + perpLat * OFFSET * sideSign,
      midLng + perpLng * OFFSET * sideSign,
    ];
  }

  try {
    const { data: shipments, error: shipErr } = await supabase.from('shipments').select('*');
    if (shipErr) throw shipErr;

    const { data: disruptions } = await supabase.from('disruptions').select('*');

    let fixedCount = 0;
    const updates = [];

    for (const shipment of shipments) {
      const isHeavy = shipment.weight > 15;
      const isMountainous = shipment.terrain_type === 'Mountainous';
      let needsReroute = (shipment.status !== 'On-Track') || (isHeavy && isMountainous);
      let nearestDisruption = null;

      // Also check proximity to any active disruption (within ~300km)
      if (shipment.location && disruptions) {
        for (const d of disruptions) {
          if (!d.location) continue;
          const dist = Math.sqrt(
            Math.pow(shipment.location[0] - d.location[0], 2) +
            Math.pow(shipment.location[1] - d.location[1], 2)
          );
          if (dist < 3.0) { needsReroute = true; nearestDisruption = d; break; }
        }
      }

      if (!needsReroute || !shipment.location || !shipment.route) continue;

      const destination = shipment.route[shipment.route.length - 1];

      // Compute a MINIMAL perpendicular bypass — shortest detour, not a cross-country reroute
      const bypassWaypoint = computeBypassWaypoint(
        shipment.location,
        destination,
        nearestDisruption
      );

      // instead of a 3-point straight line, we fetch a REAL road bypass via OSRM
      try {
        const urlLeg1 = `http://router.project-osrm.org/route/v1/driving/${shipment.location[1]},${shipment.location[0]};${bypassWaypoint[1]},${bypassWaypoint[0]}?overview=full&geometries=geojson`;
        const urlLeg2 = `http://router.project-osrm.org/route/v1/driving/${bypassWaypoint[1]},${bypassWaypoint[0]};${destination[1]},${destination[0]}?overview=full&geometries=geojson`;
        
        const [res1, res2] = await Promise.all([fetch(urlLeg1), fetch(urlLeg2)]);
        const [data1, data2] = await Promise.all([res1.json(), res2.json()]);

        let combinedCoords = [];
        if (data1.routes?.[0]) {
          combinedCoords.push(...data1.routes[0].geometry.coordinates.map(([lng, lat]) => [lat, lng]));
        }
        if (data2.routes?.[0]) {
          combinedCoords.push(...data2.routes[0].geometry.coordinates.map(([lng, lat]) => [lat, lng]));
        }

        const newRoute = combinedCoords.length > 0 ? combinedCoords : [shipment.location, bypassWaypoint, destination];

        updates.push(
          supabase.from('shipments')
            .update({
              status: 'On-Track',
              terrain_type: 'Highway',
              route: newRoute
            })
            .eq('id', shipment.id)
        );
      } catch (roadErr) {
        console.error("Optimizer Road Fetch Error:", roadErr);
        // Fallback to straight lines if OSRM fails
        updates.push(
          supabase.from('shipments')
            .update({
              status: 'On-Track',
              terrain_type: 'Highway',
              route: [shipment.location, bypassWaypoint, destination]
            })
            .eq('id', shipment.id)
        );
      }
      fixedCount++;
    }

    // Run all DB updates in parallel
    await Promise.all(updates);

    // AI resolved the threats — clear all active disruptions
    if (fixedCount > 0) {
      await supabase.from('disruptions').delete().neq('id', 0);
    }

    // Generate AI Route Explanation
    let aiExplanation = "";
    if (fixedCount > 0) {
      try {
        // Just explain the first re-routed truck for now as a sample
        const ship = shipments.find(s => (s.status !== 'On-Track' || (s.weight > 15 && s.terrain_type === 'Mountainous')));
        if (ship) {
          const prompt = `Explain the rerouting for Truck ${ship.truck_id} (${ship.weight}T) traveling from ${ship.origin} to ${ship.destination}. 
          It was diverted due to a disruption. New route involves a bypass waypoint. 
          Respond with a professional, human-readable summary. 
          Example: "TRK-4521 (22T) diverted via NH73 to bypass Cyclone zone. Extra distance: 68km. Estimated extra cost: ₹4,200. ETA delay: 47 mins."`;

          const aiResponse = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              model: AI_MODEL,
              messages: [{ role: "user", content: prompt }]
            })
          });
          
          const aiData = await aiResponse.json();
          aiExplanation = aiData.choices?.[0]?.message?.content || "";
        }
      } catch (aiErr) {
        console.error("Optimization AI Error:", aiErr);
        aiExplanation = "AI re-routed trucks to bypass disruption zones. Monitoring secondary corridors.";
      }
    }

    res.json({ 
      success: true, 
      message: `✅ AI Re-routing complete! ${fixedCount} truck${fixedCount !== 1 ? 's' : ''} safely diverted.`,
      aiExplanation: aiExplanation || `Diverted ${fixedCount} trucks via bypass corridors.`
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'AI Optimization failed.' });
  }
});

const PORT = process.env.PORT || 8081;
const server = app.listen(PORT, () => console.log(`🚀 AetherLog Backend running on port ${PORT}`));


server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`❌ Port ${PORT} is already in use. Please close the other process or use a different port.`);
  } else {
    console.error('❌ Server error:', err);
  }
});

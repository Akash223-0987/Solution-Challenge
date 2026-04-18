import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

// Force .env to override any system-level environment variables
dotenv.config({ override: true });

import { supabase } from './src/lib/supabase.js';

const app = express();
app.use(cors());
app.use(express.json());

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
  res.json({ message: "Shipment Created", data });
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

      // New 3-point route: current position → short bypass detour → final destination
      const newRoute = [shipment.location, bypassWaypoint, destination];

      updates.push(
        supabase.from('shipments')
          .update({
            status: 'On-Track',
            terrain_type: 'Highway',
            route: newRoute
          })
          .eq('id', shipment.id)
      );
      fixedCount++;
    }

    // Run all DB updates in parallel
    await Promise.all(updates);

    // AI resolved the threats — clear all active disruptions
    if (fixedCount > 0) {
      await supabase.from('disruptions').delete().neq('id', 0);
    }

    res.json({ 
      success: true, 
      message: `✅ AI Re-routing complete! ${fixedCount} truck${fixedCount !== 1 ? 's' : ''} safely diverted via bypass corridors.` 
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

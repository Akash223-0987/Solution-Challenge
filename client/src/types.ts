// Shared type definitions — import from here in Map.tsx, Sidebar.tsx, etc.

// Active map filter — isolates a single shipment or rail hub
export type ActiveFilter =
  | { type: 'shipment'; id: string | number; label: string }
  | { type: 'hub'; name: string; coords: [number, number] }
  | null;

export interface Shipment {
  id: string | number;
  truck_id?: string;
  name?: string;
  location: [number, number];
  status: string;
  delay: number;
  weight: number;
  maxWeight: number;
  terrain?: string;
  terrain_type?: string;
  route?: [number, number][];
  features?: string[];
  origin?: string;
  destination?: string;
  transport_mode?: 'Road' | 'Rail';
  // Gati Shakti train details (populated by optimizer)
  train_number?: string;
  train_name?: string;
  train_operator?: string;
  commodity_type?: string;
  avg_speed_kmh?: number;
  wagon_type?: string;
}

export interface Disruption {
  id: number;
  type: string;
  severity: string;
  location: [number, number];
  description?: string;
}

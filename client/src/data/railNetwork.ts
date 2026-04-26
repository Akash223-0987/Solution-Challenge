export const RAIL_NETWORK = [
  // Golden Quadrilateral and major freight corridors
  ["New Delhi", "Mumbai CST"],
  ["New Delhi", "Howrah (Kolkata)"],
  ["New Delhi", "Chennai Central"],
  ["Mumbai CST", "Chennai Central"],
  ["Chennai Central", "Howrah (Kolkata)"],
  ["Howrah (Kolkata)", "Mumbai CST"],
  
  // Diagonal Corridors
  ["New Delhi", "Nagpur Junction"],
  ["Nagpur Junction", "Mumbai CST"],
  ["Nagpur Junction", "Chennai Central"],
  ["Nagpur Junction", "Howrah (Kolkata)"],
  
  // North-South and East-West Corridors
  ["Ahmedabad Junction", "Mumbai CST"],
  ["Ahmedabad Junction", "New Delhi"],
  ["Bangalore City", "Chennai Central"],
  ["Bangalore City", "Mumbai CST"],
  ["Hyderabad Junction", "Bangalore City"],
  ["Hyderabad Junction", "Chennai Central"],
  ["Hyderabad Junction", "Nagpur Junction"],
  
  // Central and Eastern Connectors
  ["Itarsi Junction", "Nagpur Junction"],
  ["Itarsi Junction", "Jhansi Junction"],
  ["Jhansi Junction", "New Delhi"],
  ["Mughalsarai (Pt. Deen Dayal)", "New Delhi"],
  ["Mughalsarai (Pt. Deen Dayal)", "Howrah (Kolkata)"],
  ["Mughalsarai (Pt. Deen Dayal)", "Varanasi Junction"],
  ["Kanpur Central", "New Delhi"],
  ["Kanpur Central", "Mughalsarai (Pt. Deen Dayal)"],
  
  // Southern Connectors
  ["Vijayawada Junction", "Chennai Central"],
  ["Vijayawada Junction", "Hyderabad Junction"],
  ["Vijayawada Junction", "Nagpur Junction"],
  
  // Western Connectors
  ["Pune Junction", "Mumbai CST"],
  ["Pune Junction", "Bangalore City"],
  ["Vadodara Junction", "Ahmedabad Junction"],
  ["Vadodara Junction", "Mumbai CST"],
  
  // North-East Connectors
  ["Patna Junction", "Mughalsarai (Pt. Deen Dayal)"],
  ["Guwahati Junction", "Patna Junction"],
  ["Howrah (Kolkata)", "Bhubaneswar"],
  ["Bhubaneswar", "Visakhapatnam"],
  ["Visakhapatnam", "Vijayawada Junction"],
  
  // Additional major hubs
  ["Jabalpur Junction", "Itarsi Junction"],
  ["Jabalpur Junction", "Allahabad (Prayagraj)"],
  ["Lucknow Charbagh", "Kanpur Central"],
  ["Jaipur Junction", "New Delhi"],
  ["Jaipur Junction", "Ahmedabad Junction"],
  ["Surat", "Mumbai CST"],
  ["Surat", "Ahmedabad Junction"]
];

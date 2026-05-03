function getRandomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Generate a full day schedule for an agent
// Returns an array of trip objects: { origin, destination, departureHour, type, vehicle }
export function generateTripChain(agent, nodes) {
  const trips = [];
  
  // Pre-calculate attraction array for random POI selection
  const totalAttraction = nodes.reduce((sum, n) => sum + (n.attraction || 1), 0);
  
  const getRandomDestByAttraction = () => {
    const rand = Math.random() * totalAttraction;
    let cum = 0;
    for (const n of nodes) {
      cum += (n.attraction || 1);
      if (rand <= cum) return n.id;
    }
    return nodes[0].id;
  };

  let currentLocation = agent.home_village;
  
  // Helper to determine vehicle based on agent ownership. 
  // In reality, it could depend on distance, but here we bind to their primary ownership.
  // If they don't own a vehicle, they must walk/transit.
  const chooseVehicle = () => {
    return agent.vehicle_ownership;
  };

  const primaryVehicle = chooseVehicle();

  if (agent.occupation === 'Worker') {
    const isNightShift = Math.random() < 0.1; // 10% night shift workers
    
    if (isNightShift) {
      const workStart = getRandomInt(21, 23);
      const workEnd = (workStart + 8) % 24; // Returns around 5-7 AM
      
      trips.push({
        departureHour: workStart,
        origin: currentLocation,
        destination: agent.work_village,
        type: 'Night Shift Commute',
        vehicle: primaryVehicle
      });
      currentLocation = agent.work_village;

      trips.push({
        departureHour: workEnd,
        origin: currentLocation,
        destination: agent.home_village,
        type: 'Return Home',
        vehicle: primaryVehicle
      });
    } else {
      // Typical Work Day
      const workStart = getRandomInt(7, 9);
      const workEnd = workStart + getRandomInt(8, 9);
      
      // Morning trip to work
      trips.push({
        departureHour: workStart,
        origin: currentLocation,
        destination: agent.work_village,
        type: 'Commute to Work',
        vehicle: primaryVehicle
      });
      currentLocation = agent.work_village;

      // Lunch break - influenced by social mobility
      const lunchProb = 0.2 + (agent.traits.socialMobility * 0.4);
      if (Math.random() < lunchProb) {
        const lunchStart = getRandomInt(12, 13);
        const lunchNode = getRandomDestByAttraction();
        trips.push({
          departureHour: lunchStart,
          origin: currentLocation,
          destination: lunchNode,
          type: 'Lunch Break',
          vehicle: '步行/單車'
        });
        
        trips.push({
          departureHour: lunchStart + 1,
          origin: lunchNode,
          destination: agent.work_village,
          type: 'Return to Work',
          vehicle: '步行/單車'
        });
        currentLocation = agent.work_village;
      }

      // Afternoon business trip - influenced by worker type and a bit of random
      if (Math.random() < 0.15) {
        const bizStart = getRandomInt(14, 15);
        const bizNode = getRandomDestByAttraction();
        trips.push({
          departureHour: bizStart,
          origin: currentLocation,
          destination: bizNode,
          type: 'Business Meeting',
          vehicle: primaryVehicle
        });
        currentLocation = bizNode;

        trips.push({
          departureHour: bizStart + getRandomInt(1, 2),
          origin: currentLocation,
          destination: agent.work_village,
          type: 'Return to Work',
          vehicle: primaryVehicle
        });
        currentLocation = agent.work_village;
      }

      // Evening activity - heavily influenced by social mobility and inverse of thriftiness
      const dinnerProb = 0.2 + (agent.traits.socialMobility * 0.5) - (agent.traits.thriftiness * 0.2);
      if (Math.random() < Math.max(0.1, dinnerProb)) {
        const dinnerNode = getRandomDestByAttraction();
        trips.push({
          departureHour: workEnd,
          origin: currentLocation,
          destination: dinnerNode,
          type: 'Dinner/Shopping',
          vehicle: primaryVehicle
        });
        currentLocation = dinnerNode;
        
        const stayDuration = getRandomInt(1, 3);
        const goHomeHour = Math.min(23, workEnd + stayDuration);
        trips.push({
          departureHour: goHomeHour,
          origin: currentLocation,
          destination: agent.home_village,
          type: 'Return Home',
          vehicle: primaryVehicle
        });
      } else {
        // Go straight home
        trips.push({
          departureHour: workEnd,
          origin: currentLocation,
          destination: agent.home_village,
          type: 'Return Home',
          vehicle: primaryVehicle
        });
      }
    }
  } else if (agent.occupation === 'Student') {
    const schoolStart = 7;
    const schoolEnd = getRandomInt(16, 17);
    
    trips.push({
      departureHour: schoolStart,
      origin: currentLocation,
      destination: agent.work_village, // using work_village attribute for school
      type: 'Commute to School',
      vehicle: primaryVehicle
    });
    currentLocation = agent.work_village;
    
    // Cram school / hang out?
    if (Math.random() < 0.3) {
      const cramSchoolNode = getRandomDestByAttraction();
      trips.push({
        departureHour: schoolEnd,
        origin: currentLocation,
        destination: cramSchoolNode,
        type: 'Cram School/Leisure',
        vehicle: primaryVehicle
      });
      currentLocation = cramSchoolNode;
      
      trips.push({
        departureHour: schoolEnd + getRandomInt(2, 4),
        origin: currentLocation,
        destination: agent.home_village,
        type: 'Return Home',
        vehicle: primaryVehicle
      });
    } else {
      trips.push({
        departureHour: schoolEnd,
        origin: currentLocation,
        destination: agent.home_village,
        type: 'Return Home',
        vehicle: primaryVehicle
      });
    }
    
  } else if (agent.occupation === 'Retiree' || agent.occupation === 'Unemployed') {
    // More flexible schedule, might go out multiple times or not at all
    if (Math.random() < 0.6) { // 60% chance to go out in the morning
      const parkStart = getRandomInt(7, 10);
      const leisureNode = getRandomDestByAttraction(); // Or could use neighbor logic
      
      const vehicle = chooseVehicle();
      trips.push({
        departureHour: parkStart,
        origin: currentLocation,
        destination: leisureNode,
        type: 'Morning Leisure',
        vehicle: vehicle
      });
      currentLocation = leisureNode;
      
      const goHomeHour = parkStart + getRandomInt(1, 3);
      trips.push({
        departureHour: goHomeHour,
        origin: currentLocation,
        destination: agent.home_village,
        type: 'Return Home',
        vehicle: vehicle
      });
      currentLocation = agent.home_village;
    }
    
    // Maybe an afternoon/evening trip from home again
    if (Math.random() < 0.3 && currentLocation === agent.home_village) {
      const shopStart = getRandomInt(15, 18);
      const shopNode = getRandomDestByAttraction();
      
      // Since they are at home, they can choose a new vehicle
      const afternoonVehicle = chooseVehicle();
      
      trips.push({
        departureHour: shopStart,
        origin: currentLocation,
        destination: shopNode,
        type: 'Afternoon Shopping',
        vehicle: afternoonVehicle
      });
      currentLocation = shopNode;
      
      trips.push({
        departureHour: shopStart + getRandomInt(1, 2),
        origin: currentLocation,
        destination: agent.home_village,
        type: 'Return Home',
        vehicle: afternoonVehicle
      });
      currentLocation = agent.home_village;
    }
  }

  // Add Nightlife/Midnight Snack for young adults
  if (agent.age >= 18 && agent.age <= 40) {
    const nightProb = (agent.traits.socialMobility * 0.4) - (agent.traits.thriftiness * 0.1);
    if (Math.random() < Math.max(0.05, nightProb)) {
      const nightStart = getRandomInt(22, 23);
      const nightDest = getRandomDestByAttraction();
      const nightVehicle = chooseVehicle();
      
      trips.push({
        departureHour: nightStart,
        origin: currentLocation,
        destination: nightDest,
        type: 'Nightlife/Snack',
        vehicle: nightVehicle
      });
      
      trips.push({
        departureHour: (nightStart + getRandomInt(1, 3)) % 24,
        origin: nightDest,
        destination: agent.home_village,
        type: 'Return Home',
        vehicle: nightVehicle
      });
    }
  }

  // Toddlers mostly stay home or we ignore them for independent trips
  return trips;
}

export function generateAllTripChains(agents, nodes) {
  return agents.map(agent => ({
    ...agent,
    schedule: generateTripChain(agent, nodes),
    currentLocation: agent.home_village // initialize location
  }));
}

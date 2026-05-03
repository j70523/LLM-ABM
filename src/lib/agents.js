function getRandomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generateBackstory(agent) {
  const { occupation, age, traits, vehicle_ownership, salary } = agent;
  
  let story = "";
  
  // 1. Life Stage & Occupation
  if (occupation === 'Student') {
    story += age <= 18 ? "一位還在求學階段的青少年。" : "一位正在享受大學或研究所生活的學生。";
  } else if (occupation === 'Worker') {
    story += salary > 80000 ? "一位在職場頗有成就的高階主管或工程師。" : "一位勤奮工作的基層上班族。";
  } else if (occupation === 'Retiree') {
    story += "一位已經退休、開始享受悠閒生活的台南長者。";
  } else {
    story += "一位目前生活步調較為彈性的市民。";
  }

  // 2. Personality based on Traits (DNA)
  if (traits.socialMobility > 0.7) {
    story += "他天生愛好社交，下班後或假日總喜歡約朋友去咖啡廳或新開幕的景點。";
  } else if (traits.socialMobility < 0.3) {
    story += "他性格較為內向安靜，除了必要的工作或上學，最喜歡待在自己的舒適圈裡。";
  } else {
    story += "他的生活規律，平衡了工作與個人休息時間。";
  }

  // 3. Financial Attitude
  if (traits.thriftiness < 0.3) {
    story += "在消費方面，他比較隨性且注重當下享受，不太會為了省錢而犧牲便利性。";
  } else if (traits.thriftiness > 0.7) {
    story += "生活態度極其節省，每一分錢都會花在刀口上，即便出門也會優先考慮成本。";
  }

  // 4. Transport Logic description
  if (vehicle_ownership === '汽車') {
    story += traits.carPreference > 0.6 ? " 對他來說，開車不只是代步，更是一種私人的舒適空間。" : " 雖然台南塞車，但他仍依賴汽車的載重與遮風避雨。";
  } else if (vehicle_ownership === '機車') {
    story += " 他深知機車才是鑽台南小巷、找車位的唯一真理。";
  } else if (vehicle_ownership === '大眾運輸') {
    story += " 他習慣利用公車或接駁車，利用通勤時間處理瑣事或放空。";
  } else {
    story += " 他崇尚低碳生活，步行與單車是他最愛的移動方式。";
  }

  return story;
}

export function generateAgents(nodes) {
  const agents = [];
  let agentIdCounter = 0;
  
  // Pre-calculate cumulative attraction probability for destination choice
  const totalAttraction = nodes.reduce((sum, n) => sum + (n.attraction || 1), 0);
  const attrThresholds = [];
  let attrCum = 0;
  for (const node of nodes) {
    attrCum += (node.attraction || 1) / totalAttraction;
    attrThresholds.push({ id: node.id, threshold: attrCum });
  }

  for (const node of nodes) {
    const numAgents = Math.floor(node.population / 100);
    
    for (let i = 0; i < numAgents; i++) {
      const gender = Math.random() < 0.5 ? 'M' : 'F';
      
      // Age distribution
      const randAge = Math.random();
      let age;
      if (randAge < 0.15) age = getRandomInt(0, 14);
      else if (randAge < 0.25) age = getRandomInt(15, 24);
      else if (randAge < 0.80) age = getRandomInt(25, 64);
      else age = getRandomInt(65, 90);
      
      // Occupation & Salary logic
      let occupation, salary;
      if (age < 6) {
        occupation = 'Toddler';
        salary = 0;
      } else if (age >= 6 && age <= 22) {
        occupation = 'Student';
        salary = 0;
      } else if (age > 22 && age < 65) {
        if (Math.random() < 0.1) {
          occupation = 'Unemployed';
          salary = 0;
        } else {
          occupation = 'Worker';
          salary = getRandomInt(30000, 120000);
        }
      } else {
        occupation = 'Retiree';
        salary = getRandomInt(10000, 40000);
      }
      
      const household_income = salary + getRandomInt(20000, 150000);
      
      // --- NEW: Behavioral DNA (Traits) ---
      const traits = {
        thriftiness: Math.random(),      // 0: Big spender, 1: Frugal
        socialMobility: Math.random(),   // 0: Homebody, 1: Socialite
        carPreference: Math.random(),    // 0: Hate driving, 1: Love driving
        patience: Math.random()          // 0: Impatient, 1: Patient
      };

      // Vehicle Ownership logic influenced by DNA
      let vehicle_ownership = 'None';
      if (age >= 18) {
        // High car preference or high income increases car ownership chance
        const carProb = (household_income / 200000) * 0.5 + (traits.carPreference * 0.4);
        if (carProb > 0.6 && household_income > 80000) {
          vehicle_ownership = '汽車';
        } else if (traits.thriftiness < 0.8) { // Even not very rich people own scooters in Tainan
          vehicle_ownership = '機車';
        } else {
          vehicle_ownership = '大眾運輸';
        }
      } else if (age >= 12) {
        vehicle_ownership = Math.random() < 0.5 ? '步行/單車' : '大眾運輸';
      } else {
        vehicle_ownership = '步行/單車';
      }

      // Work/School Village
      let work_village = null;
      if (occupation === 'Worker' || occupation === 'Student') {
        const randAttr = Math.random();
        work_village = attrThresholds.find(t => randAttr <= t.threshold)?.id || nodes[0].id;
      }

      const agentData = {
        id: `agent_${agentIdCounter++}`,
        gender,
        age,
        occupation,
        salary,
        household_income,
        vehicle_ownership,
        traits,
        home_village: node.id,
        work_village
      };

      // Generate the LLM-style backstory
      agentData.description = generateBackstory(agentData);

      agents.push(agentData);
    }
  }
  
  return agents;
}

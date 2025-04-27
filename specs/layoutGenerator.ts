// File: /Users/danieljohnson/CODE/evil-invaders/src/layoutGenerator.ts
// New file: Copied and adapted from spritehub/src/layoutGenerator.js

// Define interfaces for clarity
interface GridConfig {
    gridRows: number;
    gridCols: number;
  }
  
  interface EnemyDistribution {
    enemies: { [key: string]: number };
    powerups: { [key: string]: number };
  }
  
  interface Position {
    row: number;
    col: number;
  }
  
  interface ClusterPosition extends Position {
    distance: number;
  }
  
  interface SymmetricPosition extends Position {
    mirror: Position;
  }
  
  // Analyze the current level to get counts of each enemy type and powerup
  export function analyzeEnemyList(enemyList: string[][]): EnemyDistribution {
    const distribution: EnemyDistribution = {
      enemies: {},
      powerups: {}
    };
  
    if (!enemyList || !Array.isArray(enemyList)) {
      console.warn("analyzeEnemyList received invalid enemyList:", enemyList);
      return distribution; // Return empty if invalid
    }
  
    // Count frequency of each enemy type and powerup in the grid
    for (let row = 0; row < enemyList.length; row++) {
      // Ensure row is an array
      if (!Array.isArray(enemyList[row])) {
        console.warn(`Row ${row} is not an array in enemyList`);
        continue;
      }
      for (let col = 0; col < enemyList[row].length; col++) {
        const code = enemyList[row][col];
        if (typeof code === 'string' && code !== "00") {
          const enemyType = code.charAt(0);
          const powerupType = code.charAt(1);
  
          // Count enemy type
          distribution.enemies[enemyType] = (distribution.enemies[enemyType] || 0) + 1;
  
          // Count powerup if present
          if (powerupType !== "0") {
            distribution.powerups[powerupType] = (distribution.powerups[powerupType] || 0) + 1;
          }
        }
      }
    }
  
    return distribution;
  }
  
  // Helper function to calculate total enemies
  export function totalEnemies(enemyDistribution: { [key: string]: number }): number {
    return Object.values(enemyDistribution).reduce((a, b) => a + b, 0);
  }
  
  // Generate aesthetic layout patterns
  export function generateAestheticLayout(gridConfig: GridConfig, distribution: EnemyDistribution): string[][] {
    const { gridRows, gridCols } = gridConfig;
  
    // Initialize default enemy list
    const enemyList: string[][] = Array.from({ length: gridRows }, () => Array(gridCols).fill("00"));
  
    // Choose a random pattern type
    const patterns = [
      "diagonal", "wave", "clusters", "symmetric", "columns"
    ];
    const patternType = patterns[Math.floor(Math.random() * patterns.length)];
  
    console.log(`Generating aesthetic layout with pattern: ${patternType}`);
  
    // Apply the selected pattern
    switch (patternType) {
      case "diagonal":
        return createDiagonalPattern(gridConfig, distribution, enemyList);
      case "wave":
        return createWavePattern(gridConfig, distribution, enemyList);
      case "clusters":
        return createClusterPattern(gridConfig, distribution, enemyList);
      case "symmetric":
        return createSymmetricPattern(gridConfig, distribution, enemyList);
      case "columns":
        return createColumnsPattern(gridConfig, distribution, enemyList);
      default:
        return enemyList;
    }
  }
  
  // Fisher-Yates (Knuth) shuffle algorithm
  export function shuffleArray<T>(array: T[]): T[] {
    let currentIndex = array.length;
    let temporaryValue: T, randomIndex: number;
  
    // While there remain elements to shuffle
    while (currentIndex !== 0) {
      // Pick a remaining element
      randomIndex = Math.floor(Math.random() * currentIndex);
      currentIndex -= 1;
  
      // Swap it with the current element
      temporaryValue = array[currentIndex];
      array[currentIndex] = array[randomIndex];
      array[randomIndex] = temporaryValue;
    }
  
    return array;
  }
  
  // Pattern 1: Diagonal Pattern
  export function createDiagonalPattern(gridConfig: GridConfig, distribution: EnemyDistribution, enemyList: string[][]): string[][] {
    const { gridRows, gridCols } = gridConfig;
  
    // Create diagonal lines of enemies
    const enemyTypes = Object.keys(distribution.enemies);
    const diagonalPositions: Position[] = [];
  
    // Generate diagonal positions
    for (let i = 0; i < gridCols + gridRows; i++) {
      for (let j = 0; j <= i; j++) {
        const row = j;
        const col = i - j;
        if (row < gridRows && col < gridCols) {
          diagonalPositions.push({ row, col });
        }
      }
    }
  
    // Shuffle the positions
    shuffleArray(diagonalPositions);
  
    // Place enemies along diagonals
    let placedCount = 0;
    for (const enemyType of enemyTypes) {
      const count = distribution.enemies[enemyType];
      for (let i = 0; i < count && placedCount < diagonalPositions.length; i++) {
        const pos = diagonalPositions[placedCount++];
        if (enemyList[pos.row]) { // Check row exists
             enemyList[pos.row][pos.col] = enemyType + "0"; // Default no powerup
        }
      }
    }
  
    // Now place powerups
    assignPowerupsToEnemies(gridConfig, distribution.powerups, enemyList);
  
    return enemyList;
  }
  
  // Pattern 2: Wave Pattern
  export function createWavePattern(gridConfig: GridConfig, distribution: EnemyDistribution, enemyList: string[][]): string[][] {
    const { gridRows, gridCols } = gridConfig;
  
    // Create wave-like patterns (sine wave)
    const enemyTypes = Object.keys(distribution.enemies);
    const wavePositions: Position[] = [];
  
    // Generate wave positions with amplitude variation
    for (let col = 0; col < gridCols; col++) {
      const amplitude = Math.floor(gridRows / 4); // 1/4 of grid height as amplitude
      const frequency = 0.5; // Adjust for wave density
  
      for (let i = 0; i < gridRows / 2; i++) {
        // Calculate sine wave positions
        const centerRow = gridRows / 2;
        const rowOffset = Math.round(amplitude * Math.sin(col * frequency));
        const row1 = Math.floor(centerRow + rowOffset - i);
        const row2 = Math.floor(centerRow + rowOffset + i);
  
        // Add positions if they're valid
        if (row1 >= 0 && row1 < gridRows) {
          wavePositions.push({ row: row1, col });
        }
        if (row2 >= 0 && row2 < gridRows && i > 0) { // Avoid duplicating center point
          wavePositions.push({ row: row2, col });
        }
      }
    }
  
    // Shuffle the positions
    shuffleArray(wavePositions);
  
    // Place enemies along wave pattern
    let placedCount = 0;
    for (const enemyType of enemyTypes) {
      const count = distribution.enemies[enemyType];
      for (let i = 0; i < count && placedCount < wavePositions.length; i++) {
        const pos = wavePositions[placedCount++];
          if (enemyList[pos.row]) { // Check row exists
             enemyList[pos.row][pos.col] = enemyType + "0"; // Default no powerup
          }
      }
    }
  
    // Now place powerups
    assignPowerupsToEnemies(gridConfig, distribution.powerups, enemyList);
  
    return enemyList;
  }
  
  // Pattern 3: Cluster Pattern
  export function createClusterPattern(gridConfig: GridConfig, distribution: EnemyDistribution, enemyList: string[][]): string[][] {
    const { gridRows, gridCols } = gridConfig;
  
    // Create clusters of enemies
    const enemyTypes = Object.keys(distribution.enemies);
    const totalEnemyCount = totalEnemies(distribution.enemies);
  
    // Determine number of clusters based on total enemies
    const clustersCount = Math.min(Math.max(2, Math.floor(totalEnemyCount / 10)), 5);
    const clusters: { centerRow: number; centerCol: number; radius: number }[] = [];
  
    // Generate cluster centers
    for (let i = 0; i < clustersCount; i++) {
      clusters.push({
        centerRow: Math.floor(Math.random() * gridRows),
        centerCol: Math.floor(Math.random() * gridCols),
        radius: Math.floor(Math.random() * 5) + 2 // Random radius between 2-7
      });
    }
  
    // Generate positions around clusters
    const clusterPositions: ClusterPosition[] = [];
    for (const cluster of clusters) {
      for (let row = 0; row < gridRows; row++) {
        for (let col = 0; col < gridCols; col++) {
          // Calculate distance to cluster center
          const distance = Math.sqrt(
            Math.pow(row - cluster.centerRow, 2) + Math.pow(col - cluster.centerCol, 2)
          );
  
          // Add positions within cluster radius
          if (distance <= cluster.radius) {
            clusterPositions.push({ row, col, distance });
          }
        }
      }
    }
  
    // Sort positions by distance from cluster centers
    clusterPositions.sort((a, b) => a.distance - b.distance);
  
    // Place enemies in clusters, starting from center
    let placedCount = 0;
    for (const enemyType of enemyTypes) {
      const count = distribution.enemies[enemyType];
      for (let i = 0; i < count && placedCount < clusterPositions.length; i++) {
        const pos = clusterPositions[placedCount++];
          if (enemyList[pos.row]) { // Check row exists
             enemyList[pos.row][pos.col] = enemyType + "0"; // Default no powerup
          }
      }
    }
  
    // Now place powerups
    assignPowerupsToEnemies(gridConfig, distribution.powerups, enemyList);
  
    return enemyList;
  }
  
  // Pattern 4: Symmetric Pattern
  export function createSymmetricPattern(gridConfig: GridConfig, distribution: EnemyDistribution, enemyList: string[][]): string[][] {
    const { gridRows, gridCols } = gridConfig;
  
    // Create symmetrical formations mirrored horizontally
    const enemyTypes = Object.keys(distribution.enemies);
    const symmetricPositions: SymmetricPosition[] = [];
  
    // Calculate positions for one half
    const halfWidth = Math.floor(gridCols / 2);
    for (let row = 0; row < gridRows; row++) {
      for (let col = 0; col < halfWidth; col++) {
        symmetricPositions.push({
          row,
          col,
          mirror: { row, col: gridCols - 1 - col }  // Mirror position
        });
      }
    }
  
    // Shuffle half positions
    shuffleArray(symmetricPositions);
  
    // Place enemies symmetrically
    let requiredPositions = Math.ceil(totalEnemies(distribution.enemies) / 2);
    let placedCount = 0;
  
    for (const enemyType of enemyTypes) {
      let count = distribution.enemies[enemyType];
      let assignedCount = 0;
  
      while (assignedCount < count && placedCount < symmetricPositions.length) {
        const pos = symmetricPositions[placedCount++];
  
        // Place on both sides for symmetry
        if (enemyList[pos.row]) { // Check row exists
            enemyList[pos.row][pos.col] = enemyType + "0";
            assignedCount++;
  
            // Place mirrored enemy if we still need more of this type
            if (assignedCount < count && enemyList[pos.mirror.row]) {
               enemyList[pos.mirror.row][pos.mirror.col] = enemyType + "0";
               assignedCount++;
            }
         }
      }
    }
  
    // Now place powerups - also with symmetry
    assignSymmetricPowerups(gridConfig, distribution.powerups, enemyList);
  
    return enemyList;
  }
  
  // Pattern 5: Columns Pattern
  export function createColumnsPattern(gridConfig: GridConfig, distribution: EnemyDistribution, enemyList: string[][]): string[][] {
    const { gridRows, gridCols } = gridConfig;
  
    // Create columns of enemies with varying densities
    const enemyTypes = Object.keys(distribution.enemies);
    const columnPositions: Position[] = [];
  
    // Create column positions with varying densities
    for (let col = 0; col < gridCols; col++) {
      // Determine column density (more enemies at edges, fewer in middle)
      const distFromCenter = Math.abs(col - (gridCols / 2 - 0.5));
      const normalizedDist = distFromCenter / (gridCols / 2);
      const density = 0.3 + 0.6 * normalizedDist; // Range: 0.3-0.9
  
      // Add positions to this column based on density
      for (let row = 0; row < gridRows; row++) {
        if (Math.random() < density) {
          columnPositions.push({ row, col });
        }
      }
    }
  
    // Shuffle the positions within each column to avoid perfect lines
    shuffleArray(columnPositions);
  
    // Place enemies in columns
    let placedCount = 0;
    for (const enemyType of enemyTypes) {
      const count = distribution.enemies[enemyType];
      for (let i = 0; i < count && placedCount < columnPositions.length; i++) {
        const pos = columnPositions[placedCount++];
          if (enemyList[pos.row]) { // Check row exists
              enemyList[pos.row][pos.col] = enemyType + "0"; // Default no powerup
          }
      }
    }
  
    // Now place powerups
    assignPowerupsToEnemies(gridConfig, distribution.powerups, enemyList);
  
    return enemyList;
  }
  
  
  // Helper function to assign powerups to enemies
  export function assignPowerupsToEnemies(gridConfig: GridConfig, powerupDistribution: { [key: string]: number }, enemyList: string[][]) {
    const { gridRows, gridCols } = gridConfig;
  
    // Get all enemy positions that can receive a powerup
    const enemyPositions: (Position & { enemyType: string })[] = [];
    for (let row = 0; row < gridRows; row++) {
      for (let col = 0; col < gridCols; col++) {
        if (enemyList[row]?.[col]) { // Check row and col exist
          const code = enemyList[row][col];
          if (code !== "00" && code.charAt(1) === "0") { // Has enemy but no powerup
            enemyPositions.push({ row, col, enemyType: code.charAt(0) });
          }
        }
      }
    }
  
    // Shuffle the positions
    shuffleArray(enemyPositions);
  
    // Place powerups
    let posIndex = 0;
    for (const powerupType of Object.keys(powerupDistribution)) {
      const count = powerupDistribution[powerupType];
      for (let i = 0; i < count && posIndex < enemyPositions.length; i++) {
        const pos = enemyPositions[posIndex++];
        if (enemyList[pos.row]) { // Check row exists
            enemyList[pos.row][pos.col] = pos.enemyType + powerupType;
        }
      }
    }
  }
  
  
  // Helper function for symmetric powerup placement
  export function assignSymmetricPowerups(gridConfig: GridConfig, powerupDistribution: { [key: string]: number }, enemyList: string[][]) {
    const { gridRows, gridCols } = gridConfig;
  
    // Get pairs of enemy positions that maintain symmetry
    const enemyPairs: { left: Position & { enemyType: string }; right: Position & { enemyType: string } }[] = [];
    const halfWidth = Math.floor(gridCols / 2);
  
    for (let row = 0; row < gridRows; row++) {
      for (let col = 0; col < halfWidth; col++) {
        const mirrorCol = gridCols - 1 - col;
  
        if (enemyList[row]?.[col] && enemyList[row]?.[mirrorCol]) { // Check row and cols exist
          const leftCode = enemyList[row][col];
          const rightCode = enemyList[row][mirrorCol];
  
          // Only add if both positions have enemies with no powerups
          if (leftCode !== "00" && leftCode.charAt(1) === "0" &&
              rightCode !== "00" && rightCode.charAt(1) === "0") {
            enemyPairs.push({
              left: { row, col, enemyType: leftCode.charAt(0) },
              right: { row, col: mirrorCol, enemyType: rightCode.charAt(0) } // Corrected mirrorCol usage
            });
          }
        }
      }
    }
  
    // Shuffle the pairs
    shuffleArray(enemyPairs);
  
    // Place powerups symmetrically
    let pairIndex = 0;
    for (const powerupType of Object.keys(powerupDistribution)) {
      let count = powerupDistribution[powerupType];
      let assignedCount = 0;
  
      while (assignedCount < count && pairIndex < enemyPairs.length) {
        const pair = enemyPairs[pairIndex++];
  
        // Place on both sides for symmetry
         if (enemyList[pair.left.row]) { // Check row exists
            enemyList[pair.left.row][pair.left.col] = pair.left.enemyType + powerupType;
            assignedCount++;
  
            // Place mirrored powerup if we still need more of this type
            if (assignedCount < count && enemyList[pair.right.row]) {
               enemyList[pair.right.row][pair.right.col] = pair.right.enemyType + powerupType;
               assignedCount++;
            }
         }
      }
    }
  }
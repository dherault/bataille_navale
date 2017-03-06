const inquirer = require('inquirer');

/* Configuration */
const n = 10;
const boats = [1, 1, 1, 1, 2, 2, 2, 3, 3, 4];

/* Utils */

const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const sep = '_';

function hash(x, y) {
  return `${x}${sep}${y}`;
}

function unhash(h) {
  const [x, y] = h.split(sep).map(n => parseInt(n));

  return { x, y, h };
}

function encode(x, y) {
  return `${alphabet.charAt(x)} ${y + 1}`;
}

function randomItem(array) {
  return array[Math.floor(Math.random() * array.length)];
}

function iterate(fn) {
  for (let x = 0; x < n; x++) {
    for (let y = 0; y < n; y++) {
      fn(x, y, hash(x, y));
    }
  }
}

/* Main logic */

function isImpossiblePosition(x, y) {
  return x < 0 || x >= n || y < 0 || y >= n;
}

function createSea() {
  const sea = {};

  iterate((x, y, h) => sea[h] = 0);

  return sea;
}

function getPositionsStrength(sea, boats) {
  const positions = {};

  iterate((x, y, h) => {
    if (sea[h]) return;

    positions[h] = 0;
    boats.forEach(boat => {
      positions[h] += checkBoatFit(sea, boat, x, y);
    });
  });

  return positions;
}

function checkBoatFit(sea, boat, x, y) {
  // console.log('checkBoatFit', i, j, boat);
  if (boat === 1) return 1;

  let capability = 1;

  for (let offset = 0; offset <= boat - 1; offset++) {
    let verticalOk = true;
    let horizontalOk = true;

    for (let boatPart = 0; boatPart < boat; boatPart++) {
      const z = boatPart - offset;

      if (isImpossiblePosition(x + z, y) || sea[hash(x + z, y)]) horizontalOk = false;
      if (isImpossiblePosition(x, y + z) || sea[hash(x, y + z)]) verticalOk = false;
    }

    if (verticalOk) capability += boat; // NOTE: += 1 for boat equality;
    if (horizontalOk) capability += boat;
  }

  return capability;
}

function findWeakestPosition(sea, boats) {
  const strengths = getPositionsStrength(sea, boats);

  console.log('findWeakestPosition');
  printBoard(strengths);

  let max = 0;
  let maxHashes = [];

  Object.keys(strengths).forEach(h => {
    if (strengths[h] === max) return maxHashes.push(h);

    if (strengths[h] > max) {
      max = strengths[h];
      maxHashes = [h];
    }
  });

  return unhash(randomItem(maxHashes));
}

function getAdjacentPositions(x, y) {
  return [
    { x, y: y + 1 },
    { x, y: y - 1 },
    { x: x + 1, y },
    { x: x - 1, y },
  ]
  .map(({ x, y }) => ({ x, y, h: hash(x, y) }));
}

function destroy(sea, currentBoats, pos) {
  const strengths = getPositionsStrength(sea, boats);

  console.log('destroy');
  printBoard(strengths);

  const validPositions = [];

  getAdjacentPositions(pos.x, pos.y)
  .forEach(({ x, y, h }) => {
    if (isImpossiblePosition(x, y)) return;
    // Is it water ?
    if (sea[h] === 1) return;
    // Is it unknow ?
    if (sea[h] === 0) return validPositions.push({ x, y, h });
    // Is it hit ?
    if (sea[h] === 2) {
      // Look for the other end of ship
      const diffVector = { x: x - pos.x, y: y - pos.y };
      const currentPos = { x, y };

      while (true) {
        currentPos.x += diffVector.x;
        currentPos.y += diffVector.y;

        if (isImpossiblePosition(currentPos.x, currentPos.y)) return;

        const h = hash(currentPos.x, currentPos.y);

        if (sea[h] === 1) return;
        if (sea[h] === 0) {
          currentPos.h = h;

          return validPositions.push(currentPos);
        }
      }
    }
  });

  let max = 0;
  let maxPos = [];

  validPositions.forEach(pos => {
    if (strengths[pos.h] === max) return maxPos.push(pos);
    if (strengths[pos.h] > max) {
      max = strengths[pos.h];
      maxPos = [pos];
    }
  });

  return randomItem(maxPos);
}

function markAsSink(sea, x, y, h) {
  let boatSize = 1;

  sea[h] = 3;

  getAdjacentPositions(x, y).forEach(({ x, y }) => {
    if (isImpossiblePosition(x, y)) return;

    const h = hash(x, y);

    if (sea[h] === 0) sea[h] = 1;
    if (sea[h] === 2) boatSize += markAsSink(sea, x, y, h);
  });

  return boatSize;
}

function printBoard(sea) {
  const a = [];

  iterate((x, y, h) => {
    if (!a[y]) a[y] = [];

    a[y][x] = sea[h];
  });

  let toPrint = '\t';

  for (let i = 0; i < n; i++) {
    toPrint += `${alphabet.charAt(i)}\t`;
  }

  a.forEach((row, y) => {
    toPrint += `\n${y + 1}|\t`;
    row.forEach(value => toPrint += `${value || '.'}\t`);
  });

  toPrint += '\n';

  console.log(toPrint);
}

function play() {
  const sea = createSea();
  const currentBoats = boats.slice();
  const promise = Promise.resolve();
  const choices = ['dans l\'eau', 'touché', 'coulé'];

  let counter = 0;
  let lastHitPos;

  function loop() {
    counter++;

    return new Promise(resolve => {
      const { x, y, h } = lastHitPos ?
        destroy(sea, currentBoats, lastHitPos) :
        findWeakestPosition(sea, currentBoats);

      printBoard(sea);
      console.log('currentBoats:', currentBoats);
      console.log('Vous devriez attaquer:');
      console.log(encode(x, y));

      return inquirer.prompt({
        choices,
        name: 'answer',
        type: 'rawlist',
        message: 'Quel est le résultat ?',
        default: 0,
      })
      .then(({ answer }) => {
        const response = choices.indexOf(answer) + 1;

        // console.log('response:', response);

        if (response === 1) sea[h] = 1;
        else {
          if (response === 2) {
            sea[h] = 2;
            lastHitPos = { x, y, h };
          }
          else {
            lastHitPos = null;
            // Remove boat
            const sankBoatSize = markAsSink(sea, x, y, h);
            currentBoats.splice(currentBoats.indexOf(sankBoatSize), 1);
          }

          [
            { x: x - 1, y: y - 1 },
            { x: x - 1, y: y + 1 },
            { x: x + 1, y: y - 1 },
            { x: x + 1, y: y + 1 },
          ]
          .forEach(({ x, y }) => {
            if (isImpossiblePosition(x, y)) return;

            const h = hash(x, y);

            if (sea[h] === 0) sea[h] = 1;
          });
        }

        return currentBoats.length ? loop() : resolve();
      });
    });
  }

  promise
  .then(loop)
  .then(() => {
    console.log('Game over!');
    console.log(`${counter} tours joués.`);
    process.exit();
  });

}

play();

require('dotenv').config();
const fs = require('node:fs');
const path = require('node:path');
const sql = require('mssql');

const database = process.env.DB_NAME || '';
if (!/^[A-Za-z][A-Za-z0-9_]*_myapp$/.test(database)) {
  console.error('DB_NAME must be your own database name ending in _myapp.');
  process.exit(1);
}

const courts = [
  { id: 1, venue: 'Green Lake Rec Court', neighborhood: 'Green Lake', city: 'Seattle' },
  { id: 2, venue: 'Ballard Neighborhood Gym', neighborhood: 'Ballard', city: 'Seattle' },
  { id: 3, venue: 'Rainier Valley Hoops Center', neighborhood: 'Rainier Valley', city: 'Seattle' },
  { id: 4, venue: 'Capitol Hill Community Court', neighborhood: 'Capitol Hill', city: 'Seattle' },
  { id: 5, venue: 'West Seattle Waterfront Court', neighborhood: 'West Seattle', city: 'Seattle' },
  { id: 6, venue: 'Fremont Playhouse Gym', neighborhood: 'Fremont', city: 'Seattle' },
  { id: 7, venue: 'University District Rec Court', neighborhood: 'University District', city: 'Seattle' },
  { id: 8, venue: 'Beacon Hill Neighborhood Court', neighborhood: 'Beacon Hill', city: 'Seattle' },
  { id: 9, venue: 'Queen Anne Sports Hall', neighborhood: 'Queen Anne', city: 'Seattle' },
  { id: 10, venue: 'Columbia City Recreation Gym', neighborhood: 'Columbia City', city: 'Seattle' },
  { id: 11, venue: 'Wallingford Community Court', neighborhood: 'Wallingford', city: 'Seattle' },
  { id: 12, venue: 'Magnolia Park Court', neighborhood: 'Magnolia', city: 'Seattle' },
  { id: 13, venue: 'Georgetown Rec Center', neighborhood: 'Georgetown', city: 'Seattle' },
  { id: 14, venue: 'Roosevelt Community Gym', neighborhood: 'Roosevelt', city: 'Seattle' },
  { id: 15, venue: 'Central District Hoops Court', neighborhood: 'Central District', city: 'Seattle' },
  { id: 16, venue: 'South Lake Union Fitness Court', neighborhood: 'South Lake Union', city: 'Seattle' },
  { id: 17, venue: 'Delridge Community Court', neighborhood: 'Delridge', city: 'Seattle' },
  { id: 18, venue: 'Phinney Ridge Rec Gym', neighborhood: 'Phinney Ridge', city: 'Seattle' },
  { id: 19, venue: 'Northgate Neighborhood Court', neighborhood: 'Northgate', city: 'Seattle' },
  { id: 20, venue: 'Greenwood Community Gym', neighborhood: 'Greenwood', city: 'Seattle' }
];

const games = [
  { id: 1, courtId: 1, title: 'Evening open run', daysAhead: 1, startTime: '18:30', skill: 'All levels', spots: 4 },
  { id: 2, courtId: 2, title: 'Ballard beginner run', daysAhead: 1, startTime: '19:00', skill: 'Beginner', spots: 6 },
  { id: 3, courtId: 3, title: 'Rainier fast-break night', daysAhead: 2, startTime: '18:00', skill: 'Advanced', spots: 3 },
  { id: 4, courtId: 4, title: 'Capitol Hill lunch run', daysAhead: 2, startTime: '12:00', skill: 'Intermediate', spots: 5 },
  { id: 5, courtId: 5, title: 'West Seattle weekend hoops', daysAhead: 3, startTime: '10:00', skill: 'All levels', spots: 8 },
  { id: 6, courtId: 6, title: 'Fremont fundamentals', daysAhead: 3, startTime: '17:30', skill: 'Beginner', spots: 4 },
  { id: 7, courtId: 7, title: 'U District evening run', daysAhead: 4, startTime: '19:30', skill: 'Intermediate', spots: 2 },
  { id: 8, courtId: 8, title: 'Beacon Hill pickup', daysAhead: 4, startTime: '18:00', skill: 'All levels', spots: 7 },
  { id: 9, courtId: 9, title: 'Queen Anne competitive run', daysAhead: 5, startTime: '19:00', skill: 'Advanced', spots: 3 },
  { id: 10, courtId: 10, title: 'Columbia City open gym', daysAhead: 5, startTime: '17:00', skill: 'All levels', spots: 5 },
  { id: 11, courtId: 11, title: 'Wallingford beginner hoops', daysAhead: 6, startTime: '18:30', skill: 'Beginner', spots: 6 },
  { id: 12, courtId: 12, title: 'Magnolia evening run', daysAhead: 6, startTime: '19:00', skill: 'Intermediate', spots: 4 },
  { id: 13, courtId: 13, title: 'Georgetown fast five', daysAhead: 7, startTime: '18:00', skill: 'Advanced', spots: 2 },
  { id: 14, courtId: 14, title: 'Roosevelt Sunday pickup', daysAhead: 7, startTime: '11:00', skill: 'All levels', spots: 8 },
  { id: 15, courtId: 15, title: 'Central District open run', daysAhead: 8, startTime: '18:30', skill: 'Intermediate', spots: 4 },
  { id: 16, courtId: 16, title: 'South Lake Union after work', daysAhead: 8, startTime: '17:30', skill: 'All levels', spots: 5 },
  { id: 17, courtId: 17, title: 'Delridge beginner game', daysAhead: 9, startTime: '18:00', skill: 'Beginner', spots: 6 },
  { id: 18, courtId: 18, title: 'Phinney Ridge late run', daysAhead: 9, startTime: '20:00', skill: 'Advanced', spots: 3 },
  { id: 19, courtId: 19, title: 'Northgate open court', daysAhead: 10, startTime: '18:30', skill: 'All levels', spots: 7 },
  { id: 20, courtId: 20, title: 'Greenwood community run', daysAhead: 10, startTime: '19:00', skill: 'Intermediate', spots: 4 }
];

function dateAfter(days) {
  const date = new Date();
  date.setHours(12, 0, 0, 0);
  date.setDate(date.getDate() + days);
  return date;
}

function timeOfDay(value) {
  const [hours, minutes] = value.split(':').map(Number);
  const time = new Date();
  time.setHours(hours, minutes, 0, 0);
  return time;
}

async function load() {
  let pool;
  try {
    pool = await sql.connect({
      server: process.env.DB_SERVER,
      port: Number(process.env.DB_PORT || 1433),
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database,
      options: { encrypt: true, trustServerCertificate: true, useUTC: false }
    });

    const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
    await pool.request().batch(schema);

    for (const court of courts) {
      await pool.request()
        .input('courtId', sql.Int, court.id)
        .input('venueName', sql.NVarChar(120), court.venue)
        .input('neighborhood', sql.NVarChar(80), court.neighborhood)
        .input('city', sql.NVarChar(80), court.city)
        .query(`
          IF NOT EXISTS (SELECT 1 FROM dbo.PickupCourts WHERE CourtID = @courtId)
          BEGIN
            INSERT INTO dbo.PickupCourts (CourtID, VenueName, Neighborhood, City)
            VALUES (@courtId, @venueName, @neighborhood, @city);
          END;
        `);
    }

    for (const game of games) {
      await pool.request()
        .input('gameId', sql.Int, game.id)
        .input('courtId', sql.Int, game.courtId)
        .input('gameTitle', sql.NVarChar(100), game.title)
        .input('gameDate', sql.Date, dateAfter(game.daysAhead))
        .input('startTime', sql.Time, timeOfDay(game.startTime))
        .input('skillLevel', sql.NVarChar(20), game.skill)
        .input('spotsAvailable', sql.Int, game.spots)
        .query(`
          IF NOT EXISTS (SELECT 1 FROM dbo.PickupGames WHERE GameID = @gameId)
          BEGIN
            INSERT INTO dbo.PickupGames
                (GameID, CourtID, GameTitle, GameDate, StartTime, SkillLevel, SpotsAvailable)
            VALUES
                (@gameId, @courtId, @gameTitle, @gameDate, @startTime, @skillLevel, @spotsAvailable);
          END;
        `);
    }

    console.log(`OK: loaded ${courts.length} courts and ${games.length} games into ${database}.`);
  } catch (error) {
    console.error('FAILED to load pickup game data:', error.message);
    process.exitCode = 1;
  } finally {
    if (pool) {
      await pool.close();
    }
  }
}

load();

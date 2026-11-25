require('dotenv').config();
const express = require('express');
const path = require('node:path');
const sql = require('mssql');

const app = express();
const webDirectory = path.join(__dirname, '..', 'web');
const port = Number(process.env.PORT) || 3000;

function isValidDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.valueOf()) && date.toISOString().slice(0, 10) === value;
}

function dateFromInput(value) {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day, 12);
}

app.get('/api/games', async (req, res) => {
  const locationValue = req.query.location ?? '';
  const dateValue = req.query.date ?? '';
  const skillValue = req.query.skill ?? 'all';

  if (
    typeof locationValue !== 'string'
    || typeof dateValue !== 'string'
    || typeof skillValue !== 'string'
  ) {
    return res.status(400).json({ error: 'Use one location, date, and skill level value.' });
  }

  const location = locationValue.trim();
  if (location.length > 100) {
    return res.status(400).json({ error: 'Location must be 100 characters or fewer.' });
  }

  if (dateValue && !isValidDate(dateValue)) {
    return res.status(400).json({ error: 'Date must be a valid date in YYYY-MM-DD format.' });
  }

  const skillLevels = {
    all: 'All',
    beginner: 'Beginner',
    intermediate: 'Intermediate',
    advanced: 'Advanced'
  };
  const selectedSkill = skillValue.toLowerCase();
  if (!Object.hasOwn(skillLevels, selectedSkill)) {
    return res.status(400).json({ error: 'Choose all, beginner, intermediate, or advanced skill level.' });
  }
  const skillLevel = skillLevels[selectedSkill];

  const database = process.env.DB_NAME || '';
  if (!/^[A-Za-z][A-Za-z0-9_]*_myapp$/.test(database)) {
    console.error('GET /api/games cannot run: DB_NAME must be your own database ending in _myapp.');
    return res.status(500).json({ error: 'The app database is not configured. Check DB_NAME in .env.' });
  }

  try {
    const pool = await sql.connect({
      server: process.env.DB_SERVER,
      port: Number(process.env.DB_PORT || 1433),
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database,
      options: { encrypt: true, trustServerCertificate: true, useUTC: false }
    });

    const result = await pool.request()
      .input('location', sql.NVarChar(100), location)
      .input('gameDate', sql.Date, dateValue ? dateFromInput(dateValue) : null)
      .input('skillLevel', sql.NVarChar(20), skillLevel)
      .query(`
        SELECT
            g.GameID,
            g.GameTitle,
            c.VenueName,
            c.Neighborhood,
            c.City,
            CONVERT(CHAR(10), g.GameDate, 23) AS GameDate,
            CONVERT(CHAR(5), g.StartTime, 108) AS StartTime,
            g.SkillLevel,
            g.SpotsAvailable
        FROM dbo.PickupGames AS g
        INNER JOIN dbo.PickupCourts AS c
            ON c.CourtID = g.CourtID
        WHERE g.SpotsAvailable > 0
            AND (
                @location = N''
                OR c.City LIKE N'%' + @location + N'%'
                OR c.Neighborhood LIKE N'%' + @location + N'%'
                OR c.VenueName LIKE N'%' + @location + N'%'
            )
            AND (@gameDate IS NULL OR g.GameDate = @gameDate)
            AND (
                @skillLevel = N'All'
                OR g.SkillLevel = N'All levels'
                OR g.SkillLevel = @skillLevel
            )
        ORDER BY g.GameDate, g.StartTime, g.GameID;
      `);

    return res.json({ games: result.recordset });
  } catch (error) {
    console.error('GET /api/games failed:', error.message);
    return res.status(500).json({
      error: 'Could not load pickup games. Check the database connection and try again.'
    });
  }
});

app.use(express.static(webDirectory));

app.listen(port, () => {
  console.log(`Pickup Finder is running at http://localhost:${port}`);
});

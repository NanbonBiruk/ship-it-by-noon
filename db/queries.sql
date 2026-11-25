-- Change these values to test different searches in VS Code.
DECLARE @location NVARCHAR(100) = N'Seattle';
DECLARE @gameDate DATE = NULL;
DECLARE @skillLevel NVARCHAR(20) = N'All';

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

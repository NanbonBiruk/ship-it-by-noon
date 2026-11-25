IF OBJECT_ID(N'dbo.PickupCourts', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.PickupCourts (
        CourtID INT NOT NULL,
        VenueName NVARCHAR(120) NOT NULL,
        Neighborhood NVARCHAR(80) NOT NULL,
        City NVARCHAR(80) NOT NULL,
        CONSTRAINT PK_PickupCourts PRIMARY KEY (CourtID)
    );
END;

IF OBJECT_ID(N'dbo.PickupGames', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.PickupGames (
        GameID INT NOT NULL,
        CourtID INT NOT NULL,
        GameTitle NVARCHAR(100) NOT NULL,
        GameDate DATE NOT NULL,
        StartTime TIME(0) NOT NULL,
        SkillLevel NVARCHAR(20) NOT NULL,
        SpotsAvailable INT NOT NULL,
        CONSTRAINT PK_PickupGames PRIMARY KEY (GameID),
        CONSTRAINT FK_PickupGames_PickupCourts
            FOREIGN KEY (CourtID) REFERENCES dbo.PickupCourts (CourtID),
        CONSTRAINT CK_PickupGames_SkillLevel
            CHECK (SkillLevel IN (N'All levels', N'Beginner', N'Intermediate', N'Advanced')),
        CONSTRAINT CK_PickupGames_SpotsAvailable CHECK (SpotsAvailable >= 0)
    );
END;

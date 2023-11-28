SELECT
    Name, COUNT(*) AS num_albums
FROM artists JOIN albums
ON albums.ArtistID = artists.ArtistID
GROUP BY Name
ORDER BY num_albums DESC
LIMIT 4;


namespace ChessPlatform.Api.Models;

public class User
{
    public Guid Id { get; set; }
    public string Provider { get; set; } = string.Empty;
    public string ProviderId { get; set; } = string.Empty;
    public string DisplayName { get; set; } = string.Empty;
    public string? AvatarUrl { get; set; }
    public int RatingBullet { get; set; } = 1200;
    public int RatingBlitz { get; set; } = 1200;
    public int RatingRapid { get; set; } = 1200;
    public int GamesPlayedBullet { get; set; }
    public int GamesPlayedBlitz { get; set; }
    public int GamesPlayedRapid { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}

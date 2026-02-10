namespace ChessPlatform.Api.Models;

public class Game
{
    public Guid Id { get; set; }
    public Guid WhitePlayerId { get; set; }
    public Guid BlackPlayerId { get; set; }
    public string TimeControl { get; set; } = string.Empty;
    public string Result { get; set; } = string.Empty;
    public string Termination { get; set; } = string.Empty;
    public string Pgn { get; set; } = string.Empty;
    public string FinalFen { get; set; } = string.Empty;
    public int WhiteRatingBefore { get; set; }
    public int BlackRatingBefore { get; set; }
    public int WhiteRatingAfter { get; set; }
    public int BlackRatingAfter { get; set; }
    public DateTime StartedAt { get; set; }
    public DateTime EndedAt { get; set; }
    public User WhitePlayer { get; set; } = null!;
    public User BlackPlayer { get; set; } = null!;
}
